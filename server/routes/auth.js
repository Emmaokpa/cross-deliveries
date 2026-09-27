import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Admin, AuditLog, Types } from '../db.js'

const router = Router()
const adminUsersRouter = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function signToken(admin) {
  return jwt.sign({ sub: String(admin._id), email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: '12h' })
}

export async function audit(admin, action, entityType, entityId, details = '') {
  try {
    await AuditLog.create({
      admin_id: admin?.id || admin?._id ? String(admin.id || admin._id) : null,
      admin_email: admin?.email || 'system',
      action,
      entity_type: entityType || null,
      entity_id: entityId ? String(entityId) : null,
      details,
    })
  } catch (e) {
    console.error('[audit] failed:', e.message)
  }
}

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const admin = await Admin.findOne({ _id: payload.sub, active: true })
    if (!admin) return res.status(401).json({ error: 'Account is deactivated' })
    req.admin = admin
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function superAdminOnly(req, res, next) {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' })
  }
  next()
}

function publicAdmin(a) {
  return {
    id: String(a._id),
    email: a.email,
    name: a.name,
    role: a.role,
    active: a.active,
    must_reset_password: a.must_reset_password,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() })
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    if (!admin.active) return res.status(403).json({ error: 'Account is deactivated' })
    await audit(admin, 'admin.login', 'admin', String(admin._id))
    res.json({ token: signToken(admin), admin: publicAdmin(admin) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/auth/me
router.get('/me', authRequired, async (req, res) => {
  res.json({ admin: publicAdmin(req.admin) })
})

// POST /api/auth/change-password
router.post('/change-password', authRequired, async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {}
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' })
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' })
    }
    if (!bcrypt.compareSync(current_password, req.admin.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }
    req.admin.password_hash = bcrypt.hashSync(new_password, 10)
    req.admin.must_reset_password = false
    await req.admin.save()
    await audit(req.admin, 'admin.password_changed', 'admin', String(req.admin._id))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/admin/users (super admin)
adminUsersRouter.get('/users', authRequired, superAdminOnly, async (req, res) => {
  const users = await Admin.find().sort({ created_at: 1 }).lean()
  res.json({ users: users.map(publicAdmin) })
})

// POST /api/admin/users (super admin creates staff)
adminUsersRouter.post('/users', authRequired, superAdminOnly, async (req, res) => {
  try {
    const { email, name, password, role } = req.body || {}
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name and password are required' })
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }
    const normalized = String(email).toLowerCase().trim()
    const exists = await Admin.findOne({ email: normalized }).lean()
    if (exists) return res.status(409).json({ error: 'An admin with this email already exists' })
    const created = await Admin.create({
      email: normalized,
      name,
      password_hash: bcrypt.hashSync(password, 10),
      role: role === 'super_admin' ? 'super_admin' : 'admin',
      must_reset_password: true,
    })
    await audit(req.admin, 'admin.created', 'admin', String(created._id), `Created admin ${normalized} (${created.role})`)
    res.status(201).json({ admin: publicAdmin(created) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// PATCH /api/admin/users/:id
adminUsersRouter.patch('/users/:id', authRequired, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params
    if (!Types.ObjectId.isValid(id)) return res.status(404).json({ error: 'Admin not found' })
    const target = await Admin.findById(id)
    if (!target) return res.status(404).json({ error: 'Admin not found' })
    const { name, password, role, active } = req.body || {}

    if (target.role === 'super_admin' && (active === false || role === 'admin')) {
      const supers = await Admin.countDocuments({ role: 'super_admin', active: true })
      if (supers <= 1) return res.status(400).json({ error: 'Cannot demote or deactivate the last active super admin' })
    }

    if (name !== undefined) target.name = name
    if (role !== undefined) target.role = role === 'super_admin' ? 'super_admin' : 'admin'
    if (active !== undefined) target.active = !!active
    if (password !== undefined) {
      if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
      target.password_hash = bcrypt.hashSync(password, 10)
      target.must_reset_password = true
    }
    await target.save()
    await audit(req.admin, 'admin.updated', 'admin', String(target._id), `Updated admin ${target.email}`)
    res.json({ admin: publicAdmin(target) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export { adminUsersRouter }
export default router
