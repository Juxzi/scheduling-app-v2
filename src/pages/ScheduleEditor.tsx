import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSchedules, upsertSchedules } from '../lib/Api.ts';
import Layout from '../components/Layout.tsx';

const DAY_LABELS: { key: string; label: string }[] = [
  { key: 'monday',        label: 'Lundi' },
  { key: 'tuesday',       label: 'Mardi' },
  { key: 'wednesday',     label: 'Mercredi' },
  { key: 'thursday',      label: 'Jeudi' },
  { key: 'friday',        label: 'Vendredi' },
  { key: 'saturday',      label: 'Samedi' },
  { key: 'sunday',        label: 'Dimanche' },
  { key: 'holiday',       label: '🎉 Férié' },
  { key: 'holidaySunday', label: '🎉☀️ Dim. Férié' },
];

interface DayRow {
  day_of_week: string;
  start_time:  string;
  end_time:    string;
  is_closed:   boolean;
  has_break:   boolean;
  break_start: string;
  break_end:   string;
}

const defaultRow = (key: string): DayRow => ({
  day_of_week: key,
  start_time:  '08:00',
  end_time:    '16:00',
  is_closed:   ['sunday','saturday','holiday','holidaySunday'].includes(key),
  has_break:   false,
  break_start: '12:00',
  break_end:   '13:00',
});

export default function ScheduleEditor() {
  const { postId } = useParams<{ postId: string }>();
  const navigate   = useNavigate();
  const pId        = Number(postId);

  const [rows, setRows]       = useState<DayRow[]>(DAY_LABELS.map(d => defaultRow(d.key)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    getSchedules(pId).then(data => {
      if (data.length > 0) {
        const map: Record<string, DayRow> = {};
        for (const r of data) {
          map[r.day_of_week] = {
            day_of_week: r.day_of_week,
            start_time:  r.start_time  ?? '08:00',
            end_time:    r.end_time    ?? '16:00',
            is_closed:   r.is_closed,
            has_break:   r.has_break   ?? false,
            break_start: r.break_start ?? '12:00',
            break_end:   r.break_end   ?? '13:00',
          };
        }
        setRows(DAY_LABELS.map(d => map[d.key] ?? defaultRow(d.key)));
      }
    })
    .catch(() => setError('Impossible de charger les horaires.'))
    .finally(() => setLoading(false));
  }, [pId]);

  const update = (key: string, field: keyof DayRow, value: string | boolean) =>
    setRows(prev => prev.map(r => r.day_of_week === key ? { ...r, [field]: value } : r));

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await upsertSchedules(pId, rows);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-start justify-center pt-8 px-4">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8">
          <button onClick={() => navigate(-1)} className="text-sm text-blue-500 hover:underline mb-4 block">← Retour</button>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">✏ Horaires</h1>
          <p className="text-sm text-gray-400 mb-6">Définissez les horaires et pauses pour chaque jour</p>

          {error && <div className="mb-4 p-3 bg-red-50 rounded-xl text-sm text-red-600">{error}</div>}

          {loading ? <p className="text-gray-400 text-sm">Chargement...</p> : (
            <div className="space-y-2">
              {/* En-tête */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase px-2 mb-1">
                <span className="col-span-2">Jour</span>
                <span className="col-span-2">Début</span>
                <span className="col-span-2">Fin</span>
                <span className="col-span-1 text-center">Fermé</span>
                <span className="col-span-1 text-center">Pause</span>
                <span className="col-span-2">Début pause</span>
                <span className="col-span-2">Fin pause</span>
              </div>

              {rows.map(row => {
                const lbl = DAY_LABELS.find(d => d.key === row.day_of_week)?.label;
                return (
                  <div key={row.day_of_week}
                    className={`grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-xl border transition ${
                      row.is_closed ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'
                    }`}>

                    {/* Jour */}
                    <span className="col-span-2 text-sm font-medium text-gray-700">{lbl}</span>

                    {/* Début */}
                    <input type="time" value={row.start_time} disabled={row.is_closed}
                      onChange={e => update(row.day_of_week, 'start_time', e.target.value)}
                      className="col-span-2 border border-gray-200 rounded-lg px-2 py-1 text-sm disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300" />

                    {/* Fin */}
                    <input type="time" value={row.end_time} disabled={row.is_closed}
                      onChange={e => update(row.day_of_week, 'end_time', e.target.value)}
                      className="col-span-2 border border-gray-200 rounded-lg px-2 py-1 text-sm disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300" />

                    {/* Fermé */}
                    <label className="col-span-1 flex justify-center items-center cursor-pointer">
                      <input type="checkbox" checked={row.is_closed}
                        onChange={e => update(row.day_of_week, 'is_closed', e.target.checked)}
                        className="w-4 h-4 accent-red-500" />
                    </label>

                    {/* Pause activée */}
                    <label className="col-span-1 flex justify-center items-center cursor-pointer">
                      <input type="checkbox" checked={row.has_break}
                        disabled={row.is_closed}
                        onChange={e => update(row.day_of_week, 'has_break', e.target.checked)}
                        className="w-4 h-4 accent-orange-500" />
                    </label>

                    {/* Début pause */}
                    <input type="time" value={row.break_start}
                      disabled={row.is_closed || !row.has_break}
                      onChange={e => update(row.day_of_week, 'break_start', e.target.value)}
                      className="col-span-2 border border-gray-200 rounded-lg px-2 py-1 text-sm disabled:bg-gray-100 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-orange-300" />

                    {/* Fin pause */}
                    <input type="time" value={row.break_end}
                      disabled={row.is_closed || !row.has_break}
                      onChange={e => update(row.day_of_week, 'break_end', e.target.value)}
                      className="col-span-2 border border-gray-200 rounded-lg px-2 py-1 text-sm disabled:bg-gray-100 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 mt-8">
            <button onClick={() => navigate(-1)}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm">
              {saving ? 'Enregistrement...' : saved ? '✅ Enregistré !' : '💾 Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}