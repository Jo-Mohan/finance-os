import { useState } from 'react'

const SCHEDULES = {
  '4yr1cliff': [
    { yr: 1, pct: 25, cliff: true },
    { yr: 2, pct: 25 },
    { yr: 3, pct: 25 },
    { yr: 4, pct: 25 },
  ],
  '4yr': [
    { yr: 1, pct: 25 },
    { yr: 2, pct: 25 },
    { yr: 3, pct: 25 },
    { yr: 4, pct: 25 },
  ],
  '3yr': [
    { yr: 1, pct: 33.3 },
    { yr: 2, pct: 33.3 },
    { yr: 3, pct: 33.4 },
  ],
  backloaded: [
    { yr: 1, pct: 5 },
    { yr: 2, pct: 15 },
    { yr: 3, pct: 40 },
    { yr: 4, pct: 40 },
  ],
}

function fmt(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + Math.round(n / 1000) + 'k'
  return '$' + Math.round(n)
}

function fmtFull(n) {
  return '$' + Math.round(n).toLocaleString()
}

export default function RSU() {
  const [grant, setGrant] = useState(200000)
  const [schedule, setSchedule] = useState('4yr1cliff')
  const [startMonths, setStartMonths] = useState(0)

  const rows = SCHEDULES[schedule]
  let vested = 0, unvested = 0

  const tableRows = rows.map(r => {
    const amt = Math.round(grant * (r.pct / 100))
    const monthsToVest = r.yr * 12
    const alreadyVested = startMonths >= monthsToVest
    const monthsLeft = Math.max(0, monthsToVest - startMonths)

    if (alreadyVested) vested += amt
    else unvested += amt

    const status = alreadyVested
      ? <span style={{ color: 'var(--color-text-success)', fontSize: 12 }}>✓ Vested</span>
      : (
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
          {monthsLeft} mo away
          {r.cliff && <span className="cliff-badge">cliff</span>}
        </span>
      )

    return (
      <tr key={r.yr}>
        <td>Year {r.yr}</td>
        <td>{Math.round(r.pct)}%</td>
        <td>{fmtFull(amt)}</td>
        <td>{status}</td>
      </tr>
    )
  })

  return (
    <div>
      <div className="rsu-disclaimer">
        ⚠ RSU values below reflect your grant at <strong>current stock price only</strong>.
        Future vest values depend on stock performance, which this tool does not model.
        Treat these figures as a reference point, not a forecast.
      </div>

      <div className="card">
        <div className="card-title">Grant details</div>
        <div className="slider-row">
          <span className="slider-label">Total grant value</span>
          <input type="range" min="0" max="1000000" step="10000" value={grant}
            onChange={e => setGrant(+e.target.value)} />
          <span className="slider-val">{fmt(grant)}</span>
        </div>
        <div className="slider-row">
          <span className="slider-label">Vesting schedule</span>
          <select value={schedule} onChange={e => setSchedule(e.target.value)}>
            <option value="4yr1cliff">4-year / 1-year cliff (standard)</option>
            <option value="4yr">4-year monthly (no cliff)</option>
            <option value="3yr">3-year equal annual</option>
            <option value="backloaded">Backloaded (5/15/40/40)</option>
          </select>
          <span className="slider-val" style={{ visibility: 'hidden' }}>—</span>
        </div>
        <div className="slider-row">
          <span className="slider-label">Start date (months ago)</span>
          <input type="range" min="0" max="47" step="1" value={startMonths}
            onChange={e => setStartMonths(+e.target.value)} />
          <span className="slider-val">{startMonths} mo</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Vesting schedule — at current stock price</div>
        <table className="vest-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>% vests</th>
              <th>Value (current price)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>{tableRows}</tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-title">Summary</div>
        <div className="metric-grid">
          <div className="metric">
            <div className="metric-label">Total grant</div>
            <div className="metric-value">{fmt(grant)}</div>
            <div className="metric-sub">at current stock price</div>
          </div>
          <div className="metric">
            <div className="metric-label">Already vested</div>
            <div className="metric-value" style={{ color: 'var(--color-text-success)' }}>{fmt(vested)}</div>
            <div className="metric-sub">in your hands</div>
          </div>
          <div className="metric">
            <div className="metric-label">Still unvested</div>
            <div className="metric-value">{fmt(unvested)}</div>
            <div className="metric-sub">subject to stock price</div>
          </div>
          <div className="metric">
            <div className="metric-label">Future value</div>
            <div className="metric-value" style={{ color: 'var(--color-text-tertiary)' }}>Unknown</div>
            <div className="metric-sub">not modeled</div>
          </div>
        </div>
      </div>
    </div>
  )
}
