import { supabase, getOrCreateHouseholdId } from './supabase.js'

export async function pushToSupabase(householdId, pantry, shoppingList) {
  const timestamp = new Date().toISOString()

  await supabase.from('pantry').upsert(
    { id: householdId, user_id: householdId, data: pantry, updated_at: timestamp },
    { onConflict: 'id' }
  )

  await supabase.from('shopping_list').upsert(
    { id: householdId, user_id: householdId, data: shoppingList, updated_at: timestamp },
    { onConflict: 'id' }
  )
}

export async function pullFromSupabase(householdId) {
  const id = householdId ?? getOrCreateHouseholdId()
  const [{ data: p }, { data: s }] = await Promise.all([
    supabase.from('pantry').select('data').eq('id', id).single(),
    supabase.from('shopping_list').select('data').eq('id', id).single(),
  ])
  return {
    pantry: p?.data || null,
    shoppingList: s?.data || null,
  }
}
