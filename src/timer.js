export function freshState(now) {
  return { day: dayKey(now), elapsed: 0, wearing: false, since: now,
    target: 20, minutes: 30, deadline: 0, job: -1, removedAt: 0,
    tray: 1, total: 0, cycle: 7, changedAt: 0, history: [] }
}
function dayKey(now) {
  const d = new Date(now)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
export function advance(state, now) {
  if (!Array.isArray(state.history)) state.history = []
  if (now < state.since) return state
  while (state.day !== dayKey(now)) {
    const d = new Date(state.since)
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
    if (state.wearing) state.elapsed += Math.max(0, midnight - state.since)
    const record = { day: state.day, elapsed: state.elapsed, target: state.target }
    const index = state.history.findIndex(item => item.day === record.day)
    if (index >= 0) state.history[index] = record
    else state.history.push(record)
    state.elapsed = 0
    state.since = midnight
    state.day = dayKey(midnight)
  }
  if (state.wearing) state.elapsed += now - state.since
  state.since = now
  return state
}
export function restore(raw, now) {
  try {
    const s = JSON.parse(raw)
    if (!s || typeof s.wearing !== 'boolean' || !Number.isFinite(s.elapsed) || s.elapsed < 0 ||
      !Number.isFinite(s.since) || !Number.isFinite(s.deadline) || !Number.isInteger(s.job) ||
      !Number.isInteger(s.target) || s.target < 1 || s.target > 24 || ![15, 30, 45, 60].includes(s.minutes)) return freshState(now)
    s.day = dayKey(s.since)
    s.history = Array.isArray(s.history) ? s.history.filter(item => item &&
      typeof item.day === 'string' && /^\d{4}-\d{1,2}-\d{1,2}$/.test(item.day) &&
      Number.isFinite(item.elapsed) && item.elapsed >= 0 &&
      Number.isInteger(item.target) && item.target >= 1 && item.target <= 24) : []
    s.removedAt = Number.isFinite(s.removedAt) && s.removedAt > 0 ? s.removedAt :
      (!s.wearing && s.deadline > 0 ? s.deadline - s.minutes * 60000 : 0)
    s.tray = Number.isInteger(s.tray) && s.tray > 0 ? s.tray : 1
    s.total = Number.isInteger(s.total) && s.total >= s.tray ? s.total : 0
    s.cycle = Number.isInteger(s.cycle) && s.cycle >= 1 && s.cycle <= 30 ? s.cycle : 7
    s.changedAt = Number.isFinite(s.changedAt) && s.changedAt > 0 ? s.changedAt : 0
    return advance(s, now)
  } catch (error) { return freshState(now) }
}
export function dailyRecords(state) {
  const today = { day: state.day, elapsed: state.elapsed, target: state.target }
  return [today].concat((state.history || []).filter(item => item.day !== state.day).slice().reverse())
    .map((item, index) => {
      const minutes = Math.floor(item.elapsed / 60000)
      const reached = item.elapsed >= item.target * 3600000
      return { day: item.day, date: index === 0 ? '今天' : item.day.replace(/-/g, '/'),
        time: `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`,
        goal: `目标 ${item.target} 小时`,
        status: reached ? '已达标' : (index === 0 ? '进行中' : '未达标'), reached }
    })
}
export function planInfo(s, now) {
  if (!s.total || !s.changedAt) return { next: '点此设置疗程', end: '疗程未设置' }
  const day = value => { const d = new Date(value); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) }
  const used = Math.max(0, Math.floor((day(now) - day(s.changedAt)) / 86400000))
  const left = Math.max(0, s.cycle - used)
  return { next: left ? `还剩 ${left} 天换套` : '已到换套日',
    end: `${Math.max(0, (s.total - s.tray) * s.cycle + s.cycle - used)} 天结束` }
}
export function duration(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1000)
  const pad = n => (`0${n}`).slice(-2)
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`
}
