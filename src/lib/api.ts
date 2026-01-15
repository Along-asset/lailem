export type StaffStatus = 'available' | 'busy'

export type Staff = {
  id: string
  name: string
  area: string
  highlight: string
  bio: string
  skills: string[]
  years: number
  sortOrder: number
  status: StaffStatus
  avatarData: string | null
  avatarUrl: string
  createdAt: string
  updatedAt: string
}

export type StaffInput = {
  name: string
  area: string
  highlight: string
  bio: string
  skills: string[]
  years: number
  sortOrder: number
  status: StaffStatus
  avatarData: string | null
  avatarUrl: string
}

type ApiError = { error: string }

async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  if (init.body) headers.set('content-type', 'application/json')
  if (token) headers.set('authorization', `Bearer ${token}`)

  const resp = await fetch(input, { ...init, headers })
  const data = (await resp.json()) as unknown
  if (!resp.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data ? String((data as ApiError).error) : 'request_failed'
    throw new Error(message)
  }
  return data as T
}

export async function apiHealth(): Promise<string> {
  const resp = await fetch('/api/health')
  if (!resp.ok) throw new Error('health_failed')
  return resp.text()
}

export async function apiAdminLogin(password: string): Promise<{ token: string }> {
  return requestJson<{ token: string }>(
    '/api/admin/login',
    {
      method: 'POST',
      body: JSON.stringify({ password }),
    },
    null,
  )
}

export async function apiListStaff(): Promise<{ items: Staff[] }> {
  return requestJson<{ items: Staff[] }>('/api/staff')
}

export async function apiCreateStaff(token: string, input: StaffInput): Promise<{ id: string; staff: Staff }> {
  return requestJson<{ id: string; staff: Staff }>(
    '/api/staff',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  )
}

export async function apiUpdateStaff(
  token: string,
  id: string,
  input: StaffInput,
): Promise<{ staff: Staff }> {
  return requestJson<{ staff: Staff }>(
    `/api/staff/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
    token,
  )
}

export async function apiDeleteStaff(token: string, id: string): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>(
    `/api/staff/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
    token,
  )
}

