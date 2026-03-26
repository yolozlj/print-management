import { render, screen } from '@testing-library/react'
import Select from '../../../components/ui/Select.jsx'

const options = [
  { value: 'a', label: '选项A' },
  { value: 'b', label: '选项B' },
]

it('renders label', () => {
  render(<Select label="类型" options={options} value="" onChange={() => {}} />)
  expect(screen.getByText('类型')).toBeInTheDocument()
})

it('renders all options', () => {
  render(<Select label="类型" options={options} value="" onChange={() => {}} />)
  expect(screen.getByText('选项A')).toBeInTheDocument()
  expect(screen.getByText('选项B')).toBeInTheDocument()
})

it('renders placeholder option by default', () => {
  render(<Select options={options} value="" onChange={() => {}} placeholder="请选择类型" />)
  expect(screen.getByText('请选择类型')).toBeInTheDocument()
})
