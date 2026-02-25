import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDataForCompute } from '../lib/Api.ts';
import { compute } from '../lib/compute.ts';
import type { ComputeResult, HourBuckets } from '../lib/compute.ts';

const round = (n: number) => Math.round(n * 100) / 100;

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(result: ComputeResult, startDate: string, endDate: string) {
  const headers = [
    'Poste','Jour Sem.','Nuit Sem.','Jour Dim.','Nuit Dim.',
    'Jour Fér.','Nuit Fér.','Total','ETP période','ETP annualisé'
  ];

  const toRow = (name: string, h: HourBuckets, fte?: { periodFTE: number; annualizedFTE: number }) =>
    [
      name,
      round(h.dayWeekday), round(h.nightWeekday),
      round(h.daySunday),  round(h.nightSunday),
      round(h.dayHoliday), round(h.nightHoliday),
      round(h.total),
      fte ? fte.periodFTE     : '',
      fte ? fte.annualizedFTE : '',
    ].join(';');

  const lines = [
    `Période;${startDate};au;${endDate}`,
    '',
    headers.join(';'),
    ...result.posts.map(p => toRow(p.post_name, p.hours, p.fte)),
    toRow('TOTAL', result.totals),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `heures_${startDate}_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Composant cellule numérique ──────────────────────────────────────────────

const Num = ({ v }: { v: number }) => (
  <td className="px-3 py-2 text-right tabular-nums">
    {v > 0 ? round(v).toFixed(2) : <span className="text-gray-300">—</span>}
  </td>
);

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Results() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const devId = Number(deviceId);

  const startDate = sessionStorage.getItem('startDate') ?? '2025-01-01';
  const endDate   = sessionStorage.getItem('endDate')   ?? '2025-12-31';

  const [result, setResult] = useState<ComputeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getDataForCompute(devId)
      .then(({ posts, schedules, holidays }) => {
        const r = compute(posts, schedules, holidays, startDate, endDate);
        setResult(r);
      })
      .catch(() => setError('Erreur lors du calcul.'))
      .finally(() => setLoading(false));
  }, [devId]);

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-blue-600 hover:underline mb-4 block"
      >← Retour</button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Résultats</h1>
          <p className="text-sm text-gray-500 mt-1">
            Période : {startDate} → {endDate}
            {result && <span className="ml-2">({result.periodDays} jours)</span>}
          </p>
        </div>
        {result && (
          <button
            onClick={() => exportCSV(result, startDate, endDate)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >📥 Export CSV</button>
        )}
      </div>

      {error   && <p className="text-red-500">{error}</p>}
      {loading && <p className="text-gray-400">Calcul en cours...</p>}

      {result && (
        <>
          {/* Tableau principal */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-xs uppercase text-gray-500">
                  <th className="px-3 py-2 text-left">Poste</th>
                  <th className="px-3 py-2 text-right">Jour Sem.</th>
                  <th className="px-3 py-2 text-right">Nuit Sem.</th>
                  <th className="px-3 py-2 text-right">Jour Dim.</th>
                  <th className="px-3 py-2 text-right">Nuit Dim.</th>
                  <th className="px-3 py-2 text-right">Jour Fér.</th>
                  <th className="px-3 py-2 text-right">Nuit Fér.</th>
                  <th className="px-3 py-2 text-right font-bold">Total</th>
                  <th className="px-3 py-2 text-right">ETP/pér.</th>
                  <th className="px-3 py-2 text-right">ETP/an</th>
                </tr>
              </thead>
              <tbody>
                {result.posts.map((p, i) => (
                  <tr key={p.post_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 font-medium">{p.post_name}</td>
                    <Num v={p.hours.dayWeekday}   />
                    <Num v={p.hours.nightWeekday}  />
                    <Num v={p.hours.daySunday}     />
                    <Num v={p.hours.nightSunday}   />
                    <Num v={p.hours.dayHoliday}    />
                    <Num v={p.hours.nightHoliday}  />
                    <td className="px-3 py-2 text-right font-bold tabular-nums">
                      {round(p.hours.total).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-blue-700">
                      {p.fte.periodFTE}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-purple-700">
                      {p.fte.annualizedFTE}
                    </td>
                  </tr>
                ))}

                {/* Ligne totaux */}
                <tr className="bg-gray-800 text-white font-bold">
                  <td className="px-3 py-2">TOTAL</td>
                  <Num v={result.totals.dayWeekday}   />
                  <Num v={result.totals.nightWeekday}  />
                  <Num v={result.totals.daySunday}     />
                  <Num v={result.totals.nightSunday}   />
                  <Num v={result.totals.dayHoliday}    />
                  <Num v={result.totals.nightHoliday}  />
                  <td className="px-3 py-2 text-right tabular-nums">
                    {round(result.totals.total).toFixed(2)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Légende ETP */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-gray-600 space-y-1">
            <p><span className="font-semibold text-blue-700">ETP période</span> — Sur cette période précise, quel % d'un temps plein a été couvert ? (utile pour la facturation)</p>
            <p><span className="font-semibold text-purple-700">ETP annualisé</span> — Si ce rythme continuait toute l'année, combien d'ETP ? (utile pour le plan de charge)</p>
            <p className="text-xs text-gray-400 mt-1">Base : 1 ETP = 1 645 h/an</p>
          </div>
        </>
      )}
    </div>
  );
}