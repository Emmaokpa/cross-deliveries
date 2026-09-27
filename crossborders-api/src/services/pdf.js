import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import fs from 'node:fs'
import { TRACKING_URL, LOGO_PATH } from './shipment-utils.js'

const BRAND_RED = '#E30613'
const NAVY = '#031435'
const GREY = '#6B7280'

export function buildInvoicePdf(shipment) {
  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  drawLetterhead(doc, shipment)

  doc.moveDown(1.2)
  titleBlock(doc, shipment)

  // Parties
  const yParties = doc.y + 8
  party(doc, 'SENDER', [
    shipment.sender_name,
    shipment.sender_address,
    shipment.sender_phone,
    shipment.sender_email,
  ], 48, yParties)
  party(doc, 'RECIPIENT', [
    shipment.recipient_name,
    shipment.recipient_address,
    `${shipment.recipient_city}${shipment.recipient_city && shipment.recipient_country ? ', ' : ''}${shipment.recipient_country}`,
    shipment.recipient_phone,
    shipment.recipient_email,
  ], 315, yParties)
  doc.y = yParties + 118

  // Shipment meta grid
  metaGrid(doc, shipment)

  // Itemized pricing
  pricingTable(doc, shipment)

  // Footer
  doc.fontSize(8).fillColor(GREY)
  doc.text(
    'CrossBordersDeliveries.com — leading logistics and distribution services. This document is generated electronically and is valid without signature.',
    48,
    doc.page.height - 70,
    { width: doc.page.width - 96, align: 'center', lineBreak: false },
  )
  doc.end()
  return doc
}

function drawLetterhead(doc, shipment) {
  // Header band
  doc.rect(0, 0, doc.page.width, 92).fill(NAVY)
  doc.rect(0, 92, doc.page.width, 4).fill(BRAND_RED)

  // Brand logo (white card behind it since the PNG has transparent background)
  if (fs.existsSync(LOGO_PATH)) {
    doc.save()
    doc.roundedRect(doc.page.width - 168, 16, 96, 60, 8).fill('#FFFFFF')
    try {
      doc.image(LOGO_PATH, doc.page.width - 160, 22, { fit: [80, 48], align: 'center', valign: 'center' })
    } catch {
      /* logo optional */
    }
    doc.restore()
  }

  // Logo mark (starburst-inspired)
  const cx = 62
  const cy = 46
  doc.circle(cx, cy, 5).fill(BRAND_RED)
  doc.moveTo(cx, cy - 22).lineTo(cx, cy - 12).lineWidth(2.2).strokeColor(BRAND_RED).stroke()
  doc.moveTo(cx, cy + 12).lineTo(cx, cy + 22).strokeColor('#FFFFFF').stroke()
  doc.moveTo(cx - 22, cy).lineTo(cx - 12, cy).strokeColor('#FFFFFF').stroke()
  doc.moveTo(cx + 12, cy).lineTo(cx + 22, cy).strokeColor(BRAND_RED).stroke()

  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(17)
  doc.text('CrossBordersDeliveries', 96, 30)
  doc.font('Helvetica').fontSize(8.5).fillColor('#B9C2D8')
  doc.text('GLOBAL LOGISTICS & COURIER SERVICES  •  AIR  •  OCEAN  •  ROAD', 96, 52)
  doc.text('crossbordersdeliveries.com  •  crossborder.delivery@outlook.com  •  +90 806 055 2123', 96, 66)

  // QR code top-right linking to public tracking
  try {
    const qr = QRCode.toBuffer(TRACKING_URL(shipment.tracking_number), { width: 220, margin: 0, color: { dark: NAVY, light: '#FFFFFF' } })
    doc.image(qr, doc.page.width - 128, 92, { width: 48, height: 48 })
    doc.fontSize(6.5).fillColor(GREY).text('SCAN TO TRACK', doc.page.width - 128, 142, { width: 48, align: 'center' })
  } catch {
    /* QR optional */
  }
}

function titleBlock(doc, shipment) {
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(20)
  doc.text('COMMERCIAL INVOICE / WAYBILL', 48, doc.y)
  doc.font('Helvetica').fontSize(10).fillColor(GREY)
  doc.text(`Tracking Number: `, 48, doc.y + 4, { continued: true })
  doc.fillColor(BRAND_RED).font('Helvetica-Bold').text(shipment.tracking_number)
  doc.moveTo(48, doc.y + 6).lineTo(doc.page.width - 48, doc.y + 6).lineWidth(1).strokeColor('#E5E7EB').stroke()
  doc.moveDown(0.5)
}

function party(doc, heading, lines, x, y) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND_RED)
  doc.text(heading, x, y, { characterSpacing: 1 })
  doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY)
  doc.text(lines[0] || '', x, y + 14)
  doc.font('Helvetica').fontSize(9.5).fillColor(GREY)
  doc.text(lines.slice(1).filter(Boolean).join('\n'), x, y + 30, { width: 230 })
}

function metaGrid(doc, shipment) {
  const items = [
    ['Cargo Type', shipment.cargo_type],
    ['Origin', shipment.origin_city || '—'],
    ['Destination', shipment.destination_city || '—'],
    ['Weight', `${shipment.package_weight || 0} kg`],
    ['Dimensions', shipment.package_dimensions || '—'],
    ['Quantity', String(shipment.package_quantity || 1)],
    ['Payment Status', shipment.payment_status],
    ['Current Status', shipment.current_status],
  ]
  const colW = (doc.page.width - 96) / 4
  let row = 0
  items.forEach(([label, value], i) => {
    const x = 48 + (i % 4) * colW
    const y = doc.y + (i % 4 === 0 && i > 0 ? 34 : 0)
    if (i % 4 === 0 && i > 0) row++
    doc.font('Helvetica').fontSize(7.5).fillColor(GREY)
    doc.text(String(label).toUpperCase(), x, y, { characterSpacing: 0.5 })
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(NAVY)
    doc.text(String(value), x, y + 12, { width: colW - 14 })
  })
  doc.y = doc.y + 76
}

function pricingTable(doc, shipment) {
  const x0 = 48
  const width = doc.page.width - 96
  doc.moveDown(1)
  doc.rect(x0, doc.y, width, 22).fill(NAVY)
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
  doc.text('DESCRIPTION', x0 + 12, doc.y + 7)
  doc.text('AMOUNT (USD)', x0 + width - 110, doc.y + 7, { width: 98, align: 'right' })
  doc.y += 22

  const rows = [
    ['Base Freight Charges', shipment.base_freight],
    ['Fuel Surcharge', shipment.surcharge_fuel],
    ['Customs & Handling', shipment.surcharge_customs],
  ]
  doc.font('Helvetica').fontSize(10)
  rows.forEach(([label, amount], i) => {
    if (i % 2 === 0) doc.rect(x0, doc.y, width, 20).fill('#F6F7F9')
    doc.fillColor('#111827').text(label, x0 + 12, doc.y + 6)
    doc.text(`$${Number(amount || 0).toFixed(2)}`, x0 + width - 110, doc.y + 6, { width: 98, align: 'right' })
    doc.y += 20
  })

  doc.rect(x0, doc.y, width, 24).fill('#EDEFF3')
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10.5)
  doc.text('TOTAL COST', x0 + 12, doc.y + 7)
  doc.text(`$${Number(shipment.total_cost || 0).toFixed(2)}`, x0 + width - 110, doc.y + 7, { width: 98, align: 'right' })
  doc.y += 30

  // Payment status banner
  const paid = shipment.payment_status === 'Paid'
  const bannerColor = paid ? '#0E7A3D' : shipment.payment_status === 'Pending' ? '#B7791F' : BRAND_RED
  const label = paid ? 'PAID' : shipment.payment_status === 'Pending' ? 'PAYMENT PENDING' : 'UNPAID'
  doc.rect(x0, doc.y, width, 30).fill(bannerColor)
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(13)
  doc.text(label, x0, doc.y + 8, { width, align: 'center' })
}
