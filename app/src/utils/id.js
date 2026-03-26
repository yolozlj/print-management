/**
 * 生成唯一编号：前缀 + 时间戳(ms) + 递增计数器
 * 使用单调递增计数器确保同一毫秒内生成的 ID 不重复
 */
let _counter = 0

function makeId(prefix) {
  _counter = (_counter + 1) % 1_000_000
  return `${prefix}${Date.now()}${String(_counter).padStart(6, '0')}`
}

export function generateOrderId() {
  return makeId('DD')
}

export function generateDistributionId() {
  return makeId('FP')
}
