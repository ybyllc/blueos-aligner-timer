import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const sharedSource = fs.readFileSync(new URL('../src/watchface-state.js', import.meta.url), 'utf8')
const { STATUS_KEY, readWatchfaceStatus, statusSnapshot } = await import(`data:text/javascript;base64,${Buffer.from(sharedSource).toString('base64')}`)
const source = fs.readFileSync(new URL('../watchface/src/watch300102/index.ux', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^\s*import .+ from .+$/gm, '')
  .replace('export default', 'globalThis.component =')
let now = new Date(2026, 10, 4, 23, 59, 30, 500).getTime()
let nextTimer = 0
const timers = new Map()
const routes = []
const messages = []
const reads = []
const context = vm.createContext({
  Date: class extends Date {
    constructor() { super(now) }
    static now() { return now }
  },
  STATUS_KEY,
  readWatchfaceStatus,
  exchange: { get(options) { reads.push(options) } },
  setTimeout(callback, delay) {
    const id = ++nextTimer
    timers.set(id, { callback, delay })
    return id
  },
  clearTimeout(id) { timers.delete(id) },
  router: { push(options) { routes.push(options.uri) } },
  prompt: { showToast(options) { messages.push(options.message) } },
})
vm.runInContext(script, context)
const face = context.component
Object.assign(face, face.data)
face.onInit()
assert.equal(face.clock, '23:59')
assert.equal(face.dateLabel, '11月4日  周三')
face.onReady()
face.onShow()
assert.equal(timers.size, 1)
assert.equal([...timers.values()][0].delay, 520)
assert.equal(face.wearLabel, '点此同步')
const snapshot = statusSnapshot({ wearing: true, elapsed: 3600000, since: now, target: 20, removedAt: 0 })
reads.at(-1).success({ value: snapshot })
assert.equal(face.wearLabel, '佩戴中')
assert.equal(face.wearTime, '01:00:00')
assert.equal(face.wearPercent, 5)
assert.equal(reads.at(-1).scope, 'vendor')
reads[0].success({ value: null })
assert.equal(face.wearTime, '01:00:00', '较旧请求不能覆盖新状态')
now = new Date(2026, 10, 5, 0, 0, 0, 20).getTime()
const [firedId, firedTimer] = [...timers.entries()][0]
timers.delete(firedId)
firedTimer.callback()
assert.equal(face.clock, '00:00')
assert.equal(face.dateLabel, '11月5日  周四')
assert.equal(face.wearTime, '00:00:00')
assert.ok(face.wearPercent < 0.001)
face.onHide()
assert.equal(timers.size, 0)
const lastTime = face.wearTime
reads.at(-1).success({ value: null })
assert.equal(face.wearTime, lastTime, '隐藏后忽略延迟返回的数据')
face.onShow()
assert.equal(timers.size, 1)
reads.at(-1).success({ value: statusSnapshot({ wearing: false, elapsed: 1800000, since: now,
  target: 20, removedAt: now - 120000 }) })
assert.equal(face.wearLabel, '已摘下')
assert.equal(face.wearTime, '00:02:00')
assert.equal(face.ringColor, '#f05252')
reads.at(-1).fail()
assert.equal(face.wearLabel, '点此同步')
assert.equal(face.wearTime, '--:--:--')
face.onDestroy()
assert.equal(timers.size, 0)
const timerManifest = JSON.parse(fs.readFileSync(new URL('../src/manifest.json', import.meta.url), 'utf8'))
face.openTimer()
assert.equal(routes[0], `hap://app/${timerManifest.package}/${timerManifest.router.entry}`)
context.router.push = () => { throw new Error('App missing') }
face.openTimer()
assert.equal(messages[0], '请先安装牙套计时器')
assert.equal(face.launching, false)
console.log('通过：表盘时钟、跨天佩戴状态、摘下计时、缺失数据提示、延迟回调隔离、单个前台刷新任务、应用跳转')
