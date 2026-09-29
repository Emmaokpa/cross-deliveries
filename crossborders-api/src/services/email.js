import nodemailer from 'nodemailer'
import fs from 'node:fs'
import { Shipment } from '../db.js'
import { audit } from '../routes/auth.js'
import { TRACKING_URL, LOGO_PATH } from './shipment-utils.js'
import { buildInvoicePdf } from './pdf.js'
import { format as fmtMoney } from './currency.js'

const LOGO_CID = 'cbd-logo'

const BRAND_RED = '#E30613'
const NAVY = '#031435'
const NAVY_2 = '#0A2148'
const MUTED = '#6B7280'
const LIGHT = '#F6F7F9'
const LINE = '#ECEEF3'

function fmt(n, code) {
  return fmtMoney(n, code)
}

function fmtDate(d) {
  if (!d) return null
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─────────────────────────────────────────────────────────────────
// Professional letterhead email template
// ─────────────────────────────────────────────────────────────────
function renderTemplate(shipment) {
  const cur = shipment.currency || 'NGN'
  const trackUrl = TRACKING_URL(shipment.tracking_number)
  const eta = fmtDate(shipment.estimated_delivery)
  const paid = shipment.payment_status === 'Paid'
  const payColor = paid ? '#0E7A3D' : shipment.payment_status === 'Pending' ? '#B7791F' : BRAND_RED
  const payLabel = paid ? 'PAID' : (shipment.payment_status || 'UNPAID').toUpperCase()
  const isDelivered = shipment.current_status === 'Delivered'
  const deliveredOn = fmtDate(shipment.delivered_at)
  const receivedBy = shipment.pod?.receiver_name

  // Delivered: green confirmation banner with proof of delivery
  const deliveredBlock = isDelivered
    ? `
          <!-- ═══ Delivered banner ═══ -->
          <tr>
            <td style="padding:14px 34px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E9F6EE;border:2px solid #0E7A3D;border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;text-align:center;">
                    <div style="font-size:15px;font-weight:bold;color:#0E6B39;">&#10004; DELIVERED${deliveredOn ? ` — ${deliveredOn}` : ''}</div>
                    ${receivedBy ? `<div style="font-size:12.5px;color:#2F6B4C;margin-top:5px;">Received by <strong>${escapeHtml(receivedBy)}</strong>${shipment.pod?.signed_at ? ' &bull; ' + fmtDate(shipment.pod.signed_at) : ''}</div>` : ''}
                    <div style="font-size:11.5px;color:#6B8F7C;margin-top:4px;">Proof of delivery is on record with our operations team.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : ''

  const costRows = [
    ['Base Freight Charges', fmt(shipment.base_freight, cur)],
    ['Fuel Surcharge', fmt(shipment.surcharge_fuel, cur)],
    ['Customs & Handling', fmt(shipment.surcharge_customs, cur)],
  ]

  const rowHtml = costRows
    .map(
      ([label, amount]) => `
                <tr>
                  <td style="padding:11px 16px;border-bottom:1px solid ${LINE};color:#4B5563;font-size:13.5px;">${label}</td>
                  <td style="padding:11px 16px;border-bottom:1px solid ${LINE};color:#111827;font-size:13.5px;text-align:right;font-weight:600;">${amount}</td>
                </tr>`,
    )
    .join('')

  const detailRow = (label, value) =>
    value
      ? `
                  <tr>
                    <td style="padding:3px 0;color:${MUTED};font-size:12.5px;white-space:nowrap;padding-right:14px;">${label}</td>
                    <td style="padding:3px 0;color:#1F2937;font-size:13.5px;font-weight:500;">${value}</td>
                  </tr>`
      : ''

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#EEF1F6;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF1F6;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 12px 40px rgba(3,20,53,0.12);">

          <!-- ═══ Letterhead ═══ -->
          <tr>
            <td style="background:${NAVY};padding:26px 34px;">
              <table role="presentation" width="100%"><tr>
                <td valign="middle">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td valign="middle" style="padding-right:14px;">
                      <div style="background:#FFFFFF;border-radius:10px;padding:6px;display:inline-block;">
                        <img src="cid:${LOGO_CID}" alt="CrossBordersDeliveries" width="72" style="display:block;width:72px;height:auto;border:0;" />
                      </div>
                    </td>
                    <td valign="middle">
                      <div style="color:#FFFFFF;font-size:21px;font-weight:bold;letter-spacing:0.3px;font-family:Georgia,'Times New Roman',serif;">CrossBorders<span style="color:#FF5A6E;">Deliveries</span></div>
                      <div style="color:#B9C2D8;font-size:10px;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">Global Logistics &amp; Courier Services</div>
                    </td>
                  </tr></table>
                </td>
                <td align="right" valign="middle" style="color:#8FA0C4;font-size:11px;line-height:1.7;">
                  Air &bull; Ocean &bull; Road<br />crossbordersdeliveries.com
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:4px;background:${BRAND_RED};font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- ═══ Greeting ═══ -->
          <tr>
            <td style="padding:30px 34px 4px;">
              <h1 style="margin:0 0 8px;font-size:21px;color:${NAVY};">Shipment Update: {{current_status}}</h1>
              <p style="margin:0;color:${MUTED};font-size:14px;line-height:1.7;">
                Dear {{recipient_name}},<br />
                Here is the latest status of your consignment with CrossBordersDeliveries. Keep your tracking number below — you can use it any time on our website to follow your delivery.
              </p>
            </td>
          </tr>

          <!-- ═══ Tracking number — copy box ═══ -->
          <tr>
            <td style="padding:18px 34px 4px;">
              <div style="border:2px dashed ${BRAND_RED};background:#FFF7F7;border-radius:10px;padding:14px 18px;text-align:center;">
                <div style="font-size:10px;color:${MUTED};letter-spacing:1.6px;text-transform:uppercase;margin-bottom:5px;">Your Tracking Number</div>
                <div style="font-size:22px;font-weight:bold;color:${BRAND_RED};letter-spacing:1.5px;font-family:'Courier New',monospace;">{{tracking_number}}</div>
                <div style="font-size:11px;color:#9CA3AF;margin-top:6px;">Select &amp; copy this number to track your delivery</div>
              </div>
            </td>
          </tr>

          <!-- ═══ Status + progress card ═══ -->
          <tr>
            <td style="padding:14px 34px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT};border-radius:10px;border:1px solid ${LINE};">
                <tr>
                  <td style="padding:16px 18px;">
                    <table role="presentation" width="100%"><tr>
                      <td>
                        <div style="font-size:10px;color:#8A93A6;letter-spacing:1.4px;text-transform:uppercase;">Current Status</div>
                        <div style="font-size:16px;font-weight:bold;color:${NAVY};margin-top:3px;">{{current_status}}</div>
                      </td>
                      <td align="right" valign="middle">
                        <span style="display:inline-block;background:${NAVY};color:#FFFFFF;font-size:12px;font-weight:bold;padding:5px 14px;border-radius:999px;">{{progress_percentage}}% Complete</span>
                      </td>
                    </tr></table>
                    <div style="background:#E1E6EE;border-radius:6px;height:9px;margin-top:12px;">
                      <div style="background:linear-gradient(90deg,${NAVY_2},${BRAND_RED});border-radius:6px;height:9px;width:{{progress_percentage}}%;"></div>
                    </div>
                    <table role="presentation" width="100%" style="margin-top:14px;"><tr>
                      <td style="color:${NAVY};font-weight:bold;font-size:13px;">{{origin_city}}</td>
                      <td align="center" style="color:${BRAND_RED};font-size:15px;">&#10230;</td>
                      <td align="right" style="color:${NAVY};font-weight:bold;font-size:13px;">{{destination_city}}</td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${deliveredBlock}
          ${!isDelivered && eta
            ? `<!-- ═══ ETA banner ═══ -->
          <tr>
            <td style="padding:14px 34px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E9F6EE;border:1px solid #CBE8D6;border-radius:10px;">
                <tr>
                  <td style="padding:12px 18px;color:#0E6B39;font-size:13.5px;">
                    <strong>Estimated Delivery:</strong> ${eta}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
            : ''}

          <!-- ═══ Shipment details ═══ -->
          <tr>
            <td style="padding:22px 34px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" style="width:50%;padding-right:8px;">
                    <div style="font-size:11px;color:${BRAND_RED};letter-spacing:1.4px;font-weight:bold;text-transform:uppercase;border-bottom:2px solid ${BRAND_RED};padding-bottom:5px;margin-bottom:9px;">Recipient</div>
                    <table role="presentation">
                      ${detailRow('Name', '{{recipient_name}}')}
                      ${detailRow('Address', '{{recipient_address}}')}
                      ${detailRow('City', '{{recipient_city}}')}
                      ${detailRow('Country', '{{recipient_country}}')}
                      ${detailRow('Phone', '{{recipient_phone}}')}
                      ${detailRow('Email', '{{recipient_email}}')}
                    </table>
                  </td>
                  <td valign="top" style="width:50%;padding-left:8px;">
                    <div style="font-size:11px;color:${NAVY};letter-spacing:1.4px;font-weight:bold;text-transform:uppercase;border-bottom:2px solid ${NAVY};padding-bottom:5px;margin-bottom:9px;">Sender</div>
                    <table role="presentation">
                      ${detailRow('Name', '{{sender_name}}')}
                      ${detailRow('Phone', '{{sender_phone}}')}
                      ${detailRow('Email', '{{sender_email}}')}
                    </table>
                    <div style="font-size:11px;color:${BRAND_RED};letter-spacing:1.4px;font-weight:bold;text-transform:uppercase;border-bottom:2px solid ${BRAND_RED};padding-bottom:5px;margin:16px 0 9px;">Consignment</div>
                    <table role="presentation">
                      ${detailRow('Cargo', '{{cargo_type}} freight')}
                      ${detailRow('Weight', '{{package_weight}} kg')}
                      ${detailRow('Pieces', '{{package_quantity}}')}
                      ${detailRow('Payment', payLabel)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ Cost breakdown ═══ -->
          <tr>
            <td style="padding:24px 34px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;border-collapse:separate;overflow:hidden;">
                <tr>
                  <td colspan="2" style="background:${NAVY};color:#FFFFFF;font-size:11px;letter-spacing:1.6px;padding:11px 16px;font-weight:bold;text-transform:uppercase;">Cost Breakdown (${cur})</td>
                </tr>
                ${rowHtml}
                <tr>
                  <td style="padding:13px 16px;background:#EDEFF3;color:${NAVY};font-weight:bold;font-size:15px;">TOTAL</td>
                  <td style="padding:13px 16px;background:#EDEFF3;color:${NAVY};font-weight:bold;font-size:15px;text-align:right;">{{total_cost}}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:10px 16px;background:#FFFFFF;">
                    <span style="display:inline-block;font-size:11px;font-weight:bold;letter-spacing:1px;color:#FFFFFF;background:${payColor};padding:4px 12px;border-radius:999px;">${payLabel}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 2px 0;color:#9CA3AF;font-size:11.5px;">The official commercial invoice for this consignment is attached to this email as a PDF.</p>
            </td>
          </tr>

          <!-- ═══ CTA ═══ -->
          <tr>
            <td align="center" style="padding:28px 34px 6px;">
              <a href="{{tracking_url}}" style="display:inline-block;background:${BRAND_RED};color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 40px;border-radius:8px;letter-spacing:0.4px;">Track Your Package</a>
              <p style="margin:12px 0 0;color:#9CA3AF;font-size:12px;">Or paste this link into your browser:<br />
                <span style="color:${MUTED};">{{tracking_url}}</span>
              </p>
            </td>
          </tr>

          <!-- ═══ Footer ═══ -->
          <tr><td style="padding:10px 34px 0;"><div style="height:1px;background:${LINE};font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr>
            <td style="padding:16px 34px 28px;text-align:center;">
              <div style="color:#9CA3AF;font-size:11.5px;line-height:1.8;">
                <strong style="color:${NAVY};">CrossBordersDeliveries</strong> — leading logistics and distribution services<br />
                No. 19/3 PK. 34810 Beykoz / Istanbul, Türkiye &bull; crossborder.delivery@outlook.com &bull; +90 806 055 2123<br />
                <span style="font-size:10.5px;">This is an automated shipment notification. If you were not expecting this consignment, please contact us immediately.</span>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export function fillTemplate(shipment) {
  return renderTemplate(shipment)
    .replaceAll('{{recipient_name}}', escapeHtml(shipment.recipient_name))
    .replaceAll('{{recipient_address}}', escapeHtml(shipment.recipient_address || '—'))
    .replaceAll('{{recipient_city}}', escapeHtml(shipment.recipient_city || '—'))
    .replaceAll('{{recipient_country}}', escapeHtml(shipment.recipient_country || '—'))
    .replaceAll('{{recipient_phone}}', escapeHtml(shipment.recipient_phone || '—'))
    .replaceAll('{{recipient_email}}', escapeHtml(shipment.recipient_email))
    .replaceAll('{{sender_name}}', escapeHtml(shipment.sender_name))
    .replaceAll('{{sender_phone}}', escapeHtml(shipment.sender_phone || '—'))
    .replaceAll('{{sender_email}}', escapeHtml(shipment.sender_email))
    .replaceAll('{{cargo_type}}', escapeHtml(shipment.cargo_type || '—'))
    .replaceAll('{{package_weight}}', String(shipment.package_weight ?? 0))
    .replaceAll('{{package_quantity}}', String(shipment.package_quantity ?? 1))
    .replaceAll('{{tracking_number}}', shipment.tracking_number)
    .replaceAll('{{current_status}}', shipment.current_status)
    .replaceAll('{{origin_city}}', escapeHtml(shipment.origin_city || '—'))
    .replaceAll('{{destination_city}}', escapeHtml(shipment.destination_city || '—'))
    .replaceAll('{{progress_percentage}}', String(shipment.progress_percentage ?? 0))
    .replaceAll('{{total_cost}}', fmt(shipment.total_cost, shipment.currency || 'NGN'))
    .replaceAll('{{tracking_url}}', TRACKING_URL(shipment.tracking_number))
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// SMTP transport (Brevo SMTP, Gmail, Mailgun, Mailtrap… any provider).
// Some cloud hosts (Render included) can't reach common SMTP ports, so the
// sender tries each candidate port in turn before giving up.
function buildSmtpTransport(port) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS, 587/2525 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
}

function smtpConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)
}

// Remembers which SMTP port worked so later sends skip dead ports
let lastGoodPort = null

// Tries the last working port first, then SMTP_PORT, then Brevo's alternates (2525, 465).
// Throws the last error if every port fails.
async function sendViaSmtp(mailOptions) {
  const { SMTP_PORT } = process.env
  const ports = [...new Set([
    ...(lastGoodPort ? [lastGoodPort] : []),
    Number(SMTP_PORT) || 587,
    2525,
    465,
  ])]
  let lastErr
  for (const port of ports) {
    try {
      await buildSmtpTransport(port).sendMail(mailOptions)
      lastGoodPort = port
      return { port }
    } catch (err) {
      lastErr = err
      console.warn(`[smtp] port ${port} failed: ${err.code || 'error'} ${err.message}`)
      // Auth rejection means the server IS reachable — no point trying other ports
      if (err.code === 'EAUTH' || err.responseCode === 535) throw err
    }
  }
  throw lastErr
}

// Brevo HTTP API (HTTPS/443) — cloud hosts like Render often block outbound
// SMTP ports entirely; port 443 is always open. Preferred when BREVO_API_KEY
// is set. Docs: https://developers.brevo.com/reference/sendtransacionalemail
async function sendViaBrevoApi({ to, subject, html, attachments }) {
  const key = process.env.BREVO_API_KEY
  if (!key) return null

  // nodemailer attachment shapes → Brevo API shapes
  const brevoAttachments = []
  for (const a of attachments || []) {
    if (a.path) {
      brevoAttachments.push({ name: a.filename, content: fs.readFileSync(a.path).toString('base64') })
    } else if (a.content) {
      brevoAttachments.push({ name: a.filename, content: Buffer.from(a.content).toString('base64') })
    }
  }

  const body = {
    sender: { name: 'CrossBordersDeliveries', email: process.env.MAIL_FROM || 'crossborder.delivery@outlook.com' },
    // Customers who hit "reply" write to this address — it does NOT need to be
    // verified in Brevo (only the sender does)
    replyTo: { email: process.env.MAIL_REPLY_TO || 'crossborder.delivery@outlook.com' },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    attachment: brevoAttachments,
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Brevo API ${res.status}: ${data.message || JSON.stringify(data).slice(0, 200)}`)
  }
  return data // { messageId, … }
}

// Compiles the PDF, renders the template, and sends via SMTP (with the brand
// logo inline and the invoice attached). Falls back to a logged simulation
// when SMTP env vars are absent.
export async function sendShipmentEmail(shipment, admin) {
  const to = shipment.recipient_email
  const subject = `[${shipment.tracking_number}] Shipment ${shipment.current_status} — CrossBordersDeliveries`
  const html = fillTemplate(shipment)

  const mailFrom = process.env.MAIL_FROM || 'crossborder.delivery@outlook.com'
  // Display/reply address — does not need Brevo verification
  const replyTo = process.env.MAIL_REPLY_TO || 'crossborder.delivery@outlook.com'

  // Build the invoice attachment once (used by both send paths)
  const invoicePdf = await new Promise((resolve, reject) => {
    const chunks = []
    const doc = buildInvoicePdf(shipment)
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
  const attachments = [
    { filename: `${shipment.tracking_number}-invoice.pdf`, content: invoicePdf, contentType: 'application/pdf' },
  ]
  const logoExists = fs.existsSync(LOGO_PATH)
  if (logoExists) {
    attachments.push({ filename: 'logo.png', path: LOGO_PATH, cid: LOGO_CID })
  }

  // ── Preferred path: Brevo HTTP API (works when SMTP ports are blocked) ──
  if (process.env.BREVO_API_KEY) {
    try {
      // The API can't inline CID images — embed the logo as a base64 data URI instead
      let htmlApi = html
      if (logoExists) {
        htmlApi = html.replaceAll(
          `src="cid:${LOGO_CID}"`,
          `src="data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}"`,
        )
      }
      await sendViaBrevoApi({ to, subject, html: htmlApi, attachments })
      await Shipment.updateOne({ _id: shipment._id }, { email_sent_at: new Date() })
      await audit(admin, 'email.sent', 'shipment', String(shipment._id), `Invoice emailed to ${to} via Brevo API`)
      return { sent: true, to, subject, message: 'Email sent via Brevo API (HTTPS).' }
    } catch (err) {
      console.error('[brevo-api] send failed:', err.message)
      await audit(admin, 'email.failed', 'shipment', String(shipment._id), `Brevo API: ${String(err.message).slice(0, 200)}`)
      return { sent: false, error: err.message, to, subject, message: `Brevo API send failed — ${err.message}` }
    }
  }

  // ── Fallback: SMTP (tries ports 587 → 2525 → 465) ──
  if (!smtpConfigured()) {
    console.log(`[email:simulated] → ${to} | ${subject}`)
    await audit(admin, 'email.simulated', 'shipment', String(shipment._id), `No BREVO_API_KEY / SMTP configured; simulated email to ${to}`)
    return { sent: false, simulated: true, to, subject, message: 'Email not configured — simulated in logs. Set BREVO_API_KEY.' }
  }

  try {
    const { port } = await sendViaSmtp({
      from: `"CrossBordersDeliveries" <${mailFrom}>`,
      replyTo,
      to,
      subject,
      html,
      attachments,
    })
    await Shipment.updateOne({ _id: shipment._id }, { email_sent_at: new Date() })
    await audit(admin, 'email.sent', 'shipment', String(shipment._id), `Invoice emailed to ${to} via SMTP port ${port}`)
    return { sent: true, to, subject, message: `Email sent via SMTP (port ${port}).` }
  } catch (err) {
    const { SMTP_HOST } = process.env
    const hint =
      err.code === 'ETIMEDOUT' || /timeout/i.test(err.message)
        ? ` — could not reach ${SMTP_HOST || '(unset)'} on ports 587/2525/465. Outbound SMTP is blocked from this host — set BREVO_API_KEY (API key, not SMTP key) to send over HTTPS instead.`
        : err.code === 'EAUTH'
          ? ' — authentication rejected by the SMTP server. Check the SMTP user/key.'
          : ''
    console.error(`[smtp] send failed (${err.code || 'error'}): ${err.message}${hint}`)
    await audit(admin, 'email.failed', 'shipment', String(shipment._id), `${err.code || 'error'}: ${String(err.message).slice(0, 200)}`)
    return { sent: false, error: err.message, to, subject, message: `SMTP send failed (${err.code || 'error'})${hint}` }
  }
}
