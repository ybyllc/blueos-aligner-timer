import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const source = readFileSync(new URL('../src/timer.js', import.meta.url), 'utf8')
const { freshState, advance, restore, duration, planInfo, dailyRecords } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const start = new Date(2026, 10, 4, 23, 50).getTime()
const state = freshState(start)
state.wearing = true
advance(state, start + 5 * 60000)
assert.equal(state.elapsed, 5 * 60000)
const resumed = restore(JSON.stringify(state), start + 8 * 60000)
assert.equal(resumed.elapsed, 8 * 60000)
advance(resumed, start + 20 * 60000)
assert.equal(resumed.elapsed, 10 * 60000, '跨天仅累计当天佩戴时间')
assert.equal(resumed.history.length, 1)
assert.equal(resumed.history[0].elapsed, 10 * 60000, '跨天保存前一天最后一段佩戴时间')
resumed.wearing = false
advance(resumed, start + 30 * 60000)
assert.equal(resumed.elapsed, 10 * 60000, '摘下不计时')
advance(resumed, start + 2 * 86400000)
assert.equal(resumed.elapsed, 0)
assert.equal(restore('broken', start).wearing, false)
assert.equal(restore('{}', start).target, 20)
assert.equal(duration(3661000), '01:01:01')
assert.equal(planInfo(freshState(start), start).end, '疗程未设置')
const plan = { ...freshState(start), tray: 19, total: 41, cycle: 7, changedAt: start }
assert.equal(planInfo(plan, start + 2 * 86400000).next, '还剩 5 天换套')
assert.equal(planInfo(plan, start + 2 * 86400000).end, '159 天结束')
assert.equal(planInfo(plan, start + 8 * 86400000).next, '已到换套日')
const legacy = freshState(start)
delete legacy.tray
delete legacy.total
delete legacy.cycle
delete legacy.changedAt
assert.equal(restore(JSON.stringify(legacy), start).total, 0)
const removed = { ...freshState(start), removedAt: start, deadline: start + 1800000 }
assert.equal(restore(JSON.stringify(removed), start + 11000).removedAt, start)
assert.equal(restore(JSON.stringify({ ...removed, target: 24 }), start).target, 24)
assert.equal(restore(JSON.stringify({ ...removed, target: 25 }), start).target, 20)
const multiple = freshState(start)
multiple.wearing = true
advance(multiple, start + 3 * 86400000)
assert.equal(multiple.history.length, 3, '后台跨多天逐日保存')
assert.equal(multiple.history[0].elapsed, 10 * 60000)
assert.equal(multiple.history[1].elapsed, 86400000)
assert.equal(multiple.history[2].elapsed, 86400000)
assert.equal(multiple.elapsed, 23 * 3600000 + 50 * 60000)
const reopened = restore(JSON.stringify(multiple), multiple.since)
assert.deepEqual(reopened.history, multiple.history, '重新打开不重复归档')
reopened.target = 24
assert.equal(reopened.history[0].target, 20, '修改目标不改历史目标')
const rows = dailyRecords(reopened)
assert.equal(rows[0].date, '今天')
assert.equal(rows[0].status, '进行中')
assert.equal(rows[1].status, '已达标')
assert.equal(rows[3].status, '未达标')
assert.equal(rows[1].goal, '目标 20 小时')
const old = freshState(start)
delete old.history
old.wearing = true
old.elapsed = 3600000
const migrated = restore(JSON.stringify(old), start + 20 * 60000)
assert.equal(migrated.history[0].elapsed, 70 * 60000, '旧数据迁移保留已有累计')
const paused = freshState(start)
advance(paused, start + 2 * 86400000)
assert.equal(paused.history.length, 2)
assert.ok(paused.history.every(item => item.elapsed === 0), '摘下期间每日记录为零')
const corruptHistory = { ...freshState(start), history: [null, { day: 'bad' }] }
assert.deepEqual(restore(JSON.stringify(corruptHistory), start).history, [])
console.log('通过：累计、跨午夜归档、多日恢复、历史目标、达标判断、暂停零记录、旧数据兼容、损坏记录恢复')
