import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const CATS = [
  { key: 'Rent',          label: 'Rent',          color: '#378ADD', def: 2200 },
  { key: 'Food',          label: 'Food',          color: '#1D9E75', def: 600  },
  { key: 'Transport',     label: 'Transport',     color: '#BA7517', def: 200  },
  { key: 'Entertainment', label: 'Entertainment', color: '#7F77DD', def: 300  },
  { key: 'Other',         label: 'Other',         color: '#888780', def: 400  },
]

const SLIDER_CFG = {
  Rent:          { min: 500,  max: 6000, step: 100 },
  Food:          { min: 100,  max: 2000, step: 50  },
  Transport:     { min: 50,   max: 1500, step: 50  },
  Entertainment: { min: 50,   max: 1500, step: 50  },
  Other:         { min: 50,   max: 3000, step: 50  },
}

const CAT_BADGE = {
  Rent: 'blue', Food: 'green', Transport: 'amber',
  Entertainment: 'blue', Other: '', Income: 'green',
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function computeActuals(transactions) {
  const totals = Object.fromEntries(CATS.map(c => [c.key, 0]))
  transactions
    .filter(t => t.amount > 0)
    .forEach(t => {
      const k = totals.hasOwnProperty(t.category) ? t.category : 'Other'
      totals[k] += t.amount
    })
  return totals
}

export default function Budget({ baseSalary = 150000, bonusPct = 10 }) {
  const [limits, setLimits] = useState(() =>
    Object.fromEntries(CATS.map(c => [c.key, c.def]))
  )
  const [transactions, setTransactions] = useState([])
  const [loadingTxns, setLoadingTxns] = useState(true)
  const [showTxns, setShowTxns] = useState(false)
  const [showLimits, setShowLimits] = useState(false)
  const [accountType, setAccountType] = useState('credit_card')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const loadTransactions = useCallback(() => {
    setLoadingTxns(true)
    api.transactions.list(currentMonth())
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoadingTxns(false))
  }, [])

  useEffect(() => {
    api.budgets.list()
      .then(rows => {
        if (rows.length > 0) {
          const loaded = Object.fromEntries(rows.map(r => [r.category, r.monthly_limit]))
          setLimits(prev => ({ ...prev, ...loaded }))
        }
      })
      .catch(console.error)

    loadTransactions()
  }, [loadTransactions])

  async function saveLimits() {
    try {
      await api.budgets.upsert(
        Object.entries(limits).map(([category, monthly_limit]) => ({ category, monthly_limit }))
      )
    } catch (e) { console.error(e) }
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    const form = new FormData()
    form.append('file', file)
    form.append('account_type', accountType)
    try {
      const res = await fetch('/api/transactions/import', { method: 'POST', body: form })
      const data = await res.json()
      setImportResult(data)
      loadTransactions()
    } catch {
      setImportResult({ error: true })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  async function deleteTransaction(id) {
    try {
      await api.transactions.remove(id)
      setTransactions(prev => prev.filter(t => t.id !== id))
    } catch (e) { console.error(e) }
  }

  const actuals = computeActuals(transactions)
  const hasTransactions = transactions.length > 0
  const totalSpent = Object.values(actuals).reduce((s, v) => s + v, 0)
  const totalLimit = Object.values(limits).reduce((s, v) => s + v, 0)
  const totalCash = baseSalary * (1 + bonusPct / 100)
  const monthlyNet = Math.round(totalCash * 0.68 / 12)
  const surplus = monthlyNet - totalSpent

  return (
    <div>
      {/* Metrics */}
      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Monthly take-home</div>
          <div className="metric-value">${monthlyNet.toLocaleString()}</div>
          <div className="metric-sub">~32% tax est.</div>
        </div>
        <div className="metric">
          <div className="metric-label">
            {hasTransactions ? `Spent (${currentMonth()})` : 'Budget total'}
          </div>
          <div className="metric-value">
            ${(hasTransactions ? totalSpent : totalLimit).toLocaleString()}
          </div>
          <div className="metric-sub">
            {hasTransactions
              ? `${Math.round(totalSpent / monthlyNet * 100)}% of income`
              : 'across all categories'}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Monthly surplus</div>
          <div className="metric-value" style={{
            color: surplus >= 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)'
          }}>
            {surplus >= 0 ? '+' : ''}${surplus.toLocaleString()}
          </div>
          <div className="metric-sub">
            {hasTransactions ? 'take-home minus spent' : 'projected'}
          </div>
        </div>
        {hasTransactions && (
          <div className="metric">
            <div className="metric-label">Budget remaining</div>
            <div className="metric-value" style={{
              color: totalLimit - totalSpent >= 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)'
            }}>
              {totalLimit - totalSpent >= 0 ? '+' : ''}${Math.round(totalLimit - totalSpent).toLocaleString()}
            </div>
            <div className="metric-sub">vs {`$${totalLimit.toLocaleString()}`} limit</div>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className="card">
        <div className="card-title">
          {hasTransactions ? `This month — actuals vs. budget` : 'Budget limits'}
        </div>
        {CATS.map(c => {
          const actual = actuals[c.key]
          const limit = limits[c.key]
          const ratio = limit > 0 ? actual / limit : 0
          const overBudget = ratio > 1
          const nearLimit = ratio > 0.8
          const barColor = overBudget
            ? 'var(--color-text-danger)'
            : nearLimit
            ? 'var(--color-text-warning)'
            : c.color

          return (
            <div key={c.key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {c.label}
                </span>
                <span style={{ fontSize: 13 }}>
                  {hasTransactions ? (
                    <>
                      <span style={{ color: overBudget ? 'var(--color-text-danger)' : 'var(--color-text-primary)', fontWeight: 500 }}>
                        ${Math.round(actual).toLocaleString()}
                      </span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        {' '}/ ${limit.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-text-tertiary)' }}>${limit.toLocaleString()}</span>
                  )}
                </span>
              </div>
              <div className="budget-bar-bg">
                <div
                  className="budget-bar-fill"
                  style={{
                    width: hasTransactions
                      ? `${Math.min(ratio * 100, 100)}%`
                      : `${Math.round(limit / totalLimit * 100)}%`,
                    background: hasTransactions ? barColor : c.color,
                    opacity: hasTransactions ? 1 : 0.45,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Import card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Import transactions</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={accountType}
              onChange={e => setAccountType(e.target.value)}
              style={{ fontSize: 12, padding: '4px 6px', flex: 'none' }}
            >
              <option value="credit_card">Credit card</option>
              <option value="checking">Checking / savings</option>
            </select>
            <label style={{
            background: importing ? 'var(--color-background-secondary)' : 'var(--color-text-success)',
            color: importing ? 'var(--color-text-secondary)' : '#fff',
            border: 'none', borderRadius: 'var(--border-radius-md)',
            padding: '5px 12px', fontSize: 12, cursor: importing ? 'default' : 'pointer',
            fontFamily: 'inherit', display: 'inline-block',
          }}>
            {importing ? 'Importing…' : '+ Choose CSV'}
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImport}
              disabled={importing}
            />
          </label>
          </div>
        </div>

        {importResult && !importResult.error && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
            ✓ Imported <strong style={{ color: 'var(--color-text-primary)' }}>{importResult.imported}</strong> transactions
            ({importResult.format?.toUpperCase()} format)
            {importResult.skipped > 0 && `, ${importResult.skipped} duplicates skipped`}
            {importResult.filtered > 0 && `, ${importResult.filtered} payment rows filtered`}.
          </div>
        )}
        {importResult?.error && (
          <div style={{ fontSize: 12, color: 'var(--color-text-danger)', marginTop: 8 }}>
            Unrecognized format. Supported: Chase, Amex, Bank of America, Apple Card.
          </div>
        )}

        {!hasTransactions && !importResult && (
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 10 }}>
            Export a CSV from your bank and import it here. Chase, Amex, BoA, and Apple Card are supported.
          </div>
        )}
      </div>

      {/* Recent transactions (toggleable) */}
      {hasTransactions && (
        <div className="card">
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowTxns(v => !v)}
          >
            <div className="card-title" style={{ marginBottom: 0 }}>
              Recent transactions
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 8, fontWeight: 400 }}>
                {transactions.length} this month
              </span>
            </div>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
              {showTxns ? '▲ hide' : '▼ show'}
            </span>
          </div>

          {showTxns && (
            <div style={{ marginTop: 12 }}>
              {loadingTxns ? (
                <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Loading…</div>
              ) : (
                transactions.slice(0, 30).map(t => (
                  <div key={t.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: '0.5px solid var(--color-border-tertiary)',
                  }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', minWidth: 0 }}>
                      <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11, flexShrink: 0 }}>
                        {t.date.slice(5)}
                      </span>
                      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.merchant}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                      <span className={`badge${CAT_BADGE[t.category] ? ` badge-${CAT_BADGE[t.category]}` : ''}`}
                        style={{ background: 'var(--color-background-secondary)', color: 'var(--color-text-tertiary)' }}>
                        {t.category}
                      </span>
                      <span style={{
                        fontSize: 13, fontWeight: 500, minWidth: 64, textAlign: 'right',
                        color: t.amount < 0 ? 'var(--color-text-success)' : 'var(--color-text-primary)',
                      }}>
                        {t.amount < 0 ? '+' : '-'}${Math.abs(t.amount).toLocaleString()}
                      </span>
                      <button className="btn-icon" onClick={() => deleteTransaction(t.id)}>×</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Budget limits sliders */}
      <div className="card">
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowLimits(v => !v)}
        >
          <div className="card-title" style={{ marginBottom: 0 }}>Budget limits</div>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
            {showLimits ? '▲ hide' : '▼ edit'}
          </span>
        </div>

        {showLimits && (
          <div style={{ marginTop: 12 }}>
            {CATS.map(c => {
              const cfg = SLIDER_CFG[c.key]
              return (
                <div className="slider-row" key={c.key}>
                  <span className="slider-label">{c.label}</span>
                  <input
                    type="range"
                    min={cfg.min} max={cfg.max} step={cfg.step}
                    value={limits[c.key]}
                    onChange={e => setLimits(prev => ({ ...prev, [c.key]: +e.target.value }))}
                  />
                  <span className="slider-val">${limits[c.key].toLocaleString()}</span>
                </div>
              )
            })}
            <button
              onClick={saveLimits}
              style={{
                background: 'var(--color-text-success)', color: '#fff',
                border: 'none', borderRadius: 'var(--border-radius-md)',
                padding: '6px 16px', fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit', marginTop: 4,
              }}
            >
              Save limits
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
