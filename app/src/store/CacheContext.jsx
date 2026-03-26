import { createContext, useContext, useRef, useState, useCallback } from 'react'
import { fetchAllRecords } from '../api/teable.js'

const CacheContext = createContext(null)

export function CacheProvider({ children }) {
  // 使用 useRef 存储缓存数据，避免每次 setState 导致 getTableData 引用变化
  const cacheRef = useRef({})
  const loadingRef = useRef({})
  const [, forceUpdate] = useState(0) // 触发重渲染

  const getTableData = useCallback(async (tableId, forceRefresh = false) => {
    if (!forceRefresh && cacheRef.current[tableId]) {
      return cacheRef.current[tableId]
    }

    loadingRef.current[tableId] = true
    try {
      const records = await fetchAllRecords(tableId)
      cacheRef.current[tableId] = records
      return records
    } finally {
      loadingRef.current[tableId] = false
    }
  }, []) // 空依赖——函数引用稳定

  const invalidate = useCallback((tableId) => {
    delete cacheRef.current[tableId]
  }, [])

  const isLoading = (tableId) => !!loadingRef.current[tableId]

  return (
    <CacheContext.Provider value={{ getTableData, invalidate, isLoading }}>
      {children}
    </CacheContext.Provider>
  )
}

export function useCache() {
  const ctx = useContext(CacheContext)
  if (!ctx) throw new Error('useCache must be used within CacheProvider')
  return ctx
}
