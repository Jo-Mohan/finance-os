import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const CATS = ['Food', 'Transport', 'Entertainment', 'Rent', 'Other']
const CAT_ICON = { Food: '🍽', Transport: '🚗', Entertainment: '🎬', Rent: '🏠', Other: '···' }

const DEFAULT_RATES = { Food: 1, Transport: 1, Entertainment: 1, Rent: 1, Other: 1 }

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function monthLabel(ym) {
  const [y, m] = ym.split('-')
  return new Date(+y, +m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

function lastNMonths(n) {
  const months = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

function fmtPct(n) {
  return n % 1 === 0 ? n + '%' : n.toFixed(1) + '%'
}

export default function Cards() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth())
  const [optData, setOptData] = useState(null)
  const [optLoading, setOptLoading] = useState(false)

  // Add card form state
  const [newName, setNewName] = useState('')
  const [newFee, setNewFee] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newRates, setNewRates] = useState({ ...DEFAULT_RATES })
  const [newPointValue, setNewPointValue] = useState(0.01)
  const [newBonusAmt, setNewBonusAmt] = useState('')
  const [newBonusDeadline, setNewBonusDeadline] = useState('')

  const loadOptimize = useCallback((month) => {
    setOptLoading(true)
    api.cards.optimize(month)
      .then(setOptData)
      .catch(console.error)
      .finally(() => setOptLoading(false))
  }, [])

  useEffect(() => {
    api.cards.list()
      .then(setCards)
      .catch(console.error)
      .finally(() => setLoading(false))
    loadOptimize(selectedMonth)
  }, [loadOptimize, selectedMonth])

  function resetForm() {
    setNewName(''); setNewFee(''); setNewDesc('')
    setNewRates({ ...DEFAULT_RATES }); setNewPointValue(0.01)
    setNewBonusAmt(''); setNewBonusDeadline('')
    setShowAdd(false)
  }

  async function addCard() {
    if (!newName.trim()) return
    try {
      const created = await api.cards.create({
        name: newName.trim(),
        annual_fee: parseFloat(newFee) || 0,
        rewards: {
          description: newDesc.trim(),
          rates: newRates,
          point_value: newPointValue,
          base_rate: newRates.Other,
        },
        signup_bonus_amount: newBonusAmt ? parseFloat(newBonusAmt) : null,
        signup_bonus_deadline: newBonusDeadline || null,
      })
      setCards(prev => [...prev, created])
      resetForm()
      loadOptimize(selectedMonth)
    } catch (e) { console.error(e) }
  }

  async function removeCard(id) {
    try {
      await api.cards.remove(id)
      setCards(prev => prev.filter(c => c.id !== id))
      loadOptimize(selectedMonth)
    } catch (e) { console.error(e) }
  }

  const bonusCards = cards.filter(c => c.signup_bonus_amount)
  const months = lastNMonths(6)

  if (loading) return (
    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, padding: '2rem 0' }}>Loading…</div>
  )

  return (
    <div>
      {/* Card catalog */}
      <div className="card">
        <div className="card-title">Your cards</div>

        {cards.length === 0 && !showAdd && (
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
            No cards yet — add one to get spend recommendations.
          </div>
        )}

        <div className="cc-grid">
          {cards.map(c => {
            const rates = c.rewards?.rates || {}
            const pv = c.rewards?.point_value || 0.01
            return (
              <div className="cc-card" key={c.id} style={{ position: 'relative' }}>
                <button
                  className="btn-icon"
                  style={{ position: 'absolute', top: 8, right: 8, fontSize: 14 }}
                  onClick={() => removeCard(c.id)}
                >×</button>
                <div className="cc-name">{c.name}</div>
                <div className="cc-detail" style={{ marginTop: 4 }}>
                  {c.rewards?.description || (
                    CATS.filter(cat => rates[cat] > 1).map(cat =>
                      `${rates[cat]}x ${cat}`
                    ).join(' · ') || 'Base rewards'
                  )}
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {CATS.filter(cat => rates[cat] > 1).map(cat => (
                    <span key={cat} className="badge" style={{
                      background: 'var(--color-background-secondary)',
                      color: 'var(--color-text-tertiary)',
                      fontSize: 10,
                    }}>
                      {cat} {fmtPct(rates[cat] * pv * 100)}
                    </span>
                  ))}
                  {c.annual_fee > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
                      ${c.annual_fee}/yr
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {!showAdd && (
            <div className="cc-card" style={{ cursor: 'pointer' }} onClick={() => setShowAdd(true)}>
              <div className="cc-name" style={{ color: 'var(--color-text-tertiary)' }}>+ Add card</div>
              <div className="cc-detail" style={{ marginTop: 8 }}>
                Enter reward rates to get live spend recommendations
              </div>
            </div>
          )}
        </div>

        {showAdd && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
            {/* Name + fee */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input
                style={inputStyle}
                placeholder="Card name (e.g. Amex Gold)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
              <input
                style={{ ...inputStyle, width: 90 }}
                placeholder="Annual fee"
                type="number"
                min={0}
                value={newFee}
                onChange={e => setNewFee(e.target.value)}
              />
            </div>

            {/* Reward rates grid */}
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Reward multipliers per category
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 10 }}>
              {CATS.map(cat => (
                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{cat}</span>
                  <input
                    style={{ ...inputStyle, textAlign: 'center', padding: '4px 6px' }}
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={newRates[cat]}
                    onChange={e => setNewRates(prev => ({ ...prev, [cat]: parseFloat(e.target.value) || 1 }))}
                  />
                </div>
              ))}
            </div>

            {/* Point value */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 120 }}>
                ¢ per point / mile
              </span>
              <select
                value={newPointValue}
                onChange={e => setNewPointValue(parseFloat(e.target.value))}
                style={{ fontSize: 12, padding: '4px 6px' }}
              >
                <option value={0.01}>1¢ — cashback / basic</option>
                <option value={0.015}>1.5¢ — Chase (via Portal)</option>
                <option value={0.02}>2¢ — Chase/Amex (transfer)</option>
                <option value={0.025}>2.5¢ — Amex (premium)</option>
              </select>
            </div>

            {/* Description (optional) */}
            <input
              style={{ ...inputStyle, marginBottom: 10, width: '100%' }}
              placeholder="Short description (optional, e.g. 4x dining & groceries)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />

            {/* Sign-up bonus */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input
                style={{ ...inputStyle, width: 130 }}
                placeholder="Bonus spend req ($)"
                type="number"
                value={newBonusAmt}
                onChange={e => setNewBonusAmt(e.target.value)}
              />
              <input
                style={{ ...inputStyle, width: 150 }}
                placeholder="Deadline (YYYY-MM-DD)"
                value={newBonusDeadline}
                onChange={e => setNewBonusDeadline(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addCard} style={btnPrimary}>Save card</button>
              <button onClick={resetForm} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Spend optimizer */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Spend optimizer</div>
          <select
            value={selectedMonth}
            onChange={e => { setSelectedMonth(e.target.value); loadOptimize(e.target.value) }}
            style={{ fontSize: 12, padding: '4px 6px' }}
          >
            {months.map(m => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
        </div>

        {cards.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            Add cards above to see recommendations.
          </div>
        ) : optLoading ? (
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Loading…</div>
        ) : optData ? (
          <>
            {optData.recommendations.filter(r => r.spent > 0).length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                No transaction data for {monthLabel(selectedMonth)}.
              </div>
            ) : (
              <div>
                {/* Category recommendations */}
                <div style={{ marginBottom: 16 }}>
                  {optData.recommendations.filter(r => r.spent > 0).map(r => (
                    <div key={r.category} style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr auto auto',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: '0.5px solid var(--color-border-tertiary)',
                    }}>
                      <span style={{ fontSize: 16 }}>{CAT_ICON[r.category]}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{r.best_card}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          {r.category} · ${r.spent.toLocaleString()} spent
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--color-text-success)', fontWeight: 500 }}>
                        {fmtPct(r.pct)} back
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                        ~${r.estimated_rewards.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Per-card value summary */}
                {optData.card_summaries.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                      Card value this month (if you put all eligible spend on each)
                    </div>
                    {optData.card_summaries.map(s => (
                      <div key={s.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)',
                      }}>
                        <span style={{ fontSize: 13 }}>{s.name}</span>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            ~${s.monthly_est.toFixed(2)}/mo
                          </span>
                          <span style={{
                            fontSize: 12, fontWeight: 500,
                            color: s.net_annual >= 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)',
                          }}>
                            ${s.net_annual > 0 ? '+' : ''}{s.net_annual.toFixed(0)}/yr net
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Sign-up bonus tracker */}
      {bonusCards.length > 0 && (
        <div className="card">
          <div className="card-title">Sign-up bonus tracker</div>
          {bonusCards.map(c => {
            const spent = c.signup_bonus_spent ?? 0
            const target = c.signup_bonus_amount
            const earned = spent >= target
            const pct = Math.min(spent / target * 100, 100)
            return (
              <div key={c.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13 }}>{c.name}</span>
                  {earned ? (
                    <span style={{ fontSize: 12, color: 'var(--color-text-success)' }}>Earned ✓</span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      ${spent.toLocaleString()} / ${target.toLocaleString()}
                      {c.signup_bonus_deadline && (
                        <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                          · due {c.signup_bonus_deadline}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="budget-bar-bg">
                  <div
                    className="budget-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: earned ? 'var(--color-text-success)' : 'var(--color-text-warning)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  background: 'var(--color-background-secondary)',
  border: '0.5px solid var(--color-border-secondary)',
  borderRadius: 'var(--border-radius-md)',
  color: 'var(--color-text-primary)',
  padding: '5px 8px',
  fontSize: 13,
  fontFamily: 'inherit',
  flex: 1,
}

const btnPrimary = {
  background: 'var(--color-text-success)', color: '#fff',
  border: 'none', borderRadius: 'var(--border-radius-md)',
  padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
}

const btnSecondary = {
  background: 'none', color: 'var(--color-text-secondary)',
  border: '0.5px solid var(--color-border-primary)',
  borderRadius: 'var(--border-radius-md)',
  padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
}
