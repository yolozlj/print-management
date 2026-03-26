import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword, parsePermissions } from '../../utils/auth.js'

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('TestPass123')
    expect(hash).toMatch(/^\$2[aby]\$/)
  })

  it('produces different hashes for same password (salted)', async () => {
    const [h1, h2] = await Promise.all([hashPassword('same'), hashPassword('same')])
    expect(h1).not.toBe(h2)
  })
})

describe('comparePassword', () => {
  it('returns true for matching password', async () => {
    const hash = await hashPassword('correct')
    expect(await comparePassword('correct', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct')
    expect(await comparePassword('wrong', hash)).toBe(false)
  })
})

describe('parsePermissions', () => {
  it('parses valid JSON permission string', () => {
    const perm = parsePermissions('{"bom":true,"admin":false}')
    expect(perm.bom).toBe(true)
    expect(perm.admin).toBe(false)
  })

  it('fills missing keys with false', () => {
    const perm = parsePermissions('{"bom":true}')
    expect(perm.contracts).toBe(false)
  })

  it('returns all-false on invalid JSON', () => {
    const perm = parsePermissions('not-json')
    expect(perm.bom).toBe(false)
    expect(perm.admin).toBe(false)
  })

  it('returns all-false when input is null/undefined', () => {
    expect(parsePermissions(null).bom).toBe(false)
    expect(parsePermissions(undefined).admin).toBe(false)
  })
})
