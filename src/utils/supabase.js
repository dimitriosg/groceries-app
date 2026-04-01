/*
  Supabase setup — run this SQL in the Supabase SQL editor:

  CREATE TABLE pantry (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE shopping_list (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
*/

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function getOrCreateUserId() {
  const stored = localStorage.getItem('user_id_v1')
  if (stored) return stored
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  const userId = data.user.id
  localStorage.setItem('user_id_v1', userId)
  return userId
}
