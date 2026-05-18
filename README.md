# Finance OS

A self-hosted personal finance dashboard for tracking complex comp structures (base, bonus, RSUs) and multiple credit cards. Runs locally with one command.

## Quick start

```bash
git clone <repo>
cd finance-os
docker-compose up
# Open http://localhost:3000
```

## Dev setup (no Docker)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

## Features (Phase 1)

| Tab | What it does |
|---|---|
| Simulate | Monte Carlo net worth projection (1,000 runs, base+bonus only). Two named job scenarios + custom. Spending shock calculator. |
| RSUs | Vesting schedule tracker across 4 schedule types. Shows vested/unvested at current stock price — intentionally no forecast. |
| Budget | Monthly spend breakdown with sliders. Take-home pulls from active Simulate scenario (32% flat tax). |
| Cards | Credit card catalog, spend optimizer, sign-up bonus tracker. |
| Net Worth | Assets/liabilities with editable balances, 6-month sparkline. |

## Stack

- **Frontend**: React + Vite, Chart.js
- **Backend**: FastAPI, SQLite via SQLAlchemy
- **Deploy**: Docker Compose

## Design decisions

- Monte Carlo uses base + bonus only — RSUs deliberately excluded (future equity is company/market dependent)
- No Plaid, no paid APIs — free forever
- Flat 32% tax estimate for MVP (Phase 2: configurable by state/filing status)
- Single user, local only — no auth, no cloud sync
