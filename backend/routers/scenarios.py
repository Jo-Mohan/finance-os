from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models

router = APIRouter()


class ScenarioIn(BaseModel):
    label: str = "Custom"
    base_salary: float = 150000
    bonus_pct: float = 10
    savings_rate: float = 30
    side_income: float = 0
    years: int = 20


class ScenarioOut(ScenarioIn):
    id: int
    model_config = {"from_attributes": True}


@router.get("/", response_model=list[ScenarioOut])
def list_scenarios(db: Session = Depends(get_db)):
    return db.query(models.Scenario).all()


@router.post("/", response_model=ScenarioOut)
def create_scenario(body: ScenarioIn, db: Session = Depends(get_db)):
    sc = models.Scenario(**body.model_dump())
    db.add(sc)
    db.commit()
    db.refresh(sc)
    return sc


@router.put("/{id}", response_model=ScenarioOut)
def update_scenario(id: int, body: ScenarioIn, db: Session = Depends(get_db)):
    sc = db.get(models.Scenario, id)
    if not sc:
        raise HTTPException(404)
    for k, v in body.model_dump().items():
        setattr(sc, k, v)
    db.commit()
    db.refresh(sc)
    return sc


@router.delete("/{id}")
def delete_scenario(id: int, db: Session = Depends(get_db)):
    sc = db.get(models.Scenario, id)
    if not sc:
        raise HTTPException(404)
    db.delete(sc)
    db.commit()
    return {"ok": True}


class RSUGrantIn(BaseModel):
    scenario_id: Optional[int] = None
    total_grant: float = 200000
    schedule_type: str = "4yr1cliff"
    start_months: int = 0


class RSUGrantOut(RSUGrantIn):
    id: int
    model_config = {"from_attributes": True}


@router.get("/rsu", response_model=list[RSUGrantOut])
def list_grants(db: Session = Depends(get_db)):
    return db.query(models.RSUGrant).all()


@router.post("/rsu", response_model=RSUGrantOut)
def create_grant(body: RSUGrantIn, db: Session = Depends(get_db)):
    g = models.RSUGrant(**body.model_dump())
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


@router.put("/rsu/{id}", response_model=RSUGrantOut)
def update_grant(id: int, body: RSUGrantIn, db: Session = Depends(get_db)):
    g = db.get(models.RSUGrant, id)
    if not g:
        raise HTTPException(404)
    for k, v in body.model_dump().items():
        setattr(g, k, v)
    db.commit()
    db.refresh(g)
    return g
