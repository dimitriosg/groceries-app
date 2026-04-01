const supported = typeof window !== 'undefined' && 'Notification' in window

export function requestPermission() {
  if (!supported) return
  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function checkPantryAlerts(pantry) {
  const now = new Date()
  const expiring = []
  const lowStock = []

  pantry.forEach(item => {
    if (item.expiryDate) {
      const days = (new Date(item.expiryDate) - now) / (1000 * 60 * 60 * 24)
      if (days >= 0 && days <= 3) {
        const label = days < 1 ? 'today' : days < 2 ? 'tomorrow' : `in ${Math.ceil(days)} days`
        expiring.push(`${item.name} expires ${label}`)
      }
    }
    if (item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold) {
      lowStock.push(`${item.name} running low`)
    }
  })

  return [...expiring, ...lowStock]
}

export function sendNotification(title, body) {
  if (!supported || Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
    })
  } catch {
    // Silently swallow — e.g. iOS Safari outside installed PWA context
  }
}
