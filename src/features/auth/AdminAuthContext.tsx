import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AdminService } from '../admin/adminService'
import {
  AdminAuthContext,
  type AdminAuthContextValue,
  type AdminAuthStatus,
} from './adminAuthContextValue'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Authentication is unavailable.'
}

export function AdminAuthProvider({
  service,
  children,
}: {
  service: AdminService | null
  children: ReactNode
}) {
  const [status, setStatus] = useState<AdminAuthStatus>(
    service ? 'loading' : 'unconfigured',
  )
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!service) return
    try {
      const authState = await service.getAuthState()
      setStatus(authState.status)
      setEmail('email' in authState ? authState.email : null)
      setError(null)
    } catch (authError) {
      setStatus('error')
      setEmail(null)
      setError(errorMessage(authError))
    }
  }, [service])

  useEffect(() => {
    if (!service) return
    const initialTimer = window.setTimeout(() => void refresh(), 0)
    const unsubscribe = service.subscribeAuth(() => void refresh())
    return () => {
      window.clearTimeout(initialTimer)
      unsubscribe()
    }
  }, [refresh, service])

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      service,
      status,
      email,
      error,
      pending,
      async signIn(signInEmail, password) {
        if (!service || pendingRef.current) return false
        pendingRef.current = true
        setPending(true)
        setError(null)
        try {
          await service.signIn(signInEmail, password)
          await refresh()
          return true
        } catch (signInError) {
          setStatus('signedOut')
          setError(errorMessage(signInError))
          return false
        } finally {
          pendingRef.current = false
          setPending(false)
        }
      },
      async signOut() {
        if (!service || pendingRef.current) return
        pendingRef.current = true
        setPending(true)
        setError(null)
        try {
          await service.signOut()
          setStatus('signedOut')
          setEmail(null)
        } catch (signOutError) {
          setError(errorMessage(signOutError))
        } finally {
          pendingRef.current = false
          setPending(false)
        }
      },
      retry: refresh,
    }),
    [email, error, pending, refresh, service, status],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
