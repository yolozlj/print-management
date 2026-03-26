import { describe, it, expect } from 'vitest'
import {
  matchPrice,
  calcLinePrintQty,
  calcLineTotal,
  calcSavings,
  isBomDuplicate,
  isContractActive,
} from '../../utils/price.js'

const makePrice = (fields) => ({ id: 'p1', fields })

const baseCriteria = {
  contractName: '合同A',
  branch: '北京分校',
  type: '教材',
  size: 'A4',
  binding: '平装',
  pageType: '内页',
  paperType: '轻型纸',
  paperBrand: '品牌X',
  printReq: '黑白',
  craftReq: '',
  quantity: 500,
}

const matchingPriceFields = {
  合同名称: '合同A', 所属分校: '北京分校', 类型: '教材',
  成品尺寸: 'A4', 装订要求: '平装', '封面/内页': '内页',
  纸张种类: '轻型纸', 纸张品牌: '品牌X', 印刷要求: '黑白',
  工艺要求: '', 数量起: 100, 数量止: 999, 印刷单价: 2.5,
}

describe('matchPrice', () => {
  it('returns null unitPrice when no records', () => {
    expect(matchPrice([], baseCriteria)).toEqual({ unitPrice: null, warning: null })
  })

  it('matches a record within quantity range', () => {
    expect(matchPrice([makePrice(matchingPriceFields)], baseCriteria))
      .toEqual({ unitPrice: 2.5, warning: null })
  })

  it('returns null when quantity out of range', () => {
    const r = makePrice({ ...matchingPriceFields, 数量起: 1000, 数量止: 9999 })
    expect(matchPrice([r], baseCriteria)).toEqual({ unitPrice: null, warning: null })
  })

  it('returns first match with warning when multiple records match', () => {
    const r1 = makePrice({ ...matchingPriceFields, 印刷单价: 2.5 })
    const r2 = makePrice({ ...matchingPriceFields, 印刷单价: 3.0 })
    const result = matchPrice([r1, r2], baseCriteria)
    expect(result.unitPrice).toBe(2.5)
    expect(result.warning).toBe('发现多条价格记录，已取第一条')
  })

  it('returns null when contract name does not match', () => {
    const r = makePrice({ ...matchingPriceFields, 合同名称: '合同B' })
    expect(matchPrice([r], baseCriteria)).toEqual({ unitPrice: null, warning: null })
  })

  it('returns null when branch does not match', () => {
    const r = makePrice({ ...matchingPriceFields, 所属分校: '上海分校' })
    expect(matchPrice([r], baseCriteria)).toEqual({ unitPrice: null, warning: null })
  })
})

describe('calcLinePrintQty', () => {
  it('multiplies order qty by bom qty', () => {
    expect(calcLinePrintQty(100, 2)).toBe(200)
  })
  it('returns orderQty when bomQty is 1', () => {
    expect(calcLinePrintQty(500, 1)).toBe(500)
  })
})

describe('calcLineTotal', () => {
  it('multiplies printQty by unitPrice', () => {
    expect(calcLineTotal(200, 2.5)).toBe(500)
  })
  it('returns 0 when unitPrice is null', () => {
    expect(calcLineTotal(200, null)).toBe(0)
  })
})

describe('calcSavings', () => {
  it('computes savings and rate correctly', () => {
    const r = calcSavings(800, 1000)
    expect(r.savings).toBe(200)
    expect(r.savingsRate).toBeCloseTo(0.2)
  })
  it('returns zeros when compareTotal is 0', () => {
    expect(calcSavings(800, 0)).toEqual({ savings: 0, savingsRate: 0 })
  })
  it('returns zeros when compareTotal is null', () => {
    expect(calcSavings(800, null)).toEqual({ savings: 0, savingsRate: 0 })
  })
  it('returns negative savings when main is more expensive than compare', () => {
    const r = calcSavings(1200, 1000)
    expect(r.savings).toBe(-200)
    expect(r.savingsRate).toBeCloseTo(-0.2)
  })
})

describe('isBomDuplicate', () => {
  const existing = [{
    fields: {
      所属分校: '北京分校', 产品名称: '教材A', 成品尺寸: 'A4',
      装订要求: '平装', 纸张种类: '轻型纸', 印刷要求: '黑白',
    },
  }]

  it('returns true when all 6 key fields match', () => {
    expect(isBomDuplicate(existing, {
      所属分校: '北京分校', 产品名称: '教材A', 成品尺寸: 'A4',
      装订要求: '平装', 纸张种类: '轻型纸', 印刷要求: '黑白',
    })).toBe(true)
  })

  it('returns false when one key field differs', () => {
    expect(isBomDuplicate(existing, {
      所属分校: '北京分校', 产品名称: '教材A', 成品尺寸: 'A4',
      装订要求: '精装', 纸张种类: '轻型纸', 印刷要求: '黑白',
    })).toBe(false)
  })
})

describe('isContractActive', () => {
  it('returns true when today is within range', () => {
    const c = { fields: { 有效期开始: '2026-01-01', 有效期结束: '2026-12-31' } }
    expect(isContractActive(c, '2026-06-01')).toBe(true)
  })
  it('returns true on boundary dates', () => {
    const c = { fields: { 有效期开始: '2026-06-01', 有效期结束: '2026-06-01' } }
    expect(isContractActive(c, '2026-06-01')).toBe(true)
  })
  it('returns false when today is before start', () => {
    const c = { fields: { 有效期开始: '2026-07-01', 有效期结束: '2026-12-31' } }
    expect(isContractActive(c, '2026-06-01')).toBe(false)
  })
  it('returns false when today is after end', () => {
    const c = { fields: { 有效期开始: '2026-01-01', 有效期结束: '2026-03-01' } }
    expect(isContractActive(c, '2026-04-01')).toBe(false)
  })
  it('returns false when start date is missing', () => {
    const c = { fields: { 有效期开始: '', 有效期结束: '2026-12-31' } }
    expect(isContractActive(c, '2026-06-01')).toBe(false)
  })
})
