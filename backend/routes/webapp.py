import os
import hashlib
import hmac
import json
from urllib.parse import parse_qs, unquote
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Player, Enterprise, GameSetting, Notification, PlayerStock

router = APIRouter(prefix="/api/webapp", tags=["webapp"])

BOT_TOKEN = os.getenv("BOT_TOKEN", "")


def validate_init_data(init_data: str) -> dict | None:
    """Validate Telegram WebApp initData and return parsed data."""
    if not BOT_TOKEN or not init_data:
        return None

    try:
        parsed = parse_qs(init_data, keep_blank_values=True)
        received_hash = parsed.get("hash", [None])[0]
        if not received_hash:
            return None

        data_pairs = []
        for key, values in parsed.items():
            if key == "hash":
                continue
            data_pairs.append(f"{key}={values[0]}")
        data_pairs.sort()
        data_check_string = "\n".join(data_pairs)

        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        if computed_hash != received_hash:
            return None

        user_raw = parsed.get("user", [None])[0]
        if not user_raw:
            return None

        user = json.loads(unquote(user_raw))
        return user

    except Exception:
        return None


def _get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(GameSetting).filter(GameSetting.key == key).first()
    if not setting:
        setting = GameSetting(key=key, value=default)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting.value


def _resolve_player(body: dict, db: Session) -> Player:
    """Authenticate via initData or telegram_id and return Player."""
    init_data = body.get("initData", "")
    user = validate_init_data(init_data)

    if not user:
        dev_id = body.get("telegram_id")
        if dev_id:
            user = {"id": int(dev_id)}
        else:
            # Try browser token auth
            browser_token = body.get("browser_token")
            if browser_token:
                player = db.query(Player).filter(Player.browser_token == browser_token).first()
                if not player:
                    raise HTTPException(401, "Invalid browser token")
                return player
            raise HTTPException(401, "Invalid initData")

    telegram_id = user.get("id")
    if not telegram_id:
        raise HTTPException(401, "No user ID in initData")

    player = db.query(Player).filter(Player.telegram_id == telegram_id).first()
    if not player:
        raise HTTPException(403, "not_registered")
    return player


def _calc_revenue(player: Player) -> float:
    total = 0.0
    for pe in player.enterprises:
        ent = pe.enterprise
        effective = ent.profit * (1 + pe.factory_count * ent.factory_profit_percent / 100)
        total += effective
    return round(total, 2)


@router.post("/auth")
def webapp_auth(body: dict, db: Session = Depends(get_db)):
    """Authenticate via Telegram WebApp initData or telegram_id and return player profile."""
    player = _resolve_player(body, db)
    current_cycle = int(_get_setting(db, "current_cycle", "0"))

    enterprises = []
    for pe in player.enterprises:
        ent = pe.enterprise
        effective = ent.profit * (1 + pe.factory_count * ent.factory_profit_percent / 100)
        enterprises.append({
            "id": pe.id,
            "enterprise_id": ent.id,
            "enterprise_name": ent.name,
            "enterprise_emoji": ent.emoji,
            "profit": ent.profit,
            "profit_cycle_interval": ent.profit_cycle_interval,
            "factory_count": pe.factory_count,
            "factory_profit_percent": ent.factory_profit_percent,
            "effective_profit": round(effective, 2),
        })

    return {
        "id": player.id,
        "telegram_id": player.telegram_id,
        "name": player.name,
        "money": player.money,
        "revenue": _calc_revenue(player),
        "current_cycle": current_cycle,
        "enterprises": enterprises,
    }


@router.get("/rules")
def get_rules(db: Session = Depends(get_db)):
    return {"rules": _get_setting(db, "rules", "Правила ещё не установлены.")}


@router.get("/prices")
def get_prices(db: Session = Depends(get_db)):
    enterprises = db.query(Enterprise).all()
    return [{
        "id": e.id,
        "name": e.name,
        "emoji": e.emoji,
        "price": e.price,
        "profit": e.profit,
        "profit_cycle_interval": e.profit_cycle_interval,
        "factory_price": e.factory_price,
        "factory_profit_percent": e.factory_profit_percent,
    } for e in enterprises]


@router.post("/stocks")
def get_player_stocks(body: dict, db: Session = Depends(get_db)):
    """Return stock data for the authenticated player.
    Stock value = target player's final budget * stock%.
    Estimated yield = (target budget + target revenue/cycle * remaining_cycles) * stock%.
    """
    player = _resolve_player(body, db)

    current_cycle = int(_get_setting(db, "current_cycle", "0"))
    total_cycles = int(_get_setting(db, "total_cycles", "12"))
    remaining_cycles = max(0, total_cycles - current_cycle)

    # Own stocks
    self_stock = db.query(PlayerStock).filter(
        PlayerStock.owner_id == player.id,
        PlayerStock.target_player_id == player.id,
    ).first()
    own_percentage = self_stock.percentage if self_stock else 100

    # Stocks owned in other players
    owned_in_others = db.query(PlayerStock).filter(
        PlayerStock.owner_id == player.id,
        PlayerStock.target_player_id != player.id,
        PlayerStock.percentage > 0,
    ).all()

    owned_list = []
    total_estimated = 0.0
    for o in owned_in_others:
        target = db.query(Player).filter(Player.id == o.target_player_id).first()
        target_revenue = 0.0
        target_budget = 0.0
        if target:
            target_budget = target.money
            for pe in target.enterprises:
                ent = pe.enterprise
                effective = ent.profit * (1 + pe.factory_count * ent.factory_profit_percent / 100)
                target_revenue += effective / ent.profit_cycle_interval
        # Estimated yield = (target budget + target revenue/cycle * remaining) * stock%
        estimated_target_final = target_budget + target_revenue * remaining_cycles
        estimated_yield = estimated_target_final * (o.percentage / 100)
        total_estimated += estimated_yield
        owned_list.append({
            "target_player_id": o.target_player_id,
            "target_player_name": target.name if target else "Неизвестно",
            "percentage": o.percentage,
            "target_budget": round(target_budget, 2),
            "target_revenue_per_cycle": round(target_revenue, 2),
            "estimated_yield": round(estimated_yield, 2),
        })

    return {
        "own_percentage": own_percentage,
        "owned_in_others": owned_list,
        "total_estimated_yield": round(total_estimated, 2),
        "remaining_cycles": remaining_cycles,
    }


@router.post("/notifications")
def get_notifications(body: dict, db: Session = Depends(get_db)):
    """Return unread notifications for the authenticated player."""
    player = _resolve_player(body, db)

    notifications = (
        db.query(Notification)
        .filter(Notification.player_id == player.id, Notification.is_read == False)
        .order_by(Notification.created_at.asc())
        .limit(20)
        .all()
    )

    result = []
    for n in notifications:
        result.append({
            "id": n.id,
            "type": n.notification_type,
            "emoji": n.emoji,
            "title": n.title,
            "message": n.message,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })

    return result


@router.post("/notifications/read")
def mark_notifications_read(body: dict, db: Session = Depends(get_db)):
    """Mark specific notifications as read."""
    player = _resolve_player(body, db)
    ids = body.get("ids", [])
    if not ids:
        return {"ok": True}

    db.query(Notification).filter(
        Notification.player_id == player.id,
        Notification.id.in_(ids),
    ).update({Notification.is_read: True}, synchronize_session="fetch")
    db.commit()
    return {"ok": True}
