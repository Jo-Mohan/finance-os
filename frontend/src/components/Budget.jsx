import { useState } from 'react'

const CATS = [
  { key: 'rent', label: 'Rent', color: '#378ADD', min: 500, max: 5000, step: 100, def: 2200 },
  { key: 'food', label: 'Food', color: '#1D9E75', min: 100, max: 2000, step: 50, def: 600 },
  { key: 'transport', label: 'Transport', color: '#BA7517', min: 50, max: 1000, step: 50, def: 200 },
  { key: 'ent', label: 'Entertainment', color: '#7F77DD', min: 50, max: 1000, step: 50, def: 300 },
  { key: 'other', label: 'Other', color: '#888780', min: 50, max: 2000, step: 50, def: 400 },
]

export default function Budget({ baseSalary = 150000, bonusPct = 10 }) {
  const [spend, setSpend] = useState(() =>
    Object.fromEntries(CATS.map(c => [c.key, c.def]))
  )

  const total = Object.values(spend).reduce((s, v) => s + v, 0)
  const totalCash = baseSalary * (1 + bonusPct / 100)
  const monthlyNet = Math.round(totalCash * 0.68 / 12)
  const surplus = monthlyNet - total
  const savingsRate = monthlyNet > 0 ? Math.round(surplus / monthlyNet * 100) : 0

  return (
    <div>
      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Monthly take-home</div>
          <div className="metric-value">${monthlyNet.toLocaleString()}</div>
          <div className="metric-sub">~32% tax est.</div>
        </div>
        <div className="metric">
          <div className="metric-label">Monthly spend</div>
          <div className="metric-value">${total.toLocaleString()}</div>
          <div className="metric-sub">
            {monthlyNet > 0 ? Math.round(total / monthlyNet * 100) : 0}% of income
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Monthly surplus</div>
          <div className="metric-value" style={{
            color: surplus >= 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)'
          }}>
            {surplus >= 0 ? '+' : ''}${surplus.toLocaleString()}
          </div>
          <div className="metric-sub">{savingsRate}% saved</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Monthly spending</div>
        {CATS.map(c => (
          <div className="budget-row" key={c.key}>
            <span className="budget-cat">{c.label}</span>
            <div className="budget-bar-bg">
              <div
                className="budget-bar-fill"
                style={{
                  width: total > 0 ? `${Math.round(spend[c.key] / total * 100)}%` : '0%',
                  background: c.color,
                }}
              />
            </div>
            <span className="budget-amt">${spend[c.key].toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Adjust monthly budget</div>
        {CATS.map(c => (
          <div className="slider-row" key={c.key}>
            <span className="slider-label">{c.label}</span>
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={spend[c.key]}
              onChange={e => setSpend(prev => ({ ...prev, [c.key]: +e.target.value }))}
            />
            <span className="slider-val">${spend[c.key].toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
