import { useState } from 'react'
import Simulate from './components/Simulate'
import RSU from './components/RSU'
import Budget from './components/Budget'
import Cards from './components/Cards'
import NetWorth from './components/NetWorth'

const TABS = [
  { id: 'simulate', label: 'Simulate' },
  { id: 'rsu', label: 'RSUs' },
  { id: 'budget', label: 'Budget' },
  { id: 'cards', label: 'Cards' },
  { id: 'networth', label: 'Net Worth' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('simulate')
  const [scenarioComp, setScenarioComp] = useState({ base: 150000, bonus: 10 })

  return (
    <div>
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'simulate' && (
        <Simulate onCompChange={setScenarioComp} />
      )}
      {activeTab === 'rsu' && <RSU />}
      {activeTab === 'budget' && (
        <Budget baseSalary={scenarioComp.base} bonusPct={scenarioComp.bonus} />
      )}
      {activeTab === 'cards' && <Cards />}
      {activeTab === 'networth' && <NetWorth />}
    </div>
  )
}
