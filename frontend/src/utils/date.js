export function formatTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function formatDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

export function groupConversationsByDate(conversations = []) {
  const groups = new Map()
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOf7 = new Date(startOfToday)
  startOf7.setDate(startOf7.getDate() - 7)
  const startOf30 = new Date(startOfToday)
  startOf30.setDate(startOf30.getDate() - 30)

  const labelFor = (iso) => {
    const d = iso ? new Date(iso) : new Date(0)
    if (d >= startOfToday) return 'Today'
    if (d >= startOfYesterday) return 'Yesterday'
    if (d >= startOf7) return 'Previous 7 days'
    if (d >= startOf30) return 'Previous 30 days'
    return 'Older'
  }

  const order = ['Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Older']
  for (const c of conversations) {
    const label = labelFor(c.updated_at || c.created_at)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(c)
  }

  return order.filter((l) => groups.has(l)).map((label) => ({ label, items: groups.get(label) }))
}
