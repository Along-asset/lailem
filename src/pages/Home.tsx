import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiListStaff, type Staff } from '../lib/api'

function staffAvatarSrc(staff: Staff): string | undefined {
  if (staff.avatarData) return staff.avatarData
  if (staff.avatarUrl) return staff.avatarUrl
  return undefined
}

export default function Home() {
  const [items, setItems] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'available' | 'busy'>('all')
  const [videoEnabled, setVideoEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiListStaff()
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'load_failed')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return items.filter((s) => {
      if (status !== 'all' && s.status !== status) return false
      if (!query) return true
      const hay = `${s.name} ${s.area} ${s.highlight} ${s.bio} ${s.skills.join(' ')}`.toLowerCase()
      return hay.includes(query)
    })
  }, [items, q, status])

  return (
    <div className="page page--home">
      <div className="hero hero--cover">
        {videoEnabled ? (
          <video
            className="hero__video"
            src="/videos/hero-loop.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : null}
        <div className="hero__content">
          <div className="hero__title">工作人员展示</div>
          <div className="hero__sub">公开展示员工信息，后台由管理员维护</div>
          {!videoEnabled ? (
            <button
              type="button"
              className="hero__play"
              onClick={() => setVideoEnabled(true)}
            >
              ▶
            </button>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <div className="filters">
          <input
            className="input"
            placeholder="搜索姓名 / 区域 / 技能"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="select"
            value={status}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'all' || v === 'available' || v === 'busy') setStatus(v)
            }}
          >
            <option value="all">全部状态</option>
            <option value="available">可接单</option>
            <option value="busy">档期满</option>
          </select>
        </div>

        {loading ? <div className="hint">加载中…</div> : null}
        {error ? (
          <div className="hint hint--danger">
            无法加载数据：{error}（部署到 ESA 后 /api 将由边缘函数提供）
          </div>
        ) : null}

        {!loading && !error && filtered.length === 0 ? <div className="hint">暂无人员数据</div> : null}

        <div className="grid">
          {filtered.map((s) => (
            <Link key={s.id} to={`/staff/${encodeURIComponent(s.id)}`} className="card card--link">
              <div className="card__media">
                {staffAvatarSrc(s) ? <img className="card__img" src={staffAvatarSrc(s)} alt={s.name} /> : null}
              </div>
              <div className="card__body">
                <div className="card__row">
                  <div className="card__title">{s.name}</div>
                  <div className={`pill ${s.status === 'available' ? 'pill--ok' : 'pill--muted'}`}>
                    {s.status === 'available' ? '可接单' : '档期满'}
                  </div>
                </div>
                <div className="card__meta">
                  <span>{s.area || '区域待补充'}</span>
                  <span>·</span>
                  <span>{s.years} 年经验</span>
                </div>
                {s.highlight ? <div className="card__highlight">{s.highlight}</div> : null}
                {s.skills.length ? (
                  <div className="tags">
                    {s.skills.slice(0, 6).map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
