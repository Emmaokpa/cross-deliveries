import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api.js'
import { EmptyState, fmtDate } from './components.jsx'
import { MailReadModal, StatusPill } from './MailBits.jsx'

// ─────────────────────────────────────────────────────────────────
// Admin → Inbox — a section of its own, dedicated to mail RECEIVED from
// customers. Replies synced from the mailbox (services/mail-sync.js) are
// listed here with bold, readable rows; clicking one opens the full-size
// reading pane (17px text, bold headers, one-click reply button).
// ─────────────────────────────────────────────────────────────────

export default function Inbox() {
  const [emails, setEmails] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [openMail, setOpenMail] = useState(null)

  const fetchEmails = useCallback(
    () =>
      api('/admin/emails')
        .then((d) => setEmails((d.emails || []).filter((m) => m.status === 'received')))
        .catch(() => {}),
    [],
  )

  const load = useCallback(() => {
    setLoading(true)
    fetchEmails().finally(() => setLoading(false))
  }, [fetchEmails])

  useEffect(() => {
    load()
  }, [load])

  // Background auto-refresh — the mailbox is synced every 30s, so re-check
  // every 10s (skipped while the tab is hidden) and new replies show up on
  // their own without clicking Refresh.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.hidden) return
      fetchEmails()
    }, 10_000)
    return () => clearInterval(t)
  }, [fetchEmails])

  const filtered = emails.filter(
    (m) =>
      !q ||
      [m.from_email, m.to_email, m.subject, m.tracking_number, m.body_text]
        .join(' ')
        .toLowerCase()
        .includes(q.toLowerCase()),
  )

  return (
    <>
      <div className="page-head">
        <div>
          <h3>Inbox — replies received</h3>
          <div className="sub">
            Every message customers have sent back to us, previewed at full size so you can read exactly
            what they said.
          </div>
        </div>
        <button className="btn-ghost-a btn-sm-a" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      <div className="mail-tabs">
        <Link className="mail-tab mail-tab-link" to="/admin/mail">
          ✉️ Compose
        </Link>
        <Link className="mail-tab mail-tab-link" to="/admin/mail">
          📤 Sent
        </Link>
        <button className="mail-tab active">
          📥 Inbox <span className="pill">{emails.length}</span>
        </button>
      </div>

      <div className="toolbar">
        <input
          placeholder="Filter by sender, subject, tracking number…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 300, fontSize: 14.5 }}
        />
      </div>

      <div className="a-card">
        <div className="table-wrap">
          <table className="data-table mail-table">
            <thead>
              <tr>
                <th>Received</th>
                <th>Status</th>
                <th>From</th>
                <th>Subject</th>
                <th>Shipment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} onClick={() => setOpenMail(m)} style={{ cursor: 'pointer' }} title="Click to read the full reply">
                  <td className="when">{fmtDate(m.created_at)}</td>
                  <td>
                    <StatusPill status={m.status} />
                  </td>
                  <td className="addr">{m.from_email || '—'}</td>
                  <td className="subject">
                    {m.subject}
                    <span style={{ color: '#9ca3af', marginLeft: 6 }}>▾</span>
                  </td>
                  <td>
                    {m.tracking_number ? (
                      <Link className="mono" to={`/admin/shipments/${m.shipment_id}`}>
                        {m.tracking_number}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-a btn-primary-a btn-sm-a"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMail(m)
                      }}
                    >
                      📖 Read
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon="📥"
                      title="No replies yet"
                      hint="When a customer answers one of our emails, it appears here automatically — click a message to read it in full size and reply with one click."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MailReadModal mail={openMail} onClose={() => setOpenMail(null)} />
    </>
  )
}
