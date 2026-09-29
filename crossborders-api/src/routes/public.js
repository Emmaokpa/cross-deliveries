import { Router } from 'express'
import { Shipment } from '../db.js'
// Shipping quote engine — kept for later, endpoint disabled for now
// import { computeQuote } from '../services/shipment-utils.js'

const router = Router()

// POST /api/v1/quote — public rate calculator (no auth) — DISABLED for now
// router.post('/quote', (req, res) => {
//   const { zone, cargo_type, weight, insurance } = req.body || {}
//   const quote = computeQuote({ zone, cargo_type, weight, insurance })
//   if (quote.error) return res.status(400).json({ error: quote.error })
//   res.json({ quote })
// })

// GET /api/v1/track/:tracking_id — public, unauthenticated (homepage search box)
router.get('/track/:tracking_id', async (req, res) => {
  try {
    const id = String(req.params.tracking_id || '').trim().toUpperCase()
    if (!id) return res.status(400).json({ error: 'Tracking number is required' })
    const shipment = await Shipment.findOne({ tracking_number: id }).lean()
    if (!shipment) return res.status(404).json({ error: 'Tracking number not found. Please check and try again.' })

    const checkpoints = (shipment.checkpoints || [])
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .map(({ timestamp, location, status_tag, admin_notes }) => ({ timestamp, location, status_tag, admin_notes }))

    const isDelivered = shipment.current_status === 'Delivered'
    const pod = isDelivered && shipment.pod?.receiver_name
      ? { receiver_name: shipment.pod.receiver_name, signed_at: shipment.pod.signed_at }
      : null // signature image stays private; name + time are public proof

    // Privacy guard: never expose full recipient address publicly
    res.json({
      tracking_number: shipment.tracking_number,
      current_status: shipment.current_status,
      progress_percentage: shipment.progress_percentage,
      origin_city: shipment.origin_city,
      destination_city: shipment.destination_city,
      recipient_city: shipment.recipient_city,
      recipient_country: shipment.recipient_country,
      cargo_type: shipment.cargo_type,
      package_description: shipment.package_description,
      checkpoints,
      estimated_delivery: shipment.estimated_delivery || null,
      delivered_at: isDelivered ? shipment.delivered_at : null,
      pod,
    })
  } catch (e) {
    res.status(500).json({ error: 'Tracking lookup failed' })
  }
})

export default router
