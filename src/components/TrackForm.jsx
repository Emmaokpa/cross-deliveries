import { useState } from 'react'

export default function TrackForm() {
  const [number, setNumber] = useState('')
  const [result, setResult] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!number.trim()) return
    setResult({
      number: number.trim(),
      status: 'In Transit',
      message: `Shipment ${number.trim()} has left the origin facility and is on its way to the destination hub.`,
    })
  }

  return (
    <div className="track-form-wrap">
      <form onSubmit={handleSubmit} className="track-form">
        <h4>Enter the Consignment No.</h4>
        <div className="track-form-row">
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Enter Tracking Number"
            autoComplete="off"
            required
          />
          <button type="submit" className="btn btn-primary">
            Track Result
          </button>
        </div>
        <p className="track-hint">Ex: 12345</p>
      </form>

      {result && (
        <div className="track-result">
          <h4>Tracking Result for: {result.number}</h4>
          <p>
            <strong>Status:</strong> {result.status}
          </p>
          <p>{result.message}</p>
        </div>
      )}
    </div>
  )
}
