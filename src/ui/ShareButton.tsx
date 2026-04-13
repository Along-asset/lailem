import { useState, type MouseEvent } from 'react'
import type { Staff } from '../lib/api'
import { shareStaffProfile } from '../lib/staff'

type ShareButtonProps = {
  staff: Pick<Staff, 'id' | 'name' | 'highlight'>
  className?: string
  label?: string
  stopPropagation?: boolean
}

export function ShareButton({
  staff,
  className = 'button button--ghost',
  label = '分享',
  stopPropagation = true,
}: ShareButtonProps) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleShare(event: MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (busy) return
    setBusy(true)
    try {
      await shareStaffProfile(staff)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'clipboard_unavailable') {
        window.alert('当前环境不支持自动复制，请更换浏览器或在系统浏览器中打开。')
      } else {
        window.alert('分享失败，请稍后重试')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className={className} onClick={handleShare} disabled={busy}>
      {busy ? '处理中…' : copied ? '链接已复制' : label}
    </button>
  )
}
