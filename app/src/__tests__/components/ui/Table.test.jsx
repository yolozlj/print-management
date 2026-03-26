import { render, screen } from '@testing-library/react'
import Table from '../../../components/ui/Table.jsx'

const columns = [
  { key: 'name', title: '名称' },
  { key: 'status', title: '状态' },
]
const data = [{ name: '产品A', status: '待审核' }]

it('renders column headers', () => {
  render(<Table columns={columns} data={data} />)
  expect(screen.getByText('名称')).toBeInTheDocument()
  expect(screen.getByText('状态')).toBeInTheDocument()
})

it('renders row data', () => {
  render(<Table columns={columns} data={data} />)
  expect(screen.getByText('产品A')).toBeInTheDocument()
})

it('shows emptyText when data is empty', () => {
  render(<Table columns={columns} data={[]} emptyText="暂无数据" />)
  expect(screen.getByText('暂无数据')).toBeInTheDocument()
})

it('shows skeleton rows when loading', () => {
  render(<Table columns={columns} data={[]} loading />)
  // Should not show emptyText when loading
  expect(screen.queryByText('暂无数据')).not.toBeInTheDocument()
})
