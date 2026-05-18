from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models
from routers import scenarios, accounts, cards, transactions, budgets

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finance OS API", version="0.3.0")


@app.on_event("startup")
async def on_startup():
    from seed import seed_if_empty
    seed_if_empty()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scenarios.router, prefix="/scenarios", tags=["scenarios"])
app.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
app.include_router(cards.router, prefix="/cards", tags=["cards"])
app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
app.include_router(budgets.router, prefix="/budgets", tags=["budgets"])


@app.get("/health")
def health():
    return {"status": "ok"}
