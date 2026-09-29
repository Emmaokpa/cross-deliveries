import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { api, downloadBlob } from './api.js'
import { Badge, Field, Modal, Progress, fmtMoney, fmtDate, useToast } from './components.jsx'
import CopyChip from './copy.jsx'
import { CURRENCIES } from './currencies.js'

const STATUSES = ['Created', 'Shipped', 'In Transit', 'Held at Customs', 'Out for Delivery', 'Delivered', 'On Hold']

// Mirror of the backend STATUS_PROGRESS presets — shown as hints in forms
const STATUS_DEFAULTS = Object.fromEntries(STATUSES.map((s, i) => [s, [5, 20, 45, 60, 85, 100, 50][i]]))

// Signature pad: draws with mouse/touch onto a canvas, exports PNG data URL
function SignaturePad({ onChange }) {
  const ref = useRef(null)
  const drawing = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#031435'
  }, [])

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (ref.current.width / r.width), y: (e.clientY - r.top) * (ref.current.height / r.height) }
  }
  const start = (e) => {
    e.preventDefault()
    drawing.current = true
    const ctx = ref.current.getContext('2d')
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }
  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = ref.current.getContext('2d')
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    setIsEmpty(false)
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange(ref.current.toDataURL('image/png'), isEmpty)
  }
  const clear = () => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
    onChange(null, true)
  }

  return (
    <div>
      <canvas
        ref={ref}
        width={480}
        height={150}
        style={{ width: '100%', maxWidth: 480, border: '1px solid #e4e8f0', borderRadius: 10, touchAction: 'none', cursor: 'crosshair', background: '#fff' }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="button" className="btn-a btn-ghost-a btn-sm-a" onClick={clear}>Clear signature</button>
        <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>{isEmpty ? 'Draw the receiver\u2019s signature above' : 'Signature captured'}</span>
      </div>
    </div>
  )
}

// Drag / type / nudge the progress bar, then save to the API
function ProgressEditor({ value, busy, onSave }) {
  const [draft, setDraft] = useState(value ?? 0)
  useEffect(() => setDraft(value ?? 0), [value])
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))
  const shown = clamp(draft)
  const dirty = shown !== (value ?? 0)

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={shown}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Progress percentage slider"
          style={{ flex: '1 1 170px', accentColor: 'var(--a-red)', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" className="btn-a btn-ghost-a btn-sm-a" onClick={() => setDraft(shown - 1)} aria-label="Decrease 1%">−</button>
          <input
            type="number"
            min="0"
            max="100"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Progress percentage"
            style={{ width: 72, textAlign: 'center', padding: '6px 8px', border: '1px solid #e4e8f0', borderRadius: 8 }}
          />
          <button type="button" className="btn-a btn-ghost-a btn-sm-a" onClick={() => setDraft(shown + 1)} aria-label="Increase 1%">＋</button>
          <span style={{ fontSize: 12.5, color: '#6b7280' }}>%</span>
        </div>
        <button type="button" className="btn-a btn-primary-a btn-sm-a" disabled={!dirty || busy} onClick={() => onSave(shown)}>
          {busy ? 'Saving…' : dirty ? 'Update Progress' : 'Saved ✓'}
        </button>
      </div>
      <div className="progress-track" style={{ marginTop: 10 }}>
        <div className="progress-fill" style={{ width: `${shown}%`, transition: 'width 0.25s ease' }} />
      </div>
    </div>
  )
}

export default function ShipmentDetail() {
  const { id } = useParams()
  const { admin } = useOutletContext()
  const toast = useToast()
  const [shipment, setShipment] = useState(null)
  const [error, setError] = useState('')

  const [statusForm, setStatusForm] = useState({ status: 'Shipped', location: '', notes: '', backdated_timestamp: '', trigger_email: true, progress_percentage: '' })
  const [busy, setBusy] = useState(false)

  const [cpModal, setCpModal] = useState(null) // null | {mode:'add'} | {mode:'edit', cp}
  const [cpForm, setCpForm] = useState({ timestamp: '', location: '', status_tag: '', admin_notes: '', set_status: '', progress_percentage: '' })

  const [etaEdit, setEtaEdit] = useState(false)
  const [etaValue, setEtaValue] = useState('')
  const [etaBusy, setEtaBusy] = useState(false)
  const [progressBusy, setProgressBusy] = useState(false)
  const [curEdit, setCurEdit] = useState(false)
  const [curValue, setCurValue] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editBusy, setEditBusy] = useState(false)
  const [podName, setPodName] = useState('')
  const [podSig, setPodSig] = useState(null)
  const [podEmpty, setPodEmpty] = useState(true)
  const [podBusy, setPodBusy] = useState(false)

  const load = () => {
    api(`/v1/shipments/${id}`)
      .then((d) => setShipment(d.shipment))
      .catch((e) => setError(e.message))
  }
  useEffect(load, [id])

  if (error) return <div className="alert-a alert-error">{error}</div>
  if (!shipment) return <div style={{ color: '#6b7280' }}>Loading shipment…</div>

  const s = shipment

  const updateStatus = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const body = { ...statusForm }
      if (!body.backdated_timestamp) delete body.backdated_timestamp
      if (body.progress_percentage === '') delete body.progress_percentage
      const data = await api(`/v1/shipments/${s.id}/status`, { method: 'PATCH', body })
      setShipment(data.shipment)
      toast(
        `Status set to ${body.status} (${data.shipment.progress_percentage}%).${
          data.email?.simulated
            ? ' Email simulated (no Brevo key).'
            : data.email?.queued
              ? ' Email queued via Brevo.'
              : ''
        }`,
        'ok',
      )
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  const sendEmail = async () => {
    try {
      const r = await api(`/v1/shipments/${s.id}/send-email`, { method: 'POST' })
      toast(r.simulated ? 'Email simulated (no Brevo key configured).' : 'Invoice email dispatched via Brevo.', r.simulated ? 'ok' : 'ok')
      load()
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  const getInvoice = async () => {
    try {
      const blob = await api(`/v1/shipments/${s.id}/invoice.pdf`)
      downloadBlob(blob, `${s.tracking_number}-invoice.pdf`)
      toast('Invoice PDF downloaded.', 'ok')
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  const openCpAdd = () => {
    setCpForm({ timestamp: '', location: '', status_tag: s.current_status, admin_notes: '', set_status: '', progress_percentage: '' })
    setCpModal({ mode: 'add' })
  }

  const openCpEdit = (cp) => {
    setCpForm({
      timestamp: cp.timestamp ? new Date(cp.timestamp).toISOString().slice(0, 16) : '',
      location: cp.location,
      status_tag: cp.status_tag,
      admin_notes: cp.admin_notes || '',
      set_status: '',
      progress_percentage: '',
    })
    setCpModal({ mode: 'edit', cp })
  }

  const saveCp = async (e) => {
    e.preventDefault()
    try {
      const body = { ...cpForm }
      if (!body.timestamp) delete body.timestamp
      if (!body.set_status) delete body.set_status
      if (body.progress_percentage === '') delete body.progress_percentage
      if (cpModal.mode === 'add') {
        await api(`/v1/shipments/${s.id}/checkpoints`, { method: 'POST', body })
        toast(
          body.set_status || body.progress_percentage !== undefined
            ? 'Checkpoint added — journey & progress updated.'
            : 'Checkpoint added to timeline.',
          'ok',
        )
      } else {
        await api(`/v1/shipments/${s.id}/checkpoints/${cpModal.cp.id}`, { method: 'PATCH', body })
        toast('Checkpoint updated.', 'ok')
      }
      setCpModal(null)
      load()
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  const deleteCp = async (cp) => {
    if (!confirm(`Delete checkpoint at "${cp.location}"?`)) return
    try {
      await api(`/v1/shipments/${s.id}/checkpoints/${cp.id}`, { method: 'DELETE' })
      toast('Checkpoint deleted.', 'ok')
      load()
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  const recordPod = async (e) => {
    e.preventDefault()
    if (!podName.trim()) return toast('Enter the receiver\u2019s name.', 'err')
    if (podEmpty || !podSig) return toast('Capture the signature on the pad.', 'err')
    setPodBusy(true)
    try {
      const data = await api(`/v1/shipments/${s.id}/pod`, {
        method: 'POST',
        body: { receiver_name: podName, signature: podSig },
      })
      setShipment(data.shipment)
      setPodName('')
      setPodSig(null)
      setPodEmpty(true)
      toast(data.email?.simulated ? 'Delivery recorded. Email simulated (no SMTP).' : 'Delivery recorded — confirmation email sent.', 'ok')
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setPodBusy(false)
    }
  }

  const reopenFromPod = async () => {
    if (!confirm('Clear proof of delivery and reopen this shipment?')) return
    try {
      const data = await api(`/v1/shipments/${s.id}/pod`, { method: 'DELETE' })
      setShipment(data.shipment)
      toast('POD cleared — shipment reopened.', 'ok')
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  const setE = (k) => (e) => setEditForm((f) => ({ ...f, [k]: e.target.value }))

  const openEdit = () => {
    setEditForm({
      sender_name: s.sender_name || '', sender_email: s.sender_email || '', sender_phone: s.sender_phone || '', sender_address: s.sender_address || '',
      recipient_name: s.recipient_name || '', recipient_email: s.recipient_email || '', recipient_phone: s.recipient_phone || '', recipient_address: s.recipient_address || '',
      recipient_city: s.recipient_city || '', recipient_country: s.recipient_country || '',
      origin_city: s.origin_city || '', destination_city: s.destination_city || '',
      cargo_type: s.cargo_type || 'Air', package_weight: s.package_weight ?? '', package_dimensions: s.package_dimensions || '',
      package_quantity: s.package_quantity ?? 1, package_description: s.package_description || '',
      base_freight: s.base_freight ?? '', surcharge_fuel: s.surcharge_fuel ?? '', surcharge_customs: s.surcharge_customs ?? '',
      payment_status: s.payment_status || 'Unpaid', currency: s.currency || 'NGN',
    })
    setEditOpen(true)
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setEditBusy(true)
    try {
      const body = { ...editForm }
      // Blank numerics fall back to existing stored values (backend merges)
      for (const k of ['package_weight', 'package_quantity', 'base_freight', 'surcharge_fuel', 'surcharge_customs']) {
        if (body[k] === '') delete body[k]
      }
      const data = await api(`/v1/shipments/${s.id}`, { method: 'PATCH', body })
      setShipment(data.shipment)
      setEditOpen(false)
      toast('Shipment details updated.', 'ok')
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setEditBusy(false)
    }
  }

  const saveProgress = async (pct) => {
    setProgressBusy(true)
    try {
      const data = await api(`/v1/shipments/${s.id}`, { method: 'PATCH', body: { progress_percentage: pct } })
      setShipment(data.shipment)
      toast(`Progress set to ${data.shipment.progress_percentage}%.`, 'ok')
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setProgressBusy(false)
    }
  }

  const openCurEdit = () => {
    setCurValue(s.currency || 'NGN')
    setCurEdit(true)
  }

  const saveCurrency = async (e) => {
    e.preventDefault()
    try {
      const data = await api(`/v1/shipments/${s.id}`, { method: 'PATCH', body: { currency: curValue } })
      setShipment(data.shipment)
      setCurEdit(false)
      toast('Currency updated.', 'ok')
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  const openEtaEdit = () => {
    setEtaValue(s.estimated_delivery ? new Date(s.estimated_delivery).toISOString().slice(0, 16) : '')
    setEtaEdit(true)
  }

  const saveEta = async (e) => {
    e.preventDefault()
    setEtaBusy(true)
    try {
      const body = { estimated_delivery: etaValue || null }
      const data = await api(`/v1/shipments/${s.id}`, { method: 'PATCH', body })
      setShipment(data.shipment)
      setEtaEdit(false)
      toast(etaValue ? 'Estimated delivery updated.' : 'Estimated delivery cleared.', 'ok')
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setEtaBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h3>
            <Link className="mono" to={`/admin/shipments/${s.id}`} style={{ textDecoration: 'none' }}>{s.tracking_number}</Link>
            <CopyChip value={s.tracking_number} label="" className="copy-icon" title={`Copy ${s.tracking_number}`} />
            <Badge value={s.current_status} />
          </h3>
          <div className="sub">{s.origin_city || '—'} → {s.destination_city || '—'} • {s.cargo_type} freight • created {fmtDate(s.created_at)}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-a btn-primary-a" onClick={openEdit}>✎ Edit Details</button>
          <button className="btn-a btn-ghost-a" onClick={getInvoice}>⬇ Invoice PDF</button>
          <button className="btn-a btn-navy-a" onClick={sendEmail}>✉ Send / Resend Email</button>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="a-card a-card-pad">
            <h3 style={{ margin: '0 0 6px', color: 'var(--a-navy)' }}>Consignment Overview</h3>
            <ProgressEditor value={s.progress_percentage} busy={progressBusy} onSave={saveProgress} />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {curEdit ? (
                <form onSubmit={saveCurrency} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 13, color: '#6b7280' }}>Currency:</label>
                  <select value={curValue} onChange={(e) => setCurValue(e.target.value)} autoFocus style={{ padding: '5px 8px', border: '1px solid #e4e8f0', borderRadius: 8 }}>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.country} — {c.code} ({c.symbol})</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-a btn-primary-a btn-sm-a">Save</button>
                  <button type="button" className="btn-a btn-ghost-a btn-sm-a" onClick={() => setCurEdit(false)}>Cancel</button>
                </form>
              ) : (
                <>
                  <span style={{ fontSize: 13.5, color: '#374151' }}>
                    Currency: <strong>{s.currency || 'NGN'}</strong>
                  </span>
                  <button className="btn-a btn-ghost-a btn-sm-a" onClick={openCurEdit}>Edit</button>
                </>
              )}
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {etaEdit ? (
                <form onSubmit={saveEta} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 13, color: '#6b7280' }}>Estimated delivery:</label>
                  <input
                    type="datetime-local"
                    value={etaValue}
                    onChange={(e) => setEtaValue(e.target.value)}
                    autoFocus
                    style={{ padding: '4px 8px', border: '1px solid #e4e8f0', borderRadius: 8 }}
                  />
                  <button type="submit" className="btn-a btn-primary-a btn-sm-a" disabled={etaBusy}>{etaBusy ? 'Saving…' : 'Save'}</button>
                  <button type="button" className="btn-a btn-ghost-a btn-sm-a" onClick={() => setEtaEdit(false)}>Cancel</button>
                </form>
              ) : (
                <>
                  <span style={{ fontSize: 13.5, color: '#374151' }}>
                    Estimated delivery: <strong>{s.estimated_delivery ? fmtDate(s.estimated_delivery) : 'Not set'}</strong>
                  </span>
                  <button className="btn-a btn-ghost-a btn-sm-a" onClick={openEtaEdit}>Edit</button>
                </>
              )}
            </div>
            <div className="kv-list" style={{ marginTop: 14 }}>
              <div className="kv"><span className="k">Sender</span><span className="v">{s.sender_name} • {s.sender_email}</span></div>
              <div className="kv"><span className="k">Recipient</span><span className="v">{s.recipient_name} • {s.recipient_email}</span></div>
              <div className="kv"><span className="k">Delivery address</span><span className="v">{s.recipient_address || '—'}, {s.recipient_city} {s.recipient_country}</span></div>
              <div className="kv"><span className="k">Cargo</span><span className="v">{s.cargo_type} • {s.package_weight} kg • {s.package_dimensions || '—'} • ×{s.package_quantity}</span></div>
              <div className="kv"><span className="k">Description</span><span className="v">{s.package_description || '—'}</span></div>
              <div className="kv"><span className="k">Base freight</span><span className="v">{fmtMoney(s.base_freight, s.currency)}</span></div>
              <div className="kv"><span className="k">Fuel surcharge</span><span className="v">{fmtMoney(s.surcharge_fuel, s.currency)}</span></div>
              <div className="kv"><span className="k">Customs & handling</span><span className="v">{fmtMoney(s.surcharge_customs, s.currency)}</span></div>
              <div className="kv"><span className="k">Total</span><span className="v" style={{ fontWeight: 700 }}>{fmtMoney(s.total_cost, s.currency)}</span></div>
              <div className="kv"><span className="k">Payment</span><span className="v"><Badge value={s.payment_status} /></span></div>
              <div className="kv"><span className="k">Last email sent</span><span className="v">{s.email_sent_at ? fmtDate(s.email_sent_at) : 'Never'}</span></div>
            </div>
          </div>

          <div className="a-card a-card-pad">
            <h3 style={{ margin: '0 0 12px', color: 'var(--a-navy)' }}>Update Status</h3>
            <form onSubmit={updateStatus}>
              <div className="form-grid">
                <Field label="New status" required>
                  <select value={statusForm.status} onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Field>
                <Field label="Location"><input value={statusForm.location} onChange={(e) => setStatusForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Istanbul Hub" /></Field>
                <Field label="Progress % (optional)">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={statusForm.progress_percentage}
                    onChange={(e) => setStatusForm((f) => ({ ...f, progress_percentage: e.target.value }))}
                    placeholder={`default ${STATUS_DEFAULTS[statusForm.status] ?? '—'}%`}
                  />
                </Field>
                <Field label="Backdate (optional)"><input type="datetime-local" value={statusForm.backdated_timestamp} onChange={(e) => setStatusForm((f) => ({ ...f, backdated_timestamp: e.target.value }))} /></Field>
                <Field label="Trigger email">
                  <select value={statusForm.trigger_email ? 'yes' : 'no'} onChange={(e) => setStatusForm((f) => ({ ...f, trigger_email: e.target.value === 'yes' }))}>
                    <option value="yes">Yes — send status email</option>
                    <option value="no">No — internal only</option>
                  </select>
                </Field>
                <Field label="Notes"><input value={statusForm.notes} onChange={(e) => setStatusForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
              </div>
              <button className="btn-a btn-primary-a" disabled={busy}>{busy ? 'Updating…' : 'Apply Status Update'}</button>
            </form>
          </div>

          <div className="a-card a-card-pad">
            <h3 style={{ margin: '0 0 12px', color: 'var(--a-navy)' }}>Proof of Delivery</h3>
            {s.pod?.receiver_name ? (
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#e9f6ee',
                    border: '1px solid #86dfa8',
                    color: '#15803d',
                    fontWeight: 600,
                    borderRadius: 999,
                    padding: '6px 14px',
                    fontSize: 13.5,
                  }}
                >
                  ✓ Delivered — received by {s.pod.receiver_name}
                </div>
                <div style={{ marginTop: 10 }}>
                  <img
                    src={s.pod.signature}
                    alt={`Signature of ${s.pod.receiver_name}`}
                    style={{ maxWidth: 320, width: '100%', border: '1px solid #e4e8f0', borderRadius: 8, background: '#fff' }}
                  />
                </div>
                <div className="kv-list" style={{ marginTop: 10 }}>
                  <div className="kv"><span className="k">Signed at</span><span className="v">{s.pod.signed_at ? fmtDate(s.pod.signed_at) : '—'}</span></div>
                  <div className="kv"><span className="k">Delivered at</span><span className="v">{s.delivered_at ? fmtDate(s.delivered_at) : '—'}</span></div>
                  <div className="kv"><span className="k">Recorded by</span><span className="v">{s.pod.recorded_by || '—'}</span></div>
                </div>
                <button className="btn-a btn-danger-a btn-sm-a" style={{ marginTop: 12 }} onClick={reopenFromPod}>
                  Clear POD & Reopen Shipment
                </button>
              </div>
            ) : (
              <form onSubmit={recordPod}>
                <p style={{ margin: '0 0 12px', fontSize: 13.5, color: '#6b7280' }}>
                  Record who received the package. This marks the shipment <strong>Delivered</strong>, locks progress at 100%,
                  emails the customer a delivery confirmation, and shows the receiver's name on the public tracking page.
                </p>
                <div className="form-grid">
                  <Field label="Receiver name" required>
                    <input value={podName} onChange={(e) => setPodName(e.target.value)} placeholder="e.g. Chidi Okonkwo" />
                  </Field>
                </div>
                <div style={{ marginTop: 10 }}>
                  <SignaturePad onChange={(dataUrl, empty) => { setPodSig(dataUrl); setPodEmpty(empty) }} />
                </div>
                <button className="btn-a btn-primary-a" style={{ marginTop: 12 }} disabled={podBusy}>
                  {podBusy ? 'Recording…' : '✓ Record Delivery & Email Customer'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="a-card a-card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: 'var(--a-navy)' }}>Checkpoint Timeline</h3>
            <button className="btn-a btn-ghost-a btn-sm-a" onClick={openCpAdd}>＋ Add</button>
          </div>
          <div className="timeline">
            {s.checkpoints.map((cp, i) => (
              <div className={`timeline-item${i === 0 ? ' latest' : ''}`} key={cp.id}>
                <div className="t-time">{fmtDate(cp.timestamp)}</div>
                <div className="t-loc">
                  {cp.location}
                  <span className="t-tag">{cp.status_tag}</span>
                </div>
                {cp.admin_notes && <div className="t-notes">{cp.admin_notes}</div>}
                <div className="t-actions">
                  <button className="btn-a btn-ghost-a btn-sm-a" onClick={() => openCpEdit(cp)}>Edit</button>
                  <button className="btn-a btn-danger-a btn-sm-a" onClick={() => deleteCp(cp)}>Delete</button>
                </div>
              </div>
            ))}
            {!s.checkpoints.length && <div className="empty-state">No checkpoints yet.</div>}
          </div>
        </div>
      </div>

      {editOpen && editForm && (
        <Modal
          title={`Edit Shipment ${s.tracking_number}`}
          onClose={() => setEditOpen(false)}
          wide
          footer={
            <>
              <button className="btn-a btn-ghost-a" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="btn-a btn-primary-a" onClick={saveEdit} disabled={editBusy}>{editBusy ? 'Saving…' : 'Save Changes'}</button>
            </>
          }
        >
          <form onSubmit={saveEdit}>
            <h4 style={{ color: 'var(--a-navy)', margin: '0 0 10px' }}>Sender</h4>
            <div className="form-grid">
              <Field label="Name" required><input value={editForm.sender_name} onChange={setE('sender_name')} required /></Field>
              <Field label="Email" required><input type="email" value={editForm.sender_email} onChange={setE('sender_email')} required /></Field>
              <Field label="Phone"><input value={editForm.sender_phone} onChange={setE('sender_phone')} /></Field>
              <Field label="Address"><input value={editForm.sender_address} onChange={setE('sender_address')} /></Field>
            </div>

            <h4 style={{ color: 'var(--a-navy)', margin: '18px 0 10px' }}>Recipient</h4>
            <div className="form-grid">
              <Field label="Name" required><input value={editForm.recipient_name} onChange={setE('recipient_name')} required /></Field>
              <Field label="Email" required><input type="email" value={editForm.recipient_email} onChange={setE('recipient_email')} required /></Field>
              <Field label="Phone"><input value={editForm.recipient_phone} onChange={setE('recipient_phone')} /></Field>
              <Field label="Delivery address"><input value={editForm.recipient_address} onChange={setE('recipient_address')} /></Field>
              <Field label="City"><input value={editForm.recipient_city} onChange={setE('recipient_city')} /></Field>
              <Field label="Country"><input value={editForm.recipient_country} onChange={setE('recipient_country')} /></Field>
            </div>

            <h4 style={{ color: 'var(--a-navy)', margin: '18px 0 10px' }}>Package & Route</h4>
            <div className="form-grid">
              <Field label="Origin city"><input value={editForm.origin_city} onChange={setE('origin_city')} /></Field>
              <Field label="Destination city"><input value={editForm.destination_city} onChange={setE('destination_city')} /></Field>
              <Field label="Cargo type">
                <select value={editForm.cargo_type} onChange={setE('cargo_type')}>
                  <option>Air</option><option>Ocean</option><option>Road</option>
                </select>
              </Field>
              <Field label="Weight (kg)"><input type="number" step="0.1" min="0" value={editForm.package_weight} onChange={setE('package_weight')} /></Field>
              <Field label="Dimensions"><input value={editForm.package_dimensions} onChange={setE('package_dimensions')} /></Field>
              <Field label="Quantity"><input type="number" min="1" value={editForm.package_quantity} onChange={setE('package_quantity')} /></Field>
              <Field label="Description"><input value={editForm.package_description} onChange={setE('package_description')} /></Field>
            </div>

            <h4 style={{ color: 'var(--a-navy)', margin: '18px 0 10px' }}>Financials</h4>
            <div className="form-grid">
              <Field label="Currency">
                <select value={editForm.currency} onChange={setE('currency')}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.country} — {c.code} ({c.symbol})</option>
                  ))}
                </select>
              </Field>
              <Field label="Base freight"><input type="number" step="0.01" min="0" value={editForm.base_freight} onChange={setE('base_freight')} /></Field>
              <Field label="Fuel surcharge"><input type="number" step="0.01" min="0" value={editForm.surcharge_fuel} onChange={setE('surcharge_fuel')} /></Field>
              <Field label="Customs & handling"><input type="number" step="0.01" min="0" value={editForm.surcharge_customs} onChange={setE('surcharge_customs')} /></Field>
              <Field label="Payment status">
                <select value={editForm.payment_status} onChange={setE('payment_status')}>
                  <option>Unpaid</option><option>Paid</option><option>Pending</option>
                </select>
              </Field>
            </div>
          </form>
        </Modal>
      )}

      {cpModal && (
        <Modal
          title={cpModal.mode === 'add' ? 'Add Checkpoint' : 'Edit Checkpoint'}
          onClose={() => setCpModal(null)}
          footer={
            <>
              <button className="btn-a btn-ghost-a" onClick={() => setCpModal(null)}>Cancel</button>
              <button className="btn-a btn-primary-a" onClick={saveCp}>Save Checkpoint</button>
            </>
          }
        >
          <form onSubmit={saveCp}>
            <div className="form-grid">
              <Field label="Date & time (supports backdating)">
                <input type="datetime-local" value={cpForm.timestamp} onChange={(e) => setCpForm((f) => ({ ...f, timestamp: e.target.value }))} />
              </Field>
              <Field label="Location" required><input value={cpForm.location} onChange={(e) => setCpForm((f) => ({ ...f, location: e.target.value }))} required /></Field>
              <Field label="Status tag" required><input value={cpForm.status_tag} onChange={(e) => setCpForm((f) => ({ ...f, status_tag: e.target.value }))} required /></Field>
              <Field label="Admin notes"><input value={cpForm.admin_notes} onChange={(e) => setCpForm((f) => ({ ...f, admin_notes: e.target.value }))} /></Field>
              {cpModal.mode === 'add' && (
                <>
                  <Field label="Move status to">
                    <select value={cpForm.set_status} onChange={(e) => setCpForm((f) => ({ ...f, set_status: e.target.value }))}>
                      <option value="">— keep current —</option>
                      {STATUSES.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </Field>
                  <Field label="Set progress %">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={cpForm.progress_percentage}
                      onChange={(e) => setCpForm((f) => ({ ...f, progress_percentage: e.target.value }))}
                      placeholder="keep current"
                    />
                  </Field>
                </>
              )}
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
