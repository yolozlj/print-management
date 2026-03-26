import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext.jsx'

/**
 * 路由守卫
 * permKey: 可选，检查特定权限键（如 'bom', 'admin'）
 */
export default function PrivateRoute({ children, permKey }) {
  const { user, permissions, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-400">
        加载中...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (permKey && !permissions[permKey]) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-500">无访问权限</p>
          <p className="mt-1 text-xs text-gray-400">请联系管理员分配角色</p>
        </div>
      </div>
    )
  }

  return children
}
