import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiAdminLogin } from '../lib/api'
import { setAdminToken } from '../lib/auth'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="page page--center">
      <div className="panel panel--narrow panel--auth">
        <div className="hero">
          <div className="hero__title">管理员登录</div>
          <div className="hero__sub">仅管理员可新增、编辑与删除人员信息</div>
        </div>

        <label className="field">
          <div className="password-field">
            <input
              className="input password-field__input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入管理员口令"
            />
            <button
              type="button"
              className={`password-toggle${showPassword ? ' password-toggle--active' : ''}`}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? '隐藏口令' : '查看口令'}
            >
              <span className="password-toggle__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 5C7 5 3.1 8.1 1.5 12c1.6 3.9 5.5 7 10.5 7s8.9-3.1 10.5-7C20.9 8.1 17 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                </svg>
              </span>
            </button>
          </div>
        </label>

        {error ? <div className="hint hint--danger">{error}</div> : null}

        <button
          className="button button--primary button--block button--auth-submit"
          disabled={loading || !password.trim()}
          onClick={async () => {
            setLoading(true)
            setError(null)
            try {
              const { token } = await apiAdminLogin(password.trim())
              setAdminToken(token)
              navigate('/admin/staff')
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'login_failed')
            } finally {
              setLoading(false)
            }
          }}
        >
          {loading ? '登录中…' : '登录'}
        </button>
      </div>
    </div>
  )
}
