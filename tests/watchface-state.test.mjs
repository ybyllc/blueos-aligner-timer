import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../src/watchface-state.js', import.meta.url), 'utf8')
const { STATUS_KEY, statusSnapshot, readWatchfaceStatus } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const start = new Date(2026, 10, 4, 10).getTime()
const state = { wearing: true, elapsed: 7200000, since: start, target: 20, removedAt: 0,
  history: [{ day: 'private' }], deadline: 42 }
const snapshot = statusSnapshot(state)
assert.equal(JSON.parse(snapshot).history, undefined)
assert.equal(JSON.parse(snapshot).deadline, undefined)
const wearing = readWatchfaceStatus(snapshot, start + 60000)
assert.equal(wearing.time, '02:01:00')
assert.equal(wearing.percent, 7260000 / 72000000 * 100)
const removed = statusSnapshot({ ...state, wearing: false, removedAt: start - 300000 })
assert.equal(readWatchfaceStatus(removed, start + 60000).time, '00:06:00')
assert.equal(readWatchfaceStatus(removed, start + 3600000).percent, 10)
const beforeMidnight = new Date(2026, 10, 4, 23, 50).getTime()
const afterMidnight = new Date(2026, 10, 5, 0, 5).getTime()
assert.equal(readWatchfaceStatus(statusSnapshot({ ...state, since: beforeMidnight }), afterMidnight).time, '00:05:00')
const removedOvernight = readWatchfaceStatus(statusSnapshot({ ...state, wearing: false, since: beforeMidnight,
  removedAt: beforeMidnight }), afterMidnight)
assert.equal(removedOvernight.percent, 0)
assert.equal(removedOvernight.time, '00:15:00')
assert.equal(readWatchfaceStatus(snapshot, start - 1), null)
assert.equal(readWatchfaceStatus('broken', start), null)
assert.equal(readWatchfaceStatus(null, start), null)
assert.equal(readWatchfaceStatus(statusSnapshot({ ...state, target: 0 }), start), null)
assert.equal(readWatchfaceStatus(statusSnapshot({ ...state, elapsed: 100000000 }), start).percent, 100)
const page = fs.readFileSync(new URL('../src/pages/Demo/index.ux', import.meta.url), 'utf8')
const script = page.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^\s*import .+ from .+$/gm, '').replace('export default', 'globalThis.component =')
const writes = []
const context = vm.createContext({ STATUS_KEY, statusSnapshot,
  exchange: { set(options) { writes.push(options) } }, console })
vm.runInContext(script, context)
const app = context.component
app.state = { ...state }
app.publishStatus()
app.state.target = 21
app.publishStatus()
app.state.target = 22
app.publishStatus()
assert.equal(writes.length, 1)
writes[0].success()
assert.equal(writes.length, 2)
assert.equal(JSON.parse(writes[1].value).target, 22)
assert.equal(writes[1].scope, 'vendor')
writes[1].success()
assert.equal(app.sharing, false)
console.log('通过：共享最小状态、实时累计、摘下进度冻结、跨午夜、无效数据、上限与共享写入顺序')
