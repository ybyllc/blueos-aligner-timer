import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../watchface/src/watch300102/index.ux', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^\s*import .+ from .+$/gm, '')
  .replace('export default', 'globalThis.component =')
let now = new Date(2026, 10, 4, 23, 59, 30, 500).getTime()
let nextTimer = 0
const timers = new Map()
const routes = []
const messages = []
const context = vm.createContext({
  Date: class extends Date {
    constructor() { super(now) }
  },
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
assert.equal([...timers.values()][0].delay, 29520)
now = new Date(2026, 10, 5, 0, 0, 0, 20).getTime()
;[...timers.values()][0].callback()
assert.equal(face.clock, '00:00')
assert.equal(face.dateLabel, '11月5日  周四')
face.onHide()
assert.equal(timers.size, 0)
face.onShow()
assert.equal(timers.size, 1)
face.onDestroy()
assert.equal(timers.size, 0)
const timerManifest = JSON.parse(fs.readFileSync(new URL('../src/manifest.json', import.meta.url), 'utf8'))
face.openTimer()
assert.equal(routes[0], `hap://app/${timerManifest.package}/${timerManifest.router.entry}`)
context.router.push = () => { throw new Error('App missing') }
face.openTimer()
assert.equal(messages[0], '请先安装牙套计时器')
assert.equal(face.launching, false)
console.log('通过：表盘时间、跨午夜日期、前台单个计时任务、隐藏销毁清理、牙套应用跳转与失败提示')
