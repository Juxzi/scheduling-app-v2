import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSchedules, upsertSchedules } from '../lib/Api';

const DAY_LABELS: { key: string; label: string }[] = [
  { key: 'monday',    label: 'Lundi' },
  { key: 'tuesday',   label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday',  label: 'Jeudi' },
  { key: 'friday',    label: 'Vendredi' },
  { key: 'saturday',  label: 'Samedi' },
  { key: 'sunday',    label: 'Dimanche' },
  { key: 'holiday',   label: '🎉 Jour férié' },
];

interface DayRow {
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_closed: boolean;
}

const defaultRow = (key: string): DayRow => ({
  day_of_week: key,
  start_time: '08:00',
  end_time: '16:00',
  is_closed: key === 'sunday' || key === 'saturday' || key === 'holiday',
});

export default function ScheduleEditor() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const pId = Number(postId);

  const [rows, setRows]       = useState<DayRow[]>(DAY_LABELS.map(d => defaultRow(d.key)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    getSchedules(pId)
      .then(data => {
        if (data.length > 0) {
          // Fusionner avec les defaults pour s'assurer que les 8 jours existent
          const map: Record<string, DayRow> = {};
          for (const r of data) {
            map[r.day_of_week] = {
              day_of_week: r.day_of_week,
              start_time: r.start_time ?? '08:00',
              end_time:   r.end_time   ?? '16:00',
              is_closed:  r.is_closed,
            };
          }
          setRows(DAY_LABELS.map(d => map[d.key] ?? defaultRow(d.key)));
        }
      })
      .catch(() => setError('Impossible de charger les horaires.'))
      .finally(() => setLoading(false));
  }, [pId]);

  const update = (key: string, field: keyof DayRow, value: string | boolean) => {
    setRows(prev =>
      prev.map(r => r.day_of_week === key ? { ...r, [field]: value } : r)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
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
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-blue-600 hover:underline mb-4 block"
      >← Retour</button>

      <h1 className="text-2xl font-bold mb-6">✏ Éditeur d'horaires</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : (
        <div className="space-y-3">
          {/* En-tête */}
          <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
            <span>Jour</span>
            <span>Début</span>
            <span>Fin</span>
            <span>Fermé</span>
          </div>

          {rows.map(row => {
            const label = DAY_LABELS.find(d => d.key === row.day_of_week)!.label;
            return (
              <div
                key={row.day_of_week}
                className={`grid grid-cols-4 gap-2 items-center px-3 py-2 rounded-lg border ${
                  row.is_closed ? 'bg-gray-50 opacity-60' : 'bg-white'
                }`}
              >
                <span className="font-medium text-sm">{label}</span>

                <input
                  type="time"
                  value={row.start_time}
                  disabled={row.is_closed}
                  onChange={e => update(row.day_of_week, 'start_time', e.target.value)}
                  className="border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                />
                <input
                  type="time"
                  value={row.end_time}
                  disabled={row.is_closed}
                  onChange={e => update(row.day_of_week, 'end_time', e.target.value)}
                  className="border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={row.is_closed}
                    onChange={e => update(row.day_of_week, 'is_closed', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-500">Fermé</span>
                </label>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <button
          onClick={() => navigate(-1)}
          className="flex-1 py-2 border rounded-xl text-gray-600 hover:bg-gray-50"
        >Annuler</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : saved ? '✅ Enregistré !' : '💾 Enregistrer'}
        </button>
      </div>
    </div>
  );
}