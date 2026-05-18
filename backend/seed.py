"""
Demo seed data. Runs automatically on startup when the database is empty.
Safe to call multiple times — exits immediately if any transactions exist.
"""
from datetime import date, timedelta
from database import SessionLocal
import models


def _months_ago(n, day=1):
    d = date.today().replace(day=1)
    month = d.month - n
    year = d.year + (month - 1) // 12
    month = ((month - 1) % 12) + 1
    return date(year, month, day)


def seed_if_empty():
    db = SessionLocal()
    try:
        if db.query(models.Transaction).count() > 0:
            return
        _seed(db)
        print("Demo data seeded.")
    finally:
        db.close()


def _seed(db):
    today = date.today()
    m0 = today.strftime("%Y-%m")  # current month
    m1 = _months_ago(1).strftime("%Y-%m")
    m2 = _months_ago(2).strftime("%Y-%m")

    # ── Transactions ────────────────────────────────────────────────────────
    txns = [
        # --- current month ---
        (f"{m0}-01", 2200.00, "RENT PAYMENT",                      "Rent"),
        (f"{m0}-01",   82.40, "WHOLE FOODS MARKET",                 "Food"),
        (f"{m0}-03",   34.90, "DOORDASH",                           "Food"),
        (f"{m0}-04",   15.99, "NETFLIX",                            "Entertainment"),
        (f"{m0}-05",   10.99, "SPOTIFY",                            "Entertainment"),
        (f"{m0}-06",   21.50, "CHIPOTLE",                           "Food"),
        (f"{m0}-07",   58.40, "CHEVRON",                            "Transport"),
        (f"{m0}-08",   18.75, "UBER",                               "Transport"),
        (f"{m0}-09",   27.30, "TRADER JOE'S",                       "Food"),
        (f"{m0}-10",   14.20, "STARBUCKS",                          "Food"),
        (f"{m0}-12",   44.00, "AMAZON.COM",                         "Other"),
        (f"{m0}-13",   19.00, "LYFT",                               "Transport"),
        (f"{m0}-14",   67.80, "SAFEWAY",                            "Food"),
        (f"{m0}-15", -6500.00, "STRIPE PAYROLL",                    "Income"),
        (f"{m0}-16",   12.00, "APPLE TV+",                          "Entertainment"),
        (f"{m0}-18",   38.50, "DOORDASH",                           "Food"),
        (f"{m0}-19",   22.00, "UBER",                               "Transport"),

        # --- 1 month ago ---
        (f"{m1}-01", 2200.00, "RENT PAYMENT",                      "Rent"),
        (f"{m1}-02",   94.20, "WHOLE FOODS MARKET",                 "Food"),
        (f"{m1}-03",   10.99, "SPOTIFY",                            "Entertainment"),
        (f"{m1}-04",   15.99, "NETFLIX",                            "Entertainment"),
        (f"{m1}-05",   28.40, "CHIPOTLE",                           "Food"),
        (f"{m1}-06",   62.10, "SHELL",                              "Transport"),
        (f"{m1}-08",   41.00, "DOORDASH",                           "Food"),
        (f"{m1}-10",   76.50, "TRADER JOE'S",                       "Food"),
        (f"{m1}-11",   24.00, "UBER",                               "Transport"),
        (f"{m1}-12",   89.99, "AMAZON.COM",                         "Other"),
        (f"{m1}-14",   14.80, "STARBUCKS",                          "Food"),
        (f"{m1}-15", -6500.00, "STRIPE PAYROLL",                    "Income"),
        (f"{m1}-16",   12.00, "APPLE TV+",                          "Entertainment"),
        (f"{m1}-18",   32.00, "DOORDASH",                           "Food"),
        (f"{m1}-19",   17.50, "LYFT",                               "Transport"),
        (f"{m1}-20",   55.00, "SAFEWAY",                            "Food"),
        (f"{m1}-22",  145.00, "TICKETMASTER",                       "Entertainment"),
        (f"{m1}-24",   29.90, "AMAZON.COM",                         "Other"),
        (f"{m1}-28",   11.50, "STARBUCKS",                          "Food"),
        (f"{m1}-29",  -300.00, "ROBINHOOD DIVIDEND",                "Income"),
        (f"{m1}-30", -6500.00, "STRIPE PAYROLL",                    "Income"),

        # --- 2 months ago ---
        (f"{m2}-01", 2200.00, "RENT PAYMENT",                      "Rent"),
        (f"{m2}-02",   78.30, "WHOLE FOODS MARKET",                 "Food"),
        (f"{m2}-03",   10.99, "SPOTIFY",                            "Entertainment"),
        (f"{m2}-04",   15.99, "NETFLIX",                            "Entertainment"),
        (f"{m2}-05",   33.60, "CHIPOTLE",                           "Food"),
        (f"{m2}-07",   54.80, "CHEVRON",                            "Transport"),
        (f"{m2}-09",   36.00, "DOORDASH",                           "Food"),
        (f"{m2}-10",   88.40, "TRADER JOE'S",                       "Food"),
        (f"{m2}-12",   21.00, "UBER",                               "Transport"),
        (f"{m2}-13",   19.99, "AMAZON.COM",                         "Other"),
        (f"{m2}-15", -6500.00, "STRIPE PAYROLL",                    "Income"),
        (f"{m2}-16",   12.00, "APPLE TV+",                          "Entertainment"),
        (f"{m2}-17",   44.50, "DOORDASH",                           "Food"),
        (f"{m2}-19",   16.00, "LYFT",                               "Transport"),
        (f"{m2}-21",   62.00, "SAFEWAY",                            "Food"),
        (f"{m2}-23",   75.00, "AMAZON.COM",                         "Other"),
        (f"{m2}-28", -6500.00, "STRIPE PAYROLL",                    "Income"),
    ]

    for date_str, amount, merchant, category in txns:
        db.add(models.Transaction(
            date=date_str,
            amount=round(amount, 2),
            merchant=merchant,
            category=category,
        ))

    # ── Cards ────────────────────────────────────────────────────────────────
    db.add(models.Card(
        name="Amex Gold",
        annual_fee=250,
        rewards={
            "description": "4x dining & groceries, 1x other",
            "rates": {"Food": 4, "Transport": 1, "Entertainment": 1, "Rent": 1, "Other": 1},
            "point_value": 0.02,
            "base_rate": 1,
        },
        signup_bonus_amount=4000,
        signup_bonus_spent=2840,
        signup_bonus_deadline=f"{m1}-30",
    ))
    db.add(models.Card(
        name="Chase Freedom Unlimited",
        annual_fee=0,
        rewards={
            "description": "3x dining, 1.5x everything else",
            "rates": {"Food": 3, "Transport": 1.5, "Entertainment": 1.5, "Rent": 1, "Other": 1.5},
            "point_value": 0.015,
            "base_rate": 1.5,
        },
    ))

    # ── Budgets ───────────────────────────────────────────────────────────────
    for cat, limit in [("Rent", 2200), ("Food", 600), ("Transport", 200),
                       ("Entertainment", 100), ("Other", 300)]:
        db.add(models.Budget(category=cat, monthly_limit=limit))

    # ── Scenario ──────────────────────────────────────────────────────────────
    db.add(models.Scenario(
        label="Current job",
        base_salary=150000,
        bonus_pct=10,
        savings_rate=20,
        side_income=0,
        years=10,
    ))

    db.commit()


if __name__ == "__main__":
    seed_if_empty()
