const DEFAULT_KV_NAMESPACE = 'lailem_staff'
const DEFAULT_ADMIN_PASSWORD = 'admin'
const DEFAULT_TOKEN_SECRET = 'change_me_in_esa_env'

const STAFF_INDEX_KEY = 'staff_index'
const MAX_BODY_BYTES = 2_000_000

function normalizeEnvValue(v) {
  if (v == null) return null
  if (typeof v === 'string') return v
  try {
    return String(v)
  } catch {
    return null
  }
}

function readEnvValue(env, key) {
  if (env && typeof env === 'object') {
    if (key in env) {
      const v = normalizeEnvValue(env[key])
      if (v != null) return v
    }
    if (typeof env.get === 'function') {
      try {
        const v = normalizeEnvValue(env.get(key))
        if (v != null) return v
      } catch {}
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    if (key in process.env) {
      const v = normalizeEnvValue(process.env[key])
      if (v != null) return v
    }
    if (typeof process.env.get === 'function') {
      try {
        const v = normalizeEnvValue(process.env.get(key))
        if (v != null) return v
      } catch {}
    }
  }
  return null
}

function firstEnv(env, keys, fallback) {
  for (const k of keys) {
    const v = readEnvValue(env, k)
    if (typeof v === 'string' && v.length > 0) return v
  }
  return fallback
}

function getKvNamespace(env) {
  return firstEnv(env, ['KV_NAMESPACE', 'ESA_KV_NAMESPACE', 'ESA_KV', 'ESA_KV_NS'], DEFAULT_KV_NAMESPACE)
}

function getAdminPassword(env) {
  return firstEnv(env, ['ADMIN_PASSWORD', 'ESA_ADMIN_PASSWORD'], DEFAULT_ADMIN_PASSWORD)
}

function getTokenSecret(env) {
  return firstEnv(env, ['JWT_SECRET', 'TOKEN_SECRET', 'ESA_JWT_SECRET', 'ESA_TOKEN_SECRET'], DEFAULT_TOKEN_SECRET)
}

function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function text(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'text/plain; charset=utf-8')
  return new Response(data, { ...init, headers })
}

function badRequest(message) {
  return json({ error: message }, { status: 400 })
}

function unauthorized(message = 'unauthorized') {
  return json({ error: message }, { status: 401 })
}

function notFound() {
  return json({ error: 'not_found' }, { status: 404 })
}

function tooLarge() {
  return json({ error: 'payload_too_large' }, { status: 413 })
}

async function readJsonBody(request) {
  const contentLength = request.headers.get('content-length')
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) return { ok: false, error: 'payload_too_large' }

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return { ok: false, error: 'content_type_must_be_application_json' }

  const bodyText = await request.text()
  if (bodyText.length > MAX_BODY_BYTES) return { ok: false, error: 'payload_too_large' }

  try {
    const data = JSON.parse(bodyText)
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'invalid_json' }
  }
}

function base64UrlEncode(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecodeToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(b64 + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hmacSha256(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return new Uint8Array(signature)
}

async function signToken(secret, payload) {
  const payloadJson = JSON.stringify(payload)
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payloadJson))
  const sigBytes = await hmacSha256(secret, payloadB64)
  const sigB64 = base64UrlEncode(sigBytes)
  return `${payloadB64}.${sigB64}`
}

async function verifyToken(secret, token) {
  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false }
  const [payloadB64, sigB64] = parts
  let payload
  try {
    const payloadBytes = base64UrlDecodeToBytes(payloadB64)
    payload = JSON.parse(new TextDecoder().decode(payloadBytes))
  } catch {
    return { ok: false }
  }

  const expectedSig = await hmacSha256(secret, payloadB64)
  const sigBytes = base64UrlDecodeToBytes(sigB64)
  if (sigBytes.length !== expectedSig.length) return { ok: false }
  for (let i = 0; i < sigBytes.length; i++) {
    if (sigBytes[i] !== expectedSig[i]) return { ok: false }
  }

  if (!payload || payload.role !== 'admin') return { ok: false }
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return { ok: false }
  return { ok: true, payload }
}

function getBearerToken(request) {
  const auth = request.headers.get('authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

function staffKey(id) {
  return `staff_${id}`
}

async function getEdgeKv(env) {
  return new EdgeKV({ namespace: getKvNamespace(env) })
}

async function getStaffIndex(edgeKV) {
  const value = await edgeKV.get(STAFF_INDEX_KEY, { type: 'json' })
  if (!Array.isArray(value)) return []
  return value.filter((x) => typeof x === 'string')
}

async function setStaffIndex(edgeKV, ids) {
  await edgeKV.put(STAFF_INDEX_KEY, JSON.stringify(ids))
}

function normalizeStaffInput(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'invalid_staff' }
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) return { ok: false, error: 'name_required' }

  const area = typeof input.area === 'string' ? input.area.trim() : ''
  const highlight = typeof input.highlight === 'string' ? input.highlight.trim() : ''
  const bio = typeof input.bio === 'string' ? input.bio.trim() : ''
  const avatarData = typeof input.avatarData === 'string' ? input.avatarData : null
  const avatarUrl = typeof input.avatarUrl === 'string' ? input.avatarUrl.trim() : ''

  const years = Number.isFinite(input.years) ? input.years : Number.parseInt(String(input.years || '0'), 10)
  const safeYears = Number.isFinite(years) && years >= 0 && years <= 80 ? years : 0

  const sortOrder = Number.isFinite(input.sortOrder)
    ? input.sortOrder
    : Number.parseInt(String(input.sortOrder || '0'), 10)
  const safeSortOrder = Number.isFinite(sortOrder) ? sortOrder : 0

  const status = input.status === 'busy' ? 'busy' : 'available'

  const skills = Array.isArray(input.skills) ? input.skills : []
  const safeSkills = skills
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 16)

  if (avatarData && avatarData.length > 1_200_000) return { ok: false, error: 'avatar_too_large' }

  return {
    ok: true,
    staff: {
      name,
      area,
      highlight,
      bio,
      skills: safeSkills,
      years: safeYears,
      sortOrder: safeSortOrder,
      status,
      avatarData,
      avatarUrl,
    },
  }
}

async function handleAdminLogin(request, env) {
  const body = await readJsonBody(request)
  if (!body.ok) return body.error === 'payload_too_large' ? tooLarge() : badRequest(body.error)

  const password = typeof body.data.password === 'string' ? body.data.password.trim() : ''
  if (!password) return badRequest('password_required')
  const adminPassword = String(getAdminPassword(env) || '').trim()
  if (!adminPassword) {
    return unauthorized('admin_password_not_configured')
  }
  if (password !== adminPassword) {
    return unauthorized('invalid_password')
  }

  const tokenSecret = String(getTokenSecret(env) || '')
  const token = await signToken(tokenSecret, { role: 'admin', exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  return json({ token })
}

async function handleListStaff(env) {
  const edgeKV = await getEdgeKv(env)
  const ids = await getStaffIndex(edgeKV)
  const staffItems = await Promise.all(
    ids.map(async (id) => {
      const v = await edgeKV.get(staffKey(id), { type: 'json' })
      if (!v || typeof v !== 'object') return null
      return { id, ...v }
    }),
  )

  const items = staffItems
    .filter(Boolean)
    .sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))

  return json({ items })
}

async function requireAdmin(request, env) {
  const token = getBearerToken(request)
  if (!token) return { ok: false, response: unauthorized() }
  const verified = await verifyToken(String(getTokenSecret(env) || ''), token)
  if (!verified.ok) return { ok: false, response: unauthorized() }
  return { ok: true }
}

async function handleCreateStaff(request, env) {
  const auth = await requireAdmin(request, env)
  if (!auth.ok) return auth.response

  const body = await readJsonBody(request)
  if (!body.ok) return body.error === 'payload_too_large' ? tooLarge() : badRequest(body.error)

  const normalized = normalizeStaffInput(body.data)
  if (!normalized.ok) return badRequest(normalized.error)

  const edgeKV = await getEdgeKv(env)
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const staff = { ...normalized.staff, createdAt: now, updatedAt: now }
  await edgeKV.put(staffKey(id), JSON.stringify(staff))

  const ids = await getStaffIndex(edgeKV)
  if (!ids.includes(id)) {
    ids.push(id)
    await setStaffIndex(edgeKV, ids)
  }

  return json({ id, staff: { id, ...staff } }, { status: 201 })
}

async function handleUpdateStaff(request, env, id) {
  const auth = await requireAdmin(request, env)
  if (!auth.ok) return auth.response

  const body = await readJsonBody(request)
  if (!body.ok) return body.error === 'payload_too_large' ? tooLarge() : badRequest(body.error)

  const normalized = normalizeStaffInput(body.data)
  if (!normalized.ok) return badRequest(normalized.error)

  const edgeKV = await getEdgeKv(env)
  const existing = await edgeKV.get(staffKey(id), { type: 'json' })
  if (!existing) return notFound()

  const now = new Date().toISOString()
  const updated = { ...existing, ...normalized.staff, updatedAt: now }
  await edgeKV.put(staffKey(id), JSON.stringify(updated))

  const ids = await getStaffIndex(edgeKV)
  if (!ids.includes(id)) {
    ids.push(id)
    await setStaffIndex(edgeKV, ids)
  }

  return json({ staff: { id, ...updated } })
}

async function handleDeleteStaff(request, env, id) {
  const auth = await requireAdmin(request, env)
  if (!auth.ok) return auth.response

  const edgeKV = await getEdgeKv(env)
  const ok = await edgeKV.delete(staffKey(id))
  if (!ok) return notFound()

  const ids = (await getStaffIndex(edgeKV)).filter((x) => x !== id)
  await setStaffIndex(edgeKV, ids)
  return json({ ok: true })
}

async function routeApi(request, env) {
  const url = new URL(request.url)
  const pathname = url.pathname

  if (pathname === '/api/health') return text('ok')

  if (pathname === '/api/admin/login' && request.method === 'POST') return handleAdminLogin(request, env)
  if (pathname === '/api/staff' && request.method === 'GET') return handleListStaff(env)
  if (pathname === '/api/staff' && request.method === 'POST') return handleCreateStaff(request, env)

  const match = pathname.match(/^\/api\/staff\/([^/]+)$/)
  if (match) {
    const id = match[1]
    if (request.method === 'PUT') return handleUpdateStaff(request, env, id)
    if (request.method === 'DELETE') return handleDeleteStaff(request, env, id)
  }

  return notFound()
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return routeApi(request, env)
    return notFound()
  },
}
