/*
  Supabase setup — run this SQL in the Supabase SQL editor:

  -- Core data tables (existing)
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

  -- NEW: Household members table
  CREATE TABLE IF NOT EXISTS household_members (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'common',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW()
  );

  -- NEW: Household ID redirect table (for changing household ID)
  CREATE TABLE IF NOT EXISTS household_redirects (
    old_id TEXT PRIMARY KEY,
    new_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS members_household_idx
    ON household_members(household_id);

  ALTER TABLE household_members DISABLE ROW LEVEL SECURITY;
  ALTER TABLE household_redirects DISABLE ROW LEVEL SECURITY;

  -- Enable Realtime for all tables:
  -- Go to Supabase dashboard → Database → Replication and enable
  -- pantry, shopping_list, household_members, household_redirects
  -- OR run:
  ALTER PUBLICATION supabase_realtime ADD TABLE household_members;
  ALTER PUBLICATION supabase_realtime ADD TABLE household_redirects;
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

export function getOrCreateDeviceId() {
  const stored = localStorage.getItem('device_id_v1')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('device_id_v1', id)
  return id
}
