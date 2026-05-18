import { useState, useMemo, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const JOB_DEFAULTS = {
  job1: { base: 150000, bonus: 10, savings: 30, years: 20, side: 0 },
  job2: { base: 200000, bonus: 15, savings: 35, years: 20, side: 0 },
}

function randNormal() {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function runMC(annualSavings, years) {
  const N = 1000, mean = 0.07, std = 0.15
  const paths = []
  for (let i = 0; i < N; i++) {
    let nw = 0
    const path = [0]
    for (let y = 1; y <= years; y++) {
      nw = nw * (1 + mean + std * randNormal()) + annualSavings
      path.push(Math.max(0, nw))
    }
    paths.push(path)
  }
  const pct = (arr, p) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length * p / 100)]
  const result = { p5: [], p25: [], p50: [], p75: [], p95: [] }
  for (let y = 0; y <= years; y++) {
    const v = paths.map(p => p[y])
    result.p5.push(Math.round(pct(v, 5)))
    result.p25.push(Math.round(pct(v, 25)))
    result.p50.push(Math.round(pct(v, 50)))
    result.p75.push(Math.round(pct(v, 75)))
    result.p95.push(Math.round(pct(v, 95)))
  }
  return result
}

function fmt(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + Math.round(n / 1000) + 'k'
  return '$' + Math.round(n)
}

export default function Simulate({ onCompChange }) {
  const [scenarioKey, setScenarioKey] = useState('job1')
  const [job1Label, setJob1Label] = useState('Job 1')
  const [job2Label, setJob2Label] = useState('Job 2')
  const [base, setBase] = useState(150000)
  const [bonus, setBonus] = useState(10)
  const [savings, setSavings] = useState(30)
  const [years, setYears] = useState(20)
  const [side, setSide] = useState(0)
  const [shock, setShock] = useState(0)

  useEffect(() => {
    onCompChange?.({ base, bonus })
  }, [base, bonus])

  function selectScenario(key) {
    setScenarioKey(key)
    if (key === 'job1' || key === 'job2') {
      const d = JOB_DEFAULTS[key]
      setBase(d.base)
      setBonus(d.bonus)
      setSavings(d.savings)
      setYears(d.years)
      setSide(d.side)
    }
  }

  const bonusAmt = Math.round(base * (bonus / 100))
  const totalCash = base + bonusAmt
  const annualSavings = totalCash * (savings / 100) + side

  const mc = useMemo(() => runMC(annualSavings, years), [annualSavings, years])

  const labels = Array.from({ length: years + 1 }, (_, i) => i === 0 ? 'Now' : `Yr ${i}`)

  const chartData = {
    labels,
    datasets: [
      {
        data: mc.p5,
        fill: '+4',
        backgroundColor: 'rgba(159,225,203,0.18)',
        borderWidth: 0,
        pointRadius: 0,
        tension: 0.4,
      },
      {
        data: mc.p25,
        fill: '+2',
        backgroundColor: 'rgba(29,158,117,0.28)',
        borderWidth: 0,
        pointRadius: 0,
        tension: 0.4,
      },
      {
        data: mc.p50,
        fill: false,
        borderColor: '#085041',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        label: 'Median',
      },
      {
        data: mc.p75,
        fill: false,
        borderWidth: 0,
        pointRadius: 0,
      },
      {
        data: mc.p95,
        fill: false,
        borderWidth: 0,
        pointRadius: 0,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ctx.dataset.label ? `${ctx.dataset.label}: ${fmt(ctx.raw)}` : fmt(ctx.raw),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 8, color: '#666' },
      },
      y: {
        ticks: { callback: v => fmt(v), color: '#666' },
        grid: { color: 'rgba(128,128,128,0.08)' },
      },
    },
  }

  const shockOpp = shock > 0 ? Math.round(shock * Math.pow(1.07, years)) : 0
  const yrsLost = shock > 0 && annualSavings > 0
    ? Math.round((shock / annualSavings) * 10) / 10
    : 0

  const activeLabel =
    scenarioKey === 'job1' ? job1Label :
    scenarioKey === 'job2' ? job2Label :
    'Custom'

  return (
    <div>
      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Scenario</div>
          <div className="metric-value" style={{ fontSize: 15 }}>{activeLabel}</div>
          <div className="metric-sub">base + bonus only</div>
        </div>
        <div className="metric">
          <div className="metric-label">Median outcome</div>
          <div className="metric-value">{fmt(mc.p50[years])}</div>
          <div className="metric-sub">in {years} yrs</div>
        </div>
        <div className="metric">
          <div className="metric-label">Best case (95th)</div>
          <div className="metric-value">{fmt(mc.p95[years])}</div>
          <div className="metric-sub">5% chance to beat</div>
        </div>
        <div className="metric">
          <div className="metric-label">Annual savings</div>
          <div className="metric-value">{fmt(annualSavings)}</div>
          <div className="metric-sub">{fmt(Math.round(annualSavings / 12))}/mo</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Job scenarios</div>
        <div className="job-label-row">
          <span className="hint">Job 1</span>
          <input
            className="job-name-input"
            value={job1Label}
            onChange={e => setJob1Label(e.target.value)}
          />
          <span className="hint" style={{ marginLeft: 8 }}>Job 2</span>
          <input
            className="job-name-input"
            value={job2Label}
            onChange={e => setJob2Label(e.target.value)}
          />
        </div>
        <div className="scenario-toggle">
          {[['job1', job1Label], ['job2', job2Label], ['custom', 'Custom']].map(([k, lbl]) => (
            <button
              key={k}
              className={`scenario-btn${scenarioKey === k ? ' active' : ''}`}
              onClick={() => selectScenario(k)}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="card-title" style={{ marginTop: 4 }}>Compensation</div>
        <div className="slider-row">
          <span className="slider-label">Base salary</span>
          <input type="range" min="40000" max="500000" step="5000" value={base}
            onChange={e => { setScenarioKey('custom'); setBase(+e.target.value) }} />
          <span className="slider-val">{fmt(base)}</span>
        </div>
        <div className="slider-row">
          <span className="slider-label">Target bonus</span>
          <input type="range" min="0" max="100" step="1" value={bonus}
            onChange={e => { setScenarioKey('custom'); setBonus(+e.target.value) }} />
          <span className="slider-val">{bonus}%</span>
        </div>

        <div className="comp-row">
          <div className="comp-block">
            <div className="comp-block-label">Base</div>
            <div className="comp-block-val">{fmt(base)}</div>
            <div className="comp-block-sub">guaranteed</div>
          </div>
          <div className="comp-block">
            <div className="comp-block-label">Target bonus</div>
            <div className="comp-block-val">{fmt(bonusAmt)}</div>
            <div className="comp-block-sub">{bonus}% of base</div>
          </div>
          <div className="comp-block">
            <div className="comp-block-label">Total cash</div>
            <div className="comp-block-val">{fmt(totalCash)}</div>
            <div className="comp-block-sub">base + bonus</div>
          </div>
          <div className="comp-block" style={{ border: '0.5px dashed var(--color-border-primary)' }}>
            <div className="comp-block-label">RSUs</div>
            <div className="comp-block-val" style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>
              see RSU tab
            </div>
            <div className="comp-block-sub">not modeled</div>
          </div>
        </div>

        <div className="card-title" style={{ marginTop: 8 }}>Simulation inputs</div>
        <div className="slider-row">
          <span className="slider-label">Savings rate</span>
          <input type="range" min="5" max="80" step="1" value={savings}
            onChange={e => { setScenarioKey('custom'); setSavings(+e.target.value) }} />
          <span className="slider-val">{savings}%</span>
        </div>
        <div className="slider-row">
          <span className="slider-label">Time horizon</span>
          <input type="range" min="5" max="40" step="1" value={years}
            onChange={e => { setScenarioKey('custom'); setYears(+e.target.value) }} />
          <span className="slider-val">{years} yrs</span>
        </div>
        <div className="slider-row">
          <span className="slider-label">Side income / yr</span>
          <input type="range" min="0" max="200000" step="5000" value={side}
            onChange={e => { setScenarioKey('custom'); setSide(+e.target.value) }} />
          <span className="slider-val">{fmt(side)}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Monte Carlo — 1,000 simulations</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 10 }}>
          Based on base + bonus only. RSUs shown separately — see RSU tab.
        </div>
        <div className="band-legend">
          <span><span className="band-swatch" style={{ background: '#9FE1CB' }} />5th–95th percentile</span>
          <span><span className="band-swatch" style={{ background: '#1D9E75' }} />25th–75th percentile</span>
          <span><span className="band-swatch" style={{ background: '#085041' }} />Median</span>
        </div>
        <div className="chart-wrap">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Spending shock — what if?</div>
        <div className="slider-row">
          <span className="slider-label">One-time expense</span>
          <input type="range" min="0" max="300000" step="5000" value={shock}
            onChange={e => setShock(+e.target.value)} />
          <span className="slider-val">{fmt(shock)}</span>
        </div>
        <div className="shock-text">
          {shock > 0
            ? `A ${fmt(shock)} expense costs ~${fmt(shockOpp)} in compounded opportunity cost over ${years} years (≈${yrsLost} years of savings).`
            : 'Move the slider to see how a large purchase affects your trajectory.'}
        </div>
      </div>
    </div>
  )
}
