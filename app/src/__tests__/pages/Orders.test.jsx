import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Orders from '../../pages/Orders.jsx'

vi.mock('../../store/CacheContext.jsx', () => ({
  useCache: () => ({ getTableData: vi.fn().mockResolvedValue([]), invalidate: vi.fn() }),
}))
vi.mock('../../store/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'u1', fields: { 姓名: '测试员', 所属分校: '北京分校' } },
    permissions: { orders: true, approve_orders: true },
  }),
}))

describe('Orders', () => {
  it('renders heading and status tabs', () => {
    render(<Orders />)
    expect(screen.getByText('查询订单')).toBeInTheDocument()
    expect(screen.getByText('全部')).toBeInTheDocument()
    expect(screen.getByText('待审核')).toBeInTheDocument()
    expect(screen.getByText('已审核')).toBeInTheDocument()
    expect(screen.getByText('已驳回')).toBeInTheDocument()
  })
})
