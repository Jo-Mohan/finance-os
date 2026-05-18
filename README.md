# Finance OS

A self-hosted personal finance dashboard built for engineers tracking complex comp (base, bonus, RSUs) and multiple credit cards. Runs entirely on your machine — no Plaid, no paid APIs, no cloud sync.

## Quick start

```bash
git clone https://github.com/Jo-Mohan/finance-os
cd finance-os
docker-compose up
```

Open **http://localhost:3000** — demo data is pre-loaded on first run.

## Features

### Simulate
Monte Carlo net worth projection across 1,000 runs. Switch between two named job scenarios (or custom). Includes a spending shock calculator that shows the compounded opportunity cost of a one-time expense. RSU block shown in comp summary but intentionally excluded from projections — future equity value is company/market dependent.

### RSU tracker
Vesting schedule across four schedule types: 4yr/1yr cliff, 4yr monthly, 3yr equal, and backloaded (5/15/40/40). Shows vested vs. unvested at current stock price with prominent disclaimer that future vest value is not modeled.

### Budget
Import transactions from Chase, Amex, Bank of America, or Apple Card CSV exports. Categories auto-detected from merchant names. Month selector lets you browse any month's actuals vs. your budget. Doughnut chart, 6-month stacked trend, and weekly spend breakdown all update live.

### Cards
Add your credit cards with per-category reward multipliers and point value. The optimizer uses your real transaction data to recommend the best card for each spending category and estimates monthly earnings and net annual value after the annual fee.

### Net Worth
Track assets (checking, brokerage, 401k) and liabilities (loans, card balances) with a 6-month sparkline and velocity metric.

## CSV import

Export a CSV from your bank and import it in the Budget tab:

| Bank | How to export |
|---|---|
| Chase | Account → Download → CSV |
| Amex | Statements → Download → CSV |
| Bank of America | Activity → Export |
| Apple Card | Wallet app → Card → Transactions → Export |

Select **Credit card** or **Checking / savings** before importing. Checking imports automatically filter out credit card payoff rows to avoid double-counting.

## Manual dev setup

**Backend** (requires Python 3.13)
```bash
cd backend
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (requires Node 22)
```bash
cd frontend
npm install
npm run dev
```

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite, Chart.js |
| Backend | FastAPI, SQLite via SQLAlchemy |
| Deploy | Docker Compose |

## Design decisions

- **No RSU projection** — future equity value depends on company and market performance. Showing a number would be misleading.
- **No Plaid, no paid APIs** — CSV import only. Free forever.
- **Flat 32% tax estimate** — good enough for net worth projections; configurable in a future release.
- **Local only** — no auth, no cloud sync. You own your data.
