import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fmtDate, parseDate } from '../dates.js'

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// Public-facing carrier / shipper identity for the tracking page only.
// Kept separate from the admin + API sender constants on purpose: the
// tracking page is a public recipient-facing view, so Carrier is the
// carrier brand people recognise (e.g. DHL), not the sender legal name.
export const TRACKING_PAGE = {
  carrier: 'CrossBordersDeliveries',
}

// History date → ISO `YYYY-MM-DD` (spec: 2026-06-27)
function isoDate(value) {
  const d = parseDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// History time → 12-hour `hh:mm am/pm` (spec: 02:51 am)
function clockTime(value) {
  const d = parseDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  let h = d.getHours()
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`
}

// Centered section heading with the clean divider underneath (spec header rule)
function SectionTitle({ children }) {
  return (
    <div className="text-center">
      <h4 className="font-heading text-h4 font-bold text-navy">{children}</h4>
      <div className="mx-auto mt-2 h-px w-4/5 max-w-sm bg-[#E5E7EB]" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// TRACKING RESULT — two-section layout per the reference design:
//   1. "Shipment Information" — centered key/value grid (exact field order)
//   2. "Shipment History" — stacked cards, one row per history field
// The progress bar was removed from this view on purpose.
// ─────────────────────────────────────────────────────────────────
export function TrackingResult({ result }) {
  if (!result) return null

  // ── Section 1: Shipment Information (exact field order per spec) ──
  // Section 1 field order + wording matches the spec exactly:
  // Origin, Package, Status, Destination, Carrier, Type of Shipment,
  // Weight, Shipment Mode, Carrier Reference No., Product, Quantity, Product Status.
  const displayStatus = result.current_status && result.current_status !== '—'
    ? result.current_status
    : '—'

  const displayProduct = result.package_description && result.package_description !== '—'
    ? result.package_description
    : ''

  const infoFields = [
    ['Origin', result.origin_city && result.origin_city !== '—' ? result.origin_city : '—'],
    ['Package', displayProduct],
    ['Status', displayStatus],
    ['Destination', result.destination_city && result.destination_city !== '—' ? result.destination_city : '—'],
    ['Carrier', TRACKING_PAGE.carrier],
    ['Type of Shipment', result.cargo_type && result.cargo_type !== '—' ? `${result.cargo_type} Freight` : '—'],
    ['Weight', weightLabel(result)],
    ['Shipment Mode', result.cargo_type && result.cargo_type !== '—' ? `${result.cargo_type} Freight` : '—'],
    ['Carrier Reference No.', result.tracking_number && result.tracking_number !== '—' ? result.tracking_number : '—'],
    ['Product', displayProduct],
    ['Quantity', String(result.package_quantity ?? 1)],
    ['Product Status', displayStatus],
  ]

  function weightLabel(r) {
    const w = r.package_weight
    if (w === undefined || w === null || Number(w) <= 0) return '—'
    return `${w}kg`
  }

  // ── Section 2: Shipment History (field order + wording per spec) ──
  const historyEntries = (result.checkpoints || []).map((cp) => [
    ['Date', isoDate(cp.timestamp)],
    ['Time', clockTime(cp.timestamp)],
    ['Location', cp.location && cp.location !== '—' ? cp.location : '—'],
    ['Status', <span className="inline-block rounded-full bg-[#fdeaec] px-2 py-0.5 text-xs font-semibold text-primary">{cp.status_tag && cp.status_tag !== '—' ? cp.status_tag : '—'}</span>],
    ['Updated By', cp.updated_by && cp.updated_by !== '—' ? cp.updated_by : '—'],
    ['Remarks', cp.admin_notes && cp.admin_notes !== '—' ? cp.admin_notes : '—'],
  ])

  return (
    <div className="mt-5 border-t-2 border-primary pt-4 text-left">
      {/* Header — reference number + live status (progress bar removed) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-body text-h4 font-normal">{result.tracking_number}</h4>
        <span className="rounded-full bg-primary px-3 py-0.5 text-sm font-semibold text-white">
          {result.current_status}
        </span>
      </div>

      {result.current_status === 'Delivered' && (
        <div className="mt-4 rounded-sm border-2 border-[#0E7A3D] bg-[#E9F6EE] px-4 py-3 text-center">
          <p className="font-heading text-lg font-bold text-[#0E6B39]">✓ DELIVERED</p>
          {result.delivered_at && (
            <p className="text-[13px] text-[#2F6B4C]">
              {fmtDate(result.delivered_at)}
            </p>
          )}
          {result.pod?.receiver_name && (
            <p className="mt-1 text-[13px] text-[#2F6B4C]">
              Received by <strong>{result.pod.receiver_name}</strong>
            </p>
          )}
        </div>
      )}
      {result.estimated_delivery && result.current_status !== 'Delivered' && (
        <p className="mt-3 rounded-sm bg-[#f2f7f3] px-3 py-2 text-[13.5px] text-[#0E6B39]">
          Estimated delivery:{' '}
          <strong>{fmtDate(result.estimated_delivery)}</strong>
        </p>
      )}

      {/* ═══ SECTION 1: Shipment Information ═══
       * Centered heading + divider, then a centered key/value list where each
       * label sits stacked above its value (spec: "Labels stacked vertically
       * above their values"). 1-column on narrow screens, 2-col on wide so
       * the block stays compact without losing the vertical label/value stack.
       ═══ */}
      <section className="mt-7">
        <SectionTitle>Shipment Information</SectionTitle>
        <div className="mt-5 flex flex-col gap-5 text-center sm:flex-row sm:grid-cols-2 sm:justify-center sm:gap-x-10 sm:gap-y-5">
          {infoFields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[13px] font-bold text-navy">{label}:</dt>
              <dd className="mt-1 break-words text-[14px] font-normal text-neutral-700">
                {value ?? ""}
              </dd>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SECTION 2: Shipment History ═══
       * Left-aligned 2-column layout per spec: Label on the left, Value on
       * the right, one row per spec field, with horizontal dividers between
       * fields. Entire history entry is a white stacked card. The card grid
       * is responsive: 1 column on mobile, 2 on tablet, 3 on desktop,
       * 4 on wide desktop, 5 on very wide desktop.
       ═══ */}
      <section className="mt-8">
        <SectionTitle>Shipment History</SectionTitle>
        {historyEntries.length > 0 ? (
          <div className="mt-5 flex flex-col gap-5 text-center sm:flex-row sm:grid-cols-2 sm:justify-center lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {historyEntries.map((row) => (
              <div
                key={row.label}
                className="mb-4 overflow-hidden rounded-sm border border-[#E5E7EB] bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[#E5E7EB] bg-[#FAFBFC]">
                  <span className="text-[13px] font-bold text-navy">{row.label}:</span>
                  <span className="min-w-0 max-w-[60%] text-[14px] font-normal text-[#E5E7EB] truncate">
                    {row.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-sm bg-[#F8F9FB] px-4 py-3 text-center text-sm text-muted">
            No shipment updates recorded yet — check back soon.
          </p>
        )}
      </section>
    </div>
  )
}

export default function TrackForm() {
  const [searchParams] = useSearchParams()
  const [number, setNumber] = useState(searchParams.get('tracking') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const lookup = async (value) => {
    const target = String(value ?? number).trim()
    if (!target) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_ORIGIN}/api/v1/track/${encodeURIComponent(target)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Tracking lookup failed')
      setResult(data)
    } catch (err) {
      setResult(null)
      setError(
        err instanceof TypeError
          ? 'Network error — could not reach the server. Please try again.'
          : err.message,
      )
    } finally {
      setLoading(false)
    }
  }

  // Auto-search when arriving via ?tracking=CBD-...
  useEffect(() => {
    const t = searchParams.get('tracking')
    if (t) lookup(t)
  }, [searchParams])

  const handleSubmit = (e) => {
    e.preventDefault()
    lookup()
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-md border border-[#E5E7EB] bg-[#F3F4F6] p-5 shadow-[0_16px_40px_rgba(3,20,53,0.16)] sm:p-6 md:p-8">
      <form onSubmit={handleSubmit} className="track-form">
        <h4 className="text-center font-heading text-h4 font-bold text-navy">
          Enter the Consignment No. <span className="font-bold text-primary">*</span>
        </h4>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Enter Tracking Number"
            autoComplete="off"
            required
            className="min-w-0 flex-1 rounded-sm border border-[#E5E7EB] bg-white px-5 py-3.5 text-base text-black shadow-sm placeholder:text-neutral-400 focus:outline focus:outline-2 focus:outline-primary max-sm:border-r"
          />
          <button
            type="submit"
            className="btn btn-primary shrink-0 rounded-sm font-bold uppercase tracking-wide max-sm:w-full"
            disabled={loading}
          >
            {loading ? 'SEARCHING…' : 'TRACK RESULT'}
          </button>
        </div>
        <p className="mt-2.5 text-left text-sm text-neutral-400">Ex: 12345</p>
      </form>

      {error && (
        <div className="mt-5 border-t-2 border-primary pt-4 text-left">
          <p className="font-semibold text-primary-dark">{error}</p>
        </div>
      )}

      <TrackingResult result={result} />
    </div>
  )
}
