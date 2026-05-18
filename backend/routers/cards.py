from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any
from collections import defaultdict
from database import get_db
import models

router = APIRouter()


class CardIn(BaseModel):
    name: str
    annual_fee: float = 0
    rewards: Optional[dict[str, Any]] = None
    category_badge: Optional[str] = None
    signup_bonus_amount: Optional[float] = None
    signup_bonus_spent: Optional[float] = None
    signup_bonus_deadline: Optional[str] = None


class CardOut(CardIn):
    id: int
    model_config = {"from_attributes": True}


@router.get("/", response_model=list[CardOut])
def list_cards(db: Session = Depends(get_db)):
    return db.query(models.Card).all()


@router.post("/", response_model=CardOut)
def create_card(body: CardIn, db: Session = Depends(get_db)):
    card = models.Card(**body.model_dump())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.put("/{id}", response_model=CardOut)
def update_card(id: int, body: CardIn, db: Session = Depends(get_db)):
    card = db.get(models.Card, id)
    if not card:
        raise HTTPException(404)
    for k, v in body.model_dump().items():
        setattr(card, k, v)
    db.commit()
    db.refresh(card)
    return card


@router.delete("/{id}")
def delete_card(id: int, db: Session = Depends(get_db)):
    card = db.get(models.Card, id)
    if not card:
        raise HTTPException(404)
    db.delete(card)
    db.commit()
    return {"ok": True}


CATS = ["Rent", "Food", "Transport", "Entertainment", "Other"]


@router.get("/optimize")
def optimize(month: Optional[str] = None, db: Session = Depends(get_db)):
    from datetime import datetime
    if not month:
        month = datetime.now().strftime("%Y-%m")

    txns = db.query(models.Transaction).filter(
        models.Transaction.date.startswith(month),
        models.Transaction.amount > 0,
    ).all()

    spending: dict[str, float] = defaultdict(float)
    for t in txns:
        if t.category in CATS:
            spending[t.category] += t.amount

    cards = db.query(models.Card).all()
    recommendations = []

    for cat in CATS:
        spent = spending.get(cat, 0)
        best_card = None
        best_pct = 0.0
        best_est = 0.0

        for card in cards:
            r = card.rewards or {}
            rates = r.get("rates", {})
            point_value = float(r.get("point_value", 0.01))
            rate = float(rates.get(cat, r.get("base_rate", 1)))
            pct = rate * point_value
            if pct > best_pct:
                best_pct = pct
                best_card = card.name
                best_est = spent * pct

        recommendations.append({
            "category": cat,
            "spent": round(spent, 2),
            "best_card": best_card,
            "pct": round(best_pct * 100, 1),
            "estimated_rewards": round(best_est, 2),
        })

    # Per-card annual value summary
    card_summaries = []
    for card in cards:
        r = card.rewards or {}
        rates = r.get("rates", {})
        point_value = float(r.get("point_value", 0.01))
        monthly_est = sum(
            spending.get(cat, 0) * float(rates.get(cat, r.get("base_rate", 1))) * point_value
            for cat in CATS
        )
        card_summaries.append({
            "id": card.id,
            "name": card.name,
            "monthly_est": round(monthly_est, 2),
            "annual_est": round(monthly_est * 12, 2),
            "annual_fee": card.annual_fee or 0,
            "net_annual": round(monthly_est * 12 - (card.annual_fee or 0), 2),
        })

    return {
        "month": month,
        "recommendations": recommendations,
        "card_summaries": card_summaries,
    }
