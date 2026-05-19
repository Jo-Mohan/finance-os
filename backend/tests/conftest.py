import sys
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Ensure backend package root is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.pool import StaticPool
from database import Base
import models  # noqa: F401 — needed so all tables are registered


@pytest.fixture
def db():
    """In-memory SQLite session, rolled back after each test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    """FastAPI test client wired to the in-memory DB."""
    from main import app
    from database import get_db

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def fixture_path(name: str) -> str:
    return os.path.join(os.path.dirname(__file__), "fixtures", name)
