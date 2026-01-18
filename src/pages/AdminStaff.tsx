import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { apiCreateStaff, apiDeleteStaff, apiListStaff, apiUpdateStaff, type Staff, type StaffInput } from '../lib/api'
import { getAdminToken, isDevAdminBypass } from '../lib/auth'
import { fileToCompressedDataUrl } from '../lib/image'

function emptyInput(): StaffInput {
  return {
    name: '',
    area: '',
    highlight: '',
    bio: '',
    skills: [],
    years: 0,
    sortOrder: 0,
    status: 'available',
    avatarData: null,
    avatarUrl: '',
    albums: [],
  }
}

export default function AdminStaff() {
  const token = getAdminToken()
  const devBypass = isDevAdminBypass()
  const [items, setItems] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<StaffInput>(emptyInput())
  const [skillsText, setSkillsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [polishing, setPolishing] = useState(false)

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0) || b.updatedAt.localeCompare(a.updatedAt))
  }, [items])

  useEffect(() => {
    if (!token && !devBypass) return
    let cancelled = false
    setLoading(true)
    setError(null)
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
  }, [token, devBypass])

  if (!token && !devBypass) return <Navigate to="/admin/login" replace />

  function openCreate() {
    setEditingId(null)
    setForm(emptyInput())
    setSkillsText('')
    setDrawerOpen(true)
  }

  function openEdit(staff: Staff) {
    setEditingId(staff.id)
    setForm({
      name: staff.name,
      area: staff.area,
      highlight: staff.highlight,
      bio: staff.bio,
      skills: staff.skills,
      years: staff.years,
      sortOrder: staff.sortOrder,
      status: staff.status,
      avatarData: staff.avatarData,
      avatarUrl: staff.avatarUrl,
      albums: staff.albums || [],
    })
    setSkillsText(staff.skills.join('，'))
    setDrawerOpen(true)
  }

  function applySkills(text: string) {
    const arr = text
      .split(/[，,、\s]+/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 16)
    setForm((p) => ({ ...p, skills: arr }))
  }

  function addAlbum() {
    setForm((p) => {
      const albums = p.albums ? [...p.albums] : []
      if (albums.length >= 4) return p
      albums.push({ title: '', images: [] })
      return { ...p, albums }
    })
  }

  function updateAlbumTitle(index: number, title: string) {
    setForm((p) => {
      const albums = p.albums ? [...p.albums] : []
      if (!albums[index]) return p
      albums[index] = { ...albums[index], title }
      return { ...p, albums }
    })
  }

  function removeAlbum(index: number) {
    setForm((p) => {
      const albums = p.albums ? [...p.albums] : []
      if (!albums[index]) return p
      albums.splice(index, 1)
      return { ...p, albums }
    })
  }

  async function polishBio() {
    const original = form.bio.trim()
    if (!original) return

    setPolishing(true)
    setError(null)
    try {
      const apiKey = 'sk-66fa2031cc8e4645b7e9bed535f6143a'
      if (!apiKey) {
        throw new Error('请先在前端代码中填写通义千问 API Key')
      }

      const resp = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          messages: [
            {
              role: 'system',
              content:
                '你是一个资深文案编辑，专门为家政服务人员润色中文简介，在不改变事实的前提下，提升表述的流畅度、专业度和亲和力，适合展示在公司官网的人员介绍中，统一使用第一人称书写。',
            },
            {
              role: 'user',
              content: `请帮我润色下面这段简介，不要虚构新的经历或信息，只优化表述：\n\n${original}`,
            },
          ],
        }),
      })

      if (!resp.ok) {
        let message = 'AI润色失败，请稍后重试'
        try {
          const data = (await resp.json()) as unknown
          if (data && typeof data === 'object' && 'error' in data) {
            const errObj = (data as { error?: unknown }).error
            if (errObj && typeof errObj === 'object' && 'message' in (errObj as Record<string, unknown>)) {
              const m = (errObj as { message?: unknown }).message
              if (typeof m === 'string' && m.trim()) message = m.trim()
            }
          }
        } catch {
          // ignore parse error
        }
        throw new Error(message)
      }

      const data = (await resp.json()) as any
      const content =
        data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        typeof data.choices[0].message.content === 'string'
          ? data.choices[0].message.content.trim()
          : ''

      if (!content) {
        throw new Error('AI没有返回润色结果，请稍后重试')
      }

      setForm((p) => ({ ...p, bio: content }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI润色失败')
    } finally {
      setPolishing(false)
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const normalized: StaffInput = {
        ...form,
        name: form.name.trim(),
        area: form.area.trim(),
        highlight: form.highlight.trim(),
        bio: form.bio.trim(),
        avatarUrl: form.avatarUrl.trim(),
      }

      if (!token) throw new Error('token_required')
      if (!normalized.name) throw new Error('name_required')

      if (editingId) {
        const resp = await apiUpdateStaff(token, editingId, normalized)
        setItems((prev) => prev.map((x) => (x.id === editingId ? resp.staff : x)))
      } else {
        const resp = await apiCreateStaff(token, normalized)
        setItems((prev) => [...prev, resp.staff])
      }
      setDrawerOpen(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'save_failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="hero hero--row">
        <div>
          <div className="hero__title">人员管理后台</div>
          <div className="hero__sub">新增/编辑后首页将自动排版展示</div>
        </div>
        <button className="button button--primary" onClick={openCreate}>
          新增人员
        </button>
      </div>

      <div className="panel">
        {loading ? <div className="hint">加载中…</div> : null}
        {error ? <div className="hint hint--danger">{error}</div> : null}

        <div className="table">
          <div className="table__head">
            <div>人员</div>
            <div>区域</div>
            <div>状态</div>
            <div>排序</div>
            <div className="table__right">操作</div>
          </div>
          {sorted.map((s) => (
            <div key={s.id} className="table__row">
              <div className="row-person">
                <div className="avatar">
                  {s.avatarData || s.avatarUrl ? (
                    <img className="avatar__img" src={s.avatarData || s.avatarUrl} alt={s.name} />
                  ) : null}
                </div>
                <div className="row-person__text">
                  <div className="row-person__name">{s.name}</div>
                  <div className="row-person__sub">{s.highlight || '—'}</div>
                </div>
              </div>
              <div>{s.area || '—'}</div>
              <div>{s.status === 'available' ? '可接单' : '档期满'}</div>
              <div>{s.sortOrder}</div>
              <div className="table__right">
                <button className="button button--ghost" onClick={() => openEdit(s)}>
                  编辑
                </button>
                <button
                  className="button button--danger"
                  onClick={async () => {
                    if (!confirm(`确认删除 ${s.name} 吗？`)) return
                    try {
                      if (!token) {
                        setError('token_required')
                        return
                      }
                      await apiDeleteStaff(token, s.id)
                      setItems((prev) => prev.filter((x) => x.id !== s.id))
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : 'delete_failed')
                    }
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {drawerOpen ? (
        <div className="drawer-overlay" role="dialog" aria-modal="true">
          <div className="drawer">
            <div className="drawer__head">
              <div className="drawer__title">{editingId ? '编辑人员' : '新增人员'}</div>
              <button className="button button--ghost" onClick={() => setDrawerOpen(false)}>
                关闭
              </button>
            </div>

            <div className="drawer__body">
              <div className="form-grid">
                <label className="field">
                  <div className="field__label">姓名 *</div>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </label>

                <label className="field">
                  <div className="field__label">服务区域</div>
                  <input
                    className="input"
                    value={form.area}
                    onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                    placeholder="如：浦东 / 徐汇"
                  />
                </label>

                <label className="field">
                  <div className="field__label">从业年限</div>
                  <div className="number-input">
                    <input
                      className="input number-input__field"
                      type="number"
                      min={0}
                      max={80}
                      value={form.years}
                      onChange={(e) => setForm((p) => ({ ...p, years: Number(e.target.value || 0) }))}
                    />
                    <div className="number-input__buttons">
                      <button
                        type="button"
                        className="number-input__btn"
                        onClick={() =>
                          setForm((p) => {
                            const next = Math.min((p.years || 0) + 1, 80)
                            return { ...p, years: next }
                          })
                        }
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="number-input__btn"
                        onClick={() =>
                          setForm((p) => {
                            const next = Math.max((p.years || 0) - 1, 0)
                            return { ...p, years: next }
                          })
                        }
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </label>

                <label className="field">
                  <div className="field__label">状态</div>
                  <select
                    className="select"
                    value={form.status}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === 'available' || v === 'busy') setForm((p) => ({ ...p, status: v }))
                    }}
                  >
                    <option value="available">可接单</option>
                    <option value="busy">档期满</option>
                  </select>
                </label>

                <label className="field field--full">
                  <div className="field__label">一句话亮点</div>
                  <input
                    className="input"
                    value={form.highlight}
                    onChange={(e) => setForm((p) => ({ ...p, highlight: e.target.value }))}
                    placeholder="如：擅长月子餐与新生儿护理"
                  />
                </label>

                <label className="field field--full">
                  <div className="field__label">技能标签（可以用逗号、顿号、空格分隔）</div>
                  <input
                    className="input"
                    value={skillsText}
                    onChange={(e) => {
                      setSkillsText(e.target.value)
                      applySkills(e.target.value)
                    }}
                    placeholder="如：月子餐, 早教、产后恢复 月子中心"
                  />
                </label>

                <label className="field field--full">
                  <div
                    className="field__label"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                  >
                    <span>简介</span>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={polishBio}
                      disabled={polishing || !form.bio.trim()}
                    >
                      {polishing ? 'AI润色中…' : 'AI润色'}
                    </button>
                  </div>
                  <textarea
                    className="textarea"
                    value={form.bio}
                    onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                    rows={4}
                  />
                </label>

                <label className="field">
                  <div className="field__label">排序权重</div>
                  <div className="number-input">
                    <input
                      className="input number-input__field"
                      type="number"
                      min={0}
                      max={9999}
                      value={form.sortOrder}
                      onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value || 0) }))}
                    />
                    <div className="number-input__buttons">
                      <button
                        type="button"
                        className="number-input__btn"
                        onClick={() =>
                          setForm((p) => {
                            const next = Math.min((p.sortOrder || 0) + 1, 9999)
                            return { ...p, sortOrder: next }
                          })
                        }
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="number-input__btn"
                        onClick={() =>
                          setForm((p) => {
                            const next = Math.max((p.sortOrder || 0) - 1, 0)
                            return { ...p, sortOrder: next }
                          })
                        }
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </label>

                <label className="field">
                  <div className="field__label">头像（上传）</div>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const dataUrl = await fileToCompressedDataUrl(file, {
                          maxSize: 640,
                          quality: 0.85,
                          maxBytes: 900_000,
                        })
                        setForm((p) => ({ ...p, avatarData: dataUrl, avatarUrl: '' }))
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : 'image_failed')
                      }
                    }}
                  />
                </label>
                {form.avatarData || form.avatarUrl ? (
                  <div className="field field--full">
                    <div className="field__label">预览</div>
                    <div className="preview">
                      <img className="preview__img" src={form.avatarData || form.avatarUrl} alt="preview" />
                    </div>
                  </div>
                ) : null}

                {(form.albums || []).map((album, index) => (
                  <div key={index} className="field field--full">
                    <div className="field__label">分组照片 {index + 1}</div>
                    <div className="field">
                      <input
                        className="input"
                        placeholder="分组名称，如：生活照 / 工作场景"
                        value={album.title}
                        onChange={(e) => updateAlbumTitle(index, e.target.value)}
                      />
                    </div>
                    <div className="album-preview">
                      {album.images.map((img, i) => (
                        <img key={i} className="album-preview__img" src={img} alt={`album-${index}-${i}`} />
                      ))}
                      <label className="album-upload">
                        <input
                          className="album-upload__input"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={async (e) => {
                            const files = e.target.files
                            if (!files || files.length === 0) return
                            try {
                              const images: string[] = []
                              const maxFiles = Math.min(files.length, 6)
                              for (let i = 0; i < maxFiles; i++) {
                                const dataUrl = await fileToCompressedDataUrl(files[i], {
                                  maxSize: 640,
                                  quality: 0.8,
                                  maxBytes: 900_000,
                                })
                                images.push(dataUrl)
                              }
                              setForm((p) => {
                                const albums = p.albums ? [...p.albums] : []
                                const current = albums[index] || { title: '', images: [] }
                                const mergedImages = [...current.images, ...images].slice(0, 12)
                                albums[index] = { ...current, images: mergedImages }
                                return { ...p, albums }
                              })
                            } catch (err: unknown) {
                              setError(err instanceof Error ? err.message : 'image_failed')
                            } finally {
                              e.target.value = ''
                            }
                          }}
                        />
                        <span className="album-upload__box">+</span>
                      </label>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => removeAlbum(index)}
                      >
                        删除该分组
                      </button>
                    </div>
                  </div>
                ))}

                <div className="field field--full">
                  <button type="button" className="button button--ghost" onClick={addAlbum}>
                    新增照片分组
                  </button>
                </div>
              </div>
            </div>

            <div className="drawer__foot">
              <button className="button button--ghost" onClick={() => setDrawerOpen(false)} disabled={saving}>
                取消
              </button>
              <button className="button button--primary" onClick={save} disabled={saving}>
                {saving ? '提交中…' : '提交'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
