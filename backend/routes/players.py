import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Player, PlayerEnterprise, Enterprise, PlayerStock, GameSetting
from schemas import PlayerCreate, PlayerOut, PlayerEnterpriseOut

router = APIRouter(prefix="/api/players", tags=["players"])


def _build_player_out(player: Player) -> dict:
    enterprises_out = []
    total_revenue = 0.0
    for pe in player.enterprises:
        ent = pe.enterprise
        effective_profit = ent.profit * (1 + pe.factory_count * ent.factory_profit_percent / 100)
        total_revenue += effective_profit
        enterprises_out.append(PlayerEnterpriseOut(
            id=pe.id,
            enterprise_id=ent.id,
            enterprise_name=ent.name,
            enterprise_emoji=ent.emoji,
            profit=ent.profit,
            factory_count=pe.factory_count,
            factory_profit_percent=ent.factory_profit_percent,
            effective_profit=round(effective_profit, 2),
        ))
    return {
        "id": player.id,
        "telegram_id": player.telegram_id,
        "name": player.name,
        "money": player.money,
        "enterprises": enterprises_out,
        "revenue": round(total_revenue, 2),
    }


@router.get("", response_model=List[PlayerOut])
def list_players(db: Session = Depends(get_db)):
    players = db.query(Player).all()
    return [_build_player_out(p) for p in players]


@router.post("", response_model=PlayerOut)
def create_player(data: PlayerCreate, db: Session = Depends(get_db)):
    existing = db.query(Player).filter(Player.telegram_id == data.telegram_id).first()
    if existing:
        raise HTTPException(400, "Player with this Telegram ID already exists")
    # Get initial budget from settings
    budget_setting = db.query(GameSetting).filter(GameSetting.key == "budget").first()
    initial_budget = float(budget_setting.value) if budget_setting else 10000

    player = Player(
        telegram_id=data.telegram_id,
        name=data.name,
        money=initial_budget,
    )
    db.add(player)
    db.commit()
    db.refresh(player)

    # Create self-stock (100% own shares)
    self_stock = PlayerStock(
        owner_id=player.id,
        target_player_id=player.id,
        percentage=100,
    )
    db.add(self_stock)
    db.commit()

    return _build_player_out(player)


@router.get("/{player_id}", response_model=PlayerOut)
def get_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(404, "Player not found")
    return _build_player_out(player)


@router.delete("/{player_id}")
def delete_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(404, "Player not found")
    db.delete(player)
    db.commit()
    return {"ok": True}


@router.post("/{player_id}/invitation")
async def send_invitation(player_id: int, db: Session = Depends(get_db)):
    """Send invitation link to player via Telegram bot using their Telegram ID."""
    import httpx
    
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(404, "Player not found")
    
    # Get base URL from env
    base_url = os.getenv("WEBAPP_URL", "")
    if not base_url:
        raise HTTPException(500, "WEBAPP_URL not configured")
    # Remove /app suffix if present
    if base_url.endswith("/app"):
        base_url = base_url.replace("/app", "")
    # Use Telegram ID in the link
    invitation_url = f"{base_url}/app?tgid={player.telegram_id}"
    
    # Send invitation link via Telegram bot
    bot_token = os.getenv("BOT_TOKEN", "")
    sent = False
    if bot_token:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={
                        "chat_id": player.telegram_id,
                        "text": (
                            f"🎮  <b>Приглашение в игру</b>\n"
                            f"━━━━━━━━━━━━━━━━━━━\n\n"
                            f"Привет, {player.name}!\n\n"
                            f"Организатор приглашает тебя в игру.\n"
                            f"Открой ссылку ниже, чтобы начать:\n\n"
                            f"<code>{invitation_url}</code>"
                        ),
                        "parse_mode": "HTML",
                    }
                )
                if resp.status_code == 200:
                    sent = True
        except Exception:
            pass  # Silently fail if bot can't send
    
    return {
        "url": invitation_url,
        "sent": sent,
    }
