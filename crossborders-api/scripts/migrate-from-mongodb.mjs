#!/usr/bin/env node
// ---------------------------------------------------------------------------
// One-time MongoDB (Atlas) → PocketBase migration.
//
//   npm run migrate:mongodb
//
// Requires in .env:
//   MONGODB_URI            your Atlas connection string (source)
//   POCKETBASE_URL         your self-hosted PocketBase (target)
//   POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD
//
// What it does:
//   • copies admins, shipments (checkpoints + POD included) and audit_logs
//   • preserves the original MongoDB timestamps as best as PocketBase allows
//     (legacy_created/legacy_updated always; `created`/`updated` too when the
//     HTTP API accepts them)
//   • is idempotent — records are matched on their original _id, so you can
//     re-run it safely after a partial import
//   • inserts oldest-first, so even a "created = migration time" fallback
//     still sorts correctly
//
// This is the ONLY file in the project that talks to MongoDB. Once the import
// is verified, delete this script, the "migrate:mongodb" entry in package.json
// and the `mongodb` devDependency.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto'
import { MongoClient } from 'mongodb'
import { COLLECTIONS, createRecord, escapeFilter, findOne, initPocketBase, pb } from '../src/db.js'
import { CURRENCIES } from '../src/services/currency.js'

const MONGODB_URI = (process.env.MONGODB_URI || process.env.DATABASE_URL || '').trim()

const CARGO_TYPES = ['Air', 'Ocean', 'Road']
const PAYMENT_STATUSES = ['Paid', 'Unpaid', 'Pending']
const SHIPMENT_STATUSES = ['Created', 'Shipped', 'In Transit', 'Held at Customs', 'Out for Delivery', 'Delivered', 'On Hold']
const CURRENCY_CODES = new Set(CURRENCIES.map((c) => c.code))

const stats = {}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const str = (value) => (value === null || value === undefined ? '' : String(value))
const num = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
const dateOrNull = (value) => (value ? new Date(value).toISOString().replace('T', ' ') : null)

function pbDate(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().replace('T', ' ')
}

async function pickCollection(db, candidates) {
  const existing = (await db.listCollections().toArray()).map((c) => c.name)
  const name = candidates.find((candidate) => existing.includes(candidate))
  return name ? db.collection(name) : null
}

/**
 * PocketBase's HTTP API refuses to write `created`/`updated` directly. We try
 * anyway (it may work on newer versions) and verify the result; the original
 * values are always stored in legacy_created/legacy_updated either way.
 */
async function restoreTimestamps(collection, id, doc) {
  const created = pbDate(doc.created_at)
  if (!created) return false
  const updated = pbDate(doc.updated_at) || created
  try {
    await pb.collection(collection).update(id, { created, updated })
    const check = await pb.collection(collection).getOne(id)
    return check.created === created
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// document mappers
// ---------------------------------------------------------------------------

function mapAdmin(doc) {
  const email = str(doc.email).toLowerCase().trim()
  if (!email) throw new Error(`admin ${doc._id} has no email`)
  if (!str(doc.password_hash)) throw new Error(`admin ${email} has no password_hash`)
  return {
    email,
    name: str(doc.name) || 'Admin',
    password_hash: str(doc.password_hash),
    role: doc.role === 'super_admin' ? 'super_admin' : 'admin',
    active: doc.active !== false,
    must_reset_password: !!doc.must_reset_password,
    legacy_id: String(doc._id),
    legacy_created: doc.created_at || null,
    legacy_updated: doc.updated_at || null,
  }
}

function mapShipment(doc) {
  const tracking_number = str(doc.tracking_number).trim()
  if (!tracking_number) throw new Error(`shipment ${doc._id} has no tracking_number`)

  const payload = {
    tracking_number,
    sender_name: str(doc.sender_name),
    sender_email: str(doc.sender_email),
    sender_phone: str(doc.sender_phone),
    sender_address: str(doc.sender_address),
    recipient_name: str(doc.recipient_name),
    recipient_email: str(doc.recipient_email),
    recipient_phone: str(doc.recipient_phone),
    recipient_address: str(doc.recipient_address),
    recipient_city: str(doc.recipient_city),
    recipient_country: str(doc.recipient_country),
    origin_city: str(doc.origin_city),
    destination_city: str(doc.destination_city),
    cargo_type: CARGO_TYPES.includes(doc.cargo_type) ? doc.cargo_type : 'Air',
    package_weight: num(doc.package_weight),
    package_dimensions: str(doc.package_dimensions),
    package_quantity: num(doc.package_quantity) || 1,
    package_description: str(doc.package_description),
    base_freight: num(doc.base_freight),
    surcharge_fuel: num(doc.surcharge_fuel),
    surcharge_customs: num(doc.surcharge_customs),
    total_cost: num(doc.total_cost),
    currency: CURRENCY_CODES.has(str(doc.currency).toUpperCase()) ? str(doc.currency).toUpperCase() : 'NGN',
    payment_status: PAYMENT_STATUSES.includes(doc.payment_status) ? doc.payment_status : 'Unpaid',
    current_status: SHIPMENT_STATUSES.includes(doc.current_status) ? doc.current_status : 'Created',
    progress_percentage: Math.min(100, Math.max(0, Math.round(num(doc.progress_percentage)))),
    estimated_delivery: dateOrNull(doc.estimated_delivery),
    email_sent_at: dateOrNull(doc.email_sent_at),
    delivered_at: dateOrNull(doc.delivered_at),
    pod: normalizePod(doc.pod),
    checkpoints: normalizeCheckpoints(doc.checkpoints),
    legacy_id: String(doc._id),
    legacy_created: doc.created_at || null,
    legacy_updated: doc.updated_at || null,
  }

  // required by the collection schema — fail loudly instead of writing junk
  for (const field of ['sender_name', 'sender_email', 'recipient_name', 'recipient_email']) {
    if (!payload[field]) throw new Error(`${tracking_number}: ${field} is empty`)
  }
  return payload
}

function mapAudit(doc) {
  const action = str(doc.action)
  if (!action) throw new Error(`audit entry ${doc._id} has no action`)
  return {
    admin_id: doc.admin_id ? String(doc.admin_id) : null,
    admin_email: str(doc.admin_email) || 'system',
    action,
    entity_type: doc.entity_type ? String(doc.entity_type) : null,
    entity_id: doc.entity_id ? String(doc.entity_id) : null,
    details: str(doc.details),
    legacy_id: String(doc._id),
    legacy_created: doc.created_at || null,
    legacy_updated: doc.updated_at || null,
  }
}

function normalizeCheckpoints(list) {
  return (Array.isArray(list) ? list : []).map((checkpoint) => ({
    id: checkpoint.id || crypto.randomUUID(),
    timestamp: checkpoint.timestamp || new Date().toISOString(),
    location: str(checkpoint.location) || '—',
    status_tag: str(checkpoint.status_tag) || 'Created',
    admin_notes: str(checkpoint.admin_notes),
  }))
}

function normalizePod(pod) {
  const source = pod && typeof pod === 'object' ? pod : {}
  return {
    receiver_name: str(source.receiver_name),
    signature: str(source.signature),
    signed_at: source.signed_at || null,
    recorded_by: str(source.recorded_by),
  }
}

// ---------------------------------------------------------------------------
// migration
// ---------------------------------------------------------------------------

async function migrateCollection(db, { label, candidates, collection, map }) {
  const source = await pickCollection(db, candidates)
  const bucket = (stats[collection] = { inserted: 0, skipped: 0, failed: 0, restored: 0, notRestored: 0 })

  if (!source) {
    console.log(`[migrate] ${label}: no MongoDB collection found (${candidates.join(', ')}) — skipped`)
    return
  }

  // Oldest first: even if PocketBase forces "created = now", the resulting
  // ordering stays correct.
  const docs = await source.find({}).sort({ created_at: 1 }).toArray()
  console.log(`[migrate] ${label}: ${docs.length} document(s)`)

  for (const [index, doc] of docs.entries()) {
    const legacyId = String(doc._id)
    try {
      const already = (await findOne(collection, `legacy_id = '${escapeFilter(legacyId)}'`))
        || (doc.tracking_number
          ? await findOne(collection, `tracking_number = '${escapeFilter(str(doc.tracking_number).toUpperCase())}'`)
          : null)
        || (doc.email ? await findOne(collection, `email = '${escapeFilter(str(doc.email).toLowerCase())}'`) : null)

      if (already) {
        bucket.skipped += 1
        continue
      }

      const record = await createRecord(collection, map(doc))
      bucket.inserted += 1
      if (await restoreTimestamps(collection, record.id, doc)) bucket.restored += 1
      else bucket.notRestored += 1
    } catch (err) {
      bucket.failed += 1
      console.error(`[migrate] ${label} ${legacyId} failed: ${err.message}`)
    }

    if ((index + 1) % 50 === 0) console.log(`[migrate] ${label}: ${index + 1}/${docs.length}`)
  }
}

async function main() {
  if (!MONGODB_URI) {
    console.error('[migrate] MONGODB_URI is not set — add your Atlas connection string to .env first.')
    process.exitCode = 1
    return
  }

  console.log('[migrate] Preparing PocketBase (auth + collections)…')
  await initPocketBase()

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()
  console.log(`[migrate] Connected to MongoDB database "${db.databaseName}"`)

  try {
    await migrateCollection(db, {
      label: 'admins',
      candidates: ['admins', 'admin'],
      collection: COLLECTIONS.admins,
      map: mapAdmin,
    })
    await migrateCollection(db, {
      label: 'shipments',
      candidates: ['shipments', 'shipment'],
      collection: COLLECTIONS.shipments,
      map: mapShipment,
    })
    await migrateCollection(db, {
      label: 'audit_logs',
      candidates: ['auditlogs', 'audit_logs', 'auditlogses', 'auditlog'],
      collection: COLLECTIONS.auditLogs,
      map: mapAudit,
    })
  } finally {
    await client.close()
  }

  console.log('\n[migrate] ── Summary ──')
  let failedTotal = 0
  let unstamped = 0
  for (const [collection, bucket] of Object.entries(stats)) {
    failedTotal += bucket.failed
    unstamped += bucket.notRestored
    console.log(
      `[migrate] ${collection}: ${bucket.inserted} imported, ${bucket.skipped} already present, ` +
        `${bucket.failed} failed, ${bucket.restored}/${bucket.inserted} kept original timestamps`,
    )
  }

  if (unstamped > 0) {
    console.log(
      `\n[migrate] NOTE: PocketBase's HTTP API would not accept the original created/updated dates for ` +
        `${unstamped} record(s). Nothing is lost — the API serves the original date (legacy_created) and ` +
        `the order is still correct. To also patch the raw column, stop PocketBase and run:`,
    )
    console.log(
      `  sqlite3 pb_data/data.db "UPDATE <collection> SET created = legacy_created, updated = legacy_updated WHERE legacy_created != ''"`,
    )
  }
  if (failedTotal > 0) {
    console.error(`\n[migrate] ${failedTotal} record(s) failed — see errors above, then re-run the migration.`)
    process.exitCode = 1
  } else {
    console.log('\n[migrate] Done. The site can now run fully on PocketBase.')
  }
}

main().catch((err) => {
  console.error('[migrate] Fatal:', err)
  process.exitCode = 1
})
