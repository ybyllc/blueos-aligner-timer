export const STATUS_KEY = 'com.personal.alignertimer.status.v1'

export function statusSnapshot(state) {
  return JSON.stringify({ version: 1, wearing: state.wearing, elapsed: state.elapsed,
    since: state.since, target: state.target, removedAt: state.removedAt })
}

export function readWatchfaceStatus(raw, now) {
  try {
    const state = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!state || state.version !== 1 || typeof state.wearing !== 'boolean' ||
      !Number.isFinite(state.elapsed) || state.elapsed < 0 ||
      !Number.isFinite(state.since) || state.since < 0 || state.since > now ||
      !Number.isInteger(state.target) || state.target < 1 || state.target > 24 ||
      !Number.isFinite(state.removedAt) || state.removedAt < 0 || state.removedAt > now) return null
    const today = new Date(now)
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const elapsed = state.since < midnight ? (state.wearing ? now - midnight : 0) :
      state.elapsed + (state.wearing ? now - state.since : 0)
    const time = state.wearing ? elapsed : (state.removedAt ? now - state.removedAt : 0)
    const seconds = Math.floor(Math.max(0, time) / 1000)
    const pad = value => String(value).padStart(2, '0')
    return { wearing: state.wearing, percent: Math.min(100, elapsed / (state.target * 3600000) * 100),
      time: `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}` }
  } catch (error) { return null }
}
