// ---------------------------------------------------------------------------
// Inbound mail sync (customer replies)
//
// Polls the IMAP mailbox (e.g. Hostinger's imap.hostinger.com) for new,
// unread messages and records each one in the `emails` PocketBase collection
// with status "received" so customer replies appear in the admin console
// under Admin → Mail, next to the outbound sends.
//
// Replies are matched to a shipment by scanning the subject for a tracking
// number (mail clients prefix replies with "Re:", so we look for the
// [CBD-YYYY-XXXXX] reference our templates put in the subject line).
// Messages are deduplicated by their Message-ID, so re-scanning never
// creates duplicates. Replies are left UNSEEN in the mailbox, so they also
// remain visible in Hostinger webmail.
//
// Disabled unless IMAP_HOST / IMAP_USER / IMAP_PASS are set. Poll interval:
// IMAP_POLL_MINUTES (default 5).
// ---------------------------------------------------------------------------

import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { COLLECTIONS, createRecord, escapeFilter, findOne } from '../db.js'

// Tracking numbers look like CBD-2026-87125 (2-5 letters, 4 digits, 5 digits).
const TRACKING_RE = /\b[A-Z]{2,5}-\d{4}-\d{3,6}\b/i

export function imapConfigured() {
  const { IMAP_HOST, IMAP_USER, IMAP_PASS } = process.env
  return Boolean(IMAP_HOST && IMAP_USER && IMAP_PASS)
}

/**
 * Parse one raw MIME message and store it as a received record.
 * Exported for tests. Returns { duplicate: true } or { created: true }.
 */
export async function processInboundMessage(source) {
  const parsed = await simpleParser(source)
  const messageId = parsed.messageId || null
  const from = parsed.from?.value?.[0]?.address || String(parsed.from?.text || 'unknown')
  const subject = parsed.subject || '(no subject)'
  const text = String(parsed.text || '').slice(0, 20000)

  if (messageId) {
    const existing = await findOne(COLLECTIONS.emails, `message_id = '${escapeFilter(messageId)}'`)
    if (existing) return { duplicate: true }
  }

  const tracking = (subject.match(TRACKING_RE) || [])[0] || null
  let shipmentId = null
  if (tracking) {
    const shipment = await findOne(COLLECTIONS.shipments, `tracking_number = '${escapeFilter(tracking)}'`)
    shipmentId = shipment?.id || null
  }

  await createRecord(COLLECTIONS.emails, {
    to_email: parsed.to?.value?.[0]?.address || process.env.IMAP_USER || 'inbox',
    from_email: from,
    subject,
    kind: 'Customer reply',
    status: 'received',
    transport: 'imap',
    shipment_id: shipmentId,
    tracking_number: tracking,
    sent_by: from,
    body_text: text,
    message_id: messageId,
  })
  return { created: true }
}

/** One IMAP sweep: store every unseen message, leave it unseen. */
async function syncOnce() {
  const { IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASS } = process.env
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: Number(IMAP_PORT) || 993,
    secure: true,
    auth: { user: IMAP_USER, pass: IMAP_PASS },
    logger: false,
  })
  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  try {
    let count = 0
    for await (const msg of client.fetch({ seen: false }, { uid: true, source: true })) {
      const result = await processInboundMessage(msg.source)
      if (result.created) count += 1
    }
    if (count) console.log(`[mail-sync] stored ${count} new inbound message(s)`)
  } finally {
    lock.release()
  }
  await client.logout()
}

/** Start the background poller (no-op when IMAP isn't configured). */
export function startMailSync() {
  if (!imapConfigured()) {
    console.log('[mail-sync] IMAP not configured (IMAP_HOST/IMAP_USER/IMAP_PASS) — inbound replies will not be synced')
    return
  }
  const minutes = Math.max(1, Number(process.env.IMAP_POLL_MINUTES) || 5)
  const run = () => syncOnce().catch((err) => console.error('[mail-sync] sync failed:', err.message))
  run()
  const timer = setInterval(run, minutes * 60 * 1000)
  timer.unref?.()
  console.log(`[mail-sync] inbound reply sync enabled — checking ${process.env.IMAP_USER} every ${minutes} min`)
}
