import type { Staff } from './api'

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
  if (typeof window === 'undefined') return `/share/staff/${encodeURIComponent(id)}`
  const origin = window.location.origin
  return `${origin}/share/staff/${encodeURIComponent(id)}`
}

export async function shareStaffProfile(staff: Pick<Staff, 'id' | 'name' | 'highlight'>): Promise<'copied'> {
  const url = buildStaffShareUrl(staff.id)

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(url)
    return 'copied'
  }

  if (typeof window !== 'undefined') {
    window.prompt('请复制此分享链接', url)
  }
  return 'copied'
}
