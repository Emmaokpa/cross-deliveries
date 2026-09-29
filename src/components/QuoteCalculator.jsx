import { useState } from 'react'

const ZONES = [
  { value: 'local', label: 'Within country (domestic)' },
  { value: 'west-africa', label: 'West Africa' },
  { value: 'africa', label: 'Rest of Africa' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia', label: 'Asia' },
  { value: 'middle-east', label: 'Middle East' },
  { value: 'americas', label: 'Americas' },
]

const CARGO = [
  { value: 'Air', label: 'Air — express' },
  { value: 'Road', label: 'Road — standard' },
  { value: 'Ocean', label: 'Ocean — economy' },
]

const naira = (n) =>
  `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function QuoteCalculator() {
  const [form, setForm] = useState({ zone: 'local', cargo_type: 'Road', weight: '', declared_value: '', insured: false })
  const [quote, setQuote] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setQuote(null)
    try {
      const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
      const res = await fetch(`${API_ORIGIN}/api/v1/quote`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          zone: form.zone,
          cargo_type: form.cargo_type,
          weight: form.weight,
          insurance: form.insured ? { declared_value: form.declared_value } : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not calculate quote')
      setQuote(data.quote)
    } catch (err) {
      setError(err instanceof TypeError ? 'Network error — could not reach the server.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-sm border border-neutral-300 bg-white px-4 py-3 text-[15px] focus:outline focus:outline-2 focus:outline-primary'

  return (
    <div className="rounded-md bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.14)] sm:p-6 md:p-8">
      <h4 className="font-body text-h4 font-normal">
        Instant Shipping Quote <span className="font-bold text-primary">*</span>
      </h4>
      <p className="mt-1 text-sm text-neutral-500">
        Estimate your freight cost in seconds — no account needed.
      </p>

      <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-[13px] font-semibold text-navy">Destination zone</span>
          <select value={form.zone} onChange={set('zone')} className={inputCls}>
            {ZONES.map((z) => (
              <option key={z.value} value={z.value}>{z.label}</option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-[13px] font-semibold text-navy">Service</span>
          <select value={form.cargo_type} onChange={set('cargo_type')} className={inputCls}>
            {CARGO.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[13px] font-semibold text-navy">Weight (kg)</span>
          <input
            type="number"
            min="0.5"
            step="0.5"
            required
            value={form.weight}
            onChange={set('weight')}
            placeholder="e.g. 24"
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mt-6 flex items-center gap-2 text-[14px] text-neutral-700 sm:mt-7">
            <input type="checkbox" checked={form.insured} onChange={set('insured')} className="size-4 accent-[#e30613]" />
            Insure my shipment
          </span>
        </label>

        {form.insured && (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[13px] font-semibold text-navy">Declared value (₦)</span>
            <input
              type="number"
              min="0"
              step="100"
              value={form.declared_value}
              onChange={set('declared_value')}
              placeholder="e.g. 250000"
              className={inputCls}
            />
          </label>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary sm:col-span-2"
        >
          {busy ? 'CALCULATING…' : 'GET MY QUOTE'}
        </button>
      </form>

      {error && (
        <div className="mt-4 border-t-2 border-primary pt-3 text-left">
          <p className="font-semibold text-primary-dark">{error}</p>
        </div>
      )}

      {quote && (
        <div className="mt-5 border-t-2 border-primary pt-4 text-left">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="font-body text-h4 font-semibold text-navy">Estimated Cost</h4>
            <span className="font-heading text-3xl font-bold text-primary">{naira(quote.total)}</span>
          </div>
          <table className="mt-3 w-full text-[13.5px]">
            <tbody>
              {[
                [quote.service_label + ' — ' + quote.zone_label, naira(quote.base_freight)],
                [`Weight (${quote.chargeable_weight} kg chargeable)`, 'included in freight'],
                ['Fuel surcharge', naira(quote.fuel_surcharge)],
                ['Customs & handling', naira(quote.customs_handling)],
                ...(quote.insurance ? [['Insurance', naira(quote.insurance)]] : []),
              ].map(([k, v], i) => (
                <tr key={i} className="border-b border-neutral-100 last:border-0">
                  <td className="py-1.5 text-neutral-600">{k}</td>
                  <td className="py-1.5 text-right font-semibold text-neutral-900">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 rounded-sm bg-[#f2f7f3] px-3 py-2 text-[13px] text-[#0E6B39]">
            Estimated transit: <strong>about {quote.estimated_days} {quote.estimated_days === 1 ? 'day' : 'days'}</strong>.
            Final price confirmed at booking — {new Date().getFullYear()} rates, excl. VAT where applicable.
          </p>
        </div>
      )}
    </div>
  )
}
