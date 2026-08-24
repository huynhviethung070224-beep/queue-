const MOCK_ADMIN_SESSION_KEY = 'fairplay-phase1-admin-preview'

export function isMockAdminAuthenticated() {
  return sessionStorage.getItem(MOCK_ADMIN_SESSION_KEY) === 'authenticated'
}

export function startMockAdminSession() {
  sessionStorage.setItem(MOCK_ADMIN_SESSION_KEY, 'authenticated')
}

export function endMockAdminSession() {
  sessionStorage.removeItem(MOCK_ADMIN_SESSION_KEY)
}
