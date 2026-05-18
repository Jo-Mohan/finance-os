import { useState } from 'react'

const OPTIMIZER = [
  { cat: 'Restaurants', icon: '🍽', card: 'Amex Gold', pts: '4x pts', pct: '~8% back' },
  { cat: 'Groceries', icon: '🛒', card: 'Amex Gold', pts: '4x pts', pct: '~8% back' },
  { cat: 'Flights & hotels', icon: '✈', card: 'Sapphire Reserve', pts: '3x pts', pct: '~6% back' },
  { cat: 'Electronics', icon: '💻', card: 'Freedom Unlimited', pts: '1.5x pts', pct: '~2.25% back' },
  { cat: 'Everything else', icon: '···', card: 'Freedom Unlimited', pts: '1.5x pts', pct: '~2.25% back' },
]

const SEED_CARDS = [
  {
    id: 1, name: 'Chase Sapphire Reserve',
    detail: '3x travel & dining\n$300 travel credit\n$550 annual fee',
    badge: 'Travel', badgeClass: 'badge-blue',
    bonus: null,
  },
  {
    id: 2, name: 'Amex Gold',
    detail: '4x dining & groceries\n$120 dining credit\n$250 annual fee',
    badge: 'Dining', badgeClass: 'badge-amber',
    bonus: { spent: 2400, total: 4000, daysLeft: 60 },
  },
  {
    id: 3, name: 'Chase Freedom Unlimited',
    detail: '1.5x everything\nNo annual fee',
    badge: 'Catchall', badgeClass: 'badge-green',
    bonus: null,
  },
]

export default function Cards() {
  const [cards, setCards] = useState(SEED_CARDS)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDetail, setNewDetail] = useState('')
  const [newBadge, setNewBadge] = useState('Travel')

  function addCard() {
    if (!newName.trim()) return
    setCards(prev => [
      ...prev,
      {
        id: Date.now(),
        name: newName.trim(),
        detail: newDetail.trim(),
        badge: newBadge,
        badgeClass: newBadge === 'Travel' ? 'badge-blue' : newBadge === 'Dining' ? 'badge-amber' : 'badge-green',
        bonus: null,
      },
    ])
    setNewName('')
    setNewDetail('')
    setShowAdd(false)
  }

  function removeCard(id) {
    setCards(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">Your cards</div>
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
              <div className="cc-detail" style={{ whiteSpace: 'pre-line' }}>{c.detail}</div>
              {c.badge && <span className={`badge ${c.badgeClass}`}>{c.badge}</span>}
            </div>
          ))}
          {!showAdd && (
            <div
              className="cc-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowAdd(true)}
            >
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
                  padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'inherit',
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
                  padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'inherit',
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

      <div className="card">
        <div className="card-title">Sign-up bonus tracker</div>
        {cards.filter(c => c.bonus).map(c => (
          <div className="rec-row" key={c.id}>
            <span style={{ color: 'var(--color-text-secondary)' }}>{c.name}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-warning)' }}>
              ${c.bonus.spent.toLocaleString()} / ${c.bonus.total.toLocaleString()} — {c.bonus.daysLeft} days left
            </span>
          </div>
        ))}
        {cards.filter(c => c.bonus === null).some((_, i) => i === 0) && (
          cards.filter(c => c.bonus === null).filter((_, i) => i === 0).map(c => (
            <div className="rec-row" key={'earned-' + c.id}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{c.name}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-success)' }}>Earned ✓</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
