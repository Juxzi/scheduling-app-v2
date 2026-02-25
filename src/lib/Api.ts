import { supabase } from './supabase';

// ─── Types publics ────────────────────────────────────────────────────────────

export interface Device   { id: number; name: string; created_at: string }
export interface Post     { id: number; device_id: number; name: string }
export interface Schedule {
  id?: number;
  post_id: number;
  day_of_week: string;
  start_time: string | null;
  end_time: string | null;
  is_closed: boolean;
}
export interface Holiday  { id: number; date: string; label: string }

// ─── Devices ─────────────────────────────────────────────────────────────────

export async function getDevices(): Promise<Device[]> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createDevice(name: string): Promise<Device> {
  const { data, error } = await supabase
    .from('devices')
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDevice(id: number): Promise<void> {
  const { error } = await supabase.from('devices').delete().eq('id', id);
  if (error) throw error;
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function getPosts(deviceId: number): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('device_id', deviceId)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createPost(deviceId: number, name: string): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .insert({ device_id: deviceId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePost(id: number): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

// ─── Schedules ────────────────────────────────────────────────────────────────

export async function getSchedules(postId: number): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('post_id', postId);
  if (error) throw error;
  return data ?? [];
}

export async function upsertSchedules(postId: number, rows: Omit<Schedule, 'id' | 'post_id'>[]): Promise<void> {
  const { error } = await supabase
    .from('schedules')
    .upsert(
      rows.map(r => ({ ...r, post_id: postId })),
      { onConflict: 'post_id,day_of_week' }
    );
  if (error) throw error;
}

// ─── Holidays ────────────────────────────────────────────────────────────────

export async function getHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .order('date');
  if (error) throw error;
  return data ?? [];
}

// ─── Données combinées pour le calcul ────────────────────────────────────────

export async function getDataForCompute(deviceId: number) {
  const posts = await getPosts(deviceId);
  const postIds = posts.map(p => p.id);

  const { data: schedules, error: sErr } = await supabase
    .from('schedules')
    .select('*')
    .in('post_id', postIds.length > 0 ? postIds : [-1]);
  if (sErr) throw sErr;

  const holidays = await getHolidays();

  return {
    posts,
    schedules: schedules ?? [],
    holidays,
  };
}