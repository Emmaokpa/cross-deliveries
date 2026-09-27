import { useEffect, useState } from 'react'
import { api } from './api.js'
import { EmptyState, fmtDate } from './components.jsx'

const ACTION_ICON = {
  'admin.login': '🔑',
  'admin.created': '👤',
  'admin.updated': '✏️',
  'admin.password_changed': '🔒',
  'shipment.created': '📦',
  'shipment.updated': '✏️',
  'shipment.status_changed': '🚚',
  'shipment.deleted': '🗑️',
  'checkpoint.created': '📍',
  'checkpoint.updated': '✏️',
  'checkpoint.deleted': '🗑️',
  'invoice.generated': '🧾',
  'email.sent': '✉️',
  'email.simulated': '📮',
  'email.failed': '⚠️',
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [q, setQ] = useState('')

  useEffect(() => {
    api('/admin/audit-logs?limit=300')
      .then((d) => setLogs(d.logs))
      .catch(() => {})
  }, [])

  const filtered = logs.filter((l) =>
    !q || [l.action, l.admin_email, l.details].join(' ').toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <>
      <div className="page-head">
        <div>
          <h3>Audit Log</h3>
          <div className="sub">Every administrative operation, recorded with timestamp and operator.</div>
        </div>
      </div>

      <div className="toolbar">
        <input placeholder="Filter by action, admin or details…" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 300 }} />
      </div>

      <div className="a-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th></th><th>Time</th><th>Admin</th><th>Action</th><th>Details</th></tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontSize: 16 }}>{ACTION_ICON[l.action] || '•'}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12.5, color: '#6b7280' }}>{fmtDate(l.created_at)}</td>
                  <td>{l.admin_email}</td>
                  <td><span className="mono" style={{ fontSize: 12.5 }}>{l.action}</span></td>
                  <td style={{ color: '#4b5563' }}>{l.details}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={5}><EmptyState icon="🧾" title="No audit entries" hint="Operations will appear here as staff use the console." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
