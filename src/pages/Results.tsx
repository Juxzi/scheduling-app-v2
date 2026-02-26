import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDataForCompute, saveCalculation } from '../lib/Api.ts';
import { compute } from '../lib/compute.ts';
import type { ComputeResult, HourBuckets } from '../lib/compute.ts';
import Layout from '../components/Layout.tsx';

const round = (n: number) => Math.round(n * 100) / 100;

function exportCSV(result: ComputeResult, startDate: string, endDate: string) {
  const headers = [
    'Poste','Jr Sem.','Nu Sem.','Jr Dim.','Nu Dim.',
    'Jr Fér.','Nu Fér.','Jr Dim.Fér.','Nu Dim.Fér.',
    'Total','ETP période','ETP annualisé'
  ];
  const toRow = (name: string, h: HourBuckets, fte?: { periodFTE: number; annualizedFTE: number }) =>
    [name,
     round(h.dayWeekday), round(h.nightWeekday),
     round(h.daySunday),  round(h.nightSunday),
     round(h.dayHoliday), round(h.nightHoliday),
     round(h.dayHolidaySunday), round(h.nightHolidaySunday),
     round(h.total),
     fte?.periodFTE ?? '', fte?.annualizedFTE ?? ''
    ].join(';');

  const pi = result.periodInfo;
  const infoLines = [
    '',
    'Infos période',
    `Semaines;${pi.weeks}`,
    `Lundis;${pi.mondays}`,
    `Mardis;${pi.tuesdays}`,
    `Mercredis;${pi.wednesdays}`,
    `Jeudis;${pi.thursdays}`,
    `Vendredis;${pi.fridays}`,
    `Samedis;${pi.saturdays}`,
    `Dimanches;${pi.sundays}`,
    `Jours fériés;${pi.holidays}`,
    `Dim. fériés;${pi.holidaySundays}`,
  ];

  const lines = [
    `Période;${startDate};au;${endDate}`, '',
    headers.join(';'),
    ...result.posts.map(p => toRow(p.post_name, p.hours, p.fte)),
    toRow('TOTAL', result.totals),
    ...infoLines,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `heures_${startDate}_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const Num = ({ v }: { v: number }) => (
  <td className="px-2 py-2 text-right tabular-nums text-xs">
    {v > 0 ? round(v).toFixed(2) : <span className="text-gray-200">—</span>}
  </td>
);

const InfoCard = ({ label, value, sub }: { label: string; value: number; sub?: string }) => (
  <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
    <p className="text-2xl font-bold text-gray-800">{value}</p>
    <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-300 mt-0.5">{sub}</p>}
  </div>
);

export default function Results() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const devId = Number(deviceId);

  const startDate  = sessionStorage.getItem('startDate')  ?? '2025-01-01';
  const endDate    = sessionStorage.getItem('endDate')    ?? '2025-12-31';
  const deviceName = sessionStorage.getItem('deviceName') ?? 'Dispositif';

  const [result, setResult]   = useState<ComputeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getDataForCompute(devId)
      .then(({ posts, schedules, holidays }) => {
        setResult(compute(posts, schedules, holidays, startDate, endDate));
      })
      .catch(() => setError('Erreur lors du calcul.'))
      .finally(() => setLoading(false));
  }, [devId]);

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await saveCalculation(devId, deviceName, startDate, endDate, result);
      setSaved(true);
    } catch {
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const pi = result?.periodInfo;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="text-sm text-blue-500 hover:underline mb-4 block">← Retour</button>

        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Résultats</h1>
            <p className="text-sm text-gray-400 mt-1">
              {deviceName} · {startDate} → {endDate}
              {result && <span className="ml-2">({result.periodDays} jours)</span>}
            </p>
          </div>
          {result && (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || saved}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {saved ? '✅ Sauvegardé' : saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
              </button>
              <button onClick={() => exportCSV(result, startDate, endDate)}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium">
                📥 Export CSV
              </button>
            </div>
          )}
        </div>

        {error   && <div className="mb-4 p-3 bg-red-50 rounded-xl text-sm text-red-600">{error}</div>}
        {loading && <p className="text-gray-400">Calcul en cours...</p>}

        {result && pi && (
          <div className="flex flex-col xl:flex-row gap-6">

            {/* ── Tableau résultats ── */}
            <div className="flex-1 min-w-0">
              <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <th className="px-3 py-3 text-left">Poste</th>
                      <th className="px-2 py-3 text-right">Jr Sem.</th>
                      <th className="px-2 py-3 text-right">Nu Sem.</th>
                      <th className="px-2 py-3 text-right">Jr Dim.</th>
                      <th className="px-2 py-3 text-right">Nu Dim.</th>
                      <th className="px-2 py-3 text-right">Jr Fér.</th>
                      <th className="px-2 py-3 text-right">Nu Fér.</th>
                      <th className="px-2 py-3 text-right text-amber-600">Jr D.Fér.</th>
                      <th className="px-2 py-3 text-right text-amber-600">Nu D.Fér.</th>
                      <th className="px-2 py-3 text-right text-gray-700 font-bold">Total</th>
                      <th className="px-2 py-3 text-right text-blue-600">ETP/p.</th>
                      <th className="px-2 py-3 text-right text-purple-600">ETP/an</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.posts.map((p, i) => (
                      <tr key={p.post_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-3 py-2 font-medium text-sm">{p.post_name}</td>
                        <Num v={p.hours.dayWeekday} />
                        <Num v={p.hours.nightWeekday} />
                        <Num v={p.hours.daySunday} />
                        <Num v={p.hours.nightSunday} />
                        <Num v={p.hours.dayHoliday} />
                        <Num v={p.hours.nightHoliday} />
                        <Num v={p.hours.dayHolidaySunday} />
                        <Num v={p.hours.nightHolidaySunday} />
                        <td className="px-2 py-2 text-right font-bold text-sm tabular-nums">{round(p.hours.total).toFixed(2)}</td>
                        <td className="px-2 py-2 text-right text-sm tabular-nums text-blue-600 font-medium">{p.fte.periodFTE}</td>
                        <td className="px-2 py-2 text-right text-sm tabular-nums text-purple-600 font-medium">{p.fte.annualizedFTE}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-800 text-white font-bold">
                      <td className="px-3 py-3 text-sm">TOTAL</td>
                      <Num v={result.totals.dayWeekday} />
                      <Num v={result.totals.nightWeekday} />
                      <Num v={result.totals.daySunday} />
                      <Num v={result.totals.nightSunday} />
                      <Num v={result.totals.dayHoliday} />
                      <Num v={result.totals.nightHoliday} />
                      <Num v={result.totals.dayHolidaySunday} />
                      <Num v={result.totals.nightHolidaySunday} />
                      <td className="px-2 py-3 text-right font-bold text-sm tabular-nums">{round(result.totals.total).toFixed(2)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Légende ETP */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">ETP période</p>
                  <p className="text-xs text-gray-500">% d'un temps plein sur cette période</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <p className="text-xs font-semibold text-purple-700 mb-0.5">ETP annualisé</p>
                  <p className="text-xs text-gray-500">Projection sur 1 an à ce rythme</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">Base : 1 ETP = 1 645 h/an</p>
            </div>

            {/* ── Panneau infos période ── */}
            <div className="xl:w-64 shrink-0">
              <div className="bg-slate-50 rounded-2xl border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Infos période</h2>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <InfoCard label="Semaines" value={pi.weeks} />
                  <InfoCard label="Jours" value={pi.periodDays} />
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Jours de semaine</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <InfoCard label="Lundis"    value={pi.mondays} />
                  <InfoCard label="Mardis"    value={pi.tuesdays} />
                  <InfoCard label="Mercredis" value={pi.wednesdays} />
                  <InfoCard label="Jeudis"    value={pi.thursdays} />
                  <InfoCard label="Vendredis" value={pi.fridays} />
                  <InfoCard label="Samedis"   value={pi.saturdays} />
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Week-end & fériés</p>
                <div className="grid grid-cols-2 gap-2">
                  <InfoCard label="Dimanches"   value={pi.sundays} />
                  <InfoCard label="Fériés"       value={pi.holidays} />
                  <InfoCard label="Dim. Fériés"  value={pi.holidaySundays} />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </Layout>
  );
}