from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models

router = APIRouter()


class BudgetItem(BaseModel):
    category: str
    monthly_limit: float


@router.get("/", response_model=list[BudgetItem])
def get_budgets(db: Session = Depends(get_db)):
    return db.query(models.Budget).all()


@router.put("/")
def upsert_budgets(body: list[BudgetItem], db: Session = Depends(get_db)):
    for item in body:
        existing = db.query(models.Budget).filter(
            models.Budget.category == item.category
        ).first()
        if existing:
            existing.monthly_limit = item.monthly_limit
        else:
            db.add(models.Budget(category=item.category, monthly_limit=item.monthly_limit))
    db.commit()
    return {"ok": True}
