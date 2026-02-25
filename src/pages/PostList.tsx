import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPosts, createPost, deletePost } from '../lib/Api.ts';
import type { Post } from '../lib/Api.ts';
import Layout from '../components/Layout.tsx';

export default function PostList() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const devId = Number(deviceId);

  const [posts, setPosts]     = useState<Post[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const deviceName = sessionStorage.getItem('deviceName') ?? 'Dispositif';

  useEffect(() => {
    getPosts(devId)
      .then(setPosts)
      .catch(() => setError('Impossible de charger les postes.'))
      .finally(() => setLoading(false));
  }, [devId]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const p = await createPost(devId, name);
      setPosts(prev => [...prev, p]);
      setNewName('');
    } catch {
      setError('Erreur lors de la création du poste.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce poste et ses horaires ?')) return;
    try {
      await deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  return (
    <Layout>
      <div className="flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <button onClick={() => navigate('/')}
            className="text-sm text-blue-500 hover:underline mb-4 block">← Retour</button>

          <h1 className="text-2xl font-bold text-gray-800 mb-1">Postes</h1>
          <p className="text-sm text-gray-400 mb-6">{deviceName}</p>

          {error && <div className="mb-4 p-3 bg-red-50 rounded-xl text-sm text-red-600">{error}</div>}

          {loading ? (
            <p className="text-gray-400 text-sm">Chargement...</p>
          ) : posts.length === 0 ? (
            <p className="text-gray-400 text-sm mb-4">Aucun poste. Créez-en un ci-dessous.</p>
          ) : (
            <ul className="mb-6 space-y-2">
              {posts.map(p => (
                <li key={p.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50">
                  <span className="font-medium text-sm">{p.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/post/${p.id}/schedule`)}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                      ✏ Horaires
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="px-3 py-1 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 mb-6">
            <input type="text" placeholder="Nom du poste"
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium">
              + Ajouter
            </button>
          </div>

          <button onClick={() => navigate(`/device/${devId}/results`)}
            disabled={posts.length === 0}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-40 transition">
            Calculer les heures →
          </button>
        </div>
      </div>
    </Layout>
  );
}