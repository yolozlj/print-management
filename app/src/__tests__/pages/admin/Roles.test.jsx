import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Roles from '../../../pages/admin/Roles.jsx'

vi.mock('../../../store/CacheContext.jsx', () => ({
  useCache: () => ({ getTableData: vi.fn().mockResolvedValue([]), invalidate: vi.fn() }),
}))
vi.mock('../../../store/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'u1', fields: { 姓名: '管理员', 所属分校: '北京分校' } },
    permissions: { admin: true },
  }),
}))

describe('Roles', () => {
  it('renders heading and add button', () => {
    render(<Roles />)
    expect(screen.getByText('角色管理')).toBeInTheDocument()
    expect(screen.getByText('新增角色')).toBeInTheDocument()
  })
})
