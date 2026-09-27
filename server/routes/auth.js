import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'

const router = Router()
const adminUsersRouter = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function signToken(admin) {
  return jwt.sign({ sub: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: '12h' })
}

export function audit(admin, action, entityType, entityId, details = '') {
  db.prepare(
    'INSERT INTO audit_logs (admin_id, admin_email, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(admin?.id || null, admin?.email || 'system', action, entityType || null, entityId || null, details)
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const admin = db.prepare('SELECT * FROM admins WHERE id = ? AND active = 1').get(payload.sub)
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
  const { password_hash, ...rest } = a
  return { ...rest, must_reset_password: !!a.must_reset_password }
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(String(email).toLowerCase().trim())
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  if (!admin.active) return res.status(403).json({ error: 'Account is deactivated' })
  audit(admin, 'admin.login', 'admin', admin.id)
  res.json({ token: signToken(admin), admin: publicAdmin(admin) })
})

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  res.json({ admin: publicAdmin(req.admin) })
})

// POST /api/auth/change-password
router.post('/change-password', authRequired, (req, res) => {
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
  const hash = bcrypt.hashSync(new_password, 10)
  db.prepare("UPDATE admins SET password_hash = ?, must_reset_password = 0, updated_at = datetime('now') WHERE id = ?").run(
    hash,
    req.admin.id,
  )
  audit(req.admin, 'admin.password_changed', 'admin', req.admin.id)
  res.json({ ok: true })
})

// GET /api/admin/users (super admin)
adminUsersRouter.get('/users', authRequired, superAdminOnly, (req, res) => {
  const users = db.prepare('SELECT * FROM admins ORDER BY created_at ASC').all()
  res.json({ users: users.map(publicAdmin) })
})

// POST /api/admin/users (super admin creates staff)
adminUsersRouter.post('/users', authRequired, superAdminOnly, (req, res) => {
  const { email, name, password, role } = req.body || {}
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name and password are required' })
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  const normalized = String(email).toLowerCase().trim()
  const exists = db.prepare('SELECT id FROM admins WHERE email = ?').get(normalized)
  if (exists) return res.status(409).json({ error: 'An admin with this email already exists' })
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO admins (id, email, name, password_hash, role, must_reset_password)
     VALUES (?, ?, ?, ?, ?, 1)`,
  ).run(id, normalized, name, bcrypt.hashSync(password, 10), role === 'super_admin' ? 'super_admin' : 'admin')
  const created = db.prepare('SELECT * FROM admins WHERE id = ?').get(id)
  audit(req.admin, 'admin.created', 'admin', id, `Created admin ${normalized} (${created.role})`)
  res.status(201).json({ admin: publicAdmin(created) })
})

// PATCH /api/admin/users/:id  (update name/password/role/active)
adminUsersRouter.patch('/users/:id', authRequired, superAdminOnly, (req, res) => {
  const target = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id)
  if (!target) return res.status(404).json({ error: 'Admin not found' })
  const { name, password, role, active } = req.body || {}

  if (target.role === 'super_admin' && (active === false || role === 'admin')) {
    const supers = db.prepare("SELECT COUNT(*) AS n FROM admins WHERE role = 'super_admin' AND active = 1").get().n
    if (supers <= 1) return res.status(400).json({ error: 'Cannot demote or deactivate the last active super admin' })
  }

  if (name !== undefined) db.prepare('UPDATE admins SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, target.id)
  if (role !== undefined) db.prepare('UPDATE admins SET role = ?, updated_at = datetime(\'now\') WHERE id = ?').run(role === 'super_admin' ? 'super_admin' : 'admin', target.id)
  if (active !== undefined) db.prepare('UPDATE admins SET active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(active ? 1 : 0, target.id)
  if (password !== undefined) {
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    db.prepare("UPDATE admins SET password_hash = ?, must_reset_password = 1, updated_at = datetime('now') WHERE id = ?").run(
      bcrypt.hashSync(password, 10),
      target.id,
    )
  }
  const updated = db.prepare('SELECT * FROM admins WHERE id = ?').get(target.id)
  audit(req.admin, 'admin.updated', 'admin', target.id, `Updated admin ${target.email}`)
  res.json({ admin: publicAdmin(updated) })
})

export { adminUsersRouter }
export default router
