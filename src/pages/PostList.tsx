import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPosts, createPost, deletePost } from '../lib/Api.ts';
import type { Post } from '../lib/Api.ts';

export default function PostList() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const devId = Number(deviceId);

  const [posts, setPosts]     = useState<Post[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

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
    <div className="max-w-lg mx-auto mt-16 p-6 bg-white rounded-2xl shadow">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-blue-600 hover:underline mb-4 block"
      >← Retour</button>

      <h1 className="text-2xl font-bold mb-6">Postes</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-400 mb-4">Aucun poste. Créez-en un ci-dessous.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {posts.map(p => (
            <li key={p.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
              <span className="font-medium">{p.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/post/${p.id}/schedule`)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >✏ Horaires</button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                >🗑</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Ajouter un poste */}
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Nom du poste"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >+ Ajouter</button>
      </div>

      <button
        onClick={() => navigate(`/device/${devId}/results`)}
        disabled={posts.length === 0}
        className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-40"
      >
        Calculer les heures →
      </button>
    </div>
  );
}