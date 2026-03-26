import { createContext, useContext, useState, useEffect } from 'react'
import { fetchAllRecords } from '../api/teable.js'
import { TABLES } from '../api/tables.js'
import { comparePassword, parsePermissions } from '../utils/auth.js'

const AuthContext = createContext(null)
const SESSION_KEY = 'print_platform_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY)
    if (saved) {
      try {
        const { user: u, permissions: p } = JSON.parse(saved)
        setUser(u)
        setPermissions(p)
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
    }
    setLoading(false)
  }, [])

  async function login(username, password) {
    const users = await fetchAllRecords(TABLES.USER)
    const found = users.find(r => r.fields['用户名'] === username)
    if (!found) return { success: false, error: '用户名或密码错误' }

    const status = found.fields['状态']
    if (status === '待审核') return { success: false, error: '账号审核中，请联系校区管理员' }
    if (status === '已驳回') return { success: false, error: '注册申请未通过' }

    const ok = await comparePassword(password, found.fields['密码哈希'])
    if (!ok) return { success: false, error: '用户名或密码错误' }

    let perms = parsePermissions(null)
    const roleId = found.fields['角色ID']
    if (roleId) {
      const roles = await fetchAllRecords(TABLES.ROLE)
      const role = roles.find(r => r.fields['角色ID'] === roleId)
      if (role) perms = parsePermissions(role.fields['权限配置'])
    }

    setUser(found)
    setPermissions(perms)
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: found, permissions: perms }))
    return { success: true }
  }

  function logout() {
    setUser(null)
    setPermissions({})
    localStorage.removeItem(SESSION_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
