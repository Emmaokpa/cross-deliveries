import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api } from './api.js'
import { Badge, Progress, fmtMoney, fmtDate } from './components.jsx'
import CopyChip from './copy.jsx'

const STATUSES = ['Created', 'Shipped', 'In Transit', 'Held at Customs', 'Out for Delivery', 'Delivered', 'On Hold']

export default function Dashboard() {
  const { admin } = useOutletContext()
  const [shipments, setShipments] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api('/v1/shipments')
      .then((d) => setShipments(d.shipments))
      .catch((e) => setError(e.message))
  }, [])

  const stats = {
    total: shipments.length,
    active: shipments.filter((s) => !['Delivered'].includes(s.current_status)).length,
    delivered: shipments.filter((s) => s.current_status === 'Delivered').length,
    revenue: shipments.reduce((sum, s) => sum + (s.payment_status === 'Paid' ? Number(s.total_cost || 0) : 0), 0),
  }

  const byStatus = STATUSES.map((s) => ({ status: s, count: shipments.filter((x) => x.current_status === s).length }))

  return (
    <>
      <div className="page-head">
        <div>
          <h3>Welcome back, {admin.name.split(' ')[0]} 👋</h3>
          <div className="sub">Here's what's moving across borders today.</div>
        </div>
        <Link to="/admin/shipments?new=1" className="btn-a btn-primary-a">＋ New Shipment</Link>
      </div>

      {error && <div className="alert-a alert-error">{error}</div>}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="ic navy">📦</div>
          <div><div className="lbl">Total Shipments</div><div className="val">{stats.total}</div></div>
        </div>
        <div className="stat-card">
          <div className="ic red">🚚</div>
          <div><div className="lbl">Active In Network</div><div className="val">{stats.active}</div></div>
        </div>
        <div className="stat-card">
          <div className="ic green">✅</div>
          <div><div className="lbl">Delivered</div><div className="val">{stats.delivered}</div></div>
        </div>
        <div className="stat-card">
          <div className="ic amber">💳</div>
          <div><div className="lbl">Collected Revenue</div><div className="val">{fmtMoney(stats.revenue)}</div></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="a-card a-card-pad">
          <h3 style={{ marginTop: 0, color: 'var(--a-navy)' }}>Shipments by Status</h3>
          <div className="kv-list">
            {byStatus.map(({ status, count }) => (
              <div className="kv" key={status}>
                <span className="k"><Badge value={status} /></span>
                <span className="v">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="a-card">
          <div className="a-card-pad" style={{ paddingBottom: 8 }}>
            <h3 style={{ margin: 0, color: 'var(--a-navy)' }}>Recent Shipments</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table stack-mobile">
              <thead>
                <tr><th>Tracking</th><th>Recipient</th><th>Route</th><th>Status</th><th>Progress</th></tr>
              </thead>
              <tbody>
                {shipments.slice(0, 6).map((s) => (
                  <tr key={s.id}>
                    <td data-label="Tracking"><Link className="mono" to={`/admin/shipments/${s.id}`}><CopyChip value={s.tracking_number} /></Link></td>
                    <td data-label="Recipient">{s.recipient_name}</td>
                    <td data-label="Route" style={{ fontSize: 12.5 }}>{s.origin_city || '—'} → {s.destination_city || '—'}</td>
                    <td data-label="Status"><Badge value={s.current_status} /></td>
                    <td data-label="Progress"><Progress value={s.progress_percentage} /></td>
                  </tr>
                ))}
                {!shipments.length && (
                  <tr><td colSpan={5}><div className="empty-state">No shipments yet — create your first consignment.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
