import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Dashboard from '../../pages/Dashboard.jsx'

vi.mock('../../store/CacheContext.jsx', () => ({
  useCache: () => ({
    getTableData: vi.fn().mockResolvedValue([]),
    invalidate: vi.fn(),
  }),
}))
vi.mock('../../store/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'u1', fields: { 姓名: '测试员', 所属分校: '北京分校' } },
    permissions: {},
  }),
}))

describe('Dashboard', () => {
  it('renders heading and stat cards', () => {
    render(<Dashboard />)
    expect(screen.getByText('首页看板')).toBeInTheDocument()
    expect(screen.getByText('待审核订单')).toBeInTheDocument()
    expect(screen.getByText('本月已审核订单')).toBeInTheDocument()
    expect(screen.getByText('有效合同')).toBeInTheDocument()
    expect(screen.getByText('待确认分发')).toBeInTheDocument()
  })

  it('renders recent orders section', () => {
    render(<Dashboard />)
    expect(screen.getByText('最近10条订单')).toBeInTheDocument()
  })
})
