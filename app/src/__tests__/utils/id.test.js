import { describe, it, expect } from 'vitest'
import { generateOrderId, generateDistributionId } from '../../utils/id.js'

describe('generateOrderId', () => {
  it('starts with DD prefix', () => {
    expect(generateOrderId()).toMatch(/^DD\d+$/)
  })

  it('generates unique IDs across 100 calls', () => {
    const ids = new Set(Array.from({ length: 100 }, generateOrderId))
    expect(ids.size).toBe(100)
  })
})

describe('generateDistributionId', () => {
  it('starts with FP prefix', () => {
    expect(generateDistributionId()).toMatch(/^FP\d+$/)
  })

  it('generates unique IDs across 100 calls', () => {
    const ids = new Set(Array.from({ length: 100 }, generateDistributionId))
    expect(ids.size).toBe(100)
  })
})
