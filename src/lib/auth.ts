const TOKEN_KEY = 'lailem_admin_token'

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    return
  }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    return
  }
}

export function isDevAdminBypass(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  const search = window.location.search
  const isLocalhost = host === 'localhost' || host === '127.0.0.1'
  const hasFlag = search.includes('dev_admin=1')
  return isLocalhost && hasFlag
}
