import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCalculations, deleteCalculation } from '../lib/Api.ts';
import type { Calculation } from '../lib/Api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import Layout from '../components/Layout.tsx';

export default function History() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [calcs, setCalcs]       = useState<Calculation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    getCalculations()
      .then(data => {
        console.log('Calculs chargés:', data);
        setCalcs(data);
      })
      .catch(e => {
        console.error('Erreur historique:', e);
        setError(e.message ?? 'Impossible de charger l\'historique.');
      })
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Historique</h1>
            <p className="text-sm text-gray-400 mt-1">
              {isAdmin ? 'Tous les calculs' : 'Vos calculs sauvegardés'}
            </p>
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
            {calcs.map(c => (
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
                      <span>📅 {formatDate(c.start_date)} → {formatDate(c.end_date)}</span>
                      <span>🕐 {formatDateTime(c.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                      {expanded === c.id ? '▲' : '▼'}
                    </button>
                    <button onClick={() => handleDelete(c.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      🗑
                    </button>
                  </div>
                </div>

                {/* Résultats expandés */}
                {expanded === c.id && c.result && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-slate-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Résultats</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="text-gray-400">
                            <th className="text-left pb-2 pr-3">Poste</th>
                            <th className="text-right pb-2 px-2">Jr Sem.</th>
                            <th className="text-right pb-2 px-2">Nu Sem.</th>
                            <th className="text-right pb-2 px-2">Jr Dim.</th>
                            <th className="text-right pb-2 px-2">Nu Dim.</th>
                            <th className="text-right pb-2 px-2">Jr Fér.</th>
                            <th className="text-right pb-2 px-2">Nu Fér.</th>
                            <th className="text-right pb-2 pl-2 font-bold text-gray-600">Total</th>
                            <th className="text-right pb-2 pl-2 text-blue-500">ETP/pér.</th>
                            <th className="text-right pb-2 pl-2 text-purple-500">ETP/an</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.result.posts?.map((p: any) => (
                            <tr key={p.post_id} className="border-t border-gray-100">
                              <td className="py-1.5 pr-3 font-medium text-gray-700">{p.post_name}</td>
                              <td className="py-1.5 px-2 text-right tabular-nums">{p.hours.dayWeekday?.toFixed(1)}</td>
                              <td className="py-1.5 px-2 text-right tabular-nums">{p.hours.nightWeekday?.toFixed(1)}</td>
                              <td className="py-1.5 px-2 text-right tabular-nums">{p.hours.daySunday?.toFixed(1)}</td>
                              <td className="py-1.5 px-2 text-right tabular-nums">{p.hours.nightSunday?.toFixed(1)}</td>
                              <td className="py-1.5 px-2 text-right tabular-nums">{p.hours.dayHoliday?.toFixed(1)}</td>
                              <td className="py-1.5 px-2 text-right tabular-nums">{p.hours.nightHoliday?.toFixed(1)}</td>
                              <td className="py-1.5 pl-2 text-right font-bold tabular-nums">{p.hours.total?.toFixed(1)}</td>
                              <td className="py-1.5 pl-2 text-right text-blue-600 tabular-nums">{p.fte?.periodFTE}</td>
                              <td className="py-1.5 pl-2 text-right text-purple-600 tabular-nums">{p.fte?.annualizedFTE}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-gray-200 bg-gray-100">
                            <td className="py-1.5 pr-3 font-bold text-gray-700">TOTAL</td>
                            <td className="py-1.5 px-2 text-right tabular-nums font-medium">{c.result.totals?.dayWeekday?.toFixed(1)}</td>
                            <td className="py-1.5 px-2 text-right tabular-nums font-medium">{c.result.totals?.nightWeekday?.toFixed(1)}</td>
                            <td className="py-1.5 px-2 text-right tabular-nums font-medium">{c.result.totals?.daySunday?.toFixed(1)}</td>
                            <td className="py-1.5 px-2 text-right tabular-nums font-medium">{c.result.totals?.nightSunday?.toFixed(1)}</td>
                            <td className="py-1.5 px-2 text-right tabular-nums font-medium">{c.result.totals?.dayHoliday?.toFixed(1)}</td>
                            <td className="py-1.5 px-2 text-right tabular-nums font-medium">{c.result.totals?.nightHoliday?.toFixed(1)}</td>
                            <td className="py-1.5 pl-2 text-right font-bold tabular-nums">{c.result.totals?.total?.toFixed(1)}</td>
                            <td colSpan={2} />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}