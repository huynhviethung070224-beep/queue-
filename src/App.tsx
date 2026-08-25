import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import type { AdminService } from './features/admin/adminService'
import type { MemberService } from './features/member/memberService'
import { MemberPage } from './pages/MemberPage'
import { NotFoundPage } from './pages/NotFoundPage'

const AdminRoutes = lazy(() => import('./features/admin/AdminRoutes'))

interface AppProps {
  memberService?: MemberService
  adminService?: AdminService
}

export default function App({ memberService, adminService }: AppProps) {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<MemberPage service={memberService} />} />
        <Route
          path="admin/*"
          element={
            <Suspense fallback={<div className="card p-8 text-center text-sm text-slate-600" role="status">Loading admin tools…</div>}>
              <AdminRoutes adminService={adminService} />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
