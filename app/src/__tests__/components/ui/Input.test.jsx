import { render, screen } from '@testing-library/react'
import Input from '../../../components/ui/Input.jsx'

it('renders label and input', () => {
  render(<Input label="用户名" value="" onChange={() => {}} />)
  expect(screen.getByText('用户名')).toBeInTheDocument()
  expect(screen.getByRole('textbox')).toBeInTheDocument()
})

it('shows error message', () => {
  render(<Input label="x" error="必填" value="" onChange={() => {}} />)
  expect(screen.getByText('必填')).toBeInTheDocument()
})

it('label is associated with input via htmlFor', () => {
  render(<Input label="密码" type="password" value="" onChange={() => {}} />)
  const label = screen.getByText('密码')
  const input = document.getElementById(label.getAttribute('for'))
  expect(input).not.toBeNull()
})
