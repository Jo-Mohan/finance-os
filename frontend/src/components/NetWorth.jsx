import { useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

function fmt(n) {
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1000) + 'k'
  return '$' + Math.round(n)
}

const SEED_ASSETS = [
  { id: 1, name: 'Checking / savings', balance: 18000, color: '#1D9E75' },
  { id: 2, name: '401(k)', balance: 12000, color: '#378ADD' },
  { id: 3, name: 'Brokerage', balance: 8500, color: '#7F77DD' },
  { id: 4, name: 'Other', balance: 2000, color: '#888780' },
]

const SEED_LIABILITIES = [
  { id: 5, name: 'Student loans', balance: 24000, color: '#D85A30' },
  { id: 6, name: 'Credit card', balance: 1200, color: '#E24B4A' },
]

const NW_HISTORY = [10200, 11800, 12400, 13100, 14500, 15300]
const NW_LABELS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']

function AccountRow({ item, onUpdate, onDelete, maxVal }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.balance)

  function commit() {
    const val = parseFloat(draft)
    if (!isNaN(val) && val >= 0) onUpdate(item.id, val)
    setEditing(false)
  }

  return (
    <div className="nw-row">
      <span className="nw-label">{item.name}</span>
      <div className="nw-bar-bg">
        <div
          className="nw-bar-fill"
          style={{
            width: maxVal > 0 ? `${Math.round(item.balance / maxVal * 100)}%` : '0%',
            background: item.color,
          }}
        />
      </div>
      {editing ? (
        <input
          className="nw-input"
          type="number"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit() }}
          autoFocus
        />
      ) : (
        <span
          className="nw-val"
          style={{ color: item.color, cursor: 'pointer' }}
          onClick={() => { setDraft(item.balance); setEditing(true) }}
          title="Click to edit"
        >
          {fmt(item.balance)}
        </span>
      )}
      <button className="btn-icon" onClick={() => onDelete(item.id)}>×</button>
    </div>
  )
}

export default function NetWorth() {
  const [assets, setAssets] = useState(SEED_ASSETS)
  const [liabilities, setLiabilities] = useState(SEED_LIABILITIES)

  const ASSET_COLORS = ['#1D9E75', '#378ADD', '#7F77DD', '#888780', '#BA7517', '#5094D4']
  const LIAB_COLORS = ['#D85A30', '#E24B4A', '#c06040', '#9a4030']

  function updateBalance(list, setList, id, val) {
    setList(list.map(x => x.id === id ? { ...x, balance: val } : x))
  }

  function deleteItem(list, setList, id) {
    setList(list.filter(x => x.id !== id))
  }

  function addAsset() {
    const color = ASSET_COLORS[assets.length % ASSET_COLORS.length]
    setAssets(prev => [...prev, { id: Date.now(), name: 'New asset', balance: 0, color }])
  }

  function addLiability() {
    const color = LIAB_COLORS[liabilities.length % LIAB_COLORS.length]
    setLiabilities(prev => [...prev, { id: Date.now(), name: 'New liability', balance: 0, color }])
  }

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
  const totalLiab = liabilities.reduce((s, l) => s + l.balance, 0)
  const netWorth = totalAssets - totalLiab

  const prev = NW_HISTORY[NW_HISTORY.length - 2]
  const curr = NW_HISTORY[NW_HISTORY.length - 1]
  const velocity = curr - prev

  const chartData = {
    labels: NW_LABELS,
    datasets: [{
      data: NW_HISTORY,
      borderColor: '#1D9E75',
      backgroundColor: 'rgba(29,158,117,0.07)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      borderWidth: 2,
      label: 'Net worth',
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: ctx => fmt(ctx.raw) },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#666' } },
      y: {
        ticks: { callback: v => fmt(v), color: '#666' },
        grid: { color: 'rgba(128,128,128,0.08)' },
      },
    },
  }

  return (
    <div>
      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Net worth</div>
          <div className="metric-value" style={{
            color: netWorth >= 0 ? 'var(--color-text-primary)' : 'var(--color-text-danger)'
          }}>
            {fmt(netWorth)}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Total assets</div>
          <div className="metric-value">{fmt(totalAssets)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Total liabilities</div>
          <div className="metric-value">{fmt(totalLiab)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Velocity</div>
          <div className="metric-value" style={{
            color: velocity >= 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)'
          }}>
            {velocity >= 0 ? '+' : ''}{fmt(velocity)}
          </div>
          <div className="metric-sub">vs last month</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Assets</div>
        {assets.map(a => (
          <AccountRow
            key={a.id}
            item={a}
            onUpdate={(id, val) => updateBalance(assets, setAssets, id, val)}
            onDelete={(id) => deleteItem(assets, setAssets, id)}
            maxVal={totalAssets}
          />
        ))}
        <button className="btn-add" onClick={addAsset}>+ Add asset</button>
      </div>

      <div className="card">
        <div className="card-title">Liabilities</div>
        {liabilities.map(l => (
          <AccountRow
            key={l.id}
            item={l}
            onUpdate={(id, val) => updateBalance(liabilities, setLiabilities, id, val)}
            onDelete={(id) => deleteItem(liabilities, setLiabilities, id)}
            maxVal={totalLiab}
          />
        ))}
        <button className="btn-add" onClick={addLiability}>+ Add liability</button>
      </div>

      <div className="card">
        <div className="card-title">Net worth velocity</div>
        <div className="chart-wrap" style={{ height: 180 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  )
}
