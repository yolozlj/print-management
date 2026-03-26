import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Bom from '../../pages/Bom.jsx'

const mockBoms = [
  { id: 'b1', fields: { 产品名称: '数学教材', 类型: '教材', 成品尺寸: 'A4', 装订要求: '平装', '封面/内页': '内页', 纸张种类: '轻型纸', 纸张品牌: '', 印刷要求: '黑白', 工艺要求: '', 单BOM印刷数量: 1, 所属分校: '北京分校' } },
  { id: 'b2', fields: { 产品名称: '英语教材', 类型: '教材', 成品尺寸: 'A5', 装订要求: '精装', '封面/内页': '封面', 纸张种类: '铜版纸', 纸张品牌: '', 印刷要求: '彩色', 工艺要求: '', 单BOM印刷数量: 1, 所属分校: '上海分校' } },
]

vi.mock('../../store/CacheContext.jsx', () => ({
  useCache: () => ({ getTableData: vi.fn().mockResolvedValue(mockBoms), invalidate: vi.fn() }),
}))
vi.mock('../../store/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { fields: { 所属分校: '北京分校' } }, permissions: {} }),
}))

describe('Bom', () => {
  it('renders heading', () => {
    render(<Bom />)
    expect(screen.getByText('产品BOM管理')).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(<Bom />)
    expect(screen.getByPlaceholderText('搜索产品名称')).toBeInTheDocument()
  })
})
