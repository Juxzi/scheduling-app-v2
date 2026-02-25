import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDevices, createDevice, deleteDevice } from '../lib/Api.ts';
import type { Device } from '../lib/Api.ts';

export default function Home() {
  const navigate = useNavigate();

  const [devices, setDevices]       = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [startDate, setStartDate]   = useState('2025-01-01');
  const [endDate, setEndDate]       = useState('2025-12-31');
  const [newName, setNewName]       = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    getDevices()
      .then(data => {
        setDevices(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(() => setError('Impossible de charger les dispositifs.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const d = await createDevice(name);
      setDevices(prev => [...prev, d]);
      setSelectedId(d.id);
      setNewName('');
    } catch {
      setError('Erreur lors de la création.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce dispositif et tous ses postes ?')) return;
    try {
      await deleteDevice(id);
      setDevices(prev => prev.filter(d => d.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  const handleGo = () => {
    if (!selectedId) return;
    sessionStorage.setItem('startDate', startDate);
    sessionStorage.setItem('endDate', endDate);
    navigate(`/device/${selectedId}/posts`);
  };

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 bg-white rounded-2xl shadow">
      <h1 className="text-2xl font-bold mb-6">📅 Calculateur d'heures</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Sélection dispositif */}
      <label className="block text-sm font-medium mb-1">Dispositif</label>
      {loading ? (
        <p className="text-gray-400 mb-4">Chargement...</p>
      ) : (
        <div className="flex gap-2 mb-4">
          <select
            className="flex-1 border rounded-lg px-3 py-2"
            value={selectedId ?? ''}
            onChange={e => setSelectedId(Number(e.target.value))}
          >
            {devices.length === 0 && <option value="">— Aucun dispositif —</option>}
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {selectedId && (
            <button
              onClick={() => handleDelete(selectedId)}
              className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
            >🗑</button>
          )}
        </div>
      )}

      {/* Créer un dispositif */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nom du nouveau dispositif"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >+ Créer</button>
      </div>

      {/* Plage de dates */}
      <label className="block text-sm font-medium mb-1">Période</label>
      <div className="flex gap-3 mb-8">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">Du</p>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">Au</p>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <button
        onClick={handleGo}
        disabled={!selectedId}
        className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-40"
      >
        Gérer les postes →
      </button>
    </div>
  );
}