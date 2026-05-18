import csv
import io
from datetime import datetime

CATEGORY_RULES = [
    ("Rent", [
        "rent", "apartment", "lease", "real property", "hoa", "management company",
        "storage", "self storage",
    ]),
    ("Food", [
        "restaurant", "doordash", "grubhub", "uber eats", "seamless", "chipotle",
        "mcdonald", "starbucks", "trader joe", "whole foods", "kroger", "safeway",
        "grocery", "groceries", "dining", "cafe", "coffee", "pizza", "sushi", "burger",
        "taco", "panda express", "instacart", "fresh market", "deli", "bagel",
        "sandwich", "thai", "chinese food", "indian food", "takeout", "takeaway",
        "wendy", "chick-fil", "panera", "dunkin", "wingstop", "sweetgreen",
    ]),
    ("Transport", [
        "uber", "lyft", "transit", "metro", "mta ", "citi bike", "zipcar",
        "parking", "shell", "chevron", "exxon", "mobil", "bp ", "sunoco",
        "amtrak", "delta air", "united air", "american air", "southwest air",
        "jetblue", "toll ", "e-zpass", "ezpass", "fastrak", "sunpass",
    ]),
    ("Entertainment", [
        "netflix", "spotify", "hulu", "hbo", "apple music", "amazon prime",
        "ticketmaster", "amc ", "cinema", "theater", "theatre", "steam ",
        "playstation", "xbox", "disney+", "youtube premium", "prime video",
        "apple tv", "paramount+", "peacock",
    ]),
]


def detect_format(headers: list[str]) -> str | None:
    h = [x.strip().lower() for x in headers]
    if "transaction date" in h and "post date" in h:
        return "chase"
    if "appears on your statement as" in h:
        return "amex"
    if "reference number" in h and "payee" in h:
        return "boa"
    if "transaction date" in h and "amount (usd)" in h:
        return "apple"
    return None


def parse_date(s: str) -> str:
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s.strip()


# Patterns that identify credit card payoff rows in a checking account CSV.
# Conservative list — only things that are unambiguously CC payments, not
# utility autopays or vendor payments.
CC_PAYMENT_PATTERNS = [
    "autopay",
    "credit card payment",
    "credit card pymt",
    "credit crd",       # Chase: "CHASE CREDIT CRD AUTOPAY"
    "cc payment",
    "e-payment",        # Discover autopay
    "epayment",         # Amex: "AMEX EPAYMENT"
    "online payment - thank you",
    "payment thank you",
    "pymt thank you",
]


def filter_checking_payments(rows: list[dict]) -> tuple[list[dict], int]:
    """Strip credit card payoff rows from a checking account import.
    Returns (kept_rows, filtered_count)."""
    kept, filtered = [], 0
    for row in rows:
        desc = row["merchant"].lower()
        if any(p in desc for p in CC_PAYMENT_PATTERNS):
            filtered += 1
        else:
            kept.append(row)
    return kept, filtered


def categorize(description: str) -> str:
    d = description.lower()
    for cat, keywords in CATEGORY_RULES:
        if any(kw in d for kw in keywords):
            return cat
    return "Other"


def parse_csv(content: str) -> tuple[list[dict], str]:
    # Strip BOM and skip any non-header preamble lines
    lines = content.lstrip("﻿").splitlines()

    # Find the header row (first line that produces a known format)
    header_idx = 0
    fmt = None
    for i, line in enumerate(lines):
        candidate = next(csv.reader([line]))
        fmt = detect_format(candidate)
        if fmt:
            header_idx = i
            break

    if fmt is None:
        raise ValueError("Unrecognized CSV format")

    body = "\n".join(lines[header_idx:])
    reader = csv.DictReader(io.StringIO(body))
    rows = []

    for row in reader:
        try:
            if fmt == "chase":
                date = parse_date(row["Transaction Date"])
                merchant = row["Description"].strip()
                raw = float(row["Amount"])
                amount = -raw  # Chase negative = debit; flip to positive = expense

            elif fmt == "amex":
                date = parse_date(row["Date"])
                merchant = row["Description"].strip()
                raw = float(row["Amount"])
                amount = raw  # Amex positive = charge

            elif fmt == "boa":
                date = parse_date(row["Posted Date"])
                merchant = row["Payee"].strip()
                raw = float(row["Amount"])
                amount = -raw  # BoA negative = debit; flip

            elif fmt == "apple":
                date = parse_date(row["Transaction Date"])
                merchant = (row.get("Merchant") or row.get("Description", "")).strip()
                raw = float(row["Amount (USD)"])
                amount = -raw  # Apple negative = charge; flip

            amount = round(amount, 2)
            category = "Income" if amount < 0 else categorize(merchant)

            rows.append({
                "date": date,
                "amount": amount,
                "merchant": merchant,
                "category": category,
            })
        except (KeyError, ValueError):
            continue

    return rows, fmt
