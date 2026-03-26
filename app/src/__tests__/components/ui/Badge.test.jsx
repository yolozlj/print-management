import { render, screen } from '@testing-library/react'
import Badge from '../../../components/ui/Badge.jsx'

it.each([
  ['pending',   '待审核'],
  ['approved',  '已审核'],
  ['rejected',  '已驳回'],
  ['confirmed', '已确认'],
  ['active',    '已激活'],
])('renders correct label for status=%s', (status, label) => {
  render(<Badge status={status} />)
  expect(screen.getByText(label)).toBeInTheDocument()
})
