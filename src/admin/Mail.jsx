import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api.js'
import { EmptyState, fmtDate } from './components.jsx'

const STATUS = {
  sent: { label: 'Sent', bg: '#ecfdf5', fg: '#047857' },
  failed: { label: 'Failed', bg: '#fef2f2', fg: '#b91c1c' },
  simulated: { label: 'Simulated', bg: '#fffbeb', fg: '#b45309' },
}

export default function Mail() {
  const [emails, setEmails] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api('/admin/emails')
      .then((d) => setEmails(d.emails || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = emails.filter(
    (m) =>
      !q ||
      [m.to_email, m.subject, m.kind, m.tracking_number, m.sent_by, m.error]
        .join(' ')
        .toLowerCase()
        .includes(q.toLowerCase()),
  )

  return (
    <>
      <div className="page-head">
        <div>
          <h3>Mail</h3>
          <div className="sub">
            Every email the system has sent to customers — confirmations, status updates and invoices.
          </div>
        </div>
        <button className="btn-ghost-a btn-sm-a" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      <div className="toolbar">
        <input
          placeholder="Filter by recipient, subject, tracking number…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 300 }}
        />
      </div>

      <div className="a-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Status</th>
                <th>Type</th>
                <th>To</th>
                <th>Subject</th>
                <th>Shipment</th>
                <th>Sent by</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const s = STATUS[m.status] || { label: m.status || '—', bg: '#f3f4f6', fg: '#4b5563' }
                return (
                  <tr key={m.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12.5, color: '#6b7280' }}>
                      {fmtDate(m.created_at)}
                    </td>
                    <td>
                      <span
                        style={{
                          background: s.bg,
                          color: s.fg,
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.label}
                      </span>
                      {m.error && (
                        <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4, maxWidth: 220 }}>
                          {m.error}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12.5, color: '#4b5563' }}>{m.kind || '—'}</td>
                    <td>{m.to_email}</td>
                    <td style={{ color: '#4b5563' }}>{m.subject}</td>
                    <td>
                      {m.tracking_number ? (
                        <Link className="mono" to={`/admin/shipments/${m.shipment_id}`}>
                          {m.tracking_number}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ fontSize: 12.5, color: '#6b7280' }}>{m.sent_by || '—'}</td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon="✉️"
                      title="No emails yet"
                      hint="Emails appear here when the system sends confirmations, status updates or invoices to customers."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
