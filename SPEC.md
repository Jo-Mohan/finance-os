# Personal Finance OS — Project Spec

## Overview
A self-hosted personal finance dashboard built for technical users. Runs locally via a single command, shareable on GitHub. Designed for high-income early-career professionals tracking complex comp structures (base, bonus, RSUs) and multiple credit cards.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite | Fast dev, mobile-responsive, component-friendly |
| Backend | FastAPI (Python) | Lightweight, async, familiar to CS/quant background |
| Database | SQLite (via SQLAlchemy) | Zero config, portable, git-friendly |
| Auth | None (local only) | Single-user, runs on localhost |
| Deployment | Docker Compose | One-command setup for any user cloning from GitHub |

---

## Getting Started (target UX for GitHub users)
```bash
git clone https://github.com/<user>/finance-os
cd finance-os
docker-compose up
# Open http://localhost:3000
```

---

## Features

### 1. Simulate tab (Monte Carlo engine)
- Inputs: base salary, target bonus %, savings rate, time horizon, side income
- Runs 1,000 simulations using normally distributed annual returns (mean 7%, std 15%)
- Outputs: fan chart showing 5th/25th/50th/75th/95th percentile net worth trajectories
- Two named job scenarios (Job 1 / Job 2) with editable labels + Custom mode
- Spending shock calculator: shows compounded opportunity cost of a one-time expense
- RSU block shown in comp summary but clearly marked "not modeled — see RSU tab"
- Chart note: "Based on base + bonus only"

### 2. RSU tab
- Inputs: total grant value (at current stock price), vesting schedule, months since grant start
- Vesting schedules: 4yr/1yr cliff (standard), 4yr monthly, 3yr equal, backloaded (5/15/40/40)
- Outputs: per-year vest table showing amount, % of grant, and vested/unvested status
- Summary metrics: total grant, already vested, still unvested, future value = "Unknown"
- Disclaimer (prominent, always visible): values reflect current stock price only; future vest value is not modeled and depends on stock performance
- Intentional design decision: no stock price projection. This is a reference panel, not a forecast tool.

### 3. Budget tab
- Monthly spend sliders: Rent, Food, Transport, Entertainment, Other
- Pulls salary from active Simulate scenario to compute monthly take-home (32% tax estimate, configurable later)
- Metrics: take-home, total spend, monthly surplus, savings rate
- Bar chart of spend by category

### 4. Cards tab
- Card catalog: name, rewards structure, annual fee, category badge
- Spend optimizer: per-category recommendation of which card to use and estimated return %
- Sign-up bonus tracker: progress toward minimum spend, days remaining
- Add card flow (MVP: manual entry of name, rewards, fee)

### 5. Net worth tab
- Asset entries: checking/savings, 401k, brokerage, other
- Liability entries: student loans, credit card balances, other
- Net worth = total assets − total liabilities
- Velocity metric: change vs. prior month
- 6-month sparkline chart

---

## Data Model (SQLite)

```
accounts
  id, name, type (asset|liability), institution, balance, updated_at

transactions
  id, account_id, date, amount, merchant, category, card_used, note

budgets
  id, category, monthly_limit

cards
  id, name, annual_fee, rewards (JSON), signup_bonus_amount, signup_bonus_spent, signup_bonus_deadline

scenarios
  id, label, base_salary, bonus_pct, savings_rate, side_income, years

rsu_grants
  id, scenario_id, total_grant, schedule_type, start_date
```

---

## CSV Import (account linking without API cost)
- Every major bank/card exports CSV (Chase, Amex, BoA, Citi, Apple Card)
- Import flow: upload CSV → detect format → map columns → deduplicate → insert transactions
- Supported formats to handle on launch: Chase, Amex, BoA (most common)
- Future: browser extension for auto-import (Phase 2)

---

## Key Design Decisions
1. **RSUs are display-only** — never fed into Monte Carlo. Intentional. Future value of RSUs is company/market dependent and cannot be modeled honestly for arbitrary employers.
2. **Monte Carlo uses base + bonus only** — labeled clearly in UI. Users mentally add RSU upside on top.
3. **Tax estimate is a flat 32%** for MVP — make it a configurable setting in Phase 2 (state, filing status, deductions matter).
4. **No Plaid, no paid APIs** — CSV import only. Free forever.
5. **Single user, local only** — no auth, no cloud sync. GitHub users run their own instance.

---

## Project Structure (suggested)
```
finance-os/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Simulate.jsx
│   │   │   ├── RSU.jsx
│   │   │   ├── Budget.jsx
│   │   │   ├── Cards.jsx
│   │   │   └── NetWorth.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── main.py          # FastAPI app
│   ├── models.py        # SQLAlchemy models
│   ├── routers/
│   │   ├── simulate.py
│   │   ├── transactions.py
│   │   ├── cards.py
│   │   └── networth.py
│   ├── csv_import.py
│   └── requirements.txt
├── docker-compose.yml
├── SPEC.md              # this file
└── README.md
```

---

## Phase Roadmap
| Phase | Scope |
|---|---|
| 1 (MVP) | Simulate + RSU tab, static Budget + Cards + Net Worth with manual entry |
| 2 | CSV import, real transaction categorization, live budget vs. actuals |
| 3 | Credit card optimizer wired to real transaction data |
| 4 | GitHub polish: Docker, demo mode with seed data, docs |

---

## Prototype Reference
A fully interactive HTML/JS prototype exists covering all 5 tabs. Use it as the UI/UX reference for component behavior, not as source code to copy. Key behaviors to replicate:
- Monte Carlo reruns on every slider change (1,000 sims, fast enough client-side in JS; move to backend for larger N)
- Comp summary always shows base / bonus / total cash / RSU (dashed, not modeled) as 4 blocks
- RSU tab vested/unvested status computed from months-since-start vs vest schedule
- Budget take-home pulls from active scenario salary automatically