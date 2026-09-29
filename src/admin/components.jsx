import { createContext, useCallback, useContext, useState } from 'react'
import { formatMoney } from './currencies.js'

// ---------- Toasts ----------
const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

// ---------- Modal ----------
export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 820 } : undefined}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

// ---------- Badges & helpers ----------
export function statusClass(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '-')
}

export function Badge({ value }) {
  return <span className={`badge ${statusClass(value)}`}>{value}</span>
}

export function Progress({ value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${value ?? 0}%` }} />
      </div>
      <span style={{ fontSize: 12, color: '#6b7280' }}>{value ?? 0}%</span>
    </div>
  )
}

export function Field({ label, required, children }) {
  return (
    <div className="field">
      {label && (
        <label>
          {label} {required && <span className="required-star-a">*</span>}
        </label>
      )}
      {children}
    </div>
  )
}

export function EmptyState({ icon = '📦', title, hint }) {
  return (
    <div className="empty-state">
      <div className="big">{icon}</div>
      <div style={{ fontWeight: 600, color: '#1f2937' }}>{title}</div>
      {hint && <div style={{ fontSize: 13, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export function fmtMoney(n, currency = 'NGN') {
  return formatMoney(n, currency)
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
