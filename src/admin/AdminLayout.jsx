import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { api, getToken, setToken } from './api.js'

export default function AdminLayout() {
  const [admin, setAdmin] = useState(null)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!getToken()) return navigate('/admin/login')
    api('/auth/me')
      .then((d) => setAdmin(d.admin))
      .catch(() => navigate('/admin/login'))
  }, [navigate])

  useEffect(() => {
    const onLogout = () => navigate('/admin/login')
    window.addEventListener('cbd:logout', onLogout)
    return () => window.removeEventListener('cbd:logout', onLogout)
  }, [navigate])

  const logout = () => {
    setToken(null)
    navigate('/admin/login')
  }

  if (!admin) return <div className="admin-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Loading…</div>

  const initials = admin.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="admin-root">
      <div className="admin-shell">
        <aside className={`admin-sidebar${open ? ' open' : ''}`}>
          <div className="admin-brand">
            <div className="brand-mark">CBD</div>
            <div className="brand-name">
              CrossBorders
              <small>Admin Panel</small>
            </div>
          </div>
          <nav className="admin-nav" onClick={() => setOpen(false)}>
            <NavLink to="/admin" end>📊 Dashboard</NavLink>
            <NavLink to="/admin/shipments">📦 Shipments</NavLink>
            {admin.role === 'super_admin' && <NavLink to="/admin/users">👥 Staff Accounts</NavLink>}
            {admin.role === 'super_admin' && <NavLink to="/admin/audit">🧾 Audit Log</NavLink>}
          </nav>
          <div className="admin-sidebar-footer">
            <div className="admin-user-chip">
              <div className="avatar">{initials}</div>
              <div className="who">
                <div className="n">{admin.name}</div>
                <div className="r">{admin.role.replace('_', ' ')}</div>
              </div>
              <button className="x-btn" title="Sign out" onClick={logout}>⎋</button>
            </div>
          </div>
        </aside>

        {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
        <div className="admin-main">
          <header className="admin-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <button className="btn-ghost-a btn-sm-a admin-menu-btn" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>☰</button>
              <h2>Operations Console</h2>
            </div>
            <button className="btn-ghost-a btn-sm-a" onClick={logout}>Sign out</button>
          </header>
          <main className="admin-content">
            <Outlet context={{ admin, setAdmin }} />
          </main>
        </div>
      </div>
    </div>
  )
}
