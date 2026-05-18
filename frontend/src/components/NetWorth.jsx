import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { api } from '../api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const ASSET_COLORS = ['#1D9E75', '#378ADD', '#7F77DD', '#888780', '#BA7517', '#5094D4']
const LIAB_COLORS = ['#D85A30', '#E24B4A', '#c06040', '#9a4030']

const NW_HISTORY = [10200, 11800, 12400, 13100, 14500, 15300]
const NW_LABELS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']

function color(id, type) {
  const p = type === 'asset' ? ASSET_COLORS : LIAB_COLORS
  return p[id % p.length]
}

function fmt(n) {
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1000) + 'k'
  return '$' + Math.round(n)
}

function AccountRow({ item, onUpdate, onDelete, maxVal }) {
  const [editingField, setEditingField] = useState(null)
  const [draft, setDraft] = useState('')
  const c = color(item.id, item.type)

  function startEdit(field) {
    setDraft(field === 'name' ? item.name : String(item.balance))
    setEditingField(field)
  }

  function commit() {
    if (editingField === 'name') {
      const name = draft.trim() || item.name
      if (name !== item.name) onUpdate(item.id, { name })
    } else if (editingField === 'balance') {
      const balance = parseFloat(draft)
      if (!isNaN(balance) && balance >= 0) onUpdate(item.id, { balance })
    }
    setEditingField(null)
  }

  return (
    <div className="nw-row">
      {editingField === 'name' ? (
        <input
          className="nw-input"
          style={{ minWidth: 130, textAlign: 'left' }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
          autoFocus
        />
      ) : (
        <span
          className="nw-label"
          style={{ cursor: 'pointer' }}
          onClick={() => startEdit('name')}
          title="Click to rename"
        >
          {item.name}
        </span>
      )}
      <div className="nw-bar-bg">
        <div
          className="nw-bar-fill"
          style={{
            width: maxVal > 0 ? `${Math.round(item.balance / maxVal * 100)}%` : '0%',
            background: c,
          }}
        />
      </div>
      {editingField === 'balance' ? (
        <input
          className="nw-input"
          type="number"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
          autoFocus
        />
      ) : (
        <span
          className="nw-val"
          style={{ color: c, cursor: 'pointer' }}
          onClick={() => startEdit('balance')}
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
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.accounts.list()
      .then(setAccounts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function addAccount(type) {
    try {
      const created = await api.accounts.create({
        name: type === 'asset' ? 'New asset' : 'New liability',
        type,
        balance: 0,
      })
      setAccounts(prev => [...prev, created])
    } catch (e) { console.error(e) }
  }

  async function updateAccount(id, patch) {
    const item = accounts.find(a => a.id === id)
    if (!item) return
    try {
      const updated = await api.accounts.update(id, {
        name: item.name,
        type: item.type,
        institution: item.institution ?? null,
        balance: item.balance,
        ...patch,
      })
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
    } catch (e) { console.error(e) }
  }

  async function deleteAccount(id) {
    try {
      await api.accounts.remove(id)
      setAccounts(prev => prev.filter(a => a.id !== id))
    } catch (e) { console.error(e) }
  }

  const assets = accounts.filter(a => a.type === 'asset')
  const liabilities = accounts.filter(a => a.type === 'liability')
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
  const totalLiab = liabilities.reduce((s, l) => s + l.balance, 0)
  const netWorth = totalAssets - totalLiab

  const velocity = NW_HISTORY[NW_HISTORY.length - 1] - NW_HISTORY[NW_HISTORY.length - 2]

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
      tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#666' } },
      y: {
        ticks: { callback: v => fmt(v), color: '#666' },
        grid: { color: 'rgba(128,128,128,0.08)' },
      },
    },
  }

  if (loading) return (
    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, padding: '2rem 0' }}>
      Loading…
    </div>
  )

  return (
    <div>
      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Net worth</div>
          <div className="metric-value" style={{
            color: netWorth >= 0 ? 'var(--color-text-primary)' : 'var(--color-text-danger)'
          }}>
            {accounts.length === 0 ? '—' : fmt(netWorth)}
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
        {assets.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
            No assets yet — add one below.
          </div>
        )}
        {assets.map(a => (
          <AccountRow key={a.id} item={a}
            onUpdate={updateAccount} onDelete={deleteAccount} maxVal={totalAssets} />
        ))}
        <button className="btn-add" onClick={() => addAccount('asset')}>+ Add asset</button>
      </div>

      <div className="card">
        <div className="card-title">Liabilities</div>
        {liabilities.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
            No liabilities yet — add one below.
          </div>
        )}
        {liabilities.map(l => (
          <AccountRow key={l.id} item={l}
            onUpdate={updateAccount} onDelete={deleteAccount} maxVal={totalLiab} />
        ))}
        <button className="btn-add" onClick={() => addAccount('liability')}>+ Add liability</button>
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
