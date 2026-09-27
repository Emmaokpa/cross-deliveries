import { Router } from 'express'
import db from '../db.js'
import { audit, authRequired } from './auth.js'
import { STATUS_PROGRESS, TRACKING_URL, generateTrackingNumber, computeFinancials } from '../services/shipment-utils.js'
import { buildInvoicePdf } from '../services/pdf.js'
import { sendShipmentEmail } from '../services/email.js'

const router = Router()
router.use(authRequired)

const SHIPMENT_FIELDS = [
  'sender_name', 'sender_email', 'sender_phone', 'sender_address',
  'recipient_name', 'recipient_email', 'recipient_phone', 'recipient_address',
  'recipient_city', 'recipient_country', 'origin_city', 'destination_city',
  'cargo_type', 'package_weight', 'package_dimensions', 'package_quantity', 'package_description',
  'base_freight', 'surcharge_fuel', 'surcharge_customs', 'payment_status',
]

function parseShipment(body) {
  const data = {}
  for (const f of SHIPMENT_FIELDS) {
    if (body[f] !== undefined) data[f] = body[f]
  }
  if (data.cargo_type && !['Air', 'Ocean', 'Road'].includes(data.cargo_type)) {
    throw new Error('cargo_type must be Air, Ocean or Road')
  }
  if (data.payment_status && !['Paid', 'Unpaid', 'Pending'].includes(data.payment_status)) {
    throw new Error('payment_status must be Paid, Unpaid or Pending')
  }
  if (!data.sender_email || !data.recipient_email || !data.sender_name || !data.recipient_name) {
    throw new Error('Sender and recipient name and email are required')
  }
  return data
}

function getShipment(id) {
  return db.prepare('SELECT * FROM shipments WHERE id = ? OR tracking_number = ?').get(id, id)
}

function checkpointsFor(shipmentId) {
  return db.prepare('SELECT * FROM checkpoints WHERE shipment_id = ? ORDER BY timestamp DESC').all(shipmentId)
}

function withTimeline(shipment) {
  return { ...shipment, checkpoints: checkpointsFor(shipment.id), tracking_url: TRACKING_URL(shipment.tracking_number) }
}

// GET /api/v1/shipments?status=&q=
router.get('/shipments', (req, res) => {
  const { status, q } = req.query
  let sql = 'SELECT * FROM shipments WHERE 1=1'
  const params = []
  if (status) {
    sql += ' AND current_status = ?'
    params.push(status)
  }
  if (q) {
    sql += ' AND (tracking_number LIKE ? OR recipient_name LIKE ? OR sender_name LIKE ? OR recipient_email LIKE ?)'
    const like = `%${q}%`
    params.push(like, like, like, like)
  }
  sql += ' ORDER BY created_at DESC'
  const shipments = db.prepare(sql).all(...params)
  res.json({ shipments })
})

// POST /api/v1/shipments
router.post('/shipments', (req, res) => {
  try {
    const data = parseShipment(req.body || {})
    const fin = computeFinancials(req.body || {})
    const id = crypto.randomUUID()
    const tracking = generateTrackingNumber(db)
    db.prepare(`
      INSERT INTO shipments (
        id, tracking_number, sender_name, sender_email, sender_phone, sender_address,
        recipient_name, recipient_email, recipient_phone, recipient_address,
        recipient_city, recipient_country, origin_city, destination_city,
        cargo_type, package_weight, package_dimensions, package_quantity, package_description,
        base_freight, surcharge_fuel, surcharge_customs, total_cost, payment_status,
        current_status, progress_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Created', ?)
    `).run(
      id, tracking,
      data.sender_name, data.sender_email, data.sender_phone || '', data.sender_address || '',
      data.recipient_name, data.recipient_email, data.recipient_phone || '', data.recipient_address || '',
      data.recipient_city || '', data.recipient_country || '', data.origin_city || '', data.destination_city || '',
      data.cargo_type || 'Air', data.package_weight || 0, data.package_dimensions || '', data.package_quantity || 1, data.package_description || '',
      fin.base, fin.fuel, fin.customs, fin.total, data.payment_status || 'Unpaid',
      STATUS_PROGRESS.Created,
    )
    // Initial checkpoint
    db.prepare(
      'INSERT INTO checkpoints (id, shipment_id, timestamp, location, status_tag, admin_notes) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(
      crypto.randomUUID(), id,
      new Date().toISOString(), data.origin_city || 'Origin facility', 'Created',
      'Consignment created in system',
    )
    audit(req.admin, 'shipment.created', 'shipment', id, `Created ${tracking}`)
    res.status(201).json({ shipment: withTimeline(getShipment(id)) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// GET /api/v1/shipments/:id
router.get('/shipments/:id', (req, res) => {
  const shipment = getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  res.json({ shipment: withTimeline(shipment) })
})

// PATCH /api/v1/shipments/:id — edit consignment details
router.patch('/shipments/:id', (req, res) => {
  const shipment = getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  try {
    const data = parseShipment({ ...shipment, ...req.body })
    const fin = computeFinancials({ ...shipment, ...req.body })
    const fields = [...SHIPMENT_FIELDS, 'base_freight', 'surcharge_fuel', 'surcharge_customs', 'total_cost']
    const updates = []
    const params = []
    for (const f of fields) {
      const val = f === 'total_cost' ? fin.total : data[f]
      updates.push(`${f} = ?`)
      params.push(val)
    }
    params.push(shipment.id)
    db.prepare(`UPDATE shipments SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params)
    audit(req.admin, 'shipment.updated', 'shipment', shipment.id, `Updated ${shipment.tracking_number}`)
    res.json({ shipment: withTimeline(getShipment(shipment.id)) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// PATCH /api/v1/shipments/:id/status — "Mark as Shipped" workflow + checkpoint add
router.patch('/shipments/:id/status', (req, res) => {
  const shipment = getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  const { status, location, notes, backdated_timestamp, trigger_email } = req.body || {}
  if (!status) return res.status(400).json({ error: 'status is required' })
  if (!(status in STATUS_PROGRESS)) return res.status(400).json({ error: `Invalid status: ${status}` })

  const ts = backdated_timestamp ? new Date(backdated_timestamp) : new Date()
  if (Number.isNaN(ts.getTime())) return res.status(400).json({ error: 'Invalid backdated_timestamp' })

  db.prepare("UPDATE shipments SET current_status = ?, progress_percentage = ?, updated_at = datetime('now') WHERE id = ?").run(
    status,
    STATUS_PROGRESS[status],
    shipment.id,
  )
  db.prepare(
    'INSERT INTO checkpoints (id, shipment_id, timestamp, location, status_tag, admin_notes) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    crypto.randomUUID(),
    shipment.id,
    ts.toISOString(),
    location || shipment.origin_city || '—',
    status,
    notes || '',
  )
  audit(req.admin, 'shipment.status_changed', 'shipment', shipment.id, `${shipment.tracking_number}: ${shipment.current_status} → ${status}`)

  let emailResult = null
  const emailTriggered = trigger_email === true || (trigger_email === undefined && ['Shipped', 'Out for Delivery'].includes(status))
  if (emailTriggered) {
    emailResult = sendShipmentEmail(db, getShipment(shipment.id), req.admin)
  }
  res.json({ shipment: withTimeline(getShipment(shipment.id)), email: emailResult })
})

// DELETE /api/v1/shipments/:id
router.delete('/shipments/:id', (req, res) => {
  const shipment = getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  db.prepare('DELETE FROM shipments WHERE id = ?').run(shipment.id)
  audit(req.admin, 'shipment.deleted', 'shipment', shipment.id, `Deleted ${shipment.tracking_number}`)
  res.json({ ok: true })
})

// --- Checkpoint manager ---

// POST /api/v1/shipments/:id/checkpoints (add / backdate)
router.post('/shipments/:id/checkpoints', (req, res) => {
  const shipment = getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  const { timestamp, location, status_tag, admin_notes } = req.body || {}
  if (!location || !status_tag) return res.status(400).json({ error: 'location and status_tag are required' })
  const ts = timestamp ? new Date(timestamp) : new Date()
  if (Number.isNaN(ts.getTime())) return res.status(400).json({ error: 'Invalid timestamp' })
  const id = crypto.randomUUID()
  db.prepare(
    'INSERT INTO checkpoints (id, shipment_id, timestamp, location, status_tag, admin_notes) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, shipment.id, ts.toISOString(), location, status_tag, admin_notes || '')
  audit(req.admin, 'checkpoint.created', 'shipment', shipment.id, `${shipment.tracking_number}: checkpoint at ${location}`)
  res.status(201).json({ shipment: withTimeline(getShipment(shipment.id)) })
})

// PATCH /api/v1/shipments/:id/checkpoints/:cpId
router.patch('/shipments/:id/checkpoints/:cpId', (req, res) => {
  const cp = db.prepare('SELECT * FROM checkpoints WHERE id = ? AND shipment_id = ?').get(req.params.cpId, req.params.id)
  if (!cp) return res.status(404).json({ error: 'Checkpoint not found' })
  const { timestamp, location, status_tag, admin_notes } = req.body || {}
  let ts = cp.timestamp
  if (timestamp) {
    const d = new Date(timestamp)
    if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid timestamp' })
    ts = d.toISOString()
  }
  db.prepare('UPDATE checkpoints SET timestamp = ?, location = ?, status_tag = ?, admin_notes = ? WHERE id = ?').run(
    ts,
    location ?? cp.location,
    status_tag ?? cp.status_tag,
    admin_notes ?? cp.admin_notes,
    cp.id,
  )
  audit(req.admin, 'checkpoint.updated', 'shipment', req.params.id, `Edited checkpoint ${cp.id}`)
  res.json({ shipment: withTimeline(getShipment(req.params.id)) })
})

// DELETE /api/v1/shipments/:id/checkpoints/:cpId
router.delete('/shipments/:id/checkpoints/:cpId', (req, res) => {
  const cp = db.prepare('SELECT * FROM checkpoints WHERE id = ? AND shipment_id = ?').get(req.params.cpId, req.params.id)
  if (!cp) return res.status(404).json({ error: 'Checkpoint not found' })
  db.prepare('DELETE FROM checkpoints WHERE id = ?').run(cp.id)
  audit(req.admin, 'checkpoint.deleted', 'shipment', req.params.id, `Deleted checkpoint at ${cp.location}`)
  res.json({ shipment: withTimeline(getShipment(req.params.id)) })
})

// --- Documents ---

// GET /api/v1/shipments/:id/invoice.pdf
router.get('/shipments/:id/invoice.pdf', (req, res) => {
  const shipment = getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${shipment.tracking_number}-invoice.pdf"`)
  buildInvoicePdf(shipment).pipe(res)
  audit(req.admin, 'invoice.generated', 'shipment', shipment.id, `PDF invoice for ${shipment.tracking_number}`)
})

// POST /api/v1/shipments/:id/send-email — manual send/resend via Brevo
router.post('/shipments/:id/send-email', (req, res) => {
  const shipment = getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  const result = sendShipmentEmail(db, shipment, req.admin)
  res.json(result)
})

export default router
