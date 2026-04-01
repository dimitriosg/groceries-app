import { supabase } from './supabase.js'

// Anonymous sign-in — creates a persistent identity per device
// Returns the user_id string, or null on failure
export async function ensureUser() {
  if (!supabase) return null
  try {
    // Re-use existing session if present
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return session.user.id

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) return null
    return data.user?.id ?? null
  } catch {
    return null
  }
}

// Upsert pantry and shopping list rows for this user
export async function pushToSupabase(userId, pantry, shoppingList) {
  if (!supabase || !userId) return
  try {
    await Promise.all([
      supabase.from('pantry').upsert({
        id: userId,
        user_id: userId,
        data: pantry,
        updated_at: new Date().toISOString(),
      }),
      supabase.from('shopping_list').upsert({
        id: userId,
        user_id: userId,
        data: shoppingList,
        updated_at: new Date().toISOString(),
      }),
    ])
  } catch {
    // Fail silently — localStorage remains source of truth offline
  }
}

// Fetch latest data for this user
// Returns { pantry, shoppingList } or null if unavailable
export async function pullFromSupabase(userId) {
  if (!supabase || !userId) return null
  try {
    const [{ data: pantryRow }, { data: shoppingRow }] = await Promise.all([
      supabase.from('pantry').select('data, updated_at').eq('id', userId).maybeSingle(),
      supabase.from('shopping_list').select('data, updated_at').eq('id', userId).maybeSingle(),
    ])
    if (!pantryRow && !shoppingRow) return null
    return {
      pantry: pantryRow?.data ?? null,
      shoppingList: shoppingRow?.data ?? null,
    }
  } catch {
    return null
  }
}
