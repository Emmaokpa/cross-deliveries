import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

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
      const res = await fetch(`/api/v1/track/${encodeURIComponent(target)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Tracking lookup failed')
      setResult(data)
    } catch (err) {
      setResult(null)
      setError(err.message)
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
    <div className="track-form-wrap">
      <form onSubmit={handleSubmit} className="track-form">
        <h4>
          Enter the Consignment No. <span className="required-star">*</span>
        </h4>
        <div className="track-form-row">
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Enter Tracking Number..."
            autoComplete="off"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'SEARCHING…' : 'TRACK RESULT'}
          </button>
        </div>
        <p className="track-hint">Ex: 12345</p>
      </form>

      {error && (
        <div className="track-result">
          <p style={{ color: '#b80510', fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {result && (
        <div className="track-result">
          <div className="track-result-head">
            <h4>{result.tracking_number}</h4>
            <span className="track-status-chip">{result.current_status}</span>
          </div>
          <div className="track-progress">
            <div className="track-progress-fill" style={{ width: `${result.progress_percentage}%` }} />
          </div>
          <p style={{ marginTop: 8 }}>
            <strong>Route:</strong> {result.origin_city || '—'} → {result.destination_city || '—'} &nbsp;•&nbsp;
            <strong>Service:</strong> {result.cargo_type} freight
          </p>
          {result.checkpoints?.length > 0 && (
            <>
              <h4 style={{ marginTop: 18 }}>Shipment Journey</h4>
              <ul className="track-timeline">
                {result.checkpoints.map((cp, i) => (
                  <li key={`${cp.timestamp}-${i}`} className={i === 0 ? 'latest' : ''}>
                    <div className="tt-loc">
                      {cp.location} <span className="tt-tag">{cp.status_tag}</span>
                    </div>
                    <div className="tt-time">{new Date(cp.timestamp).toLocaleString()}</div>
                    {cp.admin_notes && <div className="tt-notes">{cp.admin_notes}</div>}
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
