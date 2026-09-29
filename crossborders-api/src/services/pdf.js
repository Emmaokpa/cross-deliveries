import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import fs from 'node:fs'
import { TRACKING_URL, LOGO_PATH } from './shipment-utils.js'

const BRAND_RED = '#E30613'
const NAVY = '#031435'
const GREY = '#6B7280'
const LINE = '#E3E7EE'
const CARD_BG = '#F6F7F9'
const ZEBRA = '#F6F7F9'

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

export function buildInvoicePdf(shipment) {
  const doc = new PDFDocument({ size: 'A4', margin: M })
  drawLetterhead(doc, shipment)
  titleBlock(doc, shipment)
  partyCards(doc, shipment)
  metaGrid(doc, shipment)
  pricingTable(doc, shipment)

  // Footer
  doc.fontSize(8).fillColor(GREY)
  doc.text(
    'CrossBordersDeliveries.com — leading logistics and distribution services. This document is generated electronically and is valid without signature.',
    M,
    doc.page.height - 64,
    { width: doc.page.width - M * 2, align: 'center', lineBreak: false },
  )
  doc.fontSize(7.5).fillColor('#9AA3B2')
  doc.text(`Page 1 of 1`, M, doc.page.height - 50, { width: doc.page.width - M * 2, align: 'center', lineBreak: false })
  doc.end()
  return doc
}

function drawLetterhead(doc, shipment) {
  // Header band
  doc.rect(0, 0, doc.page.width, 88).fill(NAVY)
  doc.rect(0, 88, doc.page.width, 4).fill(BRAND_RED)

  // Brand logo (white card behind it since the PNG has transparent background)
  if (fs.existsSync(LOGO_PATH)) {
    doc.save()
    doc.roundedRect(doc.page.width - 164, 14, 94, 58, 8).fill('#FFFFFF')
    try {
      doc.image(LOGO_PATH, doc.page.width - 156, 20, { fit: [78, 46], align: 'center', valign: 'center' })
    } catch {
      /* logo optional */
    }
    doc.restore()
  }

  // Logo mark (starburst-inspired)
  const cx = 60
  const cy = 44
  doc.circle(cx, cy, 5).fill(BRAND_RED)
  doc.moveTo(cx, cy - 20).lineTo(cx, cy - 11).lineWidth(2).strokeColor(BRAND_RED).stroke()
  doc.moveTo(cx, cy + 11).lineTo(cx, cy + 20).strokeColor('#FFFFFF').stroke()
  doc.moveTo(cx - 20, cy).lineTo(cx - 11, cy).strokeColor('#FFFFFF').stroke()
  doc.moveTo(cx + 11, cy).lineTo(cx + 20, cy).strokeColor(BRAND_RED).stroke()

  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16)
  doc.text('CrossBordersDeliveries', 92, 26)
  doc.font('Helvetica').fontSize(8).fillColor('#B9C2D8')
  doc.text('GLOBAL LOGISTICS & COURIER SERVICES  •  AIR  •  OCEAN  •  ROAD', 92, 47)
  doc.text('crossbordersdeliveries.com  •  crossborder.delivery@outlook.com  •  +90 806 055 2123', 92, 60)

  // QR code top-right linking to public tracking
  try {
    const qr = QRCode.toBuffer(TRACKING_URL(shipment.tracking_number), { width: 220, margin: 0, color: { dark: NAVY, light: '#FFFFFF' } })
    doc.image(qr, doc.page.width - M - 40, 96, { width: 40, height: 40 })
    doc.fontSize(6).fillColor(GREY).text('SCAN TO TRACK', doc.page.width - M - 52, 138, { width: 64, align: 'center' })
  } catch {
    /* QR optional */
  }
}

// Compact, aligned title row: left = document type, right = tracking + ETA
function titleBlock(doc, shipment) {
  const y = 118
  doc.font('Helvetica-Bold').fontSize(14).fillColor(NAVY)
  doc.text('COMMERCIAL INVOICE / WAYBILL', M, y, { characterSpacing: 0.5, lineBreak: false })

  doc.font('Helvetica').fontSize(8.5).fillColor(GREY)
  doc.text('Tracking Number:', doc.page.width - M - 190, y, { width: 190, align: 'right', lineBreak: false })
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(BRAND_RED)
  doc.text(shipment.tracking_number, doc.page.width - M - 190, y + 13, { width: 190, align: 'right', lineBreak: false })

  const ruleY = y + 34
  doc.moveTo(M, ruleY).lineTo(doc.page.width - M, ruleY).lineWidth(1).strokeColor(LINE).stroke()
  doc.y = ruleY + 12
}

// Sender / recipient as two equal bordered cards
function partyCards(doc, shipment) {
  const y = doc.y
  const h = 108
  const w = (PW() - 14) / 2
  partyCard(doc, 'SENDER', y, w, [
    shipment.sender_name,
    shipment.sender_address,
    shipment.sender_phone,
    shipment.sender_email,
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
  const h = 108
  doc.roundedRect(x, y, w, h, 6).fill(CARD_BG)
  doc.roundedRect(x, y, w, h, 6).lineWidth(1).strokeColor(LINE).stroke()

  const pad = 12
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(BRAND_RED)
  doc.text(heading, x + pad, y + pad, { characterSpacing: 1.2, lineBreak: false })

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(NAVY)
  doc.text(String(lines[0] || ''), x + pad, y + pad + 14, { width: w - pad * 2, height: 16, ellipsis: true })

  doc.font('Helvetica').fontSize(8.5).fillColor(GREY)
  const body = lines.slice(1).filter(Boolean)
  doc.text(body.join('\n'), x + pad, y + pad + 34, { width: w - pad * 2, height: h - pad - 40, ellipsis: true, lineGap: 1.5 })
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

  doc.font('Helvetica').fontSize(6.5).fillColor(GREY)
  doc.text('SHIPMENT DETAILS', M, startY, { characterSpacing: 1.2, lineBreak: false })
  const gridY = startY + 14

  cells.forEach(([label, value], i) => {
    const x = M + (i % cols) * cw
    const y = gridY + Math.floor(i / cols) * ch
    doc.rect(x, y, cw, ch).lineWidth(1).strokeColor(LINE).stroke()
    // fill after stroke would hide borders — draw bg first per cell instead
  })

  cells.forEach(([label, value], i) => {
    const x = M + (i % cols) * cw
    const y = gridY + Math.floor(i / cols) * ch
    doc.font('Helvetica').fontSize(6.5).fillColor(GREY)
    doc.text(label, x + 8, y + 7, { characterSpacing: 0.8, lineBreak: false })
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
    doc.text(String(value), x + 8, y + 19, { width: cw - 16, height: 18, ellipsis: true })
  })

  // Estimated delivery strip under the grid
  const stripY = gridY + rows * ch
  doc.rect(M, stripY, PW(), 26).fillColor(CARD_BG).fill()
  doc.rect(M, stripY, PW(), 26).lineWidth(1).strokeColor(LINE).stroke()
  doc.font('Helvetica').fontSize(6.5).fillColor(GREY)
  doc.text('ESTIMATED DELIVERY', M + 8, stripY + 5, { characterSpacing: 0.8, lineBreak: false })
  doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
  doc.text(eta, M + 8, stripY + 15, { lineBreak: false })
  doc.font('Helvetica').fontSize(6.5).fillColor(GREY)
  doc.text('CURRENCY', M + 220, stripY + 5, { characterSpacing: 0.8, lineBreak: false })
  doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
  doc.text((shipment.currency || 'NGN').toUpperCase(), M + 220, stripY + 15, { lineBreak: false })

  doc.y = stripY + 26 + 16
}

function pricingTable(doc, shipment) {
  const x0 = M
  const width = PW()
  const cur = (shipment.currency || 'NGN').toUpperCase()
  doc.moveDown(0.5)

  // Header band
  doc.rect(x0, doc.y, width, 22).fill(NAVY)
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5)
  doc.text('DESCRIPTION', x0 + 12, doc.y + 7, { characterSpacing: 0.8, lineBreak: false })
  doc.text(`AMOUNT (${cur})`, x0 + width - 130, doc.y + 7, { width: 118, align: 'right', lineBreak: false })
  doc.y += 22

  const rows = [
    ['Base Freight Charges', shipment.base_freight],
    ['Fuel Surcharge', shipment.surcharge_fuel],
    ['Customs & Handling', shipment.surcharge_customs],
  ]
  rows.forEach(([label, amount], i) => {
    if (i % 2 === 0) doc.rect(x0, doc.y, width, 22).fill(ZEBRA)
    doc.rect(x0, doc.y, width, 22).lineWidth(1).strokeColor(LINE).stroke()
    doc.fillColor('#111827').font('Helvetica').fontSize(9.5)
    doc.text(label, x0 + 12, doc.y + 7, { lineBreak: false })
    doc.font('Helvetica-Bold')
    doc.text(money(amount, cur), x0 + width - 130, doc.y + 7, { width: 118, align: 'right', lineBreak: false })
    doc.y += 22
  })

  // Total row
  doc.rect(x0, doc.y, width, 26).fill('#EDEFF3')
  doc.rect(x0, doc.y, width, 26).lineWidth(1).strokeColor(LINE).stroke()
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10.5)
  doc.text('TOTAL COST', x0 + 12, doc.y + 8, { characterSpacing: 0.8, lineBreak: false })
  doc.text(money(shipment.total_cost || 0, cur), x0 + width - 130, doc.y + 8, { width: 118, align: 'right', lineBreak: false })
  doc.y += 26 + 12

  // Payment status banner
  const paid = shipment.payment_status === 'Paid'
  const bannerColor = paid ? '#0E7A3D' : shipment.payment_status === 'Pending' ? '#B7791F' : BRAND_RED
  const label = paid ? 'PAID' : shipment.payment_status === 'Pending' ? 'PAYMENT PENDING' : 'UNPAID'
  doc.rect(x0, doc.y, width, 28).fill(bannerColor)
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12)
  doc.text(label, x0, doc.y + 8, { width, align: 'center', lineBreak: false })
  doc.y += 28
}
