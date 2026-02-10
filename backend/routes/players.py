from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Player, PlayerEnterprise, Enterprise
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
    player = Player(telegram_id=data.telegram_id, name=data.name, money=0)
    db.add(player)
    db.commit()
    db.refresh(player)
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
