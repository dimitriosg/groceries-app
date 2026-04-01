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

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Returns null when env vars are not configured — all sync calls must guard for this
export const supabase = url && key ? createClient(url, key) : null
