import { Router } from 'express'
import { COLLECTIONS, listAll } from '../db.js'
import { authRequired } from './auth.js'
import { inlineLogoDataUri, renderCustomMail, sendCustomMail } from '../services/email.js'

const router = Router()

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const MAX_RECIPIENTS = 25
const MAX_SUBJECT = 300
const MAX_BODY = 10000

// GET /api/admin/emails — mail log for the admin console (Admin → Mail).
// One record per delivery attempt, written by services/email.js; customer
// replies synced over IMAP land here too with status "received".
router.get('/emails', authRequired, async (req, res) => {
  try {
    const emails = await listAll(COLLECTIONS.emails, { sort: '-created_at' })
    res.json({ emails })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/**
 * Normalise the compose form's recipient input: a string ("a@x.com, b@y.com",
 * one per line, semicolons…) or an array of strings → a de-duplicated,
 * lower-cased list of addresses. Any address is accepted — recipients do not
 * have to be registered users.
 */
function parseRecipients(input) {
  const raw = Array.isArray(input) ? input : String(input || '').split(/[\s,;]+/)
  return [...new Set(raw.map((s) => String(s).trim().toLowerCase()).filter(Boolean))]
}

/**
 * Shared validation for the compose endpoint and its live preview, so the
 * preview can never drift from what a send would actually accept.
 * Returns { ok: true, recipients, subject, body } or { ok: false, error }.
 */
function validateCompose(body) {
  const b = body || {}
  const subject = String(b.subject || '').trim()
  const text = String(b.body || '').trim()
  const recipients = parseRecipients(b.to)

  if (!subject) return { ok: false, error: 'Subject is required' }
  if (subject.length > MAX_SUBJECT) return { ok: false, error: `Subject is too long (max ${MAX_SUBJECT} characters)` }
  if (!text) return { ok: false, error: 'Message body is required' }
  if (text.length > MAX_BODY) return { ok: false, error: `Message body is too long (max ${MAX_BODY} characters)` }
  if (recipients.length) {
    if (recipients.length > MAX_RECIPIENTS) {
      return { ok: false, error: `Up to ${MAX_RECIPIENTS} recipients per send — you entered ${recipients.length}` }
    }
    const invalid = recipients.filter((e) => !EMAIL_RE.test(e))
    if (invalid.length) {
      return { ok: false, error: `Invalid email address${invalid.length > 1 ? 'es' : ''}: ${invalid.join(', ')}` }
    }
  }
  return { ok: true, recipients, subject, body: text }
}

// POST /api/admin/mail/send — the admin's compose form. Sends the message to
// every address typed in the "To" field using the same dark brand template as
// the confirmation letter / status email, and logs one Sent record per
// recipient (with the body, so it can be previewed later).
router.post('/mail/send', authRequired, async (req, res) => {
  try {
    const check = validateCompose(req.body)
    if (!check.ok) return res.status(400).json({ error: check.error })
    if (!check.recipients.length) return res.status(400).json({ error: 'Add at least one recipient email address' })

    const results = await sendCustomMail({
      recipients: check.recipients,
      subject: check.subject,
      body: check.body,
      admin: req.admin,
    })

    const sent = results.filter((r) => r.sent).length
    const simulated = results.filter((r) => r.simulated).length
    const failed = results.length - sent - simulated
    res.json({
      ok: sent > 0,
      total: results.length,
      sent,
      simulated,
      failed,
      results,
      message:
        failed === results.length
          ? `All ${results.length} delivery attempt(s) failed — check the Sent list for the error.`
          : `Sent to ${sent} recipient(s)${simulated ? `, ${simulated} simulated (mail not configured)` : ''}${failed ? `, ${failed} failed` : ''}.`,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/admin/mail/preview?subject=…&body=… — renders the composed message
// in the shared template as HTML (no send, nothing stored) so the admin sees
// exactly what recipients will receive while typing.
router.get('/mail/preview', authRequired, async (req, res) => {
  try {
    const check = validateCompose({ subject: req.query.subject, body: req.query.body })
    if (!check.ok) return res.status(400).json({ error: check.error })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // cid: images don't resolve in a browser — inline the logo as a data URI
    res.send(inlineLogoDataUri(renderCustomMail({ subject: check.subject, body: check.body })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
