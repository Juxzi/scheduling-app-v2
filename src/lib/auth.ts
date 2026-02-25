import { supabase } from './supabase.ts';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createUser(email: string, password: string, fullName: string) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) throw new Error('Non connecté');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'x-client-info': 'scheduling-app',
      },
      body: JSON.stringify({ email, password, full_name: fullName }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erreur création utilisateur');
  return data;
}

export async function deleteUser(userId: string) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) throw new Error('Non connecté');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'x-client-info': 'scheduling-app',
      },
      body: JSON.stringify({ user_id: userId }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erreur suppression utilisateur');
  return data;
}