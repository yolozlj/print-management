import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'

/**
 * 登录页 — 超极简主义
 */
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) {
      setError('请输入用户名和密码')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await login(username, password)
      if (result.success) {
        navigate('/', { replace: true })
      } else {
        setError(result.error)
      }
    } catch {
      setError('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* 标题 */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17H7a4 4 0 01-4-4V7a2 2 0 012-2h14a2 2 0 012 2v6a4 4 0 01-4 4zm0 0v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">印刷管理平台</h1>
          <p className="mt-1 text-sm text-gray-500">请登录您的账号</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <Input
              label="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
              autoFocus
            />
            <Input
              label="密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />

            {/* 错误信息 */}
            {error && (
              <p className="text-xs text-red-500" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              loading={loading}
              className="mt-1 w-full"
            >
              登录
            </Button>
          </div>
        </form>

        {/* 注册入口 */}
        <p className="mt-4 text-center text-xs text-gray-500">
          还没有账号？{' '}
          <Link to="/register" className="text-gray-900 underline underline-offset-2 hover:text-gray-600">
            申请注册
          </Link>
        </p>
      </div>
    </div>
  )
}
