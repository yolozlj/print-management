import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Users from '../../../pages/admin/Users.jsx'

vi.mock('../../../store/CacheContext.jsx', () => ({
  useCache: () => ({ getTableData: vi.fn().mockResolvedValue([]), invalidate: vi.fn() }),
}))
vi.mock('../../../store/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'u1', fields: { 姓名: '测试员', 所属分校: '北京分校', 负责校区: '["朝阳校区"]' } },
    permissions: { admin: true, approve_users: true },
  }),
}))

describe('Users', () => {
  it('renders heading and tabs', () => {
    render(<Users />)
    expect(screen.getByText('用户管理')).toBeInTheDocument()
    expect(screen.getByText('已激活')).toBeInTheDocument()
    expect(screen.getByText('待审核')).toBeInTheDocument()
  })
})
