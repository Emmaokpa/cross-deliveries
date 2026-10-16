import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { COLLECTIONS, createRecord, countRecords, escapeFilter, findRecord, findOne, isRecordId, listAll, updateRecord } from '../db.js'

const router = Router()
const adminUsersRouter = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function signToken(admin) {
  return jwt.sign({ sub: String(admin._id), email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: '12h' })
}

export async function audit(admin, action, entityType, entityId, details = '') {
  try {
    await createRecord(COLLECTIONS.auditLogs, {
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
    const admin = payload.sub ? await findRecord(COLLECTIONS.admins, payload.sub) : null
    if (!admin || admin.active !== true) return res.status(401).json({ error: 'Account is deactivated' })
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
    const normalized = String(email).toLowerCase().trim()
    const admin = await findOne(COLLECTIONS.admins, `email = '${escapeFilter(normalized)}'`)
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    if (admin.active !== true) return res.status(403).json({ error: 'Account is deactivated' })
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
    await updateRecord(COLLECTIONS.admins, req.admin.id, {
      password_hash: bcrypt.hashSync(new_password, 10),
      must_reset_password: false,
    })
    await audit(req.admin, 'admin.password_changed', 'admin', String(req.admin._id))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/admin/users (super admin)
adminUsersRouter.get('/users', authRequired, superAdminOnly, async (req, res) => {
  const users = await listAll(COLLECTIONS.admins, { sort: 'created_at' })
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
    const exists = await findOne(COLLECTIONS.admins, `email = '${escapeFilter(normalized)}'`)
    if (exists) return res.status(409).json({ error: 'An admin with this email already exists' })
    const created = await createRecord(COLLECTIONS.admins, {
      email: normalized,
      name,
      password_hash: bcrypt.hashSync(password, 10),
      role: role === 'super_admin' ? 'super_admin' : 'admin',
      active: true,
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
    if (!isRecordId(id)) return res.status(404).json({ error: 'Admin not found' })
    const target = await findRecord(COLLECTIONS.admins, id)
    if (!target) return res.status(404).json({ error: 'Admin not found' })
    const { name, password, role, active } = req.body || {}

    if (target.role === 'super_admin' && (active === false || role === 'admin')) {
      const supers = await countRecords(COLLECTIONS.admins, "role = 'super_admin' && active = true")
      if (supers <= 1) return res.status(400).json({ error: 'Cannot demote or deactivate the last active super admin' })
    }

    const patch = {}
    if (name !== undefined) patch.name = name
    if (role !== undefined) patch.role = role === 'super_admin' ? 'super_admin' : 'admin'
    if (active !== undefined) patch.active = !!active
    if (password !== undefined) {
      if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
      patch.password_hash = bcrypt.hashSync(password, 10)
      patch.must_reset_password = true
    }

    const updated = await updateRecord(COLLECTIONS.admins, target.id, patch)
    await audit(req.admin, 'admin.updated', 'admin', String(target._id), `Updated admin ${target.email}`)
    res.json({ admin: publicAdmin(updated) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export { adminUsersRouter }
export default router
