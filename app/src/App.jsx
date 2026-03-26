import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext.jsx'
import { CacheProvider } from './store/CacheContext.jsx'
import PrivateRoute from './components/PrivateRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Bom from './pages/Bom.jsx'
import Contracts from './pages/Contracts.jsx'
import CreateOrder from './pages/CreateOrder.jsx'
import Orders from './pages/Orders.jsx'
import Distribution from './pages/Distribution.jsx'
import Users from './pages/admin/Users.jsx'
import Roles from './pages/admin/Roles.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CacheProvider>
          <Routes>
            {/* 公开路由 */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* 私有路由：嵌套 Routes 使用相对路径（不带前缀 /） */}
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Layout>
                    <Routes>
                      <Route index element={<Dashboard />} />
                      <Route
                        path="bom"
                        element={
                          <PrivateRoute permKey="bom">
                            <Bom />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="contracts"
                        element={
                          <PrivateRoute permKey="contracts">
                            <Contracts />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="orders/create"
                        element={
                          <PrivateRoute permKey="create_order">
                            <CreateOrder />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="orders"
                        element={
                          <PrivateRoute permKey="orders">
                            <Orders />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="distribution"
                        element={
                          <PrivateRoute permKey="distribution">
                            <Distribution />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="admin/users"
                        element={
                          <PrivateRoute permKey="admin">
                            <Users />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="admin/roles"
                        element={
                          <PrivateRoute permKey="admin">
                            <Roles />
                          </PrivateRoute>
                        }
                      />
                    </Routes>
                  </Layout>
                </PrivateRoute>
              }
            />
          </Routes>
        </CacheProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
