import { supabase, getOrCreateUserId } from './supabase.js'

export async function pushToSupabase(pantry, shoppingList) {
  const userId = await getOrCreateUserId()
  await supabase.from('pantry').upsert({ id: userId, user_id: userId, data: pantry, updated_at: new Date().toISOString() })
  await supabase.from('shopping_list').upsert({ id: userId, user_id: userId, data: shoppingList, updated_at: new Date().toISOString() })
}

export async function pullFromSupabase() {
  const userId = await getOrCreateUserId()
  const [{ data: p }, { data: s }] = await Promise.all([
    supabase.from('pantry').select('data').eq('id', userId).single(),
    supabase.from('shopping_list').select('data').eq('id', userId).single(),
  ])
  return {
    pantry: p?.data || null,
    shoppingList: s?.data || null,
  }
}
