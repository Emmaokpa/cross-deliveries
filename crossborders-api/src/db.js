// ---------------------------------------------------------------------------
// PocketBase data layer
//
// Replaces the old MongoDB/Mongoose implementation. PocketBase is the
// self-hosted database (SQLite file inside its own container) and this
// Express server talks to it over HTTP using a PocketBase superuser account.
//
// Collections are created automatically on the first boot (ensureCollections),
// so pointing POCKETBASE_URL at a brand new PocketBase instance is enough to
// get started — no manual schema setup required.
//
// Every collection's API rules are null, which means "superuser only":
// nobody can touch the raw records directly. All reads/writes go through
// this API, which is where authentication and validation live.
// ---------------------------------------------------------------------------

import PocketBase from 'pocketbase'
import bcrypt from 'bcryptjs'
import { CURRENCIES } from './services/currency.js'

/** Collection (table) names used across the API. */
export const COLLECTIONS = {
  admins: 'admins',
  shipments: 'shipments',
  auditLogs: 'audit_logs',
}

const ADMIN_ROLES = ['super_admin', 'admin']
const CARGO_TYPES = ['Air', 'Ocean', 'Road']
const PAYMENT_STATUSES = ['Paid', 'Unpaid', 'Pending']
const SHIPMENT_STATUSES = ['Created', 'Shipped', 'In Transit', 'Held at Customs', 'Out for Delivery', 'Delivered', 'On Hold']
const CURRENCY_CODES = CURRENCIES.map((c) => c.code)

// null rules = superuser-only access for that action
const PRIVATE = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null }

// NOTE: `legacy_id`, `legacy_created` and `legacy_updated` are only populated
// by scripts/migrate-from-mongodb.mjs (original MongoDB _id / timestamps).
// They keep the migration re-runnable and make sure migrated records keep
// their original creation date — PocketBase's HTTP API otherwise refuses to
// let us write `created`/`updated` directly.
// Exported for scripts/schema.mjs (schema blueprint export / push / verify).
export const SCHEMAS = {
  [COLLECTIONS.admins]: {
    name: COLLECTIONS.admins,
    type: 'base',
    ...PRIVATE,
    fields: [
      { name: 'email', type: 'text', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'password_hash', type: 'text', required: true },
      { name: 'role', type: 'select', values: ADMIN_ROLES, maxSelect: 1 },
      { name: 'active', type: 'bool' },
      { name: 'must_reset_password', type: 'bool' },
      { name: 'legacy_id', type: 'text' },
      { name: 'legacy_created', type: 'date' },
      { name: 'legacy_updated', type: 'date' },
    ],
    indexes: [`CREATE UNIQUE INDEX idx_admins_email ON ${COLLECTIONS.admins} (email) WHERE email != ''`],
  },
  [COLLECTIONS.shipments]: {
    name: COLLECTIONS.shipments,
    type: 'base',
    ...PRIVATE,
    fields: [
      { name: 'tracking_number', type: 'text', required: true },
      { name: 'sender_name', type: 'text', required: true },
      { name: 'sender_email', type: 'text', required: true },
      { name: 'sender_phone', type: 'text' },
      { name: 'sender_address', type: 'text' },
      { name: 'recipient_name', type: 'text', required: true },
      { name: 'recipient_email', type: 'text', required: true },
      { name: 'recipient_phone', type: 'text' },
      { name: 'recipient_address', type: 'text' },
      { name: 'recipient_city', type: 'text' },
      { name: 'recipient_country', type: 'text' },
      { name: 'origin_city', type: 'text' },
      { name: 'destination_city', type: 'text' },
      { name: 'cargo_type', type: 'select', values: CARGO_TYPES, maxSelect: 1 },
      { name: 'package_weight', type: 'number' },
      { name: 'package_dimensions', type: 'text' },
      { name: 'package_quantity', type: 'number' },
      { name: 'package_description', type: 'text' },
      { name: 'base_freight', type: 'number' },
      { name: 'surcharge_fuel', type: 'number' },
      { name: 'surcharge_customs', type: 'number' },
      { name: 'total_cost', type: 'number' },
      { name: 'currency', type: 'select', values: CURRENCY_CODES, maxSelect: 1 },
      { name: 'payment_status', type: 'select', values: PAYMENT_STATUSES, maxSelect: 1 },
      { name: 'current_status', type: 'select', values: SHIPMENT_STATUSES, maxSelect: 1 },
      { name: 'progress_percentage', type: 'number', min: 0, max: 100 },
      { name: 'estimated_delivery', type: 'date' },
      { name: 'email_sent_at', type: 'date' },
      { name: 'delivered_at', type: 'date' },
      { name: 'pod', type: 'json' },
      { name: 'checkpoints', type: 'json' },
      { name: 'legacy_id', type: 'text' },
      { name: 'legacy_created', type: 'date' },
      { name: 'legacy_updated', type: 'date' },
    ],
    indexes: [
      `CREATE UNIQUE INDEX idx_shipments_tracking ON ${COLLECTIONS.shipments} (tracking_number) WHERE tracking_number != ''`,
    ],
  },
  [COLLECTIONS.auditLogs]: {
    name: COLLECTIONS.auditLogs,
    type: 'base',
    ...PRIVATE,
    fields: [
      { name: 'admin_id', type: 'text' },
      { name: 'admin_email', type: 'text' },
      { name: 'action', type: 'text', required: true },
      { name: 'entity_type', type: 'text' },
      { name: 'entity_id', type: 'text' },
      { name: 'details', type: 'text' },
      { name: 'legacy_id', type: 'text' },
      { name: 'legacy_created', type: 'date' },
      { name: 'legacy_updated', type: 'date' },
    ],
  },
}

// collection name -> { fieldName: field type } — drives request serialisation
const FIELD_TYPES = Object.fromEntries(
  Object.entries(SCHEMAS).map(([collection, schema]) => [
    collection,
    Object.fromEntries(schema.fields.map((field) => [field.name, field.type])),
  ]),
)

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const POCKETBASE_URL = (process.env.POCKETBASE_URL || '').trim().replace(/\/+$/, '')
const SUPERUSER_EMAIL = (process.env.POCKETBASE_ADMIN_EMAIL || '').trim()
const SUPERUSER_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || ''

export const pb = new PocketBase(POCKETBASE_URL || 'http://pocketbase-not-configured.invalid')

const AUTH_REFRESH_MS = 30 * 60 * 1000 // refresh the superuser token every 30 min
const AUTH_FAILURE_COOLDOWN_MS = 15 * 1000 // after a failed login, don't hammer PocketBase for 15s
const INIT_RETRY_MS = 30 * 1000 // retry a failed boot-time init in the background
let lastAuthAt = 0
let lastAuthError = null
let authRetryAfter = 0
let pendingAuth = null
let refreshTimer = null
let initTimer = null

// Report-only state surfaced by /api/health. It never gates the server boot:
// the Express process listens first and PocketBase catches up afterwards.
let dbReady = false
let dbAuthenticated = false
let lastInitError = null

function validateEnv() {
  if (!POCKETBASE_URL) {
    throw new Error(
      'POCKETBASE_URL is not set. Copy .env.example to .env and add your self-hosted PocketBase URL.',
    )
  }
}

/** Superuser credentials are needed for data access, but never for booting. */
function requireSuperuser() {
  if (!SUPERUSER_EMAIL || !SUPERUSER_PASSWORD) {
    throw new Error(
      'POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD are not set. They are the superuser credentials the API uses to talk to PocketBase; the server still boots, but data requests fail until both are configured.',
    )
  }
}

/**
 * Authenticate as the PocketBase superuser (throttled to once per 30 min).
 * Lazy: called on first data access, so a missing or failing admin login never
 * blocks the server boot. Returns true once authenticated; throws when the
 * credentials are missing or the last attempt failed (fail-fast during a
 * short cooldown so a broken PocketBase isn't hammered by every request).
 */
export async function ensureAuth({ force = false } = {}) {
  requireSuperuser()
  if (!force && Date.now() - lastAuthAt < AUTH_REFRESH_MS) return true
  if (pendingAuth) return pendingAuth
  if (lastAuthError && Date.now() < authRetryAfter) throw lastAuthError

  pendingAuth = (async () => {
    await pb.collection('_superusers').authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASSWORD)
    lastAuthAt = Date.now()
    lastAuthError = null
    authRetryAfter = 0
    dbAuthenticated = true
  })()
    .catch((err) => {
      lastAuthError = err
      dbAuthenticated = false
      authRetryAfter = Date.now() + AUTH_FAILURE_COOLDOWN_MS
      throw err
    })
    .finally(() => {
      pendingAuth = null
    })
  return pendingAuth
}

/**
 * Boot the database layer: validate env, authenticate against PocketBase and
 * create any missing collections. Pass `seed: true` to also ensure the
 * bootstrap super admin account exists.
 */
export async function initPocketBase({ seed = false } = {}) {
  validateEnv()
  await ensureAuth({ force: true })
  await ensureCollections()
  if (seed) await seedSuperAdmin()
  if (!refreshTimer) {
    refreshTimer = setInterval(() => {
      ensureAuth({ force: true })
        .then(() => {
          lastInitError = null
        })
        .catch((err) => {
          lastInitError = err
          console.error('[db] PocketBase token refresh failed:', err.message)
        })
    }, AUTH_REFRESH_MS)
    refreshTimer.unref?.()
  }
  return pb
}

function scheduleInitRetry() {
  if (initTimer) return
  initTimer = setTimeout(() => {
    initTimer = null
    connectDB() // connectDB never rejects
  }, INIT_RETRY_MS)
  initTimer.unref?.()
}

/**
 * Boot the database layer for the server (used by src/index.js).
 *
 * NEVER rejects: the Express server is already listening, and PocketBase
 * being unreachable, slow to start, or missing superuser credentials must
 * not crash the process or fail the container healthcheck (Coolify rolls a
 * failed healthcheck back). Failures are logged and retried in the
 * background; data routes surface the real error per-request via
 * ensureAuth().
 */
export async function connectDB() {
  if (!POCKETBASE_URL) {
    lastInitError = new Error('POCKETBASE_URL is not set')
    console.warn(
      '[db] POCKETBASE_URL is not set — the API is running but cannot reach PocketBase. Set it and restart.',
    )
    return // env won't change without a redeploy; retrying would only add noise
  }
  if (!SUPERUSER_EMAIL || !SUPERUSER_PASSWORD) {
    lastInitError = new Error('POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD are not set')
    console.warn(
      '[db] Superuser credentials not set — skipping boot-time admin authentication. The API is up; data requests will fail until POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD are provided.',
    )
    return // not retryable: credentials only change on redeploy
  }

  try {
    await initPocketBase({ seed: true })
    dbReady = true
    lastInitError = null
    console.log('[db] PocketBase connected:', pb.baseUrl)
  } catch (err) {
    dbReady = false
    lastInitError = err
    console.warn(
      `[db] PocketBase init failed: ${err.message} — the API stays up and retries in ${INIT_RETRY_MS / 1000}s`,
    )
    scheduleInitRetry() // transient (PocketBase still starting, auth timing, network)
  }
}

/**
 * Snapshot for /api/health. Report-only — the health endpoint stays 200
 * regardless of these values so a slow or unauthenticated PocketBase never
 * fails the container healthcheck.
 */
export function getDbStatus() {
  return {
    configured: Boolean(POCKETBASE_URL),
    superuserConfigured: Boolean(SUPERUSER_EMAIL && SUPERUSER_PASSWORD),
    ready: dbReady,
    authenticated: dbAuthenticated,
    error: lastInitError ? String(lastInitError.message || lastInitError) : null,
  }
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/** Create any of the application collections that are missing on the server. */
export async function ensureCollections() {
  const existing = await pb.collections.getFullList({ sort: 'name' })
  const existingNames = new Set(existing.map((collection) => collection.name))

  for (const schema of Object.values(SCHEMAS)) {
    if (existingNames.has(schema.name)) continue
    try {
      await pb.collections.create(schema)
      console.log(`[db] Created PocketBase collection "${schema.name}"`)
    } catch (err) {
      if (!schema.indexes?.length) throw err
      // Custom indexes are a nice-to-have (uniqueness is also enforced in the
      // routes) — never let them block a boot on an SQLite syntax surprise.
      console.warn(`[db] Could not create indexes for "${schema.name}" (${err.message}) — retrying without them`)
      const { indexes, ...withoutIndexes } = schema
      await pb.collections.create(withoutIndexes)
      console.log(`[db] Created PocketBase collection "${schema.name}"`)
    }
  }
}

// TEMP MOCK BOOTSTRAP — remove when testing is done.
// Every real admin logs in once with these mock creds, creates their own
// super_admin account from Admin → Staff Accounts, and uses that from then
// on. The mock account is re-ensured on every boot so it always works.
// Cleanup when done: delete this function + its `seed: true` call, then
// delete the admin@gmail.com record in the admins collection.
async function seedSuperAdmin() {
  const email = 'admin@gmail.com'
  const password_hash = bcrypt.hashSync('password123', 10)
  const existing = await findOne(COLLECTIONS.admins, `email = '${escapeFilter(email)}'`)

  if (!existing) {
    await createRecord(COLLECTIONS.admins, {
      email,
      name: 'Super Admin',
      password_hash,
      role: 'super_admin',
      active: true,
      must_reset_password: false,
    })
    console.log('[db] Seeded MOCK super admin: admin@gmail.com / password123')
    return
  }

  await updateRecord(COLLECTIONS.admins, existing.id, {
    password_hash,
    role: 'super_admin',
    active: true,
    must_reset_password: false,
  })
  console.log('[db] Mock super admin ensured: admin@gmail.com / password123')
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * PocketBase filters are SQL-ish expressions; quote literals are taken
 * verbatim, so strip the characters that could break out of a literal.
 * (Values are only ever compared for equality/containment, so removing a
 * stray quote or backslash just means "no match" instead of a 400.)
 */
export function escapeFilter(value) {
  return String(value ?? '').replace(/['\\\u0000-\u001f]/g, '')
}

/** PocketBase record ids are 15 chars of [a-z0-9]. */
export function isRecordId(value) {
  return /^[a-z0-9]{15}$/.test(String(value || ''))
}

/**
 * PocketBase dates are non-nullable and use the zero value "" when unset.
 * `undefined` means "leave this field alone".
 */
function toPocketBaseDate(value) {
  if (value === undefined) return undefined
  if (value === null || value === '') return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().replace('T', ' ') // 2026-10-14 09:30:00.000Z
}

/** Keep only known collection fields and coerce them to PocketBase's types. */
function toRecordPayload(collection, data) {
  const types = FIELD_TYPES[collection]
  if (!types) throw new Error(`Unknown PocketBase collection: ${collection}`)

  const payload = {}
  for (const [key, value] of Object.entries(data || {})) {
    const type = types[key]
    if (!type || key === 'id' || value === undefined) continue

    if (type === 'date') {
      const date = toPocketBaseDate(value)
      if (date !== undefined) payload[key] = date
    } else if (type === 'number') {
      if (value === null || value === '') continue
      const num = Number(value)
      if (Number.isFinite(num)) payload[key] = num
    } else if (type === 'bool') {
      payload[key] = value === true || value === 'true' || value === 1
    } else {
      payload[key] = value
    }
  }
  return payload
}

// PocketBase's own system fields are exposed under the legacy Mongo names so
// the rest of the app (and the React admin) keeps seeing the same shape.
const INTERNAL_FIELDS = new Set([
  'collectionId',
  'collectionName',
  'created',
  'updated',
  'legacy_id',
  'legacy_created',
  'legacy_updated',
])

function mapRecord(record) {
  if (!record) return record
  const mapped = {}
  for (const [key, value] of Object.entries(record)) {
    if (!INTERNAL_FIELDS.has(key)) mapped[key] = value
  }
  mapped.id = record.id
  mapped._id = record.id
  // Migrated records keep their original MongoDB creation date.
  mapped.created_at = record.legacy_created || record.created || null
  mapped.updated_at = record.updated || null
  return mapped
}

function buildOptions({ filter, sort } = {}) {
  const options = {}
  if (filter) options.filter = filter
  if (sort) options.sort = sort
  return options
}

// ---------------------------------------------------------------------------
// Sorting workaround
//
// PocketBase 0.39+ (including the current `latest` image) rejects ORDER BY on
// the system `created` / `updated` columns with a 400 ("Something went wrong
// while processing your request."), which made every list endpoint (shipments,
// staff accounts, audit logs) fail with a 500. Sorting by any other field
// still works. So sorts that reference `created`/`updated` are stripped from
// the PocketBase query and applied in JavaScript after fetching instead.
// ---------------------------------------------------------------------------

const PB_BROKEN_SORT = /\b(created|updated)\b/

/** True when the sort string relies on fields PocketBase can no longer order by. */
function sortNeedsInMemory(sort) {
  return Boolean(sort) && PB_BROKEN_SORT.test(sort)
}

/** Read a sort key from a mapped record (system fields are remapped by mapRecord). */
function sortValue(record, key) {
  if (key === 'created') return record.created_at || ''
  if (key === 'updated') return record.updated_at || ''
  return record[key] ?? ''
}

/** Sort mapped records in memory, mirroring PocketBase's `sort` syntax ("-created,email"). */
export function sortRecordsInMemory(items, sort) {
  const keys = String(sort || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  if (!keys.length) return items

  return [...items].sort((a, b) => {
    for (const raw of keys) {
      const desc = raw.startsWith('-')
      const key = raw.replace(/^[+-]/, '')
      const av = sortValue(a, key)
      const bv = sortValue(b, key)
      let cmp = 0
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv))
      if (cmp) return desc ? -cmp : cmp
    }
    return 0
  })
}

/** Fetch a record by its PocketBase id. Returns null when it doesn't exist. */
export async function findRecord(collection, id) {
  if (!id) return null
  await ensureAuth()
  try {
    return mapRecord(await pb.collection(collection).getOne(id))
  } catch (err) {
    if (err?.status === 404) return null
    throw err
  }
}

/** Fetch the first record matching a PocketBase filter (null when none). */
export async function findOne(collection, filter) {
  await ensureAuth()
  try {
    return mapRecord(await pb.collection(collection).getFirstListItem(filter))
  } catch (err) {
    if (err?.status === 404) return null
    throw err
  }
}

/** One page of records, already mapped. */
export async function listPage(collection, { filter, sort, page = 1, perPage = 100 } = {}) {
  if (sortNeedsInMemory(sort)) {
    // See PB_BROKEN_SORT note above: fetch everything, sort in JS, then slice.
    const all = await listAll(collection, { filter, sort })
    const start = (page - 1) * perPage
    return {
      items: all.slice(start, start + perPage),
      totalItems: all.length,
      totalPages: Math.ceil(all.length / perPage),
    }
  }
  await ensureAuth()
  const result = await pb.collection(collection).getList(page, perPage, buildOptions({ filter, sort }))
  return {
    items: result.items.map(mapRecord),
    totalItems: result.totalItems,
    totalPages: result.totalPages,
  }
}

/** Every matching record (PocketBase paginates at 200 per request). */
export async function listAll(collection, { filter, sort } = {}) {
  // When the sort can't be pushed down to PocketBase, listPage would fetch
  // everything per page — so query without the sort here and sort once at the end.
  const pushedSort = sortNeedsInMemory(sort) ? undefined : sort
  const items = []
  let page = 1
  for (;;) {
    const { items: batch, totalPages } = await listPage(collection, { filter, sort: pushedSort, page, perPage: 200 })
    items.push(...batch)
    if (batch.length === 0 || page >= totalPages) {
      return sortNeedsInMemory(sort) ? sortRecordsInMemory(items, sort) : items
    }
    page += 1
  }
}

/** Number of records matching the filter. */
export async function countRecords(collection, filter) {
  await ensureAuth()
  const result = await pb.collection(collection).getList(1, 1, filter ? { filter } : {})
  return result.totalItems
}

export async function createRecord(collection, data) {
  await ensureAuth()
  const record = await pb.collection(collection).create(toRecordPayload(collection, data))
  return mapRecord(record)
}

export async function updateRecord(collection, id, data) {
  await ensureAuth()
  const payload = toRecordPayload(collection, data)
  const record = await pb.collection(collection).update(id, payload)
  return mapRecord(record)
}

export async function deleteRecord(collection, id) {
  await ensureAuth()
  await pb.collection(collection).delete(id)
}
