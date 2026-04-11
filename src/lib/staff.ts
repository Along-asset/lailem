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

export async function shareStaffProfile(
  staff: Pick<Staff, 'id' | 'name' | 'highlight'>,
): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = buildStaffShareUrl(staff.id)
  const shareTitle = staff.highlight ? `${staff.name} + ${staff.highlight}` : `${staff.name} + 工作人员信息`
  const title = shareTitle
  const text = `查看 ${shareTitle}`

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(url)
    return 'copied'
  }

  if (typeof window !== 'undefined') {
    window.prompt('请复制此分享链接', url)
  }
  return 'copied'
}
