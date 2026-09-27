import { Router } from 'express'
import { AuditLog } from '../db.js'
import { authRequired, superAdminOnly } from './auth.js'

const router = Router()

// GET /api/admin/audit-logs (super admin)
router.get('/audit-logs', authRequired, superAdminOnly, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500)
    const logs = await AuditLog.find().sort({ created_at: -1 }).limit(limit).lean()
    res.json({ logs: logs.map((l) => ({ ...l, id: String(l._id) })) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
