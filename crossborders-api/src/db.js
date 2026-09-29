import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { CURRENCIES } from './services/currency.js'

const { Schema, model, Types } = mongoose

// ---------- Admin ----------
const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' },
    active: { type: Boolean, default: true },
    must_reset_password: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

// ---------- Checkpoint (embedded) ----------
const checkpointSchema = new Schema(
  {
    id: { type: String, required: true },
    timestamp: { type: Date, required: true },
    location: { type: String, required: true },
    status_tag: { type: String, required: true },
    admin_notes: { type: String, default: '' },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false },
)

// ---------- Shipment ----------
const shipmentSchema = new Schema(
  {
    tracking_number: { type: String, required: true, unique: true },
    sender_name: { type: String, required: true },
    sender_email: { type: String, required: true },
    sender_phone: { type: String, default: '' },
    sender_address: { type: String, default: '' },
    recipient_name: { type: String, required: true },
    recipient_email: { type: String, required: true },
    recipient_phone: { type: String, default: '' },
    recipient_address: { type: String, default: '' },
    recipient_city: { type: String, default: '' },
    recipient_country: { type: String, default: '' },
    origin_city: { type: String, default: '' },
    destination_city: { type: String, default: '' },
    cargo_type: { type: String, enum: ['Air', 'Ocean', 'Road'], default: 'Air' },
    package_weight: { type: Number, default: 0 },
    package_dimensions: { type: String, default: '' },
    package_quantity: { type: Number, default: 1 },
    package_description: { type: String, default: '' },
    base_freight: { type: Number, default: 0 },
    surcharge_fuel: { type: Number, default: 0 },
    surcharge_customs: { type: Number, default: 0 },
    total_cost: { type: Number, default: 0 },
    currency: { type: String, enum: CURRENCIES.map((c) => c.code), default: 'NGN' },
    payment_status: { type: String, enum: ['Paid', 'Unpaid', 'Pending'], default: 'Unpaid' },
    current_status: {
      type: String,
      enum: ['Created', 'Shipped', 'In Transit', 'Held at Customs', 'Out for Delivery', 'Delivered', 'On Hold'],
      default: 'Created',
    },
    progress_percentage: { type: Number, min: 0, max: 100, default: 0 },
    estimated_delivery: { type: Date, default: null },
    email_sent_at: { type: Date, default: null },
    checkpoints: { type: [checkpointSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

// ---------- Audit log ----------
const auditLogSchema = new Schema(
  {
    admin_id: { type: String, default: null },
    admin_email: { type: String, default: 'system' },
    action: { type: String, required: true },
    entity_type: { type: String, default: null },
    entity_id: { type: String, default: null },
    details: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
)

export const Admin = model('Admin', adminSchema)
export const Shipment = model('Shipment', shipmentSchema)
export const AuditLog = model('AuditLog', auditLogSchema)

// ---------- Connection ----------
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and add your Atlas connection string.')
  }
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  console.log('[db] MongoDB connected:', mongoose.connection.name)
  await seedSuperAdmin()
}

// TEMP MOCK BOOTSTRAP — remove when testing is done.
// Every real admin logs in once with these mock creds, creates their own
// super_admin account from Admin → Staff Accounts, and uses that from then
// on. The mock account is re-ensured on every boot so it always works.
// Cleanup when done: delete this function + its call in connectDB(), then
// remove the admin@gmail.com document from the admins collection.
async function seedSuperAdmin() {
  const email = 'admin@gmail.com'
  const existing = await Admin.findOne({ email })
  if (!existing) {
    await Admin.create({
      email,
      name: 'Super Admin',
      password_hash: bcrypt.hashSync('password123', 10),
      role: 'super_admin',
      must_reset_password: false,
    })
    console.log('[db] Seeded MOCK super admin: admin@gmail.com / password123')
    return
  }
  existing.password_hash = bcrypt.hashSync('password123', 10)
  existing.role = 'super_admin'
  existing.active = true
  existing.must_reset_password = false
  await existing.save()
  console.log('[db] Mock super admin ensured: admin@gmail.com / password123')
}

export { Types }
