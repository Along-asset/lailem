import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiAdminLogin } from '../lib/api'
import { setAdminToken } from '../lib/auth'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="page">
      <div className="hero">
        <div className="hero__title">管理员登录</div>
        <div className="hero__sub">仅管理员可新增、编辑与删除人员信息</div>
      </div>

      <div className="panel panel--narrow">
        <label className="field">
          <div className="field__label">管理员口令</div>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入管理员口令"
          />
        </label>

        {error ? <div className="hint hint--danger">{error}</div> : null}

        <button
          className="button button--primary button--block"
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

