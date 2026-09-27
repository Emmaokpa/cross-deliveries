import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export default function TrackForm() {
  const [searchParams] = useSearchParams()
  const [number, setNumber] = useState(searchParams.get('tracking') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [searched, setSearched] = useState(false)

  const lookup = async (value) => {
    const target = String(value ?? number).trim()
    if (!target) return
    setLoading(true)
    setError('')
    setSearched(true)
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
    <div className="mx-auto w-full max-w-3xl rounded-md bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.14)] sm:p-6 md:p-8">
      <form onSubmit={handleSubmit} className="track-form">
        <h4 className="text-center font-body text-h4 font-normal">
          Enter the Consignment No. <span className="font-bold text-primary">*</span>
        </h4>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Enter Tracking Number..."
            autoComplete="off"
            required
            className="min-w-0 flex-1 rounded-sm border border-neutral-300 bg-white px-5 py-3.5 text-base shadow-inner placeholder:text-neutral-400 focus:outline focus:outline-2 focus:outline-primary max-sm:border-r"
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

      {result && (
        <div className="mt-5 border-t-2 border-primary pt-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-body text-h4 font-normal">{result.tracking_number}</h4>
            <span className="rounded-full bg-primary px-3 py-0.5 text-sm font-semibold text-white">
              {result.current_status}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5e9f0]">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${result.progress_percentage}%` }}
            />
          </div>
          <p className="mt-2">
            <strong className="text-black">Route:</strong> {result.origin_city || '—'} →{' '}
            {result.destination_city || '—'} • <strong className="text-black">Service:</strong>{' '}
            {result.cargo_type} freight
          </p>
          {result.checkpoints?.length > 0 && (
            <>
              <h4 className="mt-4 font-body text-h4 font-normal">Shipment Journey</h4>
              <ul className="relative mt-2.5 list-none space-y-4 pl-6 before:absolute before:bottom-1.5 before:left-[7px] before:top-1.5 before:w-0.5 before:bg-[#e5e9f0]">
                {result.checkpoints.map((cp, i) => (
                  <li
                    key={`${cp.timestamp}-${i}`}
                    className={`relative before:absolute before:left-[-22px] before:top-1 before:size-2.5 before:rounded-full before:border-[3px] before:border-primary before:bg-white ${
                      i === 0 ? 'before:bg-primary' : ''
                    }`}
                  >
                    <div className="font-heading font-semibold text-black">
                      {cp.location}{' '}
                      <span className="ml-1.5 inline-block rounded-full bg-[#fdeaec] px-2 py-px align-middle text-xs font-semibold text-primary">
                        {cp.status_tag}
                      </span>
                    </div>
                    <div className="text-[0.82rem] text-muted">{new Date(cp.timestamp).toLocaleString()}</div>
                    {cp.admin_notes && <div className="mt-0.5 text-sm text-muted">{cp.admin_notes}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
