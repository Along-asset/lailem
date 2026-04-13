import type { Staff } from './api'

const PRODUCTION_SHARE_ORIGIN = 'https://www.lailem.top'

export function staffAvatarSrc(staff: Pick<Staff, 'avatarData' | 'avatarUrl'>): string | undefined {
  if (staff.avatarData) return staff.avatarData
  if (staff.avatarUrl) return staff.avatarUrl
  return undefined
}

export function tagVariant(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % 6
  }
  return hash
}

export function buildStaffShareUrl(id: string): string {
  const path = `/share/staff/${encodeURIComponent(id)}`
  if (typeof window === 'undefined') return `${PRODUCTION_SHARE_ORIGIN}${path}`

  const { protocol, hostname, origin } = window.location
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (isLocalhost) return `${origin}${path}`

  if (hostname === 'www.lailem.top' && protocol === 'https:') return `${origin}${path}`
  return `${PRODUCTION_SHARE_ORIGIN}${path}`
}

export async function shareStaffProfile(staff: Pick<Staff, 'id' | 'name' | 'highlight'>): Promise<'copied'> {
  const url = buildStaffShareUrl(staff.id)

  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    throw new Error('clipboard_unavailable')
  }

  await navigator.clipboard.writeText(url)
  return 'copied'
}
