import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDevices, createDevice, deleteDevice } from '../lib/Api.ts';
import type { Device } from '../lib/Api.ts';
import Layout from '../components/Layout.tsx';

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
      if (selectedId === id) setSelectedId(devices.find(d => d.id !== id)?.id ?? null);
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  const handleGo = () => {
    if (!selectedId) return;
    const device = devices.find(d => d.id === selectedId);
    sessionStorage.setItem('startDate', startDate);
    sessionStorage.setItem('endDate', endDate);
    sessionStorage.setItem('deviceName', device?.name ?? '');
    navigate(`/device/${selectedId}/posts`);
  };

  return (
    <Layout>
      <div className="flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Nouveau calcul</h1>

          {error && <div className="mb-4 p-3 bg-red-50 rounded-xl text-sm text-red-600">{error}</div>}

          {/* Sélection dispositif */}
          <label className="block text-sm font-semibold text-gray-600 mb-2">Dispositif</label>
          {loading ? (
            <p className="text-gray-400 mb-4 text-sm">Chargement...</p>
          ) : (
            <div className="flex gap-2 mb-3">
              <select
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={selectedId ?? ''}
                onChange={e => setSelectedId(Number(e.target.value))}
              >
                {devices.length === 0 && <option value="">— Aucun dispositif —</option>}
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {selectedId && (
                <button onClick={() => handleDelete(selectedId)}
                  className="px-3 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 text-sm">🗑</button>
              )}
            </div>
          )}

          {/* Créer un dispositif */}
          <div className="flex gap-2 mb-8">
            <input type="text" placeholder="Nouveau dispositif..."
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium">
              + Créer
            </button>
          </div>

          {/* Plage de dates */}
          <label className="block text-sm font-semibold text-gray-600 mb-2">Période</label>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div>
              <p className="text-xs text-gray-400 mb-1">Du</p>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Au</p>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          <button onClick={handleGo} disabled={!selectedId}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-40 transition">
            Gérer les postes →
          </button>
        </div>
      </div>
    </Layout>
  );
}