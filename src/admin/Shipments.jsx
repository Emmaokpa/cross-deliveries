import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from './api.js'
import { Badge, Field, Modal, Progress, EmptyState, fmtMoney, fmtDate, useToast } from './components.jsx'
import CopyChip from './copy.jsx'
import { CURRENCIES } from './currencies.js'

const STATUSES = ['Created', 'Shipped', 'In Transit', 'Held at Customs', 'Out for Delivery', 'Delivered', 'On Hold']

const EMPTY_FORM = {
  sender_name: '', sender_email: '', sender_phone: '', sender_address: '',
  recipient_name: '', recipient_email: '', recipient_phone: '', recipient_address: '',
  recipient_city: '', recipient_country: '', origin_city: '', destination_city: '',
  cargo_type: 'Air', package_weight: '', package_dimensions: '', package_quantity: 1, package_description: '',
  base_freight: '', surcharge_fuel: '', surcharge_customs: '', payment_status: 'Unpaid', currency: 'NGN',
}

export default function Shipments() {
  const [shipments, setShipments] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()

  const load = () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    api(`/v1/shipments?${params}`)
      .then((d) => setShipments(d.shipments))
      .catch((e) => setError(e.message))
  }

  useEffect(load, [q, status])

  useEffect(() => {
    if (searchParams.get('new')) {
      setShowCreate(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api('/v1/shipments', { method: 'POST', body: form })
      toast(`Shipment ${data.shipment.tracking_number} created`, 'ok')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h3>Shipments</h3>
          <div className="sub">Create consignments, simulate progress, and manage documents.</div>
        </div>
        <button className="btn-a btn-primary-a" onClick={() => setShowCreate(true)}>＋ New Shipment</button>
      </div>

      <div className="toolbar">
        <input placeholder="Search tracking #, name, email…" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 260 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="alert-a alert-error">{error}</div>}

      <div className="a-card">
        <div className="table-wrap">            <table className="data-table stack-mobile">
            <thead>
              <tr>
                <th>Tracking #</th><th>Recipient</th><th>Route</th><th>Cargo</th>
                <th>Total</th><th>Payment</th><th>Status</th><th>Progress</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Link className="mono" to={`/admin/shipments/${s.id}`}>{s.tracking_number}</Link>
                      <CopyChip value={s.tracking_number} label="" className="copy-icon" title={`Copy ${s.tracking_number}`} />
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{s.recipient_name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{s.recipient_email}</div>
                  </td>
                  <td data-label="Route" style={{ fontSize: 12.5 }}>{s.origin_city || '—'} → {s.destination_city || '—'}</td>
                  <td data-label="Cargo">{s.cargo_type}</td>
                  <td data-label="Total" style={{ fontWeight: 600 }}>{fmtMoney(s.total_cost, s.currency)}</td>
                  <td data-label="Payment"><Badge value={s.payment_status} /></td>
                  <td data-label="Status"><Badge value={s.current_status} /></td>
                  <td data-label="Progress"><Progress value={s.progress_percentage} /></td>
                  <td data-label="Created" style={{ fontSize: 12.5, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(s.created_at)}</td>
                </tr>
              ))}
              {!shipments.length && (
                <tr><td colSpan={9}><EmptyState title="No shipments found" hint="Adjust filters or create a new consignment." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <Modal
          title="New Shipment / Consignment"
          onClose={() => setShowCreate(false)}
          wide
          footer={
            <>
              <button className="btn-a btn-ghost-a" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-a btn-primary-a" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create Shipment'}</button>
            </>
          }
        >
          {error && <div className="alert-a alert-error">{error}</div>}
          <form onSubmit={create}>
            <h4 style={{ color: 'var(--a-navy)', margin: '0 0 10px' }}>Sender</h4>
            <div className="form-grid">
              <Field label="Name" required><input value={form.sender_name} onChange={setF('sender_name')} required /></Field>
              <Field label="Email" required><input type="email" value={form.sender_email} onChange={setF('sender_email')} required /></Field>
              <Field label="Phone"><input value={form.sender_phone} onChange={setF('sender_phone')} /></Field>
              <Field label="Address"><input value={form.sender_address} onChange={setF('sender_address')} /></Field>
            </div>

            <h4 style={{ color: 'var(--a-navy)', margin: '18px 0 10px' }}>Recipient</h4>
            <div className="form-grid">
              <Field label="Name" required><input value={form.recipient_name} onChange={setF('recipient_name')} required /></Field>
              <Field label="Email" required><input type="email" value={form.recipient_email} onChange={setF('recipient_email')} required /></Field>
              <Field label="Phone"><input value={form.recipient_phone} onChange={setF('recipient_phone')} /></Field>
              <Field label="Delivery address"><input value={form.recipient_address} onChange={setF('recipient_address')} /></Field>
              <Field label="City"><input value={form.recipient_city} onChange={setF('recipient_city')} /></Field>
              <Field label="Country"><input value={form.recipient_country} onChange={setF('recipient_country')} /></Field>
            </div>

            <h4 style={{ color: 'var(--a-navy)', margin: '18px 0 10px' }}>Package & Route</h4>
            <div className="form-grid">
              <Field label="Origin city"><input value={form.origin_city} onChange={setF('origin_city')} placeholder="Istanbul" /></Field>
              <Field label="Destination city"><input value={form.destination_city} onChange={setF('destination_city')} placeholder="Lagos" /></Field>
              <Field label="Cargo type">
                <select value={form.cargo_type} onChange={setF('cargo_type')}>
                  <option>Air</option><option>Ocean</option><option>Road</option>
                </select>
              </Field>
              <Field label="Weight (kg)"><input type="number" step="0.1" min="0" value={form.package_weight} onChange={setF('package_weight')} /></Field>
              <Field label="Dimensions"><input value={form.package_dimensions} onChange={setF('package_dimensions')} placeholder="120 x 80 x 60 cm" /></Field>
              <Field label="Quantity"><input type="number" min="1" value={form.package_quantity} onChange={setF('package_quantity')} /></Field>
              <Field label="Description"><input value={form.package_description} onChange={setF('package_description')} /></Field>
            </div>

            <h4 style={{ color: 'var(--a-navy)', margin: '18px 0 10px' }}>Financials (USD)</h4>
            <div className="form-grid">
              <Field label="Base freight"><input type="number" step="0.01" min="0" value={form.base_freight} onChange={setF('base_freight')} /></Field>
              <Field label="Fuel surcharge"><input type="number" step="0.01" min="0" value={form.surcharge_fuel} onChange={setF('surcharge_fuel')} /></Field>
              <Field label="Customs & handling"><input type="number" step="0.01" min="0" value={form.surcharge_customs} onChange={setF('surcharge_customs')} /></Field>
              <Field label="Payment status">
                <select value={form.payment_status} onChange={setF('payment_status')}>
                  <option>Unpaid</option><option>Paid</option><option>Pending</option>
                </select>
              </Field>
              <Field label="Currency">
                <select value={form.currency} onChange={setF('currency')}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.country} — {c.code} ({c.symbol})</option>
                  ))}
                </select>
              </Field>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
