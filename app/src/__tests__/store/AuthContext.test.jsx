import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../../store/AuthContext.jsx'
import * as teable from '../../api/teable.js'
import * as authUtils from '../../utils/auth.js'

// 测试用辅助组件
function TestConsumer() {
  const { user, permissions, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="user">{user ? user.fields['用户名'] : 'none'}</span>
      <span data-testid="perm-admin">{String(permissions.admin)}</span>
      <button onClick={() => login('admin', 'pass')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

const mockActiveUser = {
  id: 'rec1',
  fields: { '用户名': 'admin', '密码哈希': 'hash', '状态': '已激活', '角色ID': 'admin' },
}
const mockRole = {
  id: 'role1',
  fields: { '角色ID': 'admin', '权限配置': '{"admin":true,"bom":true}' },
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('login', () => {
  it('sets user and permissions on successful login', async () => {
    vi.spyOn(teable, 'fetchAllRecords')
      .mockResolvedValueOnce([mockActiveUser])   // 用户表
      .mockResolvedValueOnce([mockRole])          // 角色表
    vi.spyOn(authUtils, 'comparePassword').mockResolvedValueOnce(true)

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await act(async () => {
      await userEvent.click(screen.getByText('Login'))
    })

    expect(screen.getByTestId('user').textContent).toBe('admin')
    expect(screen.getByTestId('perm-admin').textContent).toBe('true')
  })

  it('returns error for pending user', async () => {
    const pendingUser = { ...mockActiveUser, fields: { ...mockActiveUser.fields, '状态': '待审核' } }
    vi.spyOn(teable, 'fetchAllRecords').mockResolvedValueOnce([pendingUser])

    let loginResult
    function Capture() {
      const { login } = useAuth()
      return <button onClick={async () => { loginResult = await login('admin', 'pass') }}>Go</button>
    }
    render(<AuthProvider><Capture /></AuthProvider>)
    await act(async () => { await userEvent.click(screen.getByText('Go')) })

    expect(loginResult.success).toBe(false)
    expect(loginResult.error).toContain('审核中')
  })

  it('returns error for wrong password', async () => {
    vi.spyOn(teable, 'fetchAllRecords').mockResolvedValueOnce([mockActiveUser])
    vi.spyOn(authUtils, 'comparePassword').mockResolvedValueOnce(false)

    let loginResult
    function Capture() {
      const { login } = useAuth()
      return <button onClick={async () => { loginResult = await login('admin', 'wrong') }}>Go</button>
    }
    render(<AuthProvider><Capture /></AuthProvider>)
    await act(async () => { await userEvent.click(screen.getByText('Go')) })

    expect(loginResult.success).toBe(false)
    expect(loginResult.error).toContain('密码')
  })
})

describe('logout', () => {
  it('clears user and permissions', async () => {
    vi.spyOn(teable, 'fetchAllRecords')
      .mockResolvedValueOnce([mockActiveUser])
      .mockResolvedValueOnce([mockRole])
    vi.spyOn(authUtils, 'comparePassword').mockResolvedValueOnce(true)

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await act(async () => { await userEvent.click(screen.getByText('Login')) })
    expect(screen.getByTestId('user').textContent).toBe('admin')

    await act(async () => { await userEvent.click(screen.getByText('Logout')) })
    expect(screen.getByTestId('user').textContent).toBe('none')
    expect(localStorage.getItem('print_platform_session')).toBeNull()
  })
})
