// Mirror of crossborders-api/src/services/currency.js — famous currencies only,
// including South Korean Won. Keep both lists in sync.
export const CURRENCIES = [
  { code: 'NGN', symbol: '₦', country: 'Nigeria' },
  { code: 'USD', symbol: '$', country: 'United States' },
  { code: 'EUR', symbol: '€', country: 'European Union' },
  { code: 'GBP', symbol: '£', country: 'United Kingdom' },
  { code: 'JPY', symbol: '¥', country: 'Japan' },
  { code: 'KRW', symbol: '₩', country: 'South Korea' },
  { code: 'CNY', symbol: '¥', country: 'China' },
  { code: 'INR', symbol: '₹', country: 'India' },
  { code: 'CAD', symbol: 'C$', country: 'Canada' },
  { code: 'AUD', symbol: 'A$', country: 'Australia' },
  { code: 'CHF', symbol: 'Fr', country: 'Switzerland' },
  { code: 'ZAR', symbol: 'R', country: 'South Africa' },
  { code: 'AED', symbol: 'د.إ', country: 'UAE' },
  { code: 'GHS', symbol: 'GH₵', country: 'Ghana' },
  { code: 'KES', symbol: 'KSh', country: 'Kenya' },
  { code: 'TRY', symbol: '₺', country: 'Türkiye' },
  { code: 'BRL', symbol: 'R$', country: 'Brazil' },
  { code: 'SAR', symbol: '﷼', country: 'Saudi Arabia' },
  { code: 'QAR', symbol: 'ر.ق', country: 'Qatar' },
  { code: 'EGP', symbol: 'E£', country: 'Egypt' },
]

const byCode = new Map(CURRENCIES.map((c) => [c.code, c]))

export function symbolFor(code) {
  return byCode.get(String(code || '').toUpperCase())?.symbol ?? '$'
}

// format(12500, 'NGN') → '₦12,500.00' (JPY/KRW use 0 decimals)
export function formatMoney(amount, code = 'NGN') {
  const c = byCode.get(String(code || '').toUpperCase())
  const zeroDecimals = c?.code === 'JPY' || c?.code === 'KRW'
  const num = Number(amount || 0)
  return `${c?.symbol ?? '$'}${num.toLocaleString('en-US', {
    minimumFractionDigits: zeroDecimals ? 0 : 2,
    maximumFractionDigits: zeroDecimals ? 0 : 2,
  })}`
}
