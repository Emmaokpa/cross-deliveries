import { Router } from 'express'
import { Shipment, Types } from '../db.js'
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

async function getShipment(id) {
  return Shipment.findOne(Types.ObjectId.isValid(id) ? { _id: id } : { tracking_number: id.toUpperCase() })
}

function withTimeline(shipment) {
  const doc = shipment.toObject ? shipment.toObject() : shipment
  return {
    ...doc,
    id: String(doc._id),
    checkpoints: [...(doc.checkpoints || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    tracking_url: TRACKING_URL(doc.tracking_number),
  }
}

// GET /api/v1/shipments?status=&q=
router.get('/shipments', async (req, res) => {
  try {
    const { status, q } = req.query
    const filter = {}
    if (status) filter.current_status = status
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [
        { tracking_number: rx },
        { recipient_name: rx },
        { sender_name: rx },
        { recipient_email: rx },
      ]
    }
    const shipments = await Shipment.find(filter).sort({ created_at: -1 }).lean()
    res.json({ shipments: shipments.map((s) => ({ ...s, id: String(s._id) })) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/v1/shipments
router.post('/shipments', async (req, res) => {
  try {
    const data = parseShipment(req.body || {})
    const fin = computeFinancials(req.body || {})
    const tracking = await generateTrackingNumber()
    const shipment = await Shipment.create({
      ...data,
      tracking_number: tracking,
      cargo_type: data.cargo_type || 'Air',
      package_weight: data.package_weight || 0,
      package_dimensions: data.package_dimensions || '',
      package_quantity: data.package_quantity || 1,
      package_description: data.package_description || '',
      recipient_city: data.recipient_city || '',
      recipient_country: data.recipient_country || '',
      origin_city: data.origin_city || '',
      destination_city: data.destination_city || '',
      base_freight: fin.base,
      surcharge_fuel: fin.fuel,
      surcharge_customs: fin.customs,
      total_cost: fin.total,
      payment_status: data.payment_status || 'Unpaid',
      current_status: 'Created',
      progress_percentage: STATUS_PROGRESS.Created,
      checkpoints: [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          location: data.origin_city || 'Origin facility',
          status_tag: 'Created',
          admin_notes: 'Consignment created in system',
        },
      ],
    })
    await audit(req.admin, 'shipment.created', 'shipment', String(shipment._id), `Created ${tracking}`)
    res.status(201).json({ shipment: withTimeline(shipment) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// GET /api/v1/shipsments/:id — accepts Mongo id or tracking number
router.get('/shipments/:id', async (req, res) => {
  const shipment = await getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  res.json({ shipment: withTimeline(shipment) })
})

// PATCH /api/v1/shipments/:id — edit consignment details
router.patch('/shipments/:id', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const data = parseShipment({ ...shipment.toObject(), ...req.body })
    const fin = computeFinancials({ ...shipment.toObject(), ...req.body })
    Object.assign(shipment, data, {
      base_freight: fin.base,
      surcharge_fuel: fin.fuel,
      surcharge_customs: fin.customs,
      total_cost: fin.total,
    })
    await shipment.save()
    await audit(req.admin, 'shipment.updated', 'shipment', String(shipment._id), `Updated ${shipment.tracking_number}`)
    res.json({ shipment: withTimeline(shipment) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// PATCH /api/v1/shipments/:id/status — "Mark as Shipped" workflow
router.patch('/shipments/:id/status', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const { status, location, notes, backdated_timestamp, trigger_email, progress_percentage } = req.body || {}
    if (!status) return res.status(400).json({ error: 'status is required' })
    if (!(status in STATUS_PROGRESS)) return res.status(400).json({ error: `Invalid status: ${status}` })

    const ts = backdated_timestamp ? new Date(backdated_timestamp) : new Date()
    if (Number.isNaN(ts.getTime())) return res.status(400).json({ error: 'Invalid backdated_timestamp' })

    // Progress defaults to the status preset but can be set manually (0-100)
    let progress = STATUS_PROGRESS[status]
    if (progress_percentage !== undefined && progress_percentage !== null && progress_percentage !== '') {
      const p = Number(progress_percentage)
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        return res.status(400).json({ error: 'progress_percentage must be a number between 0 and 100' })
      }
      progress = Math.round(p)
    }

    shipment.current_status = status
    shipment.progress_percentage = progress
    shipment.checkpoints.push({
      id: crypto.randomUUID(),
      timestamp: ts,
      location: location || shipment.origin_city || '—',
      status_tag: status,
      admin_notes: notes || '',
    })
    await shipment.save()
    await audit(req.admin, 'shipment.status_changed', 'shipment', String(shipment._id), `${shipment.tracking_number}: → ${status}`)

    let emailResult = null
    const emailTriggered = trigger_email === true || (trigger_email === undefined && ['Shipped', 'Out for Delivery'].includes(status))
    if (emailTriggered) {
      emailResult = sendShipmentEmail(shipment, req.admin)
    }
    res.json({ shipment: withTimeline(shipment), email: emailResult })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/v1/shipments/:id
router.delete('/shipments/:id', async (req, res) => {
  const shipment = await getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  await shipment.deleteOne()
  await audit(req.admin, 'shipment.deleted', 'shipment', String(shipment._id), `Deleted ${shipment.tracking_number}`)
  res.json({ ok: true })
})

// --- Checkpoint manager (embedded) ---

// POST /api/v1/shipments/:id/checkpoints
// Optional body fields beyond the checkpoint itself:
//   set_status — also move the shipment to this status
//   progress_percentage — manually set the progress bar (0-100); defaults to the set_status preset
router.post('/shipments/:id/checkpoints', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const { timestamp, location, status_tag, admin_notes, set_status, progress_percentage } = req.body || {}
    if (!location || !status_tag) return res.status(400).json({ error: 'location and status_tag are required' })
    if (set_status !== undefined && set_status !== '' && !(set_status in STATUS_PROGRESS)) {
      return res.status(400).json({ error: `Invalid set_status: ${set_status}` })
    }
    let progress = null
    if (progress_percentage !== undefined && progress_percentage !== null && progress_percentage !== '') {
      const p = Number(progress_percentage)
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        return res.status(400).json({ error: 'progress_percentage must be a number between 0 and 100' })
      }
      progress = Math.round(p)
    }
    const ts = timestamp ? new Date(timestamp) : new Date()
    if (Number.isNaN(ts.getTime())) return res.status(400).json({ error: 'Invalid timestamp' })
    shipment.checkpoints.push({ id: crypto.randomUUID(), timestamp: ts, location, status_tag, admin_notes: admin_notes || '' })

    // A journey marker can drive the shipment's public status and progress bar
    const statusChanged = set_status !== undefined && set_status !== '' && set_status !== shipment.current_status
    if (statusChanged) shipment.current_status = set_status
    if (progress === null && set_status !== undefined && set_status !== '') progress = STATUS_PROGRESS[set_status]
    if (progress !== null) shipment.progress_percentage = progress

    await shipment.save()
    const extras = [
      statusChanged ? `status → ${set_status}` : null,
      progress !== null ? `progress → ${progress}%` : null,
    ].filter(Boolean).join(', ')
    await audit(req.admin, 'checkpoint.created', 'shipment', String(shipment._id), `${shipment.tracking_number}: checkpoint at ${location}${extras ? ` (${extras})` : ''}`)
    res.status(201).json({ shipment: withTimeline(shipment) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// PATCH /api/v1/shipments/:id/checkpoints/:cpId
router.patch('/shipments/:id/checkpoints/:cpId', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const cp = shipment.checkpoints.id(req.params.cpId)
    if (!cp) return res.status(404).json({ error: 'Checkpoint not found' })
    const { timestamp, location, status_tag, admin_notes } = req.body || {}
    if (timestamp) {
      const d = new Date(timestamp)
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid timestamp' })
      cp.timestamp = d
    }
    if (location !== undefined) cp.location = location
    if (status_tag !== undefined) cp.status_tag = status_tag
    if (admin_notes !== undefined) cp.admin_notes = admin_notes
    await shipment.save()
    await audit(req.admin, 'checkpoint.updated', 'shipment', String(shipment._id), `Edited checkpoint ${cp.id}`)
    res.json({ shipment: withTimeline(shipment) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/v1/shipments/:id/checkpoints/:cpId
router.delete('/shipments/:id/checkpoints/:cpId', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const cp = shipment.checkpoints.id(req.params.cpId)
    if (!cp) return res.status(404).json({ error: 'Checkpoint not found' })
    cp.deleteOne()
    await shipment.save()
    await audit(req.admin, 'checkpoint.deleted', 'shipment', String(shipment._id), `Deleted checkpoint at ${cp.location}`)
    res.json({ shipment: withTimeline(shipment) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Documents ---

// GET /api/v1/shipments/:id/invoice.pdf
router.get('/shipments/:id/invoice.pdf', async (req, res) => {
  const shipment = await getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${shipment.tracking_number}-invoice.pdf"`)
  buildInvoicePdf(shipment.toObject ? shipment.toObject() : shipment).pipe(res)
  await audit(req.admin, 'invoice.generated', 'shipment', String(shipment._id), `PDF invoice for ${shipment.tracking_number}`)
})

// POST /api/v1/shipments/:id/send-email — manual send/resend via SMTP
router.post('/shipments/:id/send-email', async (req, res) => {
  const shipment = await getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  const result = await sendShipmentEmail(shipment, req.admin)
  res.json(result)
})

export default router
