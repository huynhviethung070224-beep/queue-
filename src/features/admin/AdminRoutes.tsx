import { useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from '../../lib/supabase'
import { AdminDashboardPage } from '../../pages/AdminDashboardPage'
import { AdminLoginPage } from '../../pages/AdminLoginPage'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { AdminAuthProvider } from '../auth/AdminAuthContext'
import { useAdminAuth } from '../auth/useAdminAuth'
import {
  createSupabaseAdminService,
  type AdminService,
} from './adminService'

function ProtectedAdminRoute() {
  const auth = useAdminAuth()
  if (auth.status === 'authorized') return <AdminDashboardPage />
  if (auth.status === 'loading') {
    return (
      <div className="card p-8 text-center text-sm text-slate-600" role="status">
        Checking administrator access…
      </div>
    )
  }
  return <Navigate to="/admin/login" replace />
}

function AdminLoginRoute() {
  const auth = useAdminAuth()
  return auth.status === 'authorized' ? (
    <Navigate to="/admin" replace />
  ) : (
    <AdminLoginPage />
  )
}

export default function AdminRoutes({ adminService }: { adminService?: AdminService }) {
  const service = useMemo(() => {
    if (adminService) return adminService
    return isSupabaseConfigured() ? createSupabaseAdminService() : null
  }, [adminService])

  return (
    <AdminAuthProvider service={service}>
      <Routes>
        <Route index element={<ProtectedAdminRoute />} />
        <Route path="login" element={<AdminLoginRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AdminAuthProvider>
  )
}
