import { Router } from 'express'
import { COLLECTIONS, listAll } from '../db.js'
import { authRequired } from './auth.js'

const router = Router()

// GET /api/admin/emails — sent-mail log for the admin console (Admin → Mail).
// One record per delivery attempt, written by services/email.js.
router.get('/emails', authRequired, async (req, res) => {
  try {
    const emails = await listAll(COLLECTIONS.emails, { sort: '-created_at' })
    res.json({ emails })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
