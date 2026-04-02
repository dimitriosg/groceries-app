/*
  Supabase setup — run this SQL in the Supabase SQL editor:

  CREATE TABLE IF NOT EXISTS pantry (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS shopping_list (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Disable RLS (household ID acts as the shared secret access token)
  ALTER TABLE pantry DISABLE ROW LEVEL SECURITY;
  ALTER TABLE shopping_list DISABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Users can manage their own pantry" ON pantry;
  DROP POLICY IF EXISTS "Users can manage their own shopping list" ON shopping_list;

  -- Enable Realtime:
  -- Go to Supabase dashboard → Database → Replication
  -- Enable replication for both the "pantry" and "shopping_list" tables.
*/

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

export function getOrCreateHouseholdId() {
  const stored = localStorage.getItem('household_id_v1')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('household_id_v1', id)
  return id
}
