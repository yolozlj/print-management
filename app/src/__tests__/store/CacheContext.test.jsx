import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { CacheProvider, useCache } from '../../store/CacheContext.jsx'
import * as teable from '../../api/teable.js'

function makeRecords(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `r${i}`, fields: {} }))
}

describe('getTableData', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('fetches from API on first call', async () => {
    const spy = vi.spyOn(teable, 'fetchAllRecords').mockResolvedValueOnce(makeRecords(5))
    let result
    function Comp() {
      const { getTableData } = useCache()
      return <button onClick={async () => { result = await getTableData('tbl1') }}>go</button>
    }
    const { getByText } = render(<CacheProvider><Comp /></CacheProvider>)
    await act(async () => { getByText('go').click() })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(5)
  })

  it('returns cached data on second call without fetch', async () => {
    const spy = vi.spyOn(teable, 'fetchAllRecords').mockResolvedValue(makeRecords(3))
    function Comp() {
      const { getTableData } = useCache()
      return <button onClick={async () => {
        await getTableData('tbl2')
        await getTableData('tbl2')
      }}>go</button>
    }
    const { getByText } = render(<CacheProvider><Comp /></CacheProvider>)
    await act(async () => { getByText('go').click() })
    expect(spy).toHaveBeenCalledTimes(1) // second call hits cache
  })

  it('refetches when forceRefresh=true', async () => {
    const spy = vi.spyOn(teable, 'fetchAllRecords').mockResolvedValue(makeRecords(2))
    function Comp() {
      const { getTableData } = useCache()
      return <button onClick={async () => {
        await getTableData('tbl3')
        await getTableData('tbl3', true)
      }}>go</button>
    }
    const { getByText } = render(<CacheProvider><Comp /></CacheProvider>)
    await act(async () => { getByText('go').click() })
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

describe('invalidate', () => {
  it('causes next getTableData call to refetch', async () => {
    const spy = vi.spyOn(teable, 'fetchAllRecords').mockResolvedValue(makeRecords(1))
    function Comp() {
      const { getTableData, invalidate } = useCache()
      return <button onClick={async () => {
        await getTableData('tbl4')
        invalidate('tbl4')
        await getTableData('tbl4')
      }}>go</button>
    }
    const { getByText } = render(<CacheProvider><Comp /></CacheProvider>)
    await act(async () => { getByText('go').click() })
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
