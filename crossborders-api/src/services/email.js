import nodemailer from 'nodemailer'
import fs from 'node:fs'
import { Shipment } from '../db.js'
import { audit } from '../routes/auth.js'
import { TRACKING_URL, LOGO_PATH } from './shipment-utils.js'
import { buildInvoicePdf } from './pdf.js'

const LOGO_CID = 'cbd-logo'

const BRAND_RED = '#E30613'
const NAVY = '#031435'

function fmt(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

function renderTemplate(shipment) {
  const trackUrl = TRACKING_URL(shipment.tracking_number)
  const rows = [
    ['Base Freight Charges', fmt(shipment.base_freight)],
    ['Fuel Surcharge', fmt(shipment.surcharge_fuel)],
    ['Customs & Handling', fmt(shipment.surcharge_customs)],
  ]
  const rowHtml = rows
    .map(
      ([label, amount]) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #ECEEF3;color:#4B5563;font-size:14px;">${label}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #ECEEF3;color:#111827;font-size:14px;text-align:right;font-weight:600;">${amount}</td>
        </tr>`,
    )
    .join('')

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F2F4F8;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F8;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 10px 30px rgba(3,20,53,0.08);">
          <!-- Letterhead -->
          <tr>
            <td style="background:${NAVY};padding:22px 28px;">
              <table role="presentation" width="100%"><tr>
                <td>
                  <div style="color:#FFFFFF;font-size:20px;font-weight:bold;letter-spacing:0.3px;">CrossBorders<span style="color:#FF5A6E;">Deliveries</span></div>
                  <div style="color:#B9C2D8;font-size:11px;margin-top:4px;letter-spacing:1px;">GLOBAL LOGISTICS &amp; COURIER SERVICES — AIR • OCEAN • ROAD</div>
                </td>
                <td align="right" style="width:112px;">
                  <div style="background:#FFFFFF;border-radius:8px;padding:7px;display:inline-block;">
                    <img src="cid:${LOGO_CID}" alt="CrossBordersDeliveries" width="88" style="display:block;width:88px;height:auto;border:0;" />
                  </div>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:4px;background:${BRAND_RED};font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px 32px 6px;">
              <h1 style="margin:0 0 6px;font-size:21px;color:${NAVY};">Shipment Update: {{current_status}}</h1>
              <p style="margin:0 0 18px;color:#6B7280;font-size:14px;line-height:1.6;">
                Hello {{recipient_name}}, here is the latest status and invoice for your consignment.
              </p>
            </td>
          </tr>

          <!-- Status + tracking card -->
          <tr>
            <td style="padding:0 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9;border-radius:8px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:11px;color:#8A93A6;letter-spacing:1px;text-transform:uppercase;">Tracking Number</div>
                    <div style="font-size:19px;font-weight:bold;color:${BRAND_RED};margin:4px 0 10px;">{{tracking_number}}</div>
                    <div style="font-size:11px;color:#8A93A6;letter-spacing:1px;text-transform:uppercase;">Current Status</div>
                    <div style="font-size:15px;font-weight:600;color:${NAVY};">{{current_status}}</div>
                    <div style="background:#E5E9F0;border-radius:6px;height:8px;margin-top:10px;">
                      <div style="background:${BRAND_RED};border-radius:6px;height:8px;width:{{progress_percentage}}%;"></div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Route -->
          <tr>
            <td style="padding:14px 32px 0;">
              <table role="presentation" width="100%"><tr>
                <td style="color:${NAVY};font-weight:bold;font-size:14px;">{{origin_city}}</td>
                <td align="center" style="color:${BRAND_RED};font-size:15px;">&#10230;</td>
                <td align="right" style="color:${NAVY};font-weight:bold;font-size:14px;">{{destination_city}}</td>
              </tr></table>
            </td>
          </tr>

          <!-- Pricing -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ECEEF3;border-radius:8px;border-collapse:separate;overflow:hidden;">
                <tr>
                  <td style="background:${NAVY};color:#FFFFFF;font-size:12px;letter-spacing:1px;padding:10px 14px;font-weight:bold;">COST BREAKDOWN</td>
                  <td style="background:${NAVY};color:#FFFFFF;font-size:12px;letter-spacing:1px;padding:10px 14px;text-align:right;font-weight:bold;">AMOUNT</td>
                </tr>
                ${rowHtml}
                <tr>
                  <td style="padding:12px 14px;background:#EDEFF3;color:${NAVY};font-weight:bold;font-size:15px;">TOTAL</td>
                  <td style="padding:12px 14px;background:#EDEFF3;color:${NAVY};font-weight:bold;font-size:15px;text-align:right;">{{total_cost}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:26px 32px 8px;">
              <a href="{{tracking_url}}" style="display:inline-block;background:${BRAND_RED};color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 34px;border-radius:6px;">Track Package</a>
              <p style="margin:12px 0 0;color:#9CA3AF;font-size:12px;">Or paste this link into your browser:<br /><span style="color:#6B7280;">{{tracking_url}}</span></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr><td style="height:1px;background:#ECEEF3;font-size:0;line-height:0;margin:0 32px;">&nbsp;</td></tr>
          <tr>
            <td style="padding:18px 32px 26px;text-align:center;">
              <div style="color:#9CA3AF;font-size:12px;line-height:1.7;">
                CrossBordersDeliveries.com — leading logistics and distribution services<br />
                No. 19/3 PK. 34810 Beykoz / Instabul Turkiye • crossborder.delivery@outlook.com
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
    .replaceAll('{{tracking_number}}', shipment.tracking_number)
    .replaceAll('{{current_status}}', shipment.current_status)
    .replaceAll('{{origin_city}}', escapeHtml(shipment.origin_city || '—'))
    .replaceAll('{{destination_city}}', escapeHtml(shipment.destination_city || '—'))
    .replaceAll('{{progress_percentage}}', String(shipment.progress_percentage ?? 0))
    .replaceAll('{{total_cost}}', fmt(shipment.total_cost))
    .replaceAll('{{tracking_url}}', TRACKING_URL(shipment.tracking_number))
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// SMTP transport (Brevo SMTP, Gmail, Mailgun, Mailtrap… any provider).
// Returns null when SMTP is not configured → emails are simulated in logs.
function smtpTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  const port = Number(SMTP_PORT) || 587
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

// Compiles the PDF, renders the template, and sends via SMTP (with the brand
// logo inline and the invoice attached). Falls back to a logged simulation
// when SMTP env vars are absent.
export async function sendShipmentEmail(shipment, admin) {
  const to = shipment.recipient_email
  const subject = `[${shipment.tracking_number}] Shipment ${shipment.current_status} — CrossBordersDeliveries`
  const html = fillTemplate(shipment)
  const transport = smtpTransport()

  if (!transport) {
    console.log(`[email:simulated] → ${to} | ${subject}`)
    await audit(admin, 'email.simulated', 'shipment', String(shipment._id), `SMTP not configured; simulated email to ${to}`)
    return { sent: false, simulated: true, to, subject, message: 'SMTP not configured — email simulated in logs.' }
  }

  const invoicePdf = Buffer.from(buildInvoicePdf(shipment).output())
  const attachments = [
    { filename: `${shipment.tracking_number}-invoice.pdf`, content: invoicePdf, contentType: 'application/pdf' },
  ]
  if (fs.existsSync(LOGO_PATH)) {
    attachments.push({ filename: 'logo.png', path: LOGO_PATH, cid: LOGO_CID })
  }

  try {
    await transport.sendMail({
      from: `"CrossBordersDeliveries" <${process.env.MAIL_FROM || 'no-reply@crossbordersdeliveries.com'}>`,
      to,
      subject,
      html,
      attachments,
    })
    await Shipment.updateOne({ _id: shipment._id }, { email_sent_at: new Date() })
    await audit(admin, 'email.sent', 'shipment', String(shipment._id), `Invoice emailed to ${to} via SMTP`)
    return { sent: true, to, subject, message: 'Email sent via SMTP.' }
  } catch (err) {
    console.error('[smtp] send failed:', err.message)
    await audit(admin, 'email.failed', 'shipment', String(shipment._id), String(err.message).slice(0, 300))
    return { sent: false, error: err.message, to, subject, message: 'SMTP send failed — see server logs.' }
  }
}
