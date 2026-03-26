import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../../../components/ui/Button.jsx'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>提交</Button>)
    expect(screen.getByRole('button', { name: '提交' })).toBeInTheDocument()
  })

  it('calls onClick on click', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is disabled when loading=true', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders secondary variant without error', () => {
    render(<Button variant="secondary">Next</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders danger variant without error', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
