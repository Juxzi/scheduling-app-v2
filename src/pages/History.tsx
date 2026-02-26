import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCalculations, deleteCalculation } from '../lib/Api.ts';
import type { Calculation } from '../lib/Api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import Layout from '../components/Layout.tsx';

export default function History() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [calcs, setCalcs]         = useState<Calculation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [expanded, setExpanded]   = useState<number | null>(null);

  useEffect(() => {
    getCalculations()
      .then(setCalcs)
      .catch(e => setError(e.message ?? 'Impossible de charger l\'historique.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce calcul ?')) return;
    try {
      await deleteCalculation(id);
      setCalcs(prev => prev.filter(c => c.id !== id));
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  const fmt  = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtDT = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const r2   = (n: number) => Math.round(n * 100) / 100;
  const N    = ({ v }: { v: number }) => (
    <td className="py-1.5 px-1.5 text-right tabular-nums">{v > 0 ? r2(v).toFixed(1) : <span className="text-gray-200">—</span>}</td>
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Historique</h1>
            <p className="text-sm text-gray-400 mt-1">{isAdmin ? 'Tous les calculs' : 'Vos calculs sauvegardés'}</p>
          </div>
          <button onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            + Nouveau calcul
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 rounded-xl text-sm text-red-600">{error}</div>}

        {loading ? (
          <p className="text-gray-400 text-sm">Chargement...</p>
        ) : calcs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 font-medium">Aucun calcul sauvegardé</p>
            <p className="text-gray-400 text-sm mt-1">Lancez un calcul depuis l'accueil pour le voir ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {calcs.map(c => {
              const pi = c.result?.periodInfo;
              return (
                <div key={c.id} className="bg-white rounded-2xl shadow overflow-hidden">

                  {/* En-tête */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex-1 cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800 text-sm">{c.device_name}</span>
                        {isAdmin && c.profiles && (
                          <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-500 rounded-full">
                            {c.profiles.full_name ?? c.profiles.email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>📅 {fmt(c.start_date)} → {fmt(c.end_date)}</span>
                        <span>🕐 {fmtDT(c.created_at)}</span>
                        {pi && <span>📆 {pi.periodDays} jours · {pi.weeks} sem.</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                        {expanded === c.id ? '▲' : '▼'}
                      </button>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">🗑</button>
                    </div>
                  </div>

                  {/* Détail expandé */}
                  {expanded === c.id && (
                    <div className="border-t border-gray-100 bg-slate-50">

                      {/* Tableau des heures */}
                      <div className="px-5 py-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Résultats heures</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="text-gray-400">
                                <th className="text-left pb-2 pr-2">Poste</th>
                                <th className="text-right pb-2 px-1.5">Jr Sem.</th>
                                <th className="text-right pb-2 px-1.5">Nu Sem.</th>
                                <th className="text-right pb-2 px-1.5">Jr Dim.</th>
                                <th className="text-right pb-2 px-1.5">Nu Dim.</th>
                                <th className="text-right pb-2 px-1.5">Jr Fér.</th>
                                <th className="text-right pb-2 px-1.5">Nu Fér.</th>
                                <th className="text-right pb-2 px-1.5 text-amber-500">Jr D.Fér.</th>
                                <th className="text-right pb-2 px-1.5 text-amber-500">Nu D.Fér.</th>
                                <th className="text-right pb-2 pl-2 font-bold text-gray-600">Total</th>
                                <th className="text-right pb-2 pl-2 text-blue-500">ETP/p.</th>
                                <th className="text-right pb-2 pl-2 text-purple-500">ETP/an</th>
                              </tr>
                            </thead>
                            <tbody>
                              {c.result.posts?.map((p: any) => (
                                <tr key={p.post_id} className="border-t border-gray-100">
                                  <td className="py-1.5 pr-2 font-medium text-gray-700">{p.post_name}</td>
                                  <N v={p.hours.dayWeekday}        />
                                  <N v={p.hours.nightWeekday}       />
                                  <N v={p.hours.daySunday}          />
                                  <N v={p.hours.nightSunday}        />
                                  <N v={p.hours.dayHoliday}         />
                                  <N v={p.hours.nightHoliday}       />
                                  <N v={p.hours.dayHolidaySunday  ?? 0} />
                                  <N v={p.hours.nightHolidaySunday ?? 0} />
                                  <td className="py-1.5 pl-2 text-right font-bold tabular-nums">{r2(p.hours.total).toFixed(1)}</td>
                                  <td className="py-1.5 pl-2 text-right text-blue-600 tabular-nums">{p.fte?.periodFTE}</td>
                                  <td className="py-1.5 pl-2 text-right text-purple-600 tabular-nums">{p.fte?.annualizedFTE}</td>
                                </tr>
                              ))}
                              <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                                <td className="py-1.5 pr-2 text-gray-700">TOTAL</td>
                                <N v={c.result.totals?.dayWeekday}         />
                                <N v={c.result.totals?.nightWeekday}        />
                                <N v={c.result.totals?.daySunday}           />
                                <N v={c.result.totals?.nightSunday}         />
                                <N v={c.result.totals?.dayHoliday}          />
                                <N v={c.result.totals?.nightHoliday}        />
                                <N v={c.result.totals?.dayHolidaySunday  ?? 0} />
                                <N v={c.result.totals?.nightHolidaySunday ?? 0} />
                                <td className="py-1.5 pl-2 text-right tabular-nums">{r2(c.result.totals?.total).toFixed(1)}</td>
                                <td colSpan={2} />
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Infos période */}
                      {pi && (
                        <div className="px-5 pb-4 border-t border-gray-100 pt-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Infos période</p>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            {[
                              { label: 'Semaines', value: pi.weeks },
                              { label: 'Jours',    value: pi.periodDays },
                              { label: 'Lundis',   value: pi.mondays },
                              { label: 'Mardis',   value: pi.tuesdays },
                              { label: 'Mercredis',value: pi.wednesdays },
                              { label: 'Jeudis',   value: pi.thursdays },
                              { label: 'Vendredis',value: pi.fridays },
                              { label: 'Samedis',  value: pi.saturdays },
                              { label: 'Dimanches',value: pi.sundays },
                              { label: 'Fériés',   value: pi.holidays },
                              { label: 'Dim. Fér.',value: pi.holidaySundays },
                            ].map(item => (
                              <div key={item.label} className="bg-white rounded-lg px-3 py-2 text-center border border-gray-100">
                                <p className="font-bold text-gray-800">{item.value}</p>
                                <p className="text-gray-400 text-xs">{item.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}