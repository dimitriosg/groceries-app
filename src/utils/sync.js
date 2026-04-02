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

  // Check for redirect first
  const { data: redirect } = await supabase
    .from('household_redirects')
    .select('new_id')
    .eq('old_id', id)
    .maybeSingle()

  const resolvedId = redirect?.new_id ?? id

  if (resolvedId !== id) {
    localStorage.setItem('household_id_v1', resolvedId)
  }

  const [{ data: p }, { data: s }] = await Promise.all([
    supabase.from('pantry').select('data').eq('id', resolvedId).single(),
    supabase.from('shopping_list').select('data').eq('id', resolvedId).single(),
  ])

  return {
    pantry: p?.data || null,
    shoppingList: s?.data || null,
    resolvedId,
  }
}

export async function registerMember(householdId, deviceId, role) {
  try {
    const { data: existing } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId)
      .eq('device_id', deviceId)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('household_members')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', existing.id)
      return existing
    }

    const { data: members } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)

    const assignedRole = (!members || members.length === 0) ? 'admin_1' : (role || 'common')
    const displayName = assignedRole === 'admin_1' ? 'Admin #1' : 'Common User'

    const newMember = {
      id: crypto.randomUUID(),
      household_id: householdId,
      device_id: deviceId,
      role: assignedRole,
      display_name: displayName,
      joined_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    }

    await supabase.from('household_members').insert(newMember)
    return newMember
  } catch {
    return null
  }
}

export async function fetchMembers(householdId) {
  try {
    const { data } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId)
      .order('joined_at', { ascending: true })
    return data || []
  } catch {
    return []
  }
}

export async function promoteToAdmin(memberId, householdId) {
  try {
    const { data: members } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', householdId)

    const adminCount = (members || []).filter(m => m.role.startsWith('admin')).length
    const newRole = `admin_${adminCount + 1}`
    const newName = `Admin #${adminCount + 1}`

    await supabase
      .from('household_members')
      .update({ role: newRole, display_name: newName })
      .eq('id', memberId)

    return { role: newRole, display_name: newName }
  } catch {
    return null
  }
}

export async function leaveHousehold(myMember, householdId) {
  try {
    // Remove this device's member row
    await supabase.from('household_members').delete().eq('id', myMember.id)

    // If I was admin_1, promote next admin or earliest member
    if (myMember.role === 'admin_1') {
      const { data: remaining } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', householdId)
        .order('joined_at', { ascending: true })

      if (remaining && remaining.length > 0) {
        const nextAdmin = remaining.find(m => m.role.startsWith('admin')) || remaining[0]
        await supabase
          .from('household_members')
          .update({ role: 'admin_1', display_name: 'Admin #1' })
          .eq('id', nextAdmin.id)
      }
    }
  } catch {
    // Fail silently
  }
}

export async function changeHouseholdId(oldId, newId, pantry, shoppingList) {
  // 1. Check uniqueness
  const { data: existing } = await supabase
    .from('pantry')
    .select('id')
    .eq('id', newId)
    .maybeSingle()

  if (existing) throw new Error('ID_IN_USE')

  const timestamp = new Date().toISOString()

  // 2. Write redirect
  await supabase.from('household_redirects').upsert(
    { old_id: oldId, new_id: newId, created_at: timestamp },
    { onConflict: 'old_id' }
  )

  // 3. Copy pantry and shopping_list to new ID
  await supabase.from('pantry').upsert(
    { id: newId, user_id: newId, data: pantry, updated_at: timestamp },
    { onConflict: 'id' }
  )
  await supabase.from('shopping_list').upsert(
    { id: newId, user_id: newId, data: shoppingList, updated_at: timestamp },
    { onConflict: 'id' }
  )

  // 4. Update all household_members rows to new household_id
  await supabase
    .from('household_members')
    .update({ household_id: newId })
    .eq('household_id', oldId)

  // 5. Update localStorage
  localStorage.setItem('household_id_v1', newId)
}
