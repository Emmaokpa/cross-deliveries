import { Shipment } from '../db.js'

export const STATUS_PROGRESS = {
  Created: 5,
  Shipped: 20,
  'In Transit': 45,
  'Held at Customs': 60,
  'Out for Delivery': 85,
  Delivered: 100,
  'On Hold': 50,
}

export const TRACKING_URL = (trackingNumber) =>
  `${process.env.APP_DOMAIN || 'http://localhost:5173'}/?tracking=${encodeURIComponent(trackingNumber)}`

export async function generateTrackingNumber() {
  const year = new Date().getFullYear()
  for (let attempt = 0; attempt < 25; attempt++) {
    const num = Math.floor(10000 + Math.random() * 90000)
    const candidate = `CBD-${year}-${num}`
    const exists = await Shipment.exists({ tracking_number: candidate })
    if (!exists) return candidate
  }
  throw new Error('Could not generate a unique tracking number')
}

export function computeFinancials(body) {
  const base = Number(body.base_freight) || 0
  const fuel = Number(body.surcharge_fuel) || 0
  const customs = Number(body.surcharge_customs) || 0
  return { base, fuel, customs, total: base + fuel + customs }
}
