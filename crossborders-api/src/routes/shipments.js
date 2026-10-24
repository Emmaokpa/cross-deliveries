import { Router } from 'express'
import { COLLECTIONS, createRecord, deleteRecord, escapeFilter, findRecord, findOne, isRecordId, listAll, updateRecord } from '../db.js'
import { audit, authRequired } from './auth.js'
import { STATUS_PROGRESS, TRACKING_URL, generateTrackingNumber, computeFinancials } from '../services/shipment-utils.js'
import { buildInvoicePdf } from '../services/pdf.js'
import { sendShipmentEmail, sendConfirmationEmail, fillTemplate, renderConfirmationLetter } from '../services/email.js'
import { HARDCODED_SENDER } from '../services/company.js'
import { isValidCurrency } from '../services/currency.js'

const router = Router()
router.use(authRequired)

const SHIPMENT_FIELDS = [
  'sender_name', 'sender_email', 'sender_phone', 'sender_address',
  'recipient_name', 'recipient_email', 'recipient_phone', 'recipient_address',
  'recipient_city', 'recipient_country', 'origin_city', 'destination_city',
  'cargo_type', 'carrier', 'package_weight', 'package_dimensions', 'package_quantity', 'package_description',
  'base_freight', 'surcharge_fuel', 'surcharge_customs', 'payment_status', 'estimated_delivery', 'currency',
]

function parseShipment(body) {
  const data = {}
  for (const f of SHIPMENT_FIELDS) {
    if (body[f] !== undefined) data[f] = body[f]
  }
  if (data.cargo_type && !['Air', 'Ocean', 'Road'].includes(data.cargo_type)) {
    throw new Error('cargo_type must be Air, Ocean or Road')
  }
  if (data.carrier) {
    if (!['DHL', 'FedEx'].includes(data.carrier)) throw new Error('carrier must be DHL or FedEx')
  } else {
    delete data.carrier // blank → falls back to the DHL default
  }
  if (data.payment_status && !['Paid', 'Unpaid', 'Pending'].includes(data.payment_status)) {
    throw new Error('payment_status must be Paid, Unpaid or Pending')
  }
  if (data.currency !== undefined) {
    const cur = String(data.currency || '').toUpperCase()
    if (cur) {
      if (!isValidCurrency(cur)) throw new Error('Unsupported currency')
      data.currency = cur
    } else {
      delete data.currency // empty → falls back to the default (USD)
    }
  }
  // Sender/company details are HARDCODED — any sender fields sent by a
  // client are ignored and replaced with the company constants.
  Object.assign(data, HARDCODED_SENDER)
  // No shipment field is required any more — the dashboard can save a
  // partial consignment. Only check the email FORMAT when one was typed.
  if (data.recipient_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.recipient_email)) {
    throw new Error('recipient_email must be a valid email address')
  }
  if (data.estimated_delivery !== undefined) {
    if (data.estimated_delivery === null || data.estimated_delivery === '') {
      data.estimated_delivery = null // explicit clear
    } else {
      const d = new Date(data.estimated_delivery)
      if (Number.isNaN(d.getTime())) throw new Error('estimated_delivery must be a valid date')
      data.estimated_delivery = d
    }
  }
  return data
}

// Accepts either a PocketBase record id or a tracking number.
async function getShipment(id) {
  const raw = String(id || '').trim()
  if (isRecordId(raw)) {
    const byId = await findRecord(COLLECTIONS.shipments, raw)
    if (byId) return byId
  }
  if (!raw) return null
  return findOne(COLLECTIONS.shipments, `tracking_number = '${escapeFilter(raw.toUpperCase())}'`)
}

// Checkpoints/pod are JSON fields and may come back as null on old records.
function ensureShape(shipment) {
  if (!Array.isArray(shipment.checkpoints)) shipment.checkpoints = []
  if (!shipment.pod || typeof shipment.pod !== 'object') {
    shipment.pod = { receiver_name: '', signature: '', signed_at: null, recorded_by: '' }
  }
  return shipment
}

function withTimeline(shipment) {
  return {
    ...shipment,
    id: String(shipment._id),
    checkpoints: [...(shipment.checkpoints || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    tracking_url: TRACKING_URL(shipment.tracking_number),
  }
}

// Persist a mutated shipment (the whole mapped record is sent; unknown or
// derived fields are filtered out by the data layer).
async function saveShipment(shipment) {
  return updateRecord(COLLECTIONS.shipments, shipment.id, shipment)
}

// GET /api/v1/shipments?status=&q=
router.get('/shipments', async (req, res) => {
  try {
    const { status, q } = req.query
    const clauses = []
    if (status) clauses.push(`current_status = '${escapeFilter(status)}'`)
    if (q) {
      const needle = escapeFilter(q)
      clauses.push(
        `(tracking_number~'${needle}' || recipient_name~'${needle}' || sender_name~'${needle}' || recipient_email~'${needle}')`,
      )
    }
    const shipments = await listAll(COLLECTIONS.shipments, {
      filter: clauses.join(' && '),
      sort: '-created_at',
    })
    res.json({ shipments })
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
    const shipment = await createRecord(COLLECTIONS.shipments, {
      ...data,
      tracking_number: tracking,
      cargo_type: data.cargo_type || 'Air',
      carrier: data.carrier || 'DHL',
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
      payment_status: data.payment_status || 'Paid',
      currency: data.currency || 'USD',
      current_status: 'Created',
      progress_percentage: STATUS_PROGRESS.Created,
      checkpoints: [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          location: data.origin_city || 'Origin facility',
          status_tag: 'Created',
          admin_notes: 'Consignment created in system',
          updated_by: 'Halilpeli',
        },
      ],
    })
    await audit(req.admin, 'shipment.created', 'shipment', String(shipment._id), `Created ${tracking}`)
    res.status(201).json({ shipment: withTimeline(shipment) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// GET /api/v1/shipments/:id — accepts record id or tracking number
router.get('/shipments/:id', async (req, res) => {
  const shipment = await getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  res.json({ shipment: withTimeline(ensureShape(shipment)) })
})

// PATCH /api/v1/shipments/:id — edit consignment details
// Also accepts `progress_percentage` (0-100) and/or `current_status` so the
// admin UI can drive the progress bar and status directly.
router.patch('/shipments/:id', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    ensureShape(shipment)

    // Direct progress/status edits (independent of the consignment fields)
    const body = req.body || {}
    const touch = {}
    if (body.progress_percentage !== undefined && body.progress_percentage !== null && body.progress_percentage !== '') {
      const p = Number(body.progress_percentage)
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        return res.status(400).json({ error: 'progress_percentage must be a number between 0 and 100' })
      }
      touch.progress = Math.round(p)
    }
    if (body.current_status !== undefined && body.current_status !== '') {
      if (!(body.current_status in STATUS_PROGRESS)) {
        return res.status(400).json({ error: `Invalid status: ${body.current_status}` })
      }
      touch.status = body.current_status
    }

    const hasConsign = Object.keys(body).some((k) => SHIPMENT_FIELDS.includes(k))
    if (hasConsign) {
      const data = parseShipment({ ...shipment, ...body })
      const fin = computeFinancials({ ...shipment, ...body })
      Object.assign(shipment, data, {
        base_freight: fin.base,
        surcharge_fuel: fin.fuel,
        surcharge_customs: fin.customs,
        total_cost: fin.total,
      })
    }
    if (touch.status) shipment.current_status = touch.status
    if (touch.progress !== undefined) {
      // Delivery rules: Delivered pins the bar at 100%; reopening clears the stamp.
      shipment.progress_percentage = shipment.current_status === 'Delivered' ? 100 : touch.progress
    }
    if (shipment.current_status === 'Delivered') {
      shipment.progress_percentage = 100
      if (!shipment.delivered_at) shipment.delivered_at = new Date()
    } else if (touch.status && shipment.delivered_at) {
      shipment.delivered_at = null
    }

    const nothingToDo = !hasConsign && !touch.status && touch.progress === undefined
    if (nothingToDo) return res.status(400).json({ error: 'No editable fields provided' })

    const updated = await saveShipment(shipment)
    const bits = [
      touch.status ? `status → ${touch.status}` : null,
      touch.progress !== undefined ? `progress → ${touch.progress}%` : null,
      hasConsign ? 'consignment details' : null,
    ].filter(Boolean).join(', ')
    await audit(req.admin, 'shipment.updated', 'shipment', String(updated._id), `${updated.tracking_number}: ${bits}`)
    res.json({ shipment: withTimeline(updated) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// PATCH /api/v1/shipments/:id/status — "Mark as Shipped" workflow
router.patch('/shipments/:id/status', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    ensureShape(shipment)
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

    // ── Delivery consistency rules ──
    // Delivered ⇒ progress locked to 100% & delivered_at stamped; reopening clears it.
    if (status === 'Delivered') {
      progress = 100
      if (!shipment.delivered_at) shipment.delivered_at = ts
    } else if (shipment.delivered_at) {
      shipment.delivered_at = null // reopening a delivered shipment un-locks the bar
    }

    shipment.current_status = status
    shipment.progress_percentage = progress
    shipment.checkpoints.push({
      id: crypto.randomUUID(),
      timestamp: ts,
      location: location || shipment.origin_city || '—',
      status_tag: status,
      admin_notes: notes || '',
      updated_by: 'Halilpeli',
    })
    const updated = await saveShipment(shipment)
    await audit(req.admin, 'shipment.status_changed', 'shipment', String(updated._id), `${updated.tracking_number}: → ${status}`)

    let emailResult = null
    const emailTriggered = trigger_email === true || (trigger_email === undefined && ['Shipped', 'Out for Delivery', 'Delivered'].includes(status))
    if (emailTriggered) {
      emailResult = sendShipmentEmail(updated, req.admin)
    }
    res.json({ shipment: withTimeline(updated), email: emailResult })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/v1/shipments/:id
router.delete('/shipments/:id', async (req, res) => {
  const shipment = await getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  await deleteRecord(COLLECTIONS.shipments, shipment.id)
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
    ensureShape(shipment)
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
    shipment.checkpoints.push({ id: crypto.randomUUID(), timestamp: ts, location, status_tag, admin_notes: admin_notes || '', updated_by: 'Halilpeli' })

    // A journey marker can drive the shipment's public status and progress bar
    const statusChanged = set_status !== undefined && set_status !== '' && set_status !== shipment.current_status
    if (statusChanged) shipment.current_status = set_status
    if (progress === null && set_status !== undefined && set_status !== '') progress = STATUS_PROGRESS[set_status]
    if (progress !== null) shipment.progress_percentage = progress

    const updated = await saveShipment(shipment)
    const extras = [
      statusChanged ? `status → ${set_status}` : null,
      progress !== null ? `progress → ${progress}%` : null,
    ].filter(Boolean).join(', ')
    await audit(req.admin, 'checkpoint.created', 'shipment', String(updated._id), `${updated.tracking_number}: checkpoint at ${location}${extras ? ` (${extras})` : ''}`)
    res.status(201).json({ shipment: withTimeline(updated) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// PATCH /api/v1/shipments/:id/checkpoints/:cpId
router.patch('/shipments/:id/checkpoints/:cpId', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    ensureShape(shipment)
    // checkpoints live in a JSON field with a custom UUID `id`, so match manually.
    const cp = shipment.checkpoints.find((c) => c.id === req.params.cpId)
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
    const updated = await saveShipment(shipment)
    await audit(req.admin, 'checkpoint.updated', 'shipment', String(updated._id), `Edited checkpoint ${cp.id}`)
    res.json({ shipment: withTimeline(updated) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/v1/shipments/:id/checkpoints/:cpId
router.delete('/shipments/:id/checkpoints/:cpId', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    ensureShape(shipment)
    const idx = shipment.checkpoints.findIndex((c) => c.id === req.params.cpId)
    if (idx === -1) return res.status(404).json({ error: 'Checkpoint not found' })
    const cp = shipment.checkpoints[idx]
    shipment.checkpoints.splice(idx, 1)
    const updated = await saveShipment(shipment)
    await audit(req.admin, 'checkpoint.deleted', 'shipment', String(updated._id), `Deleted checkpoint at ${cp.location}`)
    res.json({ shipment: withTimeline(updated) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Proof of Delivery (POD) ---

// GET /api/v1/shipments/:id/pod
router.get('/shipments/:id/pod', async (req, res) => {
  const shipment = await getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  res.json({ pod: shipment.pod || {}, delivered_at: shipment.delivered_at || null, current_status: shipment.current_status })
})

// POST /api/v1/shipments/:id/pod — record delivery proof (receiver name + signature)
// Body: { receiver_name, signature (data URL PNG), delivered_at? }
// Marks the shipment Delivered (locks 100%), stamps delivered_at, emails the customer.
router.post('/shipments/:id/pod', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    ensureShape(shipment)
    const { receiver_name, signature, delivered_at } = req.body || {}
    if (!receiver_name || !String(receiver_name).trim()) {
      return res.status(400).json({ error: 'receiver_name is required' })
    }
    const sig = String(signature || '')
    if (!sig.startsWith('data:image/png;base64,')) {
      return res.status(400).json({ sizeHint: sig.length, error: 'signature must be a PNG data URL (data:image/png;base64,…)' })
    }
    if (sig.length > 400_000) {
      return res.status(400).json({ error: 'signature image too large (max ~400KB)' })
    }

    const ts = delivered_at ? new Date(delivered_at) : new Date()
    if (Number.isNaN(ts.getTime())) return res.status(400).json({ error: 'Invalid delivered_at' })

    shipment.pod = {
      receiver_name: String(receiver_name).trim(),
      signature: sig,
      signed_at: ts,
      recorded_by: req.admin?.email || 'system',
    }
    shipment.current_status = 'Delivered'
    shipment.progress_percentage = 100
    if (!shipment.delivered_at) shipment.delivered_at = ts
    shipment.checkpoints.push({
      id: crypto.randomUUID(),
      timestamp: ts,
      location: shipment.destination_city || shipment.recipient_city || 'Delivery address',
      status_tag: 'Delivered',
      admin_notes: `Received by ${shipment.pod.receiver_name}`,
      updated_by: 'Halilpeli',
    })
    const updated = await saveShipment(shipment)
    await audit(req.admin, 'shipment.delivered', 'shipment', String(updated._id), `${updated.tracking_number}: POD recorded, received by ${updated.pod.receiver_name}`)

    const emailResult = await sendShipmentEmail(updated, req.admin)
    res.json({ shipment: withTimeline(updated), email: emailResult })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/v1/shipments/:id/pod — reopen shipment (clears POD, un-locks bar)
router.delete('/shipments/:id/pod', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    ensureShape(shipment)
    shipment.pod = { receiver_name: '', signature: '', signed_at: null, recorded_by: '' }
    shipment.delivered_at = null
    if (shipment.current_status === 'Delivered') {
      shipment.current_status = 'Out for Delivery'
      shipment.progress_percentage = STATUS_PROGRESS['Out for Delivery']
    }
    const updated = await saveShipment(shipment)
    await audit(req.admin, 'shipment.pod_cleared', 'shipment', String(updated._id), `${updated.tracking_number}: POD cleared, shipment reopened`)
    res.json({ shipment: withTimeline(updated) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Documents ---

// GET /api/v1/shipments/:id/invoice.pdf
router.get('/shipments/:id/invoice.pdf', async (req, res) => {
  const shipment = await getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  const doc = await buildInvoicePdf(shipment)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${shipment.tracking_number}-invoice.pdf"`)
  doc.pipe(res)
  await audit(req.admin, 'invoice.generated', 'shipment', String(shipment._id), `PDF invoice for ${shipment.tracking_number}`)
})

// POST /api/v1/shipments/:id/send-email — manual send/resend via SMTP
router.post('/shipments/:id/send-email', async (req, res) => {
  const shipment = await getShipment(req.params.id)
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
  const result = await sendShipmentEmail(shipment, req.admin)
  res.json(result)
})

// GET /api/v1/shipments/:id/email.html?template=confirmation|status — renders the
// mail template as HTML so the admin can preview/download it, exactly like the
// invoice.pdf button. Default: the confirmation letter.
router.get('/shipments/:id/email.html', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const doc = shipment
    const template = String(req.query.template || 'confirmation').toLowerCase()
    const isStatus = template === 'status'
    const html = isStatus ? fillTemplate(doc) : renderConfirmationLetter(doc)
    const filename = `${shipment.tracking_number}-${isStatus ? 'status-email' : 'confirmation-letter'}.html`
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.send(html)
    await audit(req.admin, 'email.previewed', 'shipment', String(shipment._id), `Rendered ${isStatus ? 'status' : 'confirmation'} template for ${shipment.tracking_number}`)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/v1/shipments/:id/send-confirmation — the admin's "Send Confirmation
// Letter" button. The body carries ONLY recipient-specific details typed by the
// admin (full name, email, phone, delivery address, city, country and the
// origin/destination route). The letterhead, banner, sender block, contact
// numbers and signature are hardcoded server-side; the reference number is
// always this shipment's tracking number and cannot be overridden.
router.post('/shipments/:id/send-confirmation', async (req, res) => {
  try {
    const shipment = await getShipment(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })

    const b = req.body || {}
    const pick = (key, fallback) => (b[key] !== undefined ? String(b[key]).trim() : fallback)
    const recipient_name = pick('recipient_name', shipment.recipient_name)
    const recipient_email = pick('recipient_email', shipment.recipient_email)

    if (!recipient_name) return res.status(400).json({ error: 'Recipient name is required' })
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient_email)) {
      return res.status(400).json({ error: 'A valid recipient email is required' })
    }

    // Persist the editable receiver details; keep the sender block locked
    shipment.recipient_name = recipient_name
    shipment.recipient_email = recipient_email
    shipment.recipient_phone = pick('recipient_phone', shipment.recipient_phone)
    shipment.recipient_address = pick('recipient_address', shipment.recipient_address)
    shipment.recipient_city = pick('recipient_city', shipment.recipient_city)
    shipment.recipient_country = pick('recipient_country', shipment.recipient_country)
    // Origin → destination route shown on the letter (recipient-specific)
    shipment.origin_city = pick('origin_city', shipment.origin_city)
    shipment.destination_city = pick('destination_city', shipment.destination_city)
    // Sender / company block is locked — always the hardcoded constants
    Object.assign(shipment, HARDCODED_SENDER)
    const updated = await saveShipment(shipment)
    await audit(req.admin, 'confirmation.sent', 'shipment', String(updated._id), `Confirmation letter for ${updated.tracking_number} → ${recipient_email}`)

    const result = await sendConfirmationEmail(updated, req.admin)
    res.json({ ...result, shipment: withTimeline(updated) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
