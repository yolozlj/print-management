import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import Modal from '../../../components/ui/Modal.jsx'

it('renders title when open', () => {
  render(<Modal open title="确认操作" onClose={() => {}}>内容</Modal>)
  expect(screen.getByText('确认操作')).toBeInTheDocument()
})

it('does not render when closed', () => {
  render(<Modal open={false} title="确认操作" onClose={() => {}}>内容</Modal>)
  expect(screen.queryByText('确认操作')).not.toBeInTheDocument()
})

it('calls onClose when close button clicked', async () => {
  const onClose = vi.fn()
  render(<Modal open title="T" onClose={onClose}>内容</Modal>)
  await userEvent.click(screen.getByRole('button', { name: '关闭' }))
  expect(onClose).toHaveBeenCalled()
})

it('calls onClose when Escape pressed', async () => {
  const onClose = vi.fn()
  render(<Modal open title="T" onClose={onClose}>内容</Modal>)
  await userEvent.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalled()
})
