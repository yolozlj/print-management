import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllRecords, createRecord } from '../api/teable.js'
import { hashPassword } from '../utils/auth.js'
import { TABLES } from '../api/tables.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'

/**
 * 注册页 — 超极简主义
 */
export default function Register() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirm: '',
    name: '',
    branch: '',
    campus: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function setField(key) {
    return (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // 前端校验
    if (!form.username || !form.password || !form.name) {
      setError('用户名、密码、姓名为必填项')
      return
    }
    if (form.password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    if (form.password !== form.confirm) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      // 检查用户名唯一性
      const users = await fetchAllRecords(TABLES.USER)
      if (users.some((u) => u.fields['用户名'] === form.username)) {
        setError('该用户名已被注册，请换一个')
        return
      }

      // 哈希密码
      const hash = await hashPassword(form.password)

      // 写入用户表
      await createRecord(TABLES.USER, {
        用户名: form.username,
        密码哈希: hash,
        姓名: form.name,
        所属分校: form.branch,
        所属校区: form.campus,
        角色ID: '',
        负责校区: '[]',
        状态: '待审核',
      })

      setSubmitted(true)
    } catch {
      setError('提交失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 提交成功状态
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-lg border border-gray-100 bg-white p-6 shadow-sm text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 mx-auto">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-900">注册申请已提交</h2>
          <p className="mt-2 text-xs text-gray-500">
            请等待校区管理员审核。审核通过后您即可登录使用。
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block text-xs text-gray-900 underline underline-offset-2 hover:text-gray-600"
          >
            返回登录
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        {/* 标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">申请注册</h1>
          <p className="mt-1 text-sm text-gray-500">填写信息后等待校区管理员审核</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <Input
              label="用户名 *"
              value={form.username}
              onChange={setField('username')}
              placeholder="设置登录账号"
              autoComplete="username"
              autoFocus
            />
            <Input
              label="密码 *"
              type="password"
              value={form.password}
              onChange={setField('password')}
              placeholder="至少 6 位"
              autoComplete="new-password"
            />
            <Input
              label="确认密码 *"
              type="password"
              value={form.confirm}
              onChange={setField('confirm')}
              placeholder="再次输入密码"
              autoComplete="new-password"
            />
            <Input
              label="姓名 *"
              value={form.name}
              onChange={setField('name')}
              placeholder="您的真实姓名"
            />
            <Input
              label="所属分校"
              value={form.branch}
              onChange={setField('branch')}
              placeholder="如：北京分校"
            />
            <Input
              label="所属校区"
              value={form.campus}
              onChange={setField('campus')}
              placeholder="如：朝阳校区"
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
              提交申请
            </Button>
          </div>
        </form>

        {/* 登录入口 */}
        <p className="mt-4 text-center text-xs text-gray-500">
          已有账号？{' '}
          <Link to="/login" className="text-gray-900 underline underline-offset-2 hover:text-gray-600">
            去登录
          </Link>
        </p>
      </div>
    </div>
  )
}
