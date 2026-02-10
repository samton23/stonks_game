import os
from sqlalchemy import inspect, text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from models import GameSetting, Enterprise, Notification
from routes import players, enterprises, settings, game, webapp

# Migrate notifications table if schema changed
_inspector = inspect(engine)
if _inspector.has_table("notifications"):
    existing_cols = {c["name"] for c in _inspector.get_columns("notifications")}
    if "player_id" not in existing_cols:
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE notifications"))

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Stonks Game API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router)
app.include_router(enterprises.router)
app.include_router(settings.router)
app.include_router(game.router)
app.include_router(webapp.router)


@app.on_event("startup")
def seed_defaults():
    db = SessionLocal()
    try:
        # Ensure default settings
        defaults = {
            "rules": "Правила игры будут добавлены организатором.",
            "budget": "10000",
            "current_cycle": "0",
        }
        for key, value in defaults.items():
            existing = db.query(GameSetting).filter(GameSetting.key == key).first()
            if not existing:
                db.add(GameSetting(key=key, value=value))

        # Seed default enterprises if none exist
        if db.query(Enterprise).count() == 0:
            default_enterprises = [
                Enterprise(
                    name="Овощное",
                    emoji="🥬",
                    price=3000,
                    profit=500,
                    profit_cycle_interval=1,
                    factory_price=2000,
                    factory_profit_percent=15,
                ),
                Enterprise(
                    name="Автомобильное",
                    emoji="🚗",
                    price=8000,
                    profit=1500,
                    profit_cycle_interval=2,
                    factory_price=5000,
                    factory_profit_percent=10,
                ),
                Enterprise(
                    name="Фермерское",
                    emoji="🌾",
                    price=5000,
                    profit=800,
                    profit_cycle_interval=1,
                    factory_price=3000,
                    factory_profit_percent=12,
                ),
            ]
            for ent in default_enterprises:
                db.add(ent)

        db.commit()
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
