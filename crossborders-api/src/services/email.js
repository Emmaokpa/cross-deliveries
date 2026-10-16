import nodemailer from 'nodemailer'
import fs from 'node:fs'
import { COLLECTIONS, createRecord, updateRecord } from '../db.js'
import { audit } from '../routes/auth.js'
import { TRACKING_URL, LOGO_PATH } from './shipment-utils.js'
import { COMPANY } from './company.js'
import { buildInvoicePdf } from './pdf.js'
import { format as fmtMoney } from './currency.js'

const LOGO_CID = 'cbd-logo'

// ─────────────────────────────────────────────────────────────────
// UNIFIED DARK THEME — shared by EVERY system email (confirmation
// letter, status/invoice email) and mirrored by the invoice PDF so
// the whole brand experience is identical. These colors, the banner
// letterhead, the logo asset and the sign-off are HARDCODED brand
// assets: they are NOT editable from the admin UI or the API.
// ─────────────────────────────────────────────────────────────────
const DARK_BG = '#0F1117'    // outer wrapper background
const DARK_CARD = '#121212'  // message container
const DARK_PANEL = '#1A1D24' // inner cards / rows / boxes
const DARK_LINE = '#2A2E38'  // hairline dividers & borders
const CORAL = '#EE6044'      // brand accent (company details, highlights)
// (#E86C53 is the secondary coral shade used for gradients/variants)
const BLUE = '#4A90E2'       // clickable links / phone numbers
const NAVY = '#031435'       // highlight bar behind the legal name
const WHITE = '#FFFFFF'
const OFF_WHITE = '#D6DAE3'  // general body text
const MUTED = '#9AA1AE'      // labels
const DIM = '#7A8290'        // footnotes / footers

function fmt(n, code) {
  return fmtMoney(n, code)
}

function fmtDate(d) {
  if (!d) return null
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// ─────────────────────────────────────────────────────────────────
// LETTERHEAD — HARDCODED. The official logo (assets/logo.png, the
// red-and-dark stylized "X" mark) is referenced by CID and attached
// inline with the message. NOTE: most mail clients (Gmail, Outlook,
// Yahoo…) silently strip base64 `data:` URI images from received
// mail, which made the letterhead logo disappear — CID is the only
// embedding that renders reliably everywhere.
// ─────────────────────────────────────────────────────────────────
function logoSrc() {
  return `cid:${LOGO_CID}`
}

/** Inline logo attachment matching the CID referenced by the letterhead. */
function logoAttachment() {
  return fs.existsSync(LOGO_PATH)
    ? [{ filename: 'logo.png', path: LOGO_PATH, cid: LOGO_CID }]
    : []
}

// Brand banner: soft pink-tinted gradient strip with the logo mark on the
// left and the bold "Cross Borders Deliveries" lockup on the right. The
// pink is deliberately gentle — white easing into a barely-there coral
// wash (#FDEEE9 → #F8D7CD, ~15-30% of the brand coral over white) so it
// reads as a subtle tint, never a hard color block. Mirrored by the
// invoice PDF banner.
function brandBanner() {
  return `
          <!-- ═══ Brand banner (HARDCODED letterhead) ═══ -->
          <tr>
            <td class="cbd-pad" style="background:linear-gradient(135deg,#FFFFFF 0%,#FDEEE9 55%,#F8D7CD 100%);background-color:#FCEFEB;padding:13px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td class="cbd-logo-cell" valign="middle" style="width:70px;">
                  <img src="${logoSrc()}" alt="Cross Borders Deliveries" width="60" style="display:block;width:60px;height:auto;border:0;" class="cbd-logo" />
                </td>
                <td valign="middle" style="padding-left:14px;">
                  <div class="cbd-brand" style="color:${NAVY};font-size:21px;font-weight:bold;letter-spacing:0.2px;">Cross Borders <span style="color:${CORAL};">Deliveries</span></div>
                  <div class="cbd-brand-sub" style="color:#5B6478;font-size:9.5px;letter-spacing:2.2px;text-transform:uppercase;margin-top:3px;">Global Logistics &amp; Courier Services</div>
                </td>
              </tr></table>
            </td>
          </tr>`
}

// Dark shell: dark outer wrapper + clean dark container. Every system
// template renders its content inside this block.
//
// RESPONSIVE: the container is already fluid (width:100% / max-width), but a
// browser preview also needs a viewport meta tag — without it a phone renders
// a ~980px desktop viewport and shrinks the whole letter to ~40% scale (the
// "shrunken UI" look). With the meta + the mobile rules below, the letter
// fills the phone screen edge-to-edge at full text size, the same way the
// invoice PDF does in a PDF viewer. The <style> block degrades gracefully in
// email clients that ignore it — every layout-critical rule stays inline.
function darkShell(inner, { width = 620 } = {}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(COMPANY.brand_name)}</title>
    <style>
      /* Mobile: drop the desktop gutters so the card fills the screen like a page. */
      @media only screen and (max-width:620px){
        .cbd-shell{padding:0 !important;}
        .cbd-card{border-radius:0 !important;box-shadow:none !important;}
        .cbd-pad{padding-left:18px !important;padding-right:18px !important;}
        .cbd-logo-cell{width:46px !important;}
        .cbd-logo{width:42px !important;}
        .cbd-brand{font-size:16.5px !important;letter-spacing:0 !important;}
        .cbd-brand-sub{font-size:8.5px !important;letter-spacing:1.5px !important;}
        .cbd-legal{font-size:13px !important;letter-spacing:1.2px !important;}
        .cbd-body{font-size:15px !important;line-height:1.75 !important;}
        .cbd-title{font-size:16px !important;}
        .cbd-foot{font-size:12px !important;}
        .cbd-track{font-size:19px !important;letter-spacing:1px !important;}
        /* Stack the two detail columns (Recipient / Sender) vertically. */
        .cbd-cols,.cbd-cols tr,.cbd-cols td{display:block !important;width:auto !important;}
        .cbd-cols td{padding:0 0 20px !important;}
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${DARK_BG};font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" class="cbd-shell" width="100%" cellpadding="0" cellspacing="0" style="background:${DARK_BG};padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" class="cbd-card" width="${width}" cellpadding="0" cellspacing="0" style="max-width:${width}px;width:100%;background:${DARK_CARD};border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,0.55);">
${brandBanner()}
${inner}
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

// ─────────────────────────────────────────────────────────────────
// HARDCODED letterhead block shared by the letter & footer: navy
// highlight bar with the legal name, then the company details in
// coral (address, fax, reg. no) and bright blue underlined links
// (email, website).
// ─────────────────────────────────────────────────────────────────
function letterheadDetails() {
  return `
          <!-- ═══ Letterhead details (HARDCODED — not editable) ═══ -->
          <tr>
            <td class="cbd-pad" style="padding:0 28px;">
              <div style="background:${NAVY};border-radius:8px;padding:9px 14px;margin-top:18px;text-align:center;">
                <span class="cbd-legal" style="color:${WHITE};font-size:15.5px;font-weight:bold;letter-spacing:1.8px;">${COMPANY.legal_name}</span>
              </div>
              <div style="text-align:center;font-size:12px;line-height:1.95;color:${CORAL};padding:13px 8px 0;">
                ${escapeHtml(COMPANY.address)},<br />
                Fax: ${escapeHtml(COMPANY.fax)},<br />
                Reg. No. ${escapeHtml(COMPANY.reg_no)},<br />
                Email: <a href="mailto:${COMPANY.email}" style="color:${BLUE};text-decoration:underline;">${escapeHtml(COMPANY.email)}</a>,<br />
                Website: <a href="https://${COMPANY.website}" style="color:${BLUE};text-decoration:underline;">${escapeHtml(COMPANY.website)}</a>
              </div>
            </td>
          </tr>
          <tr><td class="cbd-pad" style="padding:16px 28px 0;"><div style="height:1px;background:${DARK_LINE};font-size:0;line-height:0;">&nbsp;</div></td></tr>`
}

// Hardcoded footer strip — identical on every system email.
function brandFooter(note) {
  return `
          <!-- ═══ Footer (HARDCODED) ═══ -->
          <tr><td class="cbd-pad" style="padding:22px 28px 0;"><div style="height:1px;background:${DARK_LINE};font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr>
            <td class="cbd-pad" style="padding:14px 28px 26px;text-align:center;">
              <div class="cbd-foot" style="color:${DIM};font-size:11.5px;line-height:1.9;font-family:Arial,Helvetica,sans-serif;">
                <strong style="color:${CORAL};">${COMPANY.legal_name}</strong> — leading logistics and distribution services<br />
                ${escapeHtml(COMPANY.address)} &bull; Fax: ${escapeHtml(COMPANY.fax)}<br />
                Reg. No. ${escapeHtml(COMPANY.reg_no)} &bull; ${escapeHtml(COMPANY.email)} &bull; ${escapeHtml(COMPANY.website)}<br />
                <span style="font-size:10.5px;">${note}</span>
              </div>
            </td>
          </tr>`
}

// ─────────────────────────────────────────────────────────────────
// STATUS / INVOICE EMAIL — dark theme, same letterhead & container
// as the confirmation letter.
// ─────────────────────────────────────────────────────────────────
function renderTemplate(shipment) {
  const cur = shipment.currency || 'NGN'
  const trackUrl = TRACKING_URL(shipment.tracking_number)
  const eta = fmtDate(shipment.estimated_delivery)
  const paid = shipment.payment_status === 'Paid'
  const payColor = paid ? '#0E7A3D' : shipment.payment_status === 'Pending' ? '#B7791F' : CORAL
  const payLabel = paid ? 'PAID' : (shipment.payment_status || 'UNPAID').toUpperCase()
  const isDelivered = shipment.current_status === 'Delivered'
  const deliveredOn = fmtDate(shipment.delivered_at)
  const receivedBy = shipment.pod?.receiver_name

  // Delivered: green confirmation banner with proof of delivery
  const deliveredBlock = isDelivered
    ? `
          <!-- ═══ Delivered banner ═══ -->
          <tr>
            <td class="cbd-pad" style="padding:14px 34px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F2419;border:1px solid #1D6B41;border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;text-align:center;">
                    <div style="font-size:15px;font-weight:bold;color:#5FD48C;">&#10004; DELIVERED${deliveredOn ? ` — ${deliveredOn}` : ''}</div>
                    ${receivedBy ? `<div style="font-size:12.5px;color:#8FBFA3;margin-top:5px;">Received by <strong>${escapeHtml(receivedBy)}</strong>${shipment.pod?.signed_at ? ' &bull; ' + fmtDate(shipment.pod.signed_at) : ''}</div>` : ''}
                    <div style="font-size:11.5px;color:#6E9A83;margin-top:4px;">Proof of delivery is on record with our operations team.</div>
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
                  <td style="padding:11px 16px;border-bottom:1px solid ${DARK_LINE};color:${OFF_WHITE};font-size:13.5px;">${label}</td>
                  <td style="padding:11px 16px;border-bottom:1px solid ${DARK_LINE};color:${WHITE};font-size:13.5px;text-align:right;font-weight:600;">${amount}</td>
                </tr>`,
    )
    .join('')

  const detailRow = (label, value) =>
    value
      ? `
                  <tr>
                    <td style="padding:3px 0;color:${MUTED};font-size:12.5px;white-space:nowrap;padding-right:14px;">${label}</td>
                    <td style="padding:3px 0;color:${OFF_WHITE};font-size:13.5px;font-weight:500;">${value}</td>
                  </tr>`
      : ''

  const inner = `
          <!-- ═══ Greeting ═══ -->
          <tr>
            <td class="cbd-pad" style="padding:26px 34px 4px;">
              <h1 style="margin:0 0 8px;font-size:20px;color:${WHITE};">Shipment Update: {{current_status}}</h1>
              <p style="margin:0;color:${OFF_WHITE};font-size:14px;line-height:1.7;">
                Dear {{recipient_name}},<br />
                Here is the latest status of your consignment with Cross Borders Deliveries. Keep your tracking number below — you can use it any time on our website to follow your delivery.
              </p>
            </td>
          </tr>

          <!-- ═══ Tracking number — copy box ═══ -->
          <tr>
            <td class="cbd-pad" style="padding:18px 34px 4px;">
              <div style="border:2px dashed ${CORAL};background:${DARK_PANEL};border-radius:10px;padding:14px 18px;text-align:center;">
                <div style="font-size:10px;color:${MUTED};letter-spacing:1.6px;text-transform:uppercase;margin-bottom:5px;">Your Tracking Number</div>
                <div class="cbd-track" style="font-size:22px;font-weight:bold;color:${CORAL};letter-spacing:1.5px;font-family:'Courier New',monospace;">{{tracking_number}}</div>
                <div style="font-size:11px;color:${DIM};margin-top:6px;">Select &amp; copy this number to track your delivery</div>
              </div>
            </td>
          </tr>

          <!-- ═══ Status + progress card ═══ -->
          <tr>
            <td class="cbd-pad" style="padding:14px 34px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${DARK_PANEL};border-radius:10px;border:1px solid ${DARK_LINE};">
                <tr>
                  <td style="padding:16px 18px;">
                    <table role="presentation" width="100%"><tr>
                      <td>
                        <div style="font-size:10px;color:${MUTED};letter-spacing:1.4px;text-transform:uppercase;">Current Status</div>
                        <div style="font-size:16px;font-weight:bold;color:${WHITE};margin-top:3px;">{{current_status}}</div>
                      </td>
                      <td align="right" valign="middle">
                        <span style="display:inline-block;background:${CORAL};color:${WHITE};font-size:12px;font-weight:bold;padding:5px 14px;border-radius:999px;">{{progress_percentage}}% Complete</span>
                      </td>
                    </tr></table>
                    <div style="background:#262A33;border-radius:6px;height:9px;margin-top:12px;">
                      <div style="background:linear-gradient(90deg,#3C5AA6,${CORAL});border-radius:6px;height:9px;width:{{progress_percentage}}%;"></div>
                    </div>
                    <table role="presentation" width="100%" style="margin-top:14px;"><tr>
                      <td style="color:${WHITE};font-weight:bold;font-size:13px;">{{origin_city}}</td>
                      <td align="center" style="color:${CORAL};font-size:15px;">&#10230;</td>
                      <td align="right" style="color:${WHITE};font-weight:bold;font-size:13px;">{{destination_city}}</td>
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
            <td class="cbd-pad" style="padding:14px 34px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F2419;border:1px solid #1D6B41;border-radius:10px;">
                <tr>
                  <td style="padding:12px 18px;color:#8FBFA3;font-size:13.5px;">
                    <strong style="color:#5FD48C;">Estimated Delivery:</strong> ${eta}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
            : ''}

          <!-- ═══ Shipment details ═══ -->
          <tr>
            <td class="cbd-pad" style="padding:22px 34px 0;">
              <table class="cbd-cols" role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" style="width:50%;padding-right:8px;">
                    <div style="font-size:11px;color:${CORAL};letter-spacing:1.4px;font-weight:bold;text-transform:uppercase;border-bottom:2px solid ${CORAL};padding-bottom:5px;margin-bottom:9px;">Recipient</div>
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
                    <div style="font-size:11px;color:${WHITE};letter-spacing:1.4px;font-weight:bold;text-transform:uppercase;border-bottom:2px solid ${WHITE};padding-bottom:5px;margin-bottom:9px;">Sender</div>
                    <table role="presentation">
                      ${detailRow('Name', escapeHtml(COMPANY.legal_name))}
                      ${detailRow('Address', escapeHtml(COMPANY.address))}
                      ${detailRow('Phone', escapeHtml(COMPANY.phone))}
                      ${detailRow('Email', escapeHtml(COMPANY.email))}
                    </table>
                    <div style="font-size:11px;color:${CORAL};letter-spacing:1.4px;font-weight:bold;text-transform:uppercase;border-bottom:2px solid ${CORAL};padding-bottom:5px;margin:16px 0 9px;">Consignment</div>
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
            <td class="cbd-pad" style="padding:24px 34px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${DARK_LINE};border-radius:10px;border-collapse:separate;overflow:hidden;">
                <tr>
                  <td colspan="2" style="background:${NAVY};color:${WHITE};font-size:11px;letter-spacing:1.6px;padding:11px 16px;font-weight:bold;text-transform:uppercase;">Cost Breakdown (${cur})</td>
                </tr>
                ${rowHtml}
                <tr>
                  <td style="padding:13px 16px;background:#202430;color:${WHITE};font-weight:bold;font-size:15px;">TOTAL</td>
                  <td style="padding:13px 16px;background:#202430;color:${WHITE};font-weight:bold;font-size:15px;text-align:right;">{{total_cost}}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:10px 16px;background:${DARK_CARD};">
                    <span style="display:inline-block;font-size:11px;font-weight:bold;letter-spacing:1px;color:${WHITE};background:${payColor};padding:4px 12px;border-radius:999px;">${payLabel}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 2px 0;color:${DIM};font-size:11.5px;">The official commercial invoice for this consignment is attached to this email as a PDF.</p>
            </td>
          </tr>

          <!-- ═══ CTA ═══ -->
          <tr>
            <td align="center" class="cbd-pad" style="padding:26px 34px 4px;">
              <a href="{{tracking_url}}" style="display:inline-block;background:${CORAL};color:${WHITE};text-decoration:none;font-weight:bold;font-size:15px;padding:14px 40px;border-radius:8px;letter-spacing:0.4px;">Track Your Package</a>
              <p style="margin:12px 0 0;color:${DIM};font-size:12px;">Or paste this link into your browser:<br />
                <span style="color:${MUTED};">{{tracking_url}}</span>
              </p>
            </td>
          </tr>
${letterheadDetails()}
${brandFooter('This is an automated shipment notification. If you were not expecting this consignment, please contact us immediately.')}`

  return darkShell(inner)
}

export function fillTemplate(shipment) {
  return renderTemplate(shipment)
    .replaceAll('{{recipient_name}}', escapeHtml(shipment.recipient_name))
    .replaceAll('{{recipient_address}}', escapeHtml(shipment.recipient_address || '—'))
    .replaceAll('{{recipient_city}}', escapeHtml(shipment.recipient_city || '—'))
    .replaceAll('{{recipient_country}}', escapeHtml(shipment.recipient_country || '—'))
    .replaceAll('{{recipient_phone}}', escapeHtml(shipment.recipient_phone || '—'))
    .replaceAll('{{recipient_email}}', escapeHtml(shipment.recipient_email))
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

// Masks an email/key for diagnostics: "john.doe@gmail.com" → "j***@g***.com"
function mask(v) {
  const s = String(v || '')
  if (!s) return '(empty!)'
  if (s.includes('@')) return `${s[0]}***@${s.split('@')[1]?.[0]}***.com`
  return `${s.slice(0, 8)}***(${s.length} chars)`
}

// Tries the last working port first, then SMTP_PORT, then Brevo's alternates (2525, 465).
// Throws the last error if every port fails.
async function sendViaSmtp(mailOptions) {
  const { SMTP_PORT, SMTP_USER } = process.env
  console.log(`[smtp] attempting send as user=${mask(SMTP_USER)}`)
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
    sender: { name: COMPANY.brand_name, email: process.env.MAIL_FROM || COMPANY.email },
    // Customers who hit "reply" write to this address — it does NOT need to be
    // verified in Brevo (only the sender does)
    replyTo: { email: process.env.MAIL_REPLY_TO || COMPANY.email },
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

// ─────────────────────────────────────────────────────────────────
// SENT-MAIL LOG — every delivery outcome (sent / failed / simulated) is
// recorded in the `emails` PocketBase collection and shown in the admin
// console under Admin → Mail. A logging failure never affects the send.
// ─────────────────────────────────────────────────────────────────
async function logEmail({ to, subject, label, shipment, admin, status, transport, error }) {
  try {
    await createRecord(COLLECTIONS.emails, {
      to_email: to,
      subject,
      kind: label,
      status,
      transport,
      error: error ? String(error).slice(0, 500) : undefined,
      shipment_id: shipment?.id || shipment?._id || undefined,
      tracking_number: shipment?.tracking_number || undefined,
      sent_by: admin?.email || 'system',
    })
  } catch (e) {
    console.error('[email-log] failed to record mail log:', e.message)
  }
}

// ─────────────────────────────────────────────────────────────────
// Generic dispatch shared by every system email. Sender identity is
// HARDCODED to the company constants — never taken from shipment data.
// Prefers the Brevo HTTP API (HTTPS/443 — always open), falls back to
// SMTP (ports 587 → 2525 → 465), then a logged simulation.
// ─────────────────────────────────────────────────────────────────
async function deliverMail({ to, subject, html, attachments = [], shipment, admin, label }) {
  const mailFrom = process.env.MAIL_FROM || COMPANY.email
  // Display/reply address — does not need Brevo verification
  const replyTo = process.env.MAIL_REPLY_TO || COMPANY.email
  const logoInline = fs.existsSync(LOGO_PATH) && html.includes(`cid:${LOGO_CID}`)

  // ── Preferred path: Brevo HTTP API (works when SMTP ports are blocked) ──
  if (process.env.BREVO_API_KEY) {
    try {
      // The API can't inline CID images — embed the logo as a base64 data URI instead
      let htmlApi = html
      if (logoInline) {
        htmlApi = html.replaceAll(
          `src="cid:${LOGO_CID}"`,
          `src="data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}"`,
        )
      }
      await sendViaBrevoApi({ to, subject, html: htmlApi, attachments })
      await updateRecord(COLLECTIONS.shipments, shipment.id || shipment._id, { email_sent_at: new Date() })
      await audit(admin, 'email.sent', 'shipment', String(shipment._id), `${label} emailed to ${to} via Brevo API`)
      await logEmail({ to, subject, label, shipment, admin, status: 'sent', transport: 'brevo-api' })
      return { sent: true, to, subject, message: 'Email sent via Brevo API (HTTPS).' }
    } catch (err) {
      console.error('[brevo-api] send failed:', err.message)
      await audit(admin, 'email.failed', 'shipment', String(shipment._id), `Brevo API: ${String(err.message).slice(0, 200)}`)
      await logEmail({ to, subject, label, shipment, admin, status: 'failed', transport: 'brevo-api', error: err.message })
      return { sent: false, error: err.message, to, subject, message: `Brevo API send failed — ${err.message}` }
    }
  }

  // ── Fallback: SMTP (tries ports 587 → 2525 → 465) ──
  if (!smtpConfigured()) {
    console.log(`[email:simulated] → ${to} | ${subject}`)
    await audit(admin, 'email.simulated', 'shipment', String(shipment._id), `No BREVO_API_KEY / SMTP configured; simulated email to ${to}`)
    await logEmail({ to, subject, label, shipment, admin, status: 'simulated', transport: 'none' })
    return { sent: false, simulated: true, to, subject, message: 'Email not configured — simulated in logs. Set SMTP_HOST / SMTP_USER / SMTP_PASS.' }
  }

  try {
    const { port } = await sendViaSmtp({
      from: `"${COMPANY.brand_name}" <${mailFrom}>`,
      replyTo,
      to,
      subject,
      html,
      attachments,
    })
    await updateRecord(COLLECTIONS.shipments, shipment.id || shipment._id, { email_sent_at: new Date() })
    await audit(admin, 'email.sent', 'shipment', String(shipment._id), `${label} emailed to ${to} via SMTP port ${port}`)
    await logEmail({ to, subject, label, shipment, admin, status: 'sent', transport: `smtp:${port}` })
    return { sent: true, to, subject, message: `Email sent via SMTP (port ${port}).` }
  } catch (err) {
    const { SMTP_HOST } = process.env
    const hint =
      err.code === 'ETIMEDOUT' || /timeout/i.test(err.message)
        ? ` — could not reach ${SMTP_HOST || '(unset)'} on ports 587/2525/465. Outbound SMTP may be blocked from this host — double-check the SMTP host/port settings.`
        : err.code === 'EAUTH'
          ? ' — authentication rejected by the SMTP server. Check the SMTP user/key.'
          : ''
    console.error(`[smtp] send failed (${err.code || 'error'}): ${err.message}${hint}`)
    await audit(admin, 'email.failed', 'shipment', String(shipment._id), `${err.code || 'error'}: ${String(err.message).slice(0, 200)}`)
    await logEmail({ to, subject, label, shipment, admin, status: 'failed', transport: 'smtp', error: err.message })
    return { sent: false, error: err.message, to, subject, message: `SMTP send failed (${err.code || 'error'})${hint}` }
  }
}

// Status/progress email — invoice PDF attached, logo inline.
export async function sendShipmentEmail(shipment, admin) {
  const to = shipment.recipient_email
  const subject = `[${shipment.tracking_number}] Shipment ${shipment.current_status} — ${COMPANY.brand_name}`
  const html = fillTemplate(shipment)

  // Build the invoice attachment once (used by both send paths)
  const doc = await buildInvoicePdf(shipment)
  const invoicePdf = await new Promise((resolve, reject) => {
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
  const attachments = [
    { filename: `${shipment.tracking_number}-invoice.pdf`, content: invoicePdf, contentType: 'application/pdf' },
    ...logoAttachment(),
  ]

  return deliverMail({ to, subject, html, attachments, shipment, admin, label: 'Invoice/status email' })
}

// ─────────────────────────────────────────────────────────────────
// CONFIRMATION LETTER — exact formal letter format on the unified
// dark theme. The letterhead banner, the navy highlight bar, the
// company details (address, fax, reg. no, email, website), the body
// wording and the signature block are HARDCODED. Only the date
// (always current), the reference/tracking number and the recipient
// details vary per shipment.
// ─────────────────────────────────────────────────────────────────
export function renderConfirmationLetter(shipment) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const rawName = String(shipment.recipient_name || '—')
  const rawAddress = String(shipment.recipient_address || '—')
  const rawEmail = String(shipment.recipient_email || '—')
  const rawPhone = String(shipment.recipient_phone || '—')
  const name = escapeHtml(rawName)
  const address = escapeHtml(rawAddress)
  const emailAddr = escapeHtml(rawEmail)
  const phone = escapeHtml(rawPhone)
  const reference = escapeHtml(shipment.tracking_number)
  const origin = escapeHtml(shipment.origin_city || '—')
  const destination = escapeHtml(shipment.destination_city || '—')

  // Clickable recipient values: maps link, mailto: and tel:
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(rawAddress)}`
  const mailHref = `mailto:${rawEmail}`
  const telHref = `tel:${rawPhone.replace(/[^\d+]/g, '')}`

  const inner = `
          ${letterheadDetails().trimStart()}

          <!-- ═══ Date — always current ═══ -->
          <tr>
            <td class="cbd-pad" style="padding:14px 34px 0;text-align:right;font-size:13px;font-family:Arial,Helvetica,sans-serif;">
              <span style="color:${CORAL};font-style:italic;">Date: ${date}</span>
            </td>
          </tr>

          <!-- ═══ Letter body — exact wording (HARDCODED) ═══ -->
          <tr>
            <td class="cbd-pad cbd-body" style="padding:18px 34px 34px;font-size:14.5px;color:${OFF_WHITE};line-height:1.85;">
              <p style="margin:0 0 20px;">Dear ${name}</p>

              <h1 class="cbd-title" style="margin:0 0 22px;font-size:17px;font-weight:bold;color:${WHITE};text-decoration:underline;text-align:center;letter-spacing:0.3px;">Official Notification of Incoming Shipment</h1>

              <p style="margin:0 0 4px;"><em style="color:${MUTED};">Reference Number:</em> <strong style="color:${WHITE};">${reference}</strong></p>
              <p style="margin:0 0 18px;"><em style="color:${MUTED};">Shipment Origin and Destination:</em> <strong style="color:${WHITE};">${origin} to ${destination}.</strong></p>

              <p style="margin:0 0 14px;">Cross Borders Deliveries is pleased to inform you that a consignment has been received and is scheduled for delivery to your registered residential address.</p>

              <p style="margin:0 0 10px;">To proceed with the dispatch, we kindly request your confirmation that the following details are accurate:</p>

              <p style="margin:0 0 18px;">
                <em style="color:${MUTED};">Full Name:</em> <strong style="color:${WHITE};">${name}</strong><br />
                <em style="color:${MUTED};">Delivery Address:</em> <a href="${escapeHtml(mapsHref)}" style="color:${BLUE};text-decoration:underline;">${address}</a><br />
                <em style="color:${MUTED};">Email Address:</em> <a href="${escapeHtml(mailHref)}" style="color:${BLUE};text-decoration:underline;">${emailAddr}</a><br />
                <em style="color:${MUTED};">Telephone Number:</em> <a href="${escapeHtml(telHref)}" style="color:${BLUE};text-decoration:underline;font-weight:bold;">${phone}</a>
              </p>

              <p style="margin:0 0 16px;">Upon verification of the above information, we will promptly arrange for the shipment to your address.</p>

              <p style="margin:0 0 16px;"><strong style="color:${WHITE};">Important Requirement:</strong><br />
                <em style="color:${OFF_WHITE};">Due to security protocols and the high-value nature of this consignment, the recipient must present a form of government-issued identification at the time of delivery for verification purposes. Failure to provide such identification may result in the package being withheld or returned.</em></p>

              <p style="margin:0 0 16px;">We kindly request that you contact us at your earliest convenience to confirm the dispatch and release of the shipment. Your prompt response will help us avoid any delays and ensure a high standard of service.</p>

              <p style="margin:0 0 16px;">Should you have any questions or require further assistance, please do not hesitate to contact our support team. We operate 24 hours a day, 7 days a week.</p>

              <p style="margin:0 0 26px;">Thank you for choosing Cross Borders Deliveries.</p>

              <p style="margin:0;">Yours sincerely,<br /><br />
                <strong style="color:${WHITE};">${escapeHtml(COMPANY.signatory)}</strong><br />
                ${escapeHtml(COMPANY.signatory_title)}<br />
                <strong style="color:${WHITE};">${escapeHtml(COMPANY.legal_name)}</strong></p>
            </td>
          </tr>
${brandFooter('This is an automated letter from Cross Borders Deliveries. If you were not expecting this consignment, please contact us immediately.')}`

  return darkShell(inner)
}

// Confirmation letter — sent from the admin's "Send Confirmation" button.
// Recipient details come from the admin's receiver-only form; everything
// else (letterhead, signature, date) is fixed server-side.
export async function sendConfirmationEmail(shipment, admin) {
  const to = shipment.recipient_email
  const subject = `Official Notification of Incoming Shipment — ${shipment.tracking_number}`
  const html = renderConfirmationLetter(shipment)
  return deliverMail({ to, subject, html, attachments: logoAttachment(), shipment, admin, label: 'Confirmation letter' })
}
