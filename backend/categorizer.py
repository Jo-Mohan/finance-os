"""
Three-layer categorization pipeline:
  1. DB merchant_rules table (user corrections + cached LLM results)
  2. Keyword rules (fast, offline)
  3. Claude Haiku batch call (if ANTHROPIC_API_KEY set) — results cached in DB
"""
import os
import re
import json
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

VALID_CATS = {"Rent", "Food", "Transport", "Entertainment", "Other", "Income"}


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
    # Trailing "City ST" with space — only when last token is a known state
    d = re.sub(rf'\s+\S+\s+({_STATE_PAT})\s*$', '', d)
    # Fused "CityCA" — only strip if last exactly 2 chars are a known state
    if len(d) >= 3 and d[-2:] in _STATES and d[-3] != ' ':
        d = d[:-2]
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


def llm_categorize_batch(merchants: list[str]) -> dict[str, str]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or not merchants:
        return {}
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        merchant_list = "\n".join(f"- {m}" for m in merchants)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": (
                    "Categorize each bank transaction merchant into exactly one of: "
                    "Rent, Food, Transport, Entertainment, Other.\n\n"
                    f"Merchants:\n{merchant_list}\n\n"
                    'Reply with only a JSON object: {"merchant name": "Category", ...}\n'
                    "Use the exact merchant name strings as keys."
                ),
            }],
        )
        text = msg.content[0].text
        start = text.index('{')
        end = text.rindex('}') + 1
        result = json.loads(text[start:end])
        return {k: v for k, v in result.items() if v in VALID_CATS}
    except Exception:
        return {}


def apply_to_rows(rows: list[dict], db: Session) -> list[dict]:
    """
    Re-categorize rows using DB rules then LLM.
    Income rows are never re-categorized.
    """
    # Pass 1: DB rules override keyword categorization
    for row in rows:
        if row["category"] == "Income":
            continue
        cat = db_lookup(row["merchant"], db)
        if cat:
            row["category"] = cat

    # Pass 2: collect still-uncategorized (Other) merchants for LLM
    other_merchants = list({
        row["merchant"]
        for row in rows
        if row["category"] == "Other"
    })

    if other_merchants:
        llm_results = llm_categorize_batch(other_merchants)
        for merchant, cat in llm_results.items():
            save_rule(merchant, cat, "llm", db)
        for row in rows:
            if row["category"] == "Other" and row["merchant"] in llm_results:
                row["category"] = llm_results[row["merchant"]]

    return rows
