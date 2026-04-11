import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGetStaff, type Staff } from '../lib/api'
import { staffAvatarSrc, tagVariant } from '../lib/staff'
import { ShareButton } from '../ui/ShareButton'

export default function StaffShare() {
  const { id } = useParams<{ id: string }>()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('未找到该工作人员')
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
    <div className="share-page">
      <div className="share-page__backdrop" />
      <div className="share-page__content">
        {loading ? <div className="panel share-panel"><div className="hint">加载中…</div></div> : null}
        {error ? <div className="panel share-panel"><div className="hint hint--danger">{error}</div></div> : null}

        {!loading && !error && staff ? (
          <div className="share-panel">
            <div className="share-panel__eyebrow">Lailem · 工作人员分享页</div>
            <div className="share-panel__hero">
              <div className="share-panel__hero-main">
                <div className="share-panel__avatar-wrap">
                  {staffAvatarSrc(staff) ? (
                    <img className="share-panel__avatar" src={staffAvatarSrc(staff)} alt={staff.name} />
                  ) : (
                    <div className="share-panel__avatar share-panel__avatar--placeholder" />
                  )}
                </div>
                <div className="share-panel__hero-text">
                  <div className="share-panel__title-row">
                    <h1 className="share-panel__name">{staff.name}</h1>
                    <span className={`pill ${staff.status === 'available' ? 'pill--ok' : 'pill--muted'}`}>
                      {staff.status === 'available' ? '可接单' : '档期满'}
                    </span>
                  </div>
                  {staff.highlight ? <div className="share-panel__highlight">{staff.highlight}</div> : null}
                  <div className="share-panel__facts">
                    <div className="share-panel__fact">
                      <span className="share-panel__fact-label">服务区域</span>
                      <span className="share-panel__fact-value">{staff.area || '待补充'}</span>
                    </div>
                    <div className="share-panel__fact">
                      <span className="share-panel__fact-label">年龄</span>
                      <span className="share-panel__fact-value">{staff.age ? `${staff.age} 岁` : '待补充'}</span>
                    </div>
                    <div className="share-panel__fact">
                      <span className="share-panel__fact-label">籍贯</span>
                      <span className="share-panel__fact-value">{staff.nativePlace || '待补充'}</span>
                    </div>
                    <div className="share-panel__fact">
                      <span className="share-panel__fact-label">经验</span>
                      <span className="share-panel__fact-value">{staff.years} 年</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="share-panel__hero-actions">
                <ShareButton staff={staff} className="button button--primary button--share" label="分享此页" />
                <Link to="/" className="button button--ghost button--share">
                  返回首页
                </Link>
              </div>
            </div>

            {staff.bio ? (
              <div className="share-panel__section">
                <div className="share-panel__section-title">个人简介</div>
                <div className="share-panel__section-body">{staff.bio}</div>
              </div>
            ) : null}

            {staff.skills.length ? (
              <div className="share-panel__section">
                <div className="share-panel__section-title">技能标签</div>
                <div className="tags">
                  {staff.skills.map((t) => (
                    <span key={t} className={`tag tag--variant-${tagVariant(t)}`}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {staff.albums && staff.albums.length ? (
              <div className="share-panel__section">
                <div className="share-panel__section-title">照片集</div>
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
                              alt={`${staff.name}-share-album-${index}-${i}`}
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
