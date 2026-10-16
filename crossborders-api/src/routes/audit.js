import { Router } from 'express'
import { COLLECTIONS, listPage } from '../db.js'
import { authRequired, superAdminOnly } from './auth.js'

const router = Router()

// GET /api/admin/audit-logs (super admin)
router.get('/audit-logs', authRequired, superAdminOnly, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500)
    const logs = await listPage(COLLECTIONS.auditLogs, { sort: '-created_at', page: 1, perPage: limit })
    res.json({ logs: logs.items })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
