import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { signOut } from '../lib/auth.ts';

interface Props { children: React.ReactNode }

const NAV_ITEMS = [
  { path: '/',         label: 'Accueil',     icon: '🏠' },
  { path: '/history',  label: 'Historique',  icon: '📋' },
];

const ADMIN_ITEMS = [
  { path: '/admin',    label: 'Utilisateurs', icon: '👥' },
];

export default function Layout({ children }: Props) {
  const [open, setOpen] = useState(false);
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const goTo = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xl">📅</span>
          <span className="font-bold text-gray-800 text-sm">Calculateur d'heures</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-xl hover:bg-gray-100 transition"
        >
          {open ? (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Menu hamburger overlay */}
      {open && (
        <div className="fixed inset-0 z-20 flex" onClick={() => setOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Panel */}
          <div
            className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Profil */}
            <div className="p-6 border-b border-gray-100 bg-slate-50">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl mb-3">
                {isAdmin ? '👑' : '👤'}
              </div>
              <p className="font-semibold text-gray-800 text-sm">{profile?.full_name ?? 'Utilisateur'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{profile?.email}</p>
              <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                isAdmin ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {isAdmin ? 'Administrateur' : 'Utilisateur'}
              </span>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-4 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-2">Navigation</p>
              {NAV_ITEMS.map(item => (
                <button
                  key={item.path}
                  onClick={() => goTo(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              {isAdmin && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase px-3 mt-4 mb-2">Administration</p>
                  {ADMIN_ITEMS.map(item => (
                    <button
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                        isActive(item.path)
                          ? 'bg-purple-50 text-purple-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Déconnexion */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition"
              >
                <span>🚪</span>
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenu */}
      <main className="flex-1">
        {children}
      </main>

      <footer className="text-center py-4 text-xs text-gray-300">
        © Quentin Millancourt
      </footer>
    </div>
  );
}