import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal, fmtDate } from './components.jsx'

// Shared pieces for the three mail views (Compose / Inbox / Sent):
// status pills, a defensive HTML sanitizer for customer replies, and the
// big, bold "reading pane" modal used to preview a message in full size.

export const STATUS = {
  sent: { label: 'Sent', bg: '#ecfdf5', fg: '#047857' },
  failed: { label: 'Failed', bg: '#fef2f2', fg: '#b91c1c' },
  simulated: { label: 'Simulated', bg: '#fffbeb', fg: '#b45309' },
  received: { label: 'Reply', bg: '#eff6ff', fg: '#1d4ed8' },
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Bold status pill (+ the delivery error under it when there is one). */
export function StatusPill({ status, error }) {
  const s = STATUS[status] || { label: status || '—', bg: '#f3f4f6', fg: '#4b5563' }
  return (
    <>
      <span
        style={{
          display: 'inline-block',
          background: s.bg,
          color: s.fg,
          fontSize: 12.5,
          fontWeight: 700,
          padding: '4px 11px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
        }}
      >
        {s.label}
      </span>
      {error && (
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#b91c1c', marginTop: 5, maxWidth: 260 }}>
          {error}
        </div>
      )}
    </>
  )
}

/**
 * Strip anything that could execute or load active content from a customer's
 * HTML reply before rendering it in the admin console, and force links to open
 * in a new tab. (Plain text is the default view — this backs the optional
 * "original formatting" toggle.)
 */
export function sanitizeEmailHtml(html) {
  let out = String(html || '')
  out = out.replace(/<!--[\s\S]*?-->/g, '')
  out = out.replace(/<(script|style|iframe|frame|frameset|object|embed|link|meta|base|form|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '')
  out = out.replace(/<(script|iframe|frame|frameset|object|embed|link|meta|base|form|svg|math)\b[^>]*>/gi, '')
  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  out = out.replace(/\b(href|src|action|formaction)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"')
  out = out.replace(/\b(href|src|action|formaction)\s*=\s*javascript:[^\s>]+/gi, '$1="#"')
  out = out.replace(/<a\s+/gi, '<a target="_blank" rel="noopener noreferrer" ')
  return out
}

function MetaRow({ label, children }) {
  return (
    <div className="row">
      <div className="k">{label}</div>
      <div className="v">{children}</div>
    </div>
  )
}

/**
 * Full-size reading pane for one mail record — used by both the Inbox
 * (customer replies) and Sent (what we delivered) lists. Everything here is
 * deliberately large and bold: 17px body text, heavy labels, big action
 * buttons.
 */
export function MailReadModal({ mail, onClose }) {
  const [view, setView] = useState('text') // 'text' | 'html'
  if (!mail) return null

  const isReply = mail.status === 'received'
  const replyTo =
    isReply && EMAIL_RE.test(mail.from_email || '')
      ? `mailto:${mail.from_email}?subject=${encodeURIComponent(`Re: ${(mail.subject || '').replace(/^re:\s*/i, '')}`)}`
      : null
  const hasText = Boolean(mail.body_text && mail.body_text.trim())
  const hasHtml = Boolean(mail.body_html)
  const showHtml = hasHtml && (!hasText || view === 'html')

  // Our own composed/branded HTML (sent records) — safe to open as a document.
  const openAsDelivered = () => {
    const win = window.open('', '_blank') // opened synchronously so pop-up blockers allow it
    if (!win) return
    win.document.write(mail.body_html)
    win.document.close()
  }

  return (
    <Modal title={isReply ? 'Customer reply — full size' : 'Email preview'} onClose={onClose} wide>
      <div className="mail-meta">
        <MetaRow label={isReply ? 'From' : 'To'}>
          <strong>{isReply ? mail.from_email || 'unknown' : mail.to_email}</strong>
        </MetaRow>
        {isReply && (
          <MetaRow label="To">{mail.to_email || '—'}</MetaRow>
        )}
        <MetaRow label="Subject">
          <strong>{mail.subject || '(no subject)'}</strong>
        </MetaRow>
        <MetaRow label={isReply ? 'Received' : 'Sent'}>{fmtDate(mail.created_at)}</MetaRow>
        {!isReply && (
          <MetaRow label="Details">
            {mail.kind || '—'}
            {mail.sent_by ? ` · by ${mail.sent_by}` : ''}
          </MetaRow>
        )}
        <MetaRow label="Shipment">
          {mail.tracking_number ? (
            <Link className="mono" to={`/admin/shipments/${mail.shipment_id}`} onClick={onClose}>
              {mail.tracking_number}
            </Link>
          ) : (
            '—'
          )}
        </MetaRow>
      </div>

      {isReply && hasText && hasHtml && (
        <div className="mail-view-toggle">
          <button
            type="button"
            className={`mail-view-btn${view === 'text' ? ' active' : ''}`}
            onClick={() => setView('text')}
          >
            📄 Big readable text
          </button>
          <button
            type="button"
            className={`mail-view-btn${view === 'html' ? ' active' : ''}`}
            onClick={() => setView('html')}
          >
            🎨 Original formatting
          </button>
        </div>
      )}

      {showHtml ? (
        <div className="mail-html" dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(mail.body_html) }} />
      ) : (
        <div className="mail-read-body">
          {hasText ? mail.body_text : '(no text body in this message)'}
        </div>
      )}

      <div className="mail-read-actions">
        {replyTo && (
          <a className="btn-a btn-primary-a" href={replyTo}>
            ↩ Reply to this customer
          </a>
        )}
        {!isReply && hasHtml && (
          <button type="button" className="btn-a btn-ghost-a" onClick={openAsDelivered}>
            👁 Open exactly as delivered
          </button>
        )}
        <button type="button" className="btn-a btn-ghost-a" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}
