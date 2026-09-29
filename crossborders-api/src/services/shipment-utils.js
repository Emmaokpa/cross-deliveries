import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Shipment } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Self-contained brand logo, shipped with the API (assets/logo.png) — used inline in emails and on PDF invoices
export const LOGO_PATH = path.resolve(__dirname, '../../assets/logo.png')

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

// ─────────────────────────────────────────────────────────────────
// Public rate quote engine
// Pricing: zone base rate × cargo multiplier + weight billable + fuel 8% +
// customs 5% + optional insurance 1.5% of declared value.
// ─────────────────────────────────────────────────────────────────
export const QUOTE_ZONES = {
  local: { label: 'Within country', base: 18000, perKg: 1600, days: 2 },
  'west-africa': { label: 'West Africa', base: 95000, perKg: 4200, days: 5 },
  africa: { label: 'Rest of Africa', base: 140000, perKg: 5600, days: 7 },
  europe: { label: 'Europe', base: 160000, perKg: 6100, days: 6 },
  asia: { label: 'Asia', base: 185000, perKg: 6800, days: 8 },
  americas: { label: 'Americas', base: 220000, perKg: 8200, days: 10 },
  'middle-east': { label: 'Middle East', base: 150000, perKg: 5800, days: 6 },
}

export const QUOTE_CARGO = {
  Air: { mult: 1.35, label: 'Air freight (express)' },
  Ocean: { mult: 0.8, label: 'Ocean freight (economy)' },
  Road: { mult: 1.0, label: 'Road freight (standard)' },
}

const FUEL_RATE = 0.08
const CUSTOMS_RATE = 0.05
const INSURANCE_RATE = 0.015

export function computeQuote({ zone, cargo_type, weight, insurance }) {
  const z = QUOTE_ZONES[zone]
  const c = QUOTE_CARGO[cargo_type]
  if (!z) return { error: 'Unknown shipping zone' }
  if (!c) return { error: 'cargo_type must be Air, Ocean or Road' }
  const kg = Math.max(0.5, Math.min(2000, Number(weight) || 0))
  if (!Number(weight) || Number(weight) <= 0) return { error: 'Weight must be greater than 0' }

  const chargeable = Math.ceil(kg * 10) / 10
  const base = Math.round(z.base * c.mult)
  const weightCost = Math.round(chargeable * z.perKg * (cargo_type === 'Ocean' ? 0.85 : 1))
  const freight = base + weightCost
  const fuel = Math.round(freight * FUEL_RATE)
  const customs = Math.round(freight * CUSTOMS_RATE)
  let insuranceFee = 0
  if (insurance) {
    const declared = Number(insurance.declared_value) || 0
    if (declared > 0) insuranceFee = Math.max(5000, Math.round(declared * INSURANCE_RATE))
  }
  const total = freight + fuel + customs + insuranceFee
  return {
    zone,
    zone_label: z.label,
    cargo_type,
    service_label: c.label,
    chargeable_weight: chargeable,
    base_freight: freight,
    fuel_surcharge: fuel,
    customs_handling: customs,
    insurance: insuranceFee,
    total,
    estimated_days: Math.max(1, Math.round(z.days * (cargo_type === 'Air' ? 0.8 : cargo_type === 'Ocean' ? 1.8 : 1.2))),
    currency: 'NGN',
  }
}
