import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const CATS = [
  { key: 'Rent',          label: 'Rent',          color: '#378ADD' },
  { key: 'Food',          label: 'Food',          color: '#1D9E75' },
  { key: 'Transport',     label: 'Transport',     color: '#BA7517' },
  { key: 'Entertainment', label: 'Entertainment', color: '#7F77DD' },
  { key: 'Other',         label: 'Other',         color: '#888780' },
]

function fmt(n) {
  if (n >= 1000) return '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return '$' + Math.round(n)
}

function lastNMonths(n) {
  const months = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

function monthLabel(ym) {
  const [y, m] = ym.split('-')
  return new Date(+y, +m - 1, 1).toLocaleString('default', { month: 'short' })
}

export default function SpendingCharts({ transactions, currentMonth }) {
  const expenses = transactions.filter(t => t.amount > 0 && t.category !== 'Income')
  const currentExpenses = expenses.filter(t => t.date.startsWith(currentMonth))

  if (currentExpenses.length === 0) return null

  // ── Doughnut: this month by category ────────────────────────────────
  const catTotals = Object.fromEntries(CATS.map(c => [c.key, 0]))
  currentExpenses.forEach(t => {
    const k = catTotals.hasOwnProperty(t.category) ? t.category : 'Other'
    catTotals[k] += t.amount
  })
  const totalSpent = Object.values(catTotals).reduce((s, v) => s + v, 0)
  const activeCats = CATS.filter(c => catTotals[c.key] > 0)

  const doughnutData = {
    labels: activeCats.map(c => c.label),
    datasets: [{
      data: activeCats.map(c => Math.round(catTotals[c.key])),
      backgroundColor: activeCats.map(c => c.color),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmt(ctx.raw)}` } },
    },
  }

  // ── Stacked bar: 6-month trend ───────────────────────────────────────
  const months = lastNMonths(6)
  const monthlyData = {
    labels: months.map(monthLabel),
    datasets: CATS.map(c => ({
      label: c.label,
      data: months.map(m =>
        Math.round(expenses
          .filter(t => t.date.startsWith(m) && t.category === c.key)
          .reduce((s, t) => s + t.amount, 0))
      ),
      backgroundColor: c.color,
      borderRadius: 2,
      borderSkipped: false,
    })),
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: '#666' } },
      y: {
        stacked: true,
        ticks: { callback: v => fmt(v), color: '#666' },
        grid: { color: 'rgba(128,128,128,0.08)' },
      },
    },
  }

  // ── Weekly bar: this month by 7-day bucket ───────────────────────────
  const weeklySpend = [0, 0, 0, 0, 0]
  currentExpenses.forEach(t => {
    const day = parseInt(t.date.slice(8, 10))
    const i = Math.min(Math.floor((day - 1) / 7), 4)
    weeklySpend[i] += t.amount
  })
  const lastWeekIdx = weeklySpend.reduce((acc, v, i) => v > 0 ? i : acc, 0)
  const weekCount = lastWeekIdx + 1
  const weeklyLabels = ['Days 1–7', 'Days 8–14', 'Days 15–21', 'Days 22–28', 'Days 29+']
    .slice(0, weekCount)

  const weeklyData = {
    labels: weeklyLabels,
    datasets: [{
      data: weeklySpend.slice(0, weekCount).map(v => Math.round(v)),
      backgroundColor: '#1D9E75',
      borderRadius: 4,
    }],
  }

  const weeklyOptions = {
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

  return (
    <>
      {/* Doughnut + legend */}
      <div className="card">
        <div className="card-title">This month — by category</div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ width: 160, height: 160, flexShrink: 0 }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
          <div style={{ flex: 1 }}>
            {activeCats.map(c => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flex: 1 }}>{c.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{fmt(catTotals[c.key])}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', minWidth: 30, textAlign: 'right' }}>
                  {Math.round(catTotals[c.key] / totalSpent * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6-month stacked bar */}
      <div className="card">
        <div className="card-title">6-month trend</div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 10, flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <span key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, display: 'inline-block' }} />
              {c.label}
            </span>
          ))}
        </div>
        <div className="chart-wrap" style={{ height: 200 }}>
          <Bar data={monthlyData} options={barOptions} />
        </div>
      </div>

      {/* Weekly bar */}
      <div className="card">
        <div className="card-title">This month, by week</div>
        <div className="chart-wrap" style={{ height: 150 }}>
          <Bar data={weeklyData} options={weeklyOptions} />
        </div>
      </div>
    </>
  )
}
