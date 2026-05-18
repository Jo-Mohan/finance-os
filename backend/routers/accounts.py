from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models

router = APIRouter()


class AccountIn(BaseModel):
    name: str
    type: str  # 'asset' | 'liability'
    institution: Optional[str] = None
    balance: float = 0


class AccountOut(AccountIn):
    id: int
    model_config = {"from_attributes": True}


@router.get("/", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).all()


@router.post("/", response_model=AccountOut)
def create_account(body: AccountIn, db: Session = Depends(get_db)):
    acc = models.Account(**body.model_dump())
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.put("/{id}", response_model=AccountOut)
def update_account(id: int, body: AccountIn, db: Session = Depends(get_db)):
    acc = db.get(models.Account, id)
    if not acc:
        raise HTTPException(404)
    for k, v in body.model_dump().items():
        setattr(acc, k, v)
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/{id}")
def delete_account(id: int, db: Session = Depends(get_db)):
    acc = db.get(models.Account, id)
    if not acc:
        raise HTTPException(404)
    db.delete(acc)
    db.commit()
    return {"ok": True}
