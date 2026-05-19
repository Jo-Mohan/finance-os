from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey
from datetime import datetime, timezone
from database import Base


class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, default="Custom")
    base_salary = Column(Float, default=150000)
    bonus_pct = Column(Float, default=10)
    savings_rate = Column(Float, default=30)
    side_income = Column(Float, default=0)
    years = Column(Integer, default=20)


class RSUGrant(Base):
    __tablename__ = "rsu_grants"
    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=True)
    total_grant = Column(Float, default=200000)
    schedule_type = Column(String, default="4yr1cliff")
    start_months = Column(Integer, default=0)


class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    type = Column(String)  # 'asset' | 'liability'
    institution = Column(String, nullable=True)
    balance = Column(Float, default=0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Card(Base):
    __tablename__ = "cards"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    annual_fee = Column(Float, default=0)
    rewards = Column(JSON, default=dict)
    category_badge = Column(String, nullable=True)
    signup_bonus_amount = Column(Float, nullable=True)
    signup_bonus_spent = Column(Float, nullable=True)
    signup_bonus_deadline = Column(String, nullable=True)


class Budget(Base):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, unique=True)
    monthly_limit = Column(Float, default=0)


class MerchantRule(Base):
    __tablename__ = "merchant_rules"
    id = Column(Integer, primary_key=True, index=True)
    pattern = Column(String, unique=True, index=True)   # normalized merchant text
    category = Column(String, nullable=False)
    source = Column(String, default="user")             # user | llm | seed


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    date = Column(String, index=True)   # YYYY-MM-DD
    amount = Column(Float)              # positive = expense, negative = income/credit
    merchant = Column(String)
    category = Column(String, default="Other")
    card_used = Column(String, nullable=True)
    note = Column(String, nullable=True)
