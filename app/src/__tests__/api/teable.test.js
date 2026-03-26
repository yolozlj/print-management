import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configure, teableRequest, fetchAllRecords, createRecord, updateRecord, deleteRecord } from '../../api/teable.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
  configure({ baseUrl: 'https://test.teable.com', token: 'test_token' })
})

describe('teableRequest', () => {
  it('sends GET with Bearer token and correct URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ records: [], total: 0 }),
    })
    await teableRequest('/api/table/tbl123/record')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.teable.com/api/table/tbl123/record',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test_token' }),
      })
    )
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'Forbidden' })
    await expect(teableRequest('/api/table/tbl123/record')).rejects.toThrow('403')
  })
})

describe('fetchAllRecords', () => {
  it('fetches single page when total <= take', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ records: [{ id: 'r1', fields: {} }], total: 1 }),
    })
    const records = await fetchAllRecords('tbl123')
    expect(records).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('paginates until all records fetched (with total)', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ records: Array(1000).fill({ id: 'r', fields: {} }), total: 1200 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ records: Array(200).fill({ id: 'r', fields: {} }), total: 1200 }) })
    const records = await fetchAllRecords('tbl123')
    expect(records).toHaveLength(1200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('stops when records count < take even if total is null', async () => {
    // Teable sometimes returns total: null — must stop on partial page
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ records: Array(4).fill({ id: 'r', fields: {} }), total: null }),
    })
    const records = await fetchAllRecords('tbl123')
    expect(records).toHaveLength(4)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('createRecord', () => {
  it('sends POST with fields wrapped in records array', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'rec1' }) })
    await createRecord('tbl123', { name: 'test' })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.records[0].fields).toEqual({ name: 'test' })
    expect(body.fieldKeyType).toBe('name')
  })
})

describe('updateRecord', () => {
  it('sends PATCH with correct URL and body structure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await updateRecord('tbl123', 'rec999', { '订单状态': '已审核' })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.teable.com/api/table/tbl123/record/rec999',
      expect.objectContaining({ method: 'PATCH' })
    )
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.record.fields).toEqual({ '订单状态': '已审核' })
    expect(body.fieldKeyType).toBe('name')
  })
})

describe('deleteRecord', () => {
  it('sends DELETE to correct record URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await deleteRecord('tbl123', 'rec999')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.teable.com/api/table/tbl123/record/rec999',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
