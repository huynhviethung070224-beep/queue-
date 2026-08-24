import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { isMockAdminAuthenticated } from './features/auth/mockAdminAuth'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { MemberPage } from './pages/MemberPage'
import { NotFoundPage } from './pages/NotFoundPage'

function MockProtectedAdminRoute() {
  if (!isMockAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />
  }

  return <AdminDashboardPage />
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<MemberPage />} />
        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route path="admin" element={<MockProtectedAdminRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
