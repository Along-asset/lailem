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

