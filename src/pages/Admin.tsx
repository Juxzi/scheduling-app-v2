import { useEffect, useState } from 'react';
import { getAllUsers, createUser, deleteUser } from '../lib/auth.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { supabase } from '../lib/supabase.ts';
import Layout from '../components/Layout.tsx';

interface Profile {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  created_at: string;
}

export default function Admin() {
  const { profile } = useAuth();

  const [users, setUsers]       = useState<Profile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass]   = useState('');
  const [newName, setNewName]   = useState('');
  const [creating, setCreating] = useState(false);
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    getAllUsers()
      .then(setUsers)
      .catch(() => setError('Impossible de charger les utilisateurs.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newEmail || !newPass) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      // Debug : vérifier que le token est bien présent
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session token:', session?.access_token?.slice(0, 20));
      if (!session) throw new Error('Session expirée, reconnectez-vous.');

      await createUser(newEmail, newPass, newName);
      const updated = await getAllUsers();
      setUsers(updated);
      setNewEmail(''); setNewPass(''); setNewName('');
      setSuccess('Utilisateur créé avec succès !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (userId === profile?.id) { setError('Impossible de supprimer votre propre compte.'); return; }
    if (!confirm(`Supprimer l'utilisateur ${email} ?`)) return;
    try {
      await deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Administration</h1>
        <p className="text-sm text-gray-400 mb-8">Gestion des utilisateurs</p>

        {error   && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600">{success}</div>}

        {/* Créer un utilisateur */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Créer un utilisateur</h2>
          <div className="space-y-3">
            <input type="text" placeholder="Nom complet"
              value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <input type="email" placeholder="Email"
              value={newEmail} onChange={e => setNewEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <input type="password" placeholder="Mot de passe"
              value={newPass} onChange={e => setNewPass(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <button onClick={handleCreate} disabled={creating || !newEmail || !newPass}
              className="w-full py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition text-sm">
              {creating ? 'Création...' : '+ Créer l\'utilisateur'}
            </button>
          </div>
        </div>

        {/* Liste utilisateurs */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Utilisateurs ({users.length})
          </h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Chargement...</p>
          ) : (
            <ul className="space-y-2">
              {users.map(u => (
                <li key={u.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                    }`}>{u.role}</span>
                    {u.id !== profile?.id && (
                      <button onClick={() => handleDelete(u.id, u.email)}
                        className="px-3 py-1 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                        🗑
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}