from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models
from csv_import import parse_csv

router = APIRouter()


class TransactionOut(BaseModel):
    id: int
    date: str
    amount: float
    merchant: str
    category: str
    card_used: Optional[str] = None
    note: Optional[str] = None
    model_config = {"from_attributes": True}


@router.get("/", response_model=list[TransactionOut])
def list_transactions(month: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Transaction)
    if month:
        q = q.filter(models.Transaction.date.startswith(month))
    return q.order_by(models.Transaction.date.desc()).limit(500).all()


@router.post("/import")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    raw = await file.read()
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        content = raw.decode("latin-1")

    try:
        rows, fmt = parse_csv(content)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    imported = skipped = 0
    for row in rows:
        exists = db.query(models.Transaction).filter(
            models.Transaction.date == row["date"],
            models.Transaction.merchant == row["merchant"],
            models.Transaction.amount == row["amount"],
        ).first()
        if exists:
            skipped += 1
        else:
            db.add(models.Transaction(**row))
            imported += 1

    db.commit()
    return {"imported": imported, "skipped": skipped, "format": fmt}


@router.delete("/{id}")
def delete_transaction(id: int, db: Session = Depends(get_db)):
    t = db.get(models.Transaction, id)
    if not t:
        raise HTTPException(404)
    db.delete(t)
    db.commit()
    return {"ok": True}
