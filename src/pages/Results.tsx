import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDataForCompute, saveCalculation } from '../lib/Api.ts';
import type { HourBuckets } from '../lib/compute.ts';
import { compute } from '../lib/compute.ts';
import type { ComputeResult } from '../lib/compute.ts';
import Layout from '../components/Layout.tsx';

const round = (n: number) => Math.round(n * 100) / 100;

function exportCSV(result: ComputeResult, startDate: string, endDate: string) {
  const headers = ['Poste','Jour Sem.','Nuit Sem.','Jour Dim.','Nuit Dim.','Jour Fér.','Nuit Fér.','Total','ETP période','ETP annualisé'];
  const toRow = (name: string, h: HourBuckets, fte?: { periodFTE: number; annualizedFTE: number }) =>
    [name, round(h.dayWeekday), round(h.nightWeekday), round(h.daySunday), round(h.nightSunday),
     round(h.dayHoliday), round(h.nightHoliday), round(h.total),
     fte ? fte.periodFTE : '', fte ? fte.annualizedFTE : ''].join(';');
  const lines = [
    `Période;${startDate};au;${endDate}`, '',
    headers.join(';'),
    ...result.posts.map(p => toRow(p.post_name, p.hours, p.fte)),
    toRow('TOTAL', result.totals),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `heures_${startDate}_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const Num = ({ v }: { v: number }) => (
  <td className="px-3 py-2 text-right tabular-nums text-sm">
    {v > 0 ? round(v).toFixed(2) : <span className="text-gray-300">—</span>}
  </td>
);

export default function Results() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const devId = Number(deviceId);

  const startDate = sessionStorage.getItem('startDate') ?? '2025-01-01';
  const endDate   = sessionStorage.getItem('endDate')   ?? '2025-12-31';
  const deviceName = sessionStorage.getItem('deviceName') ?? 'Dispositif';

  const [result, setResult]   = useState<ComputeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getDataForCompute(devId)
      .then(({ posts, schedules, holidays }) => {
        const r = compute(posts, schedules, holidays, startDate, endDate);
        setResult(r);
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

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
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

        {result && (
          <>
            <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-3 py-3 text-left">Poste</th>
                    <th className="px-3 py-3 text-right">Jour Sem.</th>
                    <th className="px-3 py-3 text-right">Nuit Sem.</th>
                    <th className="px-3 py-3 text-right">Jour Dim.</th>
                    <th className="px-3 py-3 text-right">Nuit Dim.</th>
                    <th className="px-3 py-3 text-right">Jour Fér.</th>
                    <th className="px-3 py-3 text-right">Nuit Fér.</th>
                    <th className="px-3 py-3 text-right text-gray-700">Total</th>
                    <th className="px-3 py-3 text-right text-blue-600">ETP/pér.</th>
                    <th className="px-3 py-3 text-right text-purple-600">ETP/an</th>
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
                      <td className="px-3 py-2 text-right font-bold text-sm tabular-nums">{round(p.hours.total).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-sm tabular-nums text-blue-600 font-medium">{p.fte.periodFTE}</td>
                      <td className="px-3 py-2 text-right text-sm tabular-nums text-purple-600 font-medium">{p.fte.annualizedFTE}</td>
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
                    <td className="px-3 py-3 text-right font-bold text-sm tabular-nums">{round(result.totals.total).toFixed(2)}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm font-semibold text-blue-700 mb-1">ETP période</p>
                <p className="text-xs text-gray-500">Sur cette période précise, quel % d'un temps plein a été couvert ?</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <p className="text-sm font-semibold text-purple-700 mb-1">ETP annualisé</p>
                <p className="text-xs text-gray-500">Si ce rythme continuait toute l'année, combien d'ETP ?</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">Base : 1 ETP = 1 645 h/an</p>
          </>
        )}
      </div>
    </Layout>
  );
}