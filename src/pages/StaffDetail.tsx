import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGetStaff, type Staff } from '../lib/api'

function staffAvatarSrc(staff: Staff): string | undefined {
  if (staff.avatarData) return staff.avatarData
  if (staff.avatarUrl) return staff.avatarUrl
  return undefined
}

function tagVariant(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % 6
  }
  return hash
}

export default function StaffDetail() {
  const { id } = useParams<{ id: string }>()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('未找到该人员')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    apiGetStaff(id)
      .then((data) => {
        if (cancelled) return
        setStaff(data.staff)
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
  }, [id])

  return (
    <div className="page">
      <div className="hero">
        <div className="hero__title">人员详情</div>
        <div className="hero__sub">查看该工作人员的详细信息</div>
      </div>

      <div className="panel">
        {loading ? <div className="hint">加载中…</div> : null}
        {error ? <div className="hint hint--danger">{error}</div> : null}
        {!loading && !error && !staff ? <div className="hint">未找到该人员</div> : null}

        {staff ? (
          <div className="staff-detail">
            <div className="staff-detail__header">
              <div className="staff-detail__avatar">
                {staffAvatarSrc(staff) ? (
                  <img className="staff-detail__avatar-img" src={staffAvatarSrc(staff)} alt={staff.name} />
                ) : (
                  <div className="staff-detail__avatar-placeholder" />
                )}
              </div>
              <div className="staff-detail__info">
                <div className="staff-detail__name-row">
                  <h1 className="staff-detail__name">{staff.name}</h1>
                  <span className={`pill ${staff.status === 'available' ? 'pill--ok' : 'pill--muted'}`}>
                    {staff.status === 'available' ? '可接单' : '档期满'}
                  </span>
                </div>
                <div className="staff-detail__meta">
                  <span>{staff.area || '区域待补充'}</span>
                  <span>·</span>
                  <span>{staff.years} 年经验</span>
                </div>
                {staff.highlight ? <div className="staff-detail__highlight">{staff.highlight}</div> : null}
              </div>
            </div>

            {staff.bio ? (
              <div className="staff-detail__section">
                <div className="staff-detail__section-title">简介</div>
                <div className="staff-detail__section-body">{staff.bio}</div>
              </div>
            ) : null}

            {staff.skills.length ? (
              <div className="staff-detail__section">
                <div className="staff-detail__section-title">技能标签</div>
                <div className="tags">
                  {staff.skills.map((t) => {
                    const variant = tagVariant(t)
                    return (
                      <span key={t} className={`tag tag--variant-${variant}`}>
                        {t}
                      </span>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {staff.albums && staff.albums.length ? (
              <div className="staff-detail__section">
                <div className="staff-detail__section-title">照片集</div>
                <div className="staff-detail__albums">
                  {staff.albums.map((album, index) => (
                    <div key={index} className="staff-detail__album">
                      {album.title ? <div className="staff-detail__album-title">{album.title}</div> : null}
                      {album.images && album.images.length ? (
                        <div className="album-preview">
                          {album.images.map((img, i) => (
                            <img
                              key={i}
                              className="album-preview__img album-preview__img--clickable"
                              src={img}
                              alt={`${staff.name}-album-${index}-${i}`}
                              onClick={() => setPreviewImage(img)}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="staff-detail__footer">
              <Link to="/" className="button button--ghost">
                返回首页
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {previewImage ? (
        <div className="image-lightbox" onClick={() => setPreviewImage(null)}>
          <img className="image-lightbox__img" src={previewImage} alt="preview" />
        </div>
      ) : null}
    </div>
  )
}
