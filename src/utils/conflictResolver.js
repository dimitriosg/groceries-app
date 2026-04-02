export function resolveConflicts(localItems, remoteItems) {
  const result = []
  const conflicts = []
  const remoteMap = Object.fromEntries(remoteItems.map(i => [i.id, i]))
  const localMap = Object.fromEntries(localItems.map(i => [i.id, i]))

  const allIds = new Set([
    ...localItems.map(i => i.id),
    ...remoteItems.map(i => i.id),
  ])

  for (const id of allIds) {
    const local = localMap[id]
    const remote = remoteMap[id]

    if (!local) { result.push(remote); continue }
    if (!remote) { result.push(local); continue }

    const localTime = new Date(local.lastUpdatedAt || 0)
    const remoteTime = new Date(remote.lastUpdatedAt || 0)
    const diff = Math.abs(localTime - remoteTime)

    if (diff < 10000 && local.lastUpdatedAt !== remote.lastUpdatedAt) {
      conflicts.push({ id, local, remote })
    } else {
      result.push(localTime >= remoteTime ? local : remote)
    }
  }

  return { merged: result, conflicts }
}
