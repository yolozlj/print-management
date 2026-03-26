import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext.jsx'
import {
  LayoutDashboard,
  Package,
  FileText,
  PlusCircle,
  ClipboardList,
  Truck,
  Users,
  Shield,
  LogOut,
  Printer,
} from 'lucide-react'

/**
 * 主布局
 * 顶栏 h-14 (56px) + 左侧导航 w-56 (224px) + 主内容区
 * children prop 渲染主内容
 */

const NAV_ITEMS = [
  { path: '/', label: '首页', end: true, permKey: null, Icon: LayoutDashboard },
  { path: '/bom', label: '产品BOM', permKey: 'bom', Icon: Package },
  { path: '/contracts', label: '合同管理', permKey: 'contracts', Icon: FileText },
  { path: '/orders/create', label: '创建订单', permKey: 'create_order', Icon: PlusCircle },
  { path: '/orders', label: '查询订单', permKey: 'orders', end: true, Icon: ClipboardList },
  { path: '/distribution', label: '分发管理', permKey: 'distribution', Icon: Truck },
  { path: '/admin/users', label: '用户管理', permKey: 'admin', Icon: Users },
  { path: '/admin/roles', label: '角色管理', permKey: 'admin', Icon: Shield },
]

const MAIN_NAV = NAV_ITEMS.slice(0, 6)
const ADMIN_NAV = NAV_ITEMS.slice(6)

export default function Layout({ children }) {
  const { user, permissions, logout } = useAuth()
  const navigate = useNavigate()

  const displayName = user?.fields?.['姓名'] || user?.fields?.['用户名'] || '用户'
  const initial = displayName.charAt(0).toUpperCase()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const isVisible = (item) => item.permKey === null || permissions[item.permKey]
  const visibleMain = MAIN_NAV.filter(isVisible)
  const visibleAdmin = ADMIN_NAV.filter(isVisible)

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* 顶栏 */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-100 bg-white px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900">
            <Printer className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-gray-900">印刷管理平台</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{displayName}</span>
          {/* 用户头像 */}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 select-none">
            {initial}
          </div>
          <button
            onClick={handleLogout}
            aria-label="退出登录"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors duration-150
              hover:bg-gray-100 hover:text-gray-700
              focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 cursor-pointer"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* 左侧导航 */}
      <aside className="fixed left-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] w-56 flex-col border-r border-gray-100 bg-white">
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {/* 主导航 */}
          {visibleMain.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-gray-700 text-white font-medium'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}

          {/* 管理员导航（有权限才显示，加分隔线） */}
          {visibleAdmin.length > 0 && (
            <>
              <div className="my-3 border-t border-gray-100" />
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                管理
              </p>
              {visibleAdmin.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                      isActive
                        ? 'bg-gray-700 text-white font-medium'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.Icon
                        className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`}
                        strokeWidth={isActive ? 2 : 1.75}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="ml-56 pt-14">
        <div className="mx-auto max-w-6xl p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
