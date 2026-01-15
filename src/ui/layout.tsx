import { Link, Outlet } from 'react-router-dom'
import { clearAdminToken, getAdminToken } from '../lib/auth'

export function AppLayout() {
  const isAdmin = Boolean(getAdminToken())

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="brand">
            <div className="brand__mark" aria-hidden />
            <div className="brand__text">
              <div className="brand__name">月嫂人员管理</div>
              <div className="brand__sub">Staff Directory</div>
            </div>
          </Link>

          <nav className="nav">
            <Link to="/" className="nav__link">
              首页
            </Link>
            {isAdmin ? (
              <>
                <Link to="/admin/staff" className="nav__link">
                  管理后台
                </Link>
                <button
                  className="button button--ghost"
                  onClick={() => {
                    clearAdminToken()
                    window.location.href = '/'
                  }}
                >
                  退出
                </button>
              </>
            ) : (
              <Link to="/admin/login" className="button button--primary">
                管理员登录
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer__inner">© {new Date().getFullYear()} 月嫂公司人员管理</div>
      </footer>
    </div>
  )
}

