// Renders a sample shipment email + confirmation letter + invoice to files so
// you can preview them in a browser / PDF viewer without sending anything.
// Throwaway dev tool.
//
//   node scripts/preview-email.mjs
//
// Output: email-preview.html, confirmation-preview.html, invoice-preview.pdf
import { writeFileSync } from 'node:fs'
import { fillTemplate, renderConfirmationLetter } from '../crossborders-api/src/services/email.js'
import { buildInvoicePdf } from '../crossborders-api/src/services/pdf.js'

const days = (n) => new Date(Date.now() + n * 86400000)

const sample = {
  tracking_number: 'CBD-2026-10243',
  current_status: 'In Transit',
  progress_percentage: 68,
  currency: 'NGN',
  origin_city: 'Istanbul',
  destination_city: 'Lagos',
  estimated_delivery: days(4),
  payment_status: 'Paid',
  recipient_name: 'Chidi Okonkwo',
  recipient_email: 'chidi@example.com',
  recipient_phone: '+234 803 000 0000',
  recipient_address: '12 Adeola Odeku Street',
  recipient_city: 'Victoria Island',
  recipient_country: 'Nigeria',
  cargo_type: 'Air',
  package_weight: 24.5,
  package_dimensions: '120 x 80 x 60 cm',
  package_quantity: 2,
  package_description: 'Electronics & accessories',
  base_freight: 450000,
  surcharge_fuel: 32500,
  surcharge_customs: 78000,
  total_cost: 560500,
  checkpoints: [],
}

// ---- Email preview ----
writeFileSync('email-preview.html', fillTemplate(sample))
console.log('✓ email-preview.html written — open it in a browser')

// ---- Confirmation letter preview (hardcoded letterhead + current date) ----
writeFileSync('confirmation-preview.html', renderConfirmationLetter(sample))
console.log('✓ confirmation-preview.html written — open it in a browser')

// ---- Invoice preview (PDFKit streams, so collect chunks until 'end') ----
const invoiceDoc = await buildInvoicePdf(sample)
const chunks = []
await new Promise((resolve, reject) => {
  invoiceDoc.on('data', (c) => chunks.push(c))
  invoiceDoc.on('end', resolve)
  invoiceDoc.on('error', reject)
})
writeFileSync('invoice-preview.pdf', Buffer.concat(chunks))
console.log('✓ invoice-preview.pdf written — open it in a PDF viewer')
