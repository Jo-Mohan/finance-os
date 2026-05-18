from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any
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
