import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { api, downloadBlob } from './api.js'
import { Badge, Field, Modal, Progress, fmtMoney, fmtDate, useToast } from './components.jsx'

const STATUSES = ['Created', 'Shipped', 'In Transit', 'Held at Customs', 'Out for Delivery', 'Delivered', 'On Hold']

// Mirror of the backend STATUS_PROGRESS presets — shown as hints in forms
const STATUS_DEFAULTS = Object.fromEntries(STATUSES.map((s, i) => [s, [5, 20, 45, 60, 85, 100, 50][i]]))

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

  return (
    <>
      <div className="page-head">
        <div>
          <h3><span className="mono">{s.tracking_number}</span> <Badge value={s.current_status} /></h3>
          <div className="sub">{s.origin_city || '—'} → {s.destination_city || '—'} • {s.cargo_type} freight • created {fmtDate(s.created_at)}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-a btn-ghost-a" onClick={getInvoice}>⬇ Invoice PDF</button>
          <button className="btn-a btn-navy-a" onClick={sendEmail}>✉ Send / Resend Email</button>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="a-card a-card-pad">
            <h3 style={{ margin: '0 0 6px', color: 'var(--a-navy)' }}>Consignment Overview</h3>
            <Progress value={s.progress_percentage} />
            <div className="kv-list" style={{ marginTop: 14 }}>
              <div className="kv"><span className="k">Sender</span><span className="v">{s.sender_name} • {s.sender_email}</span></div>
              <div className="kv"><span className="k">Recipient</span><span className="v">{s.recipient_name} • {s.recipient_email}</span></div>
              <div className="kv"><span className="k">Delivery address</span><span className="v">{s.recipient_address || '—'}, {s.recipient_city} {s.recipient_country}</span></div>
              <div className="kv"><span className="k">Cargo</span><span className="v">{s.cargo_type} • {s.package_weight} kg • {s.package_dimensions || '—'} • ×{s.package_quantity}</span></div>
              <div className="kv"><span className="k">Description</span><span className="v">{s.package_description || '—'}</span></div>
              <div className="kv"><span className="k">Base freight</span><span className="v">{fmtMoney(s.base_freight)}</span></div>
              <div className="kv"><span className="k">Fuel surcharge</span><span className="v">{fmtMoney(s.surcharge_fuel)}</span></div>
              <div className="kv"><span className="k">Customs & handling</span><span className="v">{fmtMoney(s.surcharge_customs)}</span></div>
              <div className="kv"><span className="k">Total</span><span className="v" style={{ fontWeight: 700 }}>{fmtMoney(s.total_cost)}</span></div>
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
