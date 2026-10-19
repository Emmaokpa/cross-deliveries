// ─────────────────────────────────────────────────────────────────
// HARDCODED SENDER / COMPANY IDENTITY — admin UI mirror of
// crossborders-api/src/services/company.js.
// Shown read-only in forms; the API enforces these values on every
// shipment create/update, so emails and invoices always carry them.
// ─────────────────────────────────────────────────────────────────
export const COMPANY = {
  legal_name: 'CROSS BORDERS DELIVERIES',
  brand_name: 'CrossBordersDeliveries',
  address: 'Kanlica Mall, Halilpeli Cesmesi Sok, No. 10/3 PK 34810 Beykoz / İstanbul Türkiye',
  fax: '+90 (0) 216 331 2525 / +90 (0) 216 331 25 35',
  reg_no: '07537120',
  email: 'crossborder.delivery@crossbordersdeliveries.site',
  website: 'crossbordersdeliveries.site',
  phone: '+90 806 055 2123',
  signatory: 'Mr. Atisen Baris',
  signatory_title: 'Dispatch Manager',
}
