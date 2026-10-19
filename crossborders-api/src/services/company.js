// ─────────────────────────────────────────────────────────────────
// HARDCODED SENDER / COMPANY IDENTITY
// Every system email and invoice is letterheaded and signed with these
// values. They are NOT editable from the admin UI or the API — the API
// overwrites any sender fields a client sends with these constants.
// ─────────────────────────────────────────────────────────────────
export const COMPANY = {
  legal_name: 'CROSS BORDERS DELIVERIES',
  brand_name: 'CrossBordersDeliveries',
  address: 'Kanlica Mall, Halilpeli Cesmesi Sok, No. 10/3 PK 34810 Beykoz / İstanbul Türkiye',
  fax: '+90 (0) 216 331 2525 / +90 (0) 216 331 25 35',
  reg_no: '07537120',
  email: 'crossborder.delivery@crossbordersdeliveries.site',
  website: 'crossbordersdeliveries.com',
  phone: '+90 806 055 2123',
  signatory: 'Mr. Atisen Baris',
  signatory_title: 'Dispatch Manager',
}

// Shape used to fill the shipment schema's sender_* fields on create/update.
export const HARDCODED_SENDER = {
  sender_name: COMPANY.legal_name,
  sender_email: COMPANY.email,
  sender_phone: COMPANY.phone,
  sender_address: COMPANY.address,
}
