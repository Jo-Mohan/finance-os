import { useState, useEffect } from 'react'
import { api } from '../api'

const OPTIMIZER = [
  { cat: 'Restaurants', icon: '🍽', card: 'Amex Gold', pts: '4x pts', pct: '~8% back' },
  { cat: 'Groceries', icon: '🛒', card: 'Amex Gold', pts: '4x pts', pct: '~8% back' },
  { cat: 'Flights & hotels', icon: '✈', card: 'Sapphire Reserve', pts: '3x pts', pct: '~6% back' },
  { cat: 'Electronics', icon: '💻', card: 'Freedom Unlimited', pts: '1.5x pts', pct: '~2.25% back' },
  { cat: 'Everything else', icon: '···', card: 'Freedom Unlimited', pts: '1.5x pts', pct: '~2.25% back' },
]

const BADGE_CLASS = {
  Travel: 'badge-blue',
  Dining: 'badge-amber',
  Catchall: 'badge-green',
}

export default function Cards() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDetail, setNewDetail] = useState('')
  const [newBadge, setNewBadge] = useState('Travel')

  useEffect(() => {
    api.cards.list()
      .then(setCards)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function addCard() {
    if (!newName.trim()) return
    try {
      const created = await api.cards.create({
        name: newName.trim(),
        annual_fee: 0,
        rewards: { description: newDetail.trim() },
        category_badge: newBadge,
      })
      setCards(prev => [...prev, created])
      setNewName('')
      setNewDetail('')
      setShowAdd(false)
    } catch (e) { console.error(e) }
  }

  async function removeCard(id) {
    try {
      await api.cards.remove(id)
      setCards(prev => prev.filter(c => c.id !== id))
    } catch (e) { console.error(e) }
  }

  const bonusCards = cards.filter(c => c.signup_bonus_amount)

  if (loading) return (
    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, padding: '2rem 0' }}>
      Loading…
    </div>
  )

  return (
    <div>
      <div className="card">
        <div className="card-title">Your cards</div>

        {cards.length === 0 && !showAdd && (
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
            No cards yet — add one below to get spend recommendations.
          </div>
        )}

        <div className="cc-grid">
          {cards.map(c => (
            <div className="cc-card" key={c.id} style={{ position: 'relative' }}>
              <button
                className="btn-icon"
                style={{ position: 'absolute', top: 8, right: 8, fontSize: 14 }}
                onClick={() => removeCard(c.id)}
                title="Remove card"
              >
                ×
              </button>
              <div className="cc-name">{c.name}</div>
              <div className="cc-detail" style={{ whiteSpace: 'pre-line' }}>
                {c.rewards?.description || ''}
              </div>
              {c.category_badge && (
                <span className={`badge ${BADGE_CLASS[c.category_badge] || 'badge-green'}`}>
                  {c.category_badge}
                </span>
              )}
            </div>
          ))}

          {!showAdd && (
            <div className="cc-card" style={{ cursor: 'pointer' }} onClick={() => setShowAdd(true)}>
              <div className="cc-name" style={{ color: 'var(--color-text-tertiary)' }}>+ Add card</div>
              <div className="cc-detail" style={{ marginTop: 8 }}>
                Connect a new card to get spend recommendations
              </div>
            </div>
          )}
        </div>

        {showAdd && (
          <div style={{ marginTop: 8 }}>
            <div className="slider-row">
              <span className="slider-label">Card name</span>
              <input
                style={{
                  flex: 1, background: 'var(--color-background-secondary)',
                  border: '0.5px solid var(--color-border-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                  color: 'var(--color-text-primary)', padding: '5px 8px', fontSize: 13,
                  fontFamily: 'inherit',
                }}
                placeholder="e.g. Citi Double Cash"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCard()}
                autoFocus
              />
            </div>
            <div className="slider-row">
              <span className="slider-label">Rewards / details</span>
              <input
                style={{
                  flex: 1, background: 'var(--color-background-secondary)',
                  border: '0.5px solid var(--color-border-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                  color: 'var(--color-text-primary)', padding: '5px 8px', fontSize: 13,
                  fontFamily: 'inherit',
                }}
                placeholder="e.g. 2x everywhere, no annual fee"
                value={newDetail}
                onChange={e => setNewDetail(e.target.value)}
              />
            </div>
            <div className="slider-row">
              <span className="slider-label">Category</span>
              <select value={newBadge} onChange={e => setNewBadge(e.target.value)}>
                <option>Travel</option>
                <option>Dining</option>
                <option>Catchall</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={addCard}
                style={{
                  background: 'var(--color-text-success)', color: '#fff',
                  border: 'none', borderRadius: 'var(--border-radius-md)',
                  padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Save
              </button>
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  background: 'none', color: 'var(--color-text-secondary)',
                  border: '0.5px solid var(--color-border-primary)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Spend optimizer</div>
        {OPTIMIZER.map(r => (
          <div className="rec-row" key={r.cat}>
            <span style={{ color: 'var(--color-text-secondary)' }}>{r.icon} {r.cat}</span>
            <span style={{ fontWeight: 500 }}>{r.card}</span>
            <span style={{ color: 'var(--color-text-success)', fontSize: 12 }}>{r.pts} ({r.pct})</span>
          </div>
        ))}
      </div>

      {bonusCards.length > 0 && (
        <div className="card">
          <div className="card-title">Sign-up bonus tracker</div>
          {bonusCards.map(c => {
            const earned = (c.signup_bonus_spent ?? 0) >= c.signup_bonus_amount
            return (
              <div className="rec-row" key={c.id}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{c.name}</span>
                {earned ? (
                  <span style={{ fontSize: 12, color: 'var(--color-text-success)' }}>Earned ✓</span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--color-text-warning)' }}>
                    ${(c.signup_bonus_spent ?? 0).toLocaleString()} / ${c.signup_bonus_amount.toLocaleString()}
                    {c.signup_bonus_deadline ? ` — ${c.signup_bonus_deadline}` : ''}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
