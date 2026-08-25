import { createContext } from 'react'
import type { AdminAuthState, AdminService } from '../admin/adminService'

export type AdminAuthStatus =
  | 'unconfigured'
  | 'loading'
  | AdminAuthState['status']
  | 'error'

export interface AdminAuthContextValue {
  service: AdminService | null
  status: AdminAuthStatus
  email: string | null
  error: string | null
  pending: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  retry: () => Promise<void>
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)
