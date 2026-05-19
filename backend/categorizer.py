"""
Two-layer categorization pipeline:
  1. DB merchant_rules table (user corrections, persisted across imports)
  2. Keyword rules (fast, offline, no dependencies)
"""
import re
from sqlalchemy.orm import Session
import models

KEYWORD_RULES = [
    ("Rent", [
        "rent", "apartment", "lease", "real property", "hoa", "management company",
        "storage", "self storage", "bilt",
    ]),
    ("Food", [
        "restaurant", "doordash", "grubhub", "uber eats", "seamless", "chipotle",
        "mcdonald", "starbucks", "trader joe", "whole foods", "kroger", "safeway",
        "grocery", "groceries", "dining", "cafe", "coffee", "pizza", "sushi", "burger",
        "taco", "panda express", "instacart", "fresh market", "deli", "bagel",
        "sandwich", "thai", "chinese food", "indian food", "takeout", "takeaway",
        "wendy", "chick-fil", "panera", "dunkin", "wingstop", "sweetgreen",
        "in-n-out", "shake shack", "five guys",
    ]),
    ("Transport", [
        "uber", "lyft", "transit", "metro", "mta ", "citi bike", "zipcar",
        "parking", "shell", "chevron", "exxon", "mobil", "bp ", "sunoco",
        "amtrak", "delta air", "united air", "american air", "southwest air",
        "jetblue", "toll ", "e-zpass", "ezpass", "fastrak", "sunpass",
        "speedway", "arco", "circle k", "76 ", "marathon", "wawa", "quiktrip",
        "clipper", "bart ", "muni ",
    ]),
    ("Entertainment", [
        "netflix", "spotify", "hulu", "hbo", "apple music", "amazon prime",
        "ticketmaster", "amc ", "cinema", "theater", "theatre", "steam ",
        "playstation", "xbox", "disney+", "youtube premium", "prime video",
        "apple tv", "paramount+", "peacock", "stubhub", "eventbrite",
        "skydive", "bowling", "arcade",
    ]),
]


_STATES = {
    'al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia',
    'ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj',
    'nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt',
    'va','wa','wv','wi','wy','dc',
}
_STATE_PAT = '|'.join(sorted(_STATES, key=len, reverse=True))


def normalize(desc: str) -> str:
    """Strip noise from merchant names for consistent cache lookups."""
    d = desc.lower().strip()
    # POS prefixes (Square, Toast, DoorDash, PayPal)
    d = re.sub(r'^(tst\*\s*|sq \*\s*|sq\*\s*|dd \*\s*|pp\*\s*|paypal \*\s*)', '', d)
    # Phone numbers e.g. 877-778-1161 or 808-768-6861
    d = re.sub(r'\s+\d{3}[-.\s]\d{3}[-.\s]\d{4}', '', d)
    # Long numeric-only ID prefixes (e.g. "68202 4227 SPEEDWAY")
    d = re.sub(r'^\d[\d\s]{3,}', '', d)
    # Confirmation numbers
    d = re.sub(r'\s+(conf#|#)\s*\w+', '', d, flags=re.IGNORECASE)
    # Trailing "Word STATE" with a space — "SAN JOSE CA", "HONOLULU HI"
    d = re.sub(rf'\s+\S+\s+({_STATE_PAT})\s*$', '', d)
    # Fused "CitySTATE" — "FRANCISCOCA" → only apply when the base (before the 2-char suffix)
    # contains a space (meaning it looks like a multi-word city, not a brand name like "starbucks")
    if len(d) >= 5 and d[-2:] in _STATES:
        base = d[:-2]
        if ' ' in base:  # multi-word → city name fused with state, safe to strip
            d = base
    return re.sub(r'\s{2,}', ' ', d).strip()


def keyword_categorize(desc: str) -> str:
    d = desc.lower()
    for cat, keywords in KEYWORD_RULES:
        if any(kw in d for kw in keywords):
            return cat
    return "Other"


def db_lookup(merchant: str, db: Session) -> str | None:
    key = normalize(merchant)
    rule = db.query(models.MerchantRule).filter_by(pattern=key).first()
    return rule.category if rule else None


def save_rule(merchant: str, category: str, source: str, db: Session):
    key = normalize(merchant)
    existing = db.query(models.MerchantRule).filter_by(pattern=key).first()
    if existing:
        existing.category = category
        existing.source = source
    else:
        db.add(models.MerchantRule(pattern=key, category=category, source=source))


def apply_to_rows(rows: list[dict], db: Session) -> list[dict]:
    """Apply DB merchant rules on top of keyword categorization. Income rows are skipped."""
    for row in rows:
        if row["category"] == "Income":
            continue
        cat = db_lookup(row["merchant"], db)
        if cat:
            row["category"] = cat
    return rows
