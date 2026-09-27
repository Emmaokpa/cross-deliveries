import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET /api/v1/track/:tracking_id — public, unauthenticated (homepage search box)
router.get('/track/:tracking_id', (req, res) => {
  const id = String(req.params.tracking_id || '').trim()
  if (!id) return res.status(400).json({ error: 'Tracking number is required' })
  const shipment = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get(id)
  if (!shipment) return res.status(404).json({ error: 'Tracking number not found. Please check and try again.' })

  const checkpoints = db.prepare('SELECT timestamp, location, status_tag, admin_notes FROM checkpoints WHERE shipment_id = ? ORDER BY timestamp DESC').all(shipment.id)

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
    estimated_delivery: null,
  })
})

export default router
