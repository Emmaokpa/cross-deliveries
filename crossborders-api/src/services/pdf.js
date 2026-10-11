import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import fs from 'node:fs'
import { TRACKING_URL, LOGO_PATH } from './shipment-utils.js'
import { COMPANY } from './company.js'

// ─────────────────────────────────────────────────────────────────
// UNIFIED DARK THEME — mirrors the email templates (services/email.js)
// exactly: dark outer background, the light brand banner letterhead,
// the navy highlight bar, coral company details and blue underlined
// links. HARDCODED brand assets — never editable from the admin UI.
// ─────────────────────────────────────────────────────────────────
const DARK_BG = '#0F1117'
const DARK_PANEL = '#1A1D24'
const DARK_LINE = '#2A2E38'
const CORAL = '#EE6044'
const BLUE = '#4A90E2'
const NAVY = '#031435'
const WHITE = '#FFFFFF'
const OFF_WHITE = '#D6DAE3'
const MUTED = '#9AA1AE'
const DIM = '#7A8290'
const BODY = '#AEB6C4'

// PDF core fonts (Helvetica) lack most currency glyphs (₦, ₩, ₹…), so amounts
// always print with the ISO code prefix, e.g. "NGN 12,500.00" / "KRW 1,250,000".
const money = (n, code = 'NGN') => {
  const zeroDecimals = code === 'JPY' || code === 'KRW'
  const num = Number(n || 0)
  return `${String(code).toUpperCase()} ${num.toLocaleString('en-US', {
    minimumFractionDigits: zeroDecimals ? 0 : 2,
    maximumFractionDigits: zeroDecimals ? 0 : 2,
  })}`
}

const M = 48 // page margin
const PW = () => 595.28 - M * 2 // usable width (A4)

// PDF core fonts (Helvetica) use WinAnsiEncoding, which has no "İ" (U+0130) —
// transliterate it so the address renders correctly instead of as garbage.
const pdfText = (s) => String(s ?? '').replace(/İ/g, 'I')

export async function buildInvoicePdf(shipment) {
  const doc = new PDFDocument({ size: 'A4', margin: M })

  // Every page (including auto-added overflow pages) gets the dark background
  const paintBackground = () => doc.rect(0, 0, doc.page.width, doc.page.height).fill(DARK_BG)
  paintBackground()
  doc.on('pageAdded', paintBackground)

  await drawLetterhead(doc, shipment)
  titleBlock(doc, shipment)
  partyCards(doc, shipment)
  metaGrid(doc, shipment)
  pricingTable(doc, shipment)

  // Footer — kept as short single lines and clear of the bottom margin:
  // a long line used to wrap past the margin and make pdfkit append blank
  // extra pages ("Page 1 of 1" ended up alone on page 3).
  doc.fontSize(8).fillColor(DIM)
  doc.text(
    'CrossBordersDeliveries.com — leading logistics and distribution services.',
    M,
    doc.page.height - 84,
    { width: doc.page.width - M * 2, align: 'center', lineBreak: false },
  )
  doc.text(
    'This document is generated electronically and is valid without signature.',
    M,
    doc.page.height - 72,
    { width: doc.page.width - M * 2, align: 'center', lineBreak: false },
  )
  doc.fontSize(7.5).fillColor('#5A6272')
  doc.text(`Page 1 of 1`, M, doc.page.height - 60, { width: doc.page.width - M * 2, align: 'center', lineBreak: false })
  doc.end()
  return doc
}

async function drawLetterhead(doc, shipment) {
  const W = doc.page.width

  // ── Brand banner (HARDCODED) — soft pink-tinted gradient strip with the
  //    red-and-dark "X" logo mark on the left and the bold brand name to its
  //    right. Same gentle white → coral-wash tint as the email letterhead.
  const banner = doc.linearGradient(0, 0, W, 84)
  banner.stop(0, '#FFFFFF').stop(0.55, '#FDEEE9').stop(1, '#F8D7CD')
  doc.rect(0, 0, W, 84).fill(banner)

  if (fs.existsSync(LOGO_PATH)) {
    try {
      doc.image(LOGO_PATH, M, 19, { fit: [80, 46], align: 'left', valign: 'center' })
    } catch {
      /* logo optional */
    }
  }

  doc.font('Helvetica-Bold').fontSize(19)
  doc.fillColor(NAVY).text('Cross Borders ', M + 92, 25, { continued: true, lineBreak: false })
  doc.fillColor(CORAL).text('Deliveries', { lineBreak: false })
  doc.font('Helvetica').fontSize(6.8).fillColor('#5B6478')
  doc.text('GLOBAL LOGISTICS & COURIER SERVICES', M + 92, 50, { characterSpacing: 1.5, lineBreak: false })

  // QR code — scan to track (top-right of the banner)
  try {
    const qr = await QRCode.toBuffer(TRACKING_URL(shipment.tracking_number), { width: 220, margin: 0, color: { dark: NAVY, light: '#FFFFFF' } })
    doc.roundedRect(W - M - 52, 12, 52, 52, 6).fill('#FFFFFF')
    doc.image(qr, W - M - 46, 18, { width: 40, height: 40 })
    doc.fontSize(5.5).fillColor('#5B6478').text('SCAN TO TRACK', W - M - 52, 60, { width: 52, align: 'center', lineBreak: false })
  } catch {
    /* QR optional */
  }

  // ── Navy highlight bar with the HARDCODED legal name ──
  doc.rect(0, 84, W, 26).fill(NAVY)
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(WHITE)
  doc.text(COMPANY.legal_name, 0, 92, { width: W, align: 'center', characterSpacing: 1.8, lineBreak: false })

  // ── HARDCODED company details in coral ──
  const y0 = 122
  doc.font('Helvetica').fontSize(8).fillColor(CORAL)
  doc.text(`${pdfText(COMPANY.address)},`, M, y0, { lineBreak: false })
  doc.text(`Fax: ${COMPANY.fax},`, M, y0 + 12, { lineBreak: false })
  doc.text(`Reg. No. ${COMPANY.reg_no},`, M, y0 + 24, { lineBreak: false })

  // Email + website — bright blue, underlined, clickable
  const emailTxt = `Email: ${COMPANY.email}`
  doc.fillColor(BLUE).text(emailTxt, M, y0 + 36, { lineBreak: false })
  doc.underline(M, y0 + 36, doc.widthOfString(emailTxt), 9, { color: BLUE })
  doc.link(M, y0 + 36, doc.widthOfString(emailTxt), 9, `mailto:${COMPANY.email}`)

  const webTxt = `Website: ${COMPANY.website}`
  doc.fillColor(BLUE).text(webTxt, M + 180, y0 + 36, { lineBreak: false })
  doc.underline(M + 180, y0 + 36, doc.widthOfString(webTxt), 9, { color: BLUE })
  doc.link(M + 180, y0 + 36, doc.widthOfString(webTxt), 9, `https://${COMPANY.website}`)

  // Date — always current, italicized coral
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(CORAL)
  doc.text(`Date: ${today}`, W - M - 200, y0, { width: 200, align: 'right', lineBreak: false })
  doc.font('Helvetica')

  const ruleY = y0 + 52
  doc.moveTo(M, ruleY).lineTo(W - M, ruleY).lineWidth(1).strokeColor(DARK_LINE).stroke()
  doc.y = ruleY + 12
}

// Compact, aligned title row: left = document type + current date, right = tracking
function titleBlock(doc, shipment) {
  const y = doc.y
  doc.font('Helvetica-Bold').fontSize(14).fillColor(WHITE)
  doc.text('COMMERCIAL INVOICE / WAYBILL', M, y, { characterSpacing: 0.5, lineBreak: false })

  // Date — always the current date, never stored or editable
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
  doc.text(`Date: ${today}`, M, y + 15, { lineBreak: false })

  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
  doc.text('Tracking Number:', doc.page.width - M - 190, y, { width: 190, align: 'right', lineBreak: false })
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(CORAL)
  doc.text(shipment.tracking_number, doc.page.width - M - 190, y + 13, { width: 190, align: 'right', lineBreak: false })

  const ruleY = y + 34
  doc.moveTo(M, ruleY).lineTo(doc.page.width - M, ruleY).lineWidth(1).strokeColor(DARK_LINE).stroke()
  doc.y = ruleY + 12
}

// Sender / recipient as two equal bordered cards — sender is the HARDCODED
// company block, recipient comes from the admin's editable receiver form
function partyCards(doc, shipment) {
  const y = doc.y
  const h = 130
  const w = (PW() - 14) / 2
  partyCard(doc, 'SENDER', y, w, [
    COMPANY.legal_name,
    pdfText(COMPANY.address),
    `Reg. No. ${COMPANY.reg_no}`,
    `Fax: ${COMPANY.fax}`,
    COMPANY.email,
    COMPANY.website,
  ])
  const recipientLines = [
    shipment.recipient_name,
    shipment.recipient_address,
    [shipment.recipient_city, shipment.recipient_country].filter(Boolean).join(', '),
    shipment.recipient_phone,
    shipment.recipient_email,
  ]
  partyCard(doc, 'RECIPIENT', y, w, recipientLines, M + w + 14)
  doc.y = y + h + 14
}

function partyCard(doc, heading, y, w, lines, x = M) {
  const h = 130
  doc.roundedRect(x, y, w, h, 6).fill(DARK_PANEL)
  doc.roundedRect(x, y, w, h, 6).lineWidth(1).strokeColor(DARK_LINE).stroke()

  const pad = 12
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(CORAL)
  doc.text(heading, x + pad, y + pad, { characterSpacing: 1.2, lineBreak: false })

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(WHITE)
  doc.text(String(lines[0] || ''), x + pad, y + pad + 14, { width: w - pad * 2, height: 16, ellipsis: true })

  doc.font('Helvetica').fontSize(8).fillColor(BODY)
  const body = lines.slice(1).filter(Boolean)
  doc.text(body.join('\n'), x + pad, y + pad + 34, { width: w - pad * 2, height: h - pad - 42, ellipsis: true, lineGap: 2 })
}

// Bordered 4 × 2 details grid — every cell framed, identical size
function metaGrid(doc, shipment) {
  const eta = shipment.estimated_delivery
    ? new Date(shipment.estimated_delivery).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'
  const cells = [
    ['CARGO TYPE', shipment.cargo_type],
    ['ORIGIN', shipment.origin_city || '—'],
    ['DESTINATION', shipment.destination_city || '—'],
    ['WEIGHT', `${shipment.package_weight || 0} kg`],
    ['DIMENSIONS', shipment.package_dimensions || '—'],
    ['QUANTITY', String(shipment.package_quantity || 1)],
    ['PAYMENT', shipment.payment_status],
    ['STATUS', shipment.current_status],
  ]

  const cols = 4
  const rows = 2
  const cw = PW() / cols
  const ch = 44
  const startY = doc.y

  doc.font('Helvetica').fontSize(6.5).fillColor(MUTED)
  doc.text('SHIPMENT DETAILS', M, startY, { characterSpacing: 1.2, lineBreak: false })
  const gridY = startY + 14

  cells.forEach((_, i) => {
    const x = M + (i % cols) * cw
    const y = gridY + Math.floor(i / cols) * ch
    doc.rect(x, y, cw, ch).lineWidth(1).strokeColor(DARK_LINE).stroke()
    // fill after stroke would hide borders — the page background shows through instead
  })

  cells.forEach(([label, value], i) => {
    const x = M + (i % cols) * cw
    const y = gridY + Math.floor(i / cols) * ch
    doc.font('Helvetica').fontSize(6.5).fillColor(MUTED)
    doc.text(label, x + 8, y + 7, { characterSpacing: 0.8, lineBreak: false })
    doc.font('Helvetica-Bold').fontSize(10).fillColor(WHITE)
    doc.text(String(value), x + 8, y + 19, { width: cw - 16, height: 18, ellipsis: true })
  })

  // Estimated delivery strip under the grid
  const stripY = gridY + rows * ch
  doc.rect(M, stripY, PW(), 26).fillColor('#161A21').fill()
  doc.rect(M, stripY, PW(), 26).lineWidth(1).strokeColor(DARK_LINE).stroke()
  doc.font('Helvetica').fontSize(6.5).fillColor(MUTED)
  doc.text('ESTIMATED DELIVERY', M + 8, stripY + 5, { characterSpacing: 0.8, lineBreak: false })
  doc.font('Helvetica-Bold').fontSize(10).fillColor(WHITE)
  doc.text(eta, M + 8, stripY + 15, { lineBreak: false })
  doc.font('Helvetica').fontSize(6.5).fillColor(MUTED)
  doc.text('CURRENCY', M + 220, stripY + 5, { characterSpacing: 0.8, lineBreak: false })
  doc.font('Helvetica-Bold').fontSize(10).fillColor(WHITE)
  doc.text((shipment.currency || 'NGN').toUpperCase(), M + 220, stripY + 15, { lineBreak: false })

  doc.y = stripY + 26 + 16
}

function pricingTable(doc, shipment) {
  const x0 = M
  const width = PW()
  const cur = (shipment.currency || 'NGN').toUpperCase()
  doc.moveDown(0.5)

  // Every row is positioned from an explicit `y` cursor: doc.text() advances
  // doc.y by the text height, which used to drift the table down until it
  // spilled onto a phantom second page.
  let y = doc.y

  // Header band
  doc.rect(x0, y, width, 22).fill(NAVY)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8.5)
  doc.text('DESCRIPTION', x0 + 12, y + 7, { characterSpacing: 0.8, lineBreak: false })
  doc.text(`AMOUNT (${cur})`, x0 + width - 130, y + 7, { width: 118, align: 'right', lineBreak: false })
  y += 22

  const rows = [
    ['Base Freight Charges', shipment.base_freight],
    ['Fuel Surcharge', shipment.surcharge_fuel],
    ['Customs & Handling', shipment.surcharge_customs],
  ]
  rows.forEach(([label, amount], i) => {
    if (i % 2 === 0) doc.rect(x0, y, width, 22).fill('#181C23')
    doc.rect(x0, y, width, 22).lineWidth(1).strokeColor(DARK_LINE).stroke()
    doc.fillColor(OFF_WHITE).font('Helvetica').fontSize(9.5)
    doc.text(label, x0 + 12, y + 7, { lineBreak: false })
    doc.font('Helvetica-Bold').fillColor(WHITE)
    doc.text(money(amount, cur), x0 + width - 130, y + 7, { width: 118, align: 'right', lineBreak: false })
    y += 22
  })

  // Total row
  doc.rect(x0, y, width, 26).fill('#202430')
  doc.rect(x0, y, width, 26).lineWidth(1).strokeColor(DARK_LINE).stroke()
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10.5)
  doc.text('TOTAL COST', x0 + 12, y + 8, { characterSpacing: 0.8, lineBreak: false })
  doc.text(money(shipment.total_cost || 0, cur), x0 + width - 130, y + 8, { width: 118, align: 'right', lineBreak: false })
  y += 26 + 12

  // Payment status banner
  const paid = shipment.payment_status === 'Paid'
  const bannerColor = paid ? '#0E7A3D' : shipment.payment_status === 'Pending' ? '#B7791F' : CORAL
  const label = paid ? 'PAID' : shipment.payment_status === 'Pending' ? 'PAYMENT PENDING' : 'UNPAID'
  doc.rect(x0, y, width, 28).fill(bannerColor)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(12)
  doc.text(label, x0, y + 8, { width, align: 'center', lineBreak: false })
  doc.y = y + 28
}
