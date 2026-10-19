import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api.js'
import { EmptyState, fmtDate, useToast } from './components.jsx'
import { MailReadModal, StatusPill } from './MailBits.jsx'

// ─────────────────────────────────────────────────────────────────
// Admin → Mail — outbound mail centre with two bold sections:
//   ✉️ Compose — type ANY recipient address(es), a subject and a body;
//      the message goes out in the same dark brand template as the
//      confirmation letter / status email (live preview while typing),
//      including the "Click Here to Reply to This Email" button.
//   📤 Sent    — every delivery attempt with its status and the exact
//      body that went out, readable at full size.
// Customer replies live in their own section: Admin → Inbox.
// ─────────────────────────────────────────────────────────────────

function Compose({ onSent }) {
  const toast = useToast()
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState('')
  const reqId = useRef(0)

  // Live preview: re-render the real server template 500ms after typing stops
  // (subject + body are both required by the preview endpoint, like the send).
  useEffect(() => {
    const id = ++reqId.current
    if (!subject.trim() || !message.trim()) {
      setPreview('')
      return undefined
    }
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ subject, body: message }).toString()
      api(`/admin/mail/preview?${qs}`)
        .then((html) => {
          if (reqId.current === id) setPreview(html)
        })
        .catch(() => {}) // preview is best-effort; real validation happens on send
    }, 500)
    return () => clearTimeout(t)
  }, [subject, message])

  const recipients = [...new Set(to.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))]
  const busy = sending

  const reset = () => {
    setTo('')
    setSubject('')
    setMessage('')
    setPreview('')
    setError(null)
  }

  const send = async () => {
    setError(null)
    setSending(true)
    try {
      const d = await api('/admin/mail/send', { method: 'POST', body: { to, subject, body: message } })
      toast(d.message, d.ok || d.simulated ? 'ok' : 'err')
      reset()
      onSent?.(d)
    } catch (e) {
      setError(e.message) // validation problems (bad address, empty field…) stay on the form
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mail-compose">
      <div className="a-card a-card-pad">
        <h4 className="mail-card-title">✍️ Compose new email</h4>

        {error && <div className="alert-a alert-error" style={{ fontWeight: 600 }}>⚠️ {error}</div>}

        <div className="field">
          <label>
            Recipients — To <span className="required-star-a">*</span>
          </label>
          <textarea
            rows={4}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={'client@example.com\npartner@company.org, john.doe@gmail.com'}
            disabled={busy}
          />
          <div className="field-hint">
            Separate addresses with a comma, space or new line — <strong>any address works</strong>, the
            person does not need an account on the site.
            {recipients.length > 1 && (
              <>
                {' '}
                · <strong style={{ color: 'var(--a-navy)' }}>{recipients.length} recipients</strong>
              </>
            )}
          </div>
        </div>

        <div className="field">
          <label>
            Subject <span className="required-star-a">*</span>
          </label>
          <input
            type="text"
            maxLength={300}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Update on your upcoming delivery"
            disabled={busy}
          />
        </div>

        <div className="field">
          <label>
            Message <span className="required-star-a">*</span>
          </label>
          <textarea
            rows={13}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={'Hello,\n\nType your message here…\n\nBest regards,\nCross Borders Deliveries'}
            disabled={busy}
          />
          <div className="field-hint">
            Blank lines start a new paragraph. The reply button and letterhead are added automatically.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-a btn-primary-a" onClick={send} disabled={busy}>
            {busy ? 'Sending…' : `✉️ Send email${recipients.length > 1 ? ` to ${recipients.length} recipients` : ''}`}
          </button>
          <button className="btn-a btn-ghost-a" onClick={reset} disabled={busy || (!to && !subject && !message)}>
            Clear
          </button>
        </div>
      </div>

      <div className="a-card a-card-pad">
        <h4 className="mail-card-title">👁 Live preview</h4>
        <div className="field-hint" style={{ marginTop: -4, marginBottom: 12 }}>
          Exactly what recipients receive — the same dark brand template as the confirmation letter and
          status email, with the bold <strong>“Click Here to Reply to This Email”</strong> button included.
        </div>
        {preview ? (
          <iframe className="mail-preview-frame" srcDoc={preview} sandbox="" title="Email preview" />
        ) : (
          <div className="mail-preview-empty">
            Type a <strong>subject</strong> and <strong>message</strong> — the real email template appears
            here as you type.
          </div>
        )}
      </div>
    </div>
  )
}

export default function Mail() {
  const [tab, setTab] = useState('compose') // 'compose' | 'sent'
  const [emails, setEmails] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [openMail, setOpenMail] = useState(null)
  const [flash, setFlash] = useState(null)

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

  const sent = emails.filter((m) => m.status !== 'received')
  const filtered = sent.filter(
    (m) =>
      !q ||
      [m.to_email, m.subject, m.kind, m.tracking_number, m.sent_by, m.error, m.body_text]
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
            Compose and send emails to any address, and review everything the system has delivered —
            confirmations, status updates, invoices and your own messages.
          </div>
        </div>
        <button className="btn-ghost-a btn-sm-a" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      <div className="mail-tabs">
        <button className={`mail-tab${tab === 'compose' ? ' active' : ''}`} onClick={() => setTab('compose')}>
          ✉️ Compose
        </button>
        <button className={`mail-tab${tab === 'sent' ? ' active' : ''}`} onClick={() => setTab('sent')}>
          📤 Sent <span className="pill">{sent.length}</span>
        </button>
        <Link className="mail-tab mail-tab-link" to="/admin/inbox">
          📥 Inbox <span className="pill">{emails.length - sent.length}</span>
        </Link>
      </div>

      {tab === 'compose' ? (
        <Compose
          onSent={(d) => {
            setFlash(d.message)
            setTab('sent')
            load()
          }}
        />
      ) : (
        <>
          {flash && (
            <div className="alert-a alert-info" style={{ fontWeight: 600, fontSize: 14.5 }}>
              ✅ {flash}
            </div>
          )}
          <div className="toolbar">
            <input
              placeholder="Filter by recipient, subject, tracking number…"
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
                    <th>Time</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>To</th>
                    <th>Subject</th>
                    <th>Shipment</th>
                    <th>Sent by</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const hasBody = Boolean(m.body_text || m.body_html)
                    return (
                      <tr
                        key={m.id}
                        onClick={hasBody ? () => setOpenMail(m) : undefined}
                        style={hasBody ? { cursor: 'pointer' } : undefined}
                        title={hasBody ? 'Click to read the full message' : undefined}
                      >
                        <td className="when">{fmtDate(m.created_at)}</td>
                        <td>
                          <StatusPill status={m.status} error={m.error} />
                        </td>
                        <td style={{ fontWeight: 600, color: '#4b5563' }}>{m.kind || '—'}</td>
                        <td className="addr">{m.to_email}</td>
                        <td className="subject">
                          {m.subject}
                          {hasBody && <span style={{ color: '#9ca3af', marginLeft: 6 }}>▾</span>}
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
                        <td style={{ fontWeight: 600, color: '#6b7280' }}>{m.sent_by || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          {hasBody && (
                            <button
                              className="btn-a btn-ghost-a btn-sm-a"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMail(m)
                              }}
                            >
                              👁 Read
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          icon="📤"
                          title="No sent emails yet"
                          hint="Use the Compose tab to send your first email — every delivery attempt is recorded here with its status."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <MailReadModal mail={openMail} onClose={() => setOpenMail(null)} />
    </>
  )
}
