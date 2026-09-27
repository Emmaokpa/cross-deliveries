import { Router } from 'express'
import db from '../db.js'
import { authRequired, superAdminOnly } from './auth.js'

const router = Router()

// GET /api/admin/audit-logs (super admin)
router.get('/audit-logs', authRequired, superAdminOnly, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500)
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ?').all(limit)
  res.json({ logs })
})

export default router
