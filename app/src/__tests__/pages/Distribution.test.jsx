import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Distribution from '../../pages/Distribution.jsx'

vi.mock('../../store/CacheContext.jsx', () => ({
  useCache: () => ({ getTableData: vi.fn().mockResolvedValue([]), invalidate: vi.fn() }),
}))
vi.mock('../../store/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'u1', fields: { 姓名: '测试员', 所属分校: '北京分校', 所属校区: '朝阳校区', 负责校区: '["朝阳校区"]' } },
    permissions: { distribution: true },
  }),
}))
vi.mock('../../utils/export.js', () => ({
  exportDistribution: vi.fn(),
  parseDistributionImport: vi.fn(),
  downloadDistributionTemplate: vi.fn(),
}))

describe('Distribution', () => {
  it('renders heading and tabs', () => {
    render(<Distribution />)
    expect(screen.getByText('分发管理')).toBeInTheDocument()
    expect(screen.getByText('发起分发')).toBeInTheDocument()
    expect(screen.getByText('我的分发')).toBeInTheDocument()
  })
})
