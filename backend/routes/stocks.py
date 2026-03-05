from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Player, PlayerStock, GameSetting, GameLog
from schemas import StockTransfer, PlayerStockOut
from typing import List, Optional
import os
import httpx

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

BOT_TOKEN = os.getenv("BOT_TOKEN", "")

# Sentinel for bank: owner_id = None in DB
BANK_ID = 0  # used in API requests; stored as NULL in DB


def _is_bank(owner_id) -> bool:
    return owner_id is None or owner_id == 0


async def _send_telegram(chat_id: int, text: str):
    if not BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
        except Exception:
            pass


def _get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(GameSetting).filter(GameSetting.key == key).first()
    if not setting:
        setting = GameSetting(key=key, value=default)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting.value


def _create_notification(db, player_id, ntype, emoji, title, message):
    from models import Notification
    notif = Notification(
        player_id=player_id,
        notification_type=ntype,
        emoji=emoji,
        title=title,
        message=message,
    )
    db.add(notif)


def _log(db, action_type: str, description: str, player_id=None, player_name=None, amount=None, cycle=None):
    db.add(GameLog(
        action_type=action_type,
        description=description,
        player_id=player_id,
        player_name=player_name,
        amount=round(amount, 2) if amount is not None else None,
        cycle=cycle,
    ))


def _bank_stock_filter(db: Session, target_player_id: int):
    """Query bank-held stock for a target player (owner_id IS NULL)."""
    return db.query(PlayerStock).filter(
        PlayerStock.owner_id == None,  # noqa: E711
        PlayerStock.target_player_id == target_player_id,
    ).first()


@router.get("")
def get_all_stocks(db: Session = Depends(get_db)):
    """Get all stock records with player names, grouped by player."""
    players = db.query(Player).all()
    result = []

    for p in players:
        # Self stock
        self_stock = db.query(PlayerStock).filter(
            PlayerStock.owner_id == p.id,
            PlayerStock.target_player_id == p.id,
        ).first()
        own_pct = self_stock.percentage if self_stock else 100

        # Who holds stocks in this player (excluding self)
        holders = db.query(PlayerStock).filter(
            PlayerStock.target_player_id == p.id,
            PlayerStock.owner_id != p.id,
            PlayerStock.percentage > 0,
        ).all()
        holders_list = []
        for h in holders:
            if _is_bank(h.owner_id):
                holders_list.append({"owner_id": 0, "owner_name": "Банк", "percentage": h.percentage})
            else:
                owner = db.query(Player).filter(Player.id == h.owner_id).first()
                holders_list.append({
                    "owner_id": h.owner_id,
                    "owner_name": owner.name if owner else "?",
                    "percentage": h.percentage,
                })

        result.append({
            "player_id": p.id,
            "player_name": p.name,
            "own_percentage": own_pct,
            "holders": holders_list,
        })

    # Bank holdings (owner_id IS NULL)
    bank_stocks = db.query(PlayerStock).filter(
        PlayerStock.owner_id == None,  # noqa: E711
        PlayerStock.percentage > 0,
    ).all()
    bank_list = []
    for bs in bank_stocks:
        target = db.query(Player).filter(Player.id == bs.target_player_id).first()
        bank_list.append({
            "target_player_id": bs.target_player_id,
            "target_player_name": target.name if target else "?",
            "percentage": bs.percentage,
        })

    return {"players": result, "bank": bank_list}


@router.get("/player/{player_id}")
def get_player_stocks(player_id: int, db: Session = Depends(get_db)):
    """Get stock info for a specific player."""
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(404, "Player not found")

    # Own stocks remaining
    self_stock = db.query(PlayerStock).filter(
        PlayerStock.owner_id == player_id,
        PlayerStock.target_player_id == player_id,
    ).first()
    own_percentage = self_stock.percentage if self_stock else 100

    # Stocks owned by others in this player
    holders = db.query(PlayerStock).filter(
        PlayerStock.target_player_id == player_id,
        PlayerStock.owner_id != player_id,
        PlayerStock.percentage > 0,
    ).all()
    holders_list = []
    for h in holders:
        if _is_bank(h.owner_id):
            holders_list.append({"owner_id": 0, "owner_name": "Банк", "percentage": h.percentage})
        else:
            owner = db.query(Player).filter(Player.id == h.owner_id).first()
            holders_list.append({
                "owner_id": h.owner_id,
                "owner_name": owner.name if owner else "?",
                "percentage": h.percentage,
            })

    # Stocks this player owns in others
    owned = db.query(PlayerStock).filter(
        PlayerStock.owner_id == player_id,
        PlayerStock.target_player_id != player_id,
        PlayerStock.percentage > 0,
    ).all()
    owned_list = []
    for o in owned:
        target = db.query(Player).filter(Player.id == o.target_player_id).first()
        target_revenue = 0.0
        if target:
            for pe in target.enterprises:
                ent = pe.enterprise
                effective = ent.profit * (1 + pe.factory_count * ent.factory_profit_percent / 100)
                target_revenue += effective
        stock_income = target_revenue * (o.percentage / 100)
        owned_list.append({
            "target_player_id": o.target_player_id,
            "target_player_name": target.name if target else "?",
            "percentage": o.percentage,
            "expected_income": round(stock_income, 2),
        })

    return {
        "player_id": player_id,
        "player_name": player.name,
        "own_percentage": own_percentage,
        "holders": holders_list,
        "owned_in_others": owned_list,
    }


@router.post("/transfer")
async def transfer_stock(data: StockTransfer, db: Session = Depends(get_db)):
    """
    Transfer stocks.
    from_id: who gives stocks (player id, or 0=bank)
    to_id: who receives stocks (player id, or 0=bank)
    target_player_id: whose stocks are being transferred
    percentage: how much % to transfer (step 10)
    price_per_share: price per 10% block
    """
    target = db.query(Player).filter(Player.id == data.target_player_id).first()
    if not target:
        raise HTTPException(404, "Target player not found")

    from_id = data.from_id
    to_id = data.to_id
    from_is_bank = _is_bank(from_id)
    to_is_bank = _is_bank(to_id)

    # --- Validate source has enough stocks ---
    if from_is_bank:
        bank_stock = _bank_stock_filter(db, data.target_player_id)
        if not bank_stock or bank_stock.percentage < data.percentage:
            avail = bank_stock.percentage if bank_stock else 0
            raise HTTPException(400, f"Bank only has {avail}% of {target.name}")
    else:
        if from_id != data.target_player_id:
            from_stock = db.query(PlayerStock).filter(
                PlayerStock.owner_id == from_id,
                PlayerStock.target_player_id == data.target_player_id,
            ).first()
        else:
            from_stock = db.query(PlayerStock).filter(
                PlayerStock.owner_id == from_id,
                PlayerStock.target_player_id == from_id,
            ).first()
        if not from_stock or from_stock.percentage < data.percentage:
            avail = from_stock.percentage if from_stock else 0
            raise HTTPException(400, f"Not enough stocks: has {avail}%, need {data.percentage}%")

    # --- Price calculation ---
    stock_price_per_10 = data.price_per_share if data.price_per_share is not None else float(_get_setting(db, "stock_price", "50"))
    total_cost = stock_price_per_10 * (data.percentage / 10)

    # --- Subtract from source ---
    if from_is_bank:
        bank_stock = _bank_stock_filter(db, data.target_player_id)
        bank_stock.percentage = round(bank_stock.percentage - data.percentage, 2)
        if bank_stock.percentage <= 0:
            db.delete(bank_stock)
    else:
        if from_id == data.target_player_id:
            src = db.query(PlayerStock).filter(
                PlayerStock.owner_id == from_id,
                PlayerStock.target_player_id == from_id,
            ).first()
        else:
            src = db.query(PlayerStock).filter(
                PlayerStock.owner_id == from_id,
                PlayerStock.target_player_id == data.target_player_id,
            ).first()
        src.percentage = round(src.percentage - data.percentage, 2)
        if src.percentage <= 0 and from_id != data.target_player_id:
            db.delete(src)

    # --- Add to destination ---
    if to_is_bank:
        bank_stock = _bank_stock_filter(db, data.target_player_id)
        if bank_stock:
            bank_stock.percentage = round(bank_stock.percentage + data.percentage, 2)
        else:
            db.add(PlayerStock(owner_id=None, target_player_id=data.target_player_id, percentage=data.percentage))
    else:
        dest = db.query(PlayerStock).filter(
            PlayerStock.owner_id == to_id,
            PlayerStock.target_player_id == data.target_player_id,
        ).first()
        if dest:
            dest.percentage = round(dest.percentage + data.percentage, 2)
        else:
            db.add(PlayerStock(owner_id=to_id, target_player_id=data.target_player_id, percentage=data.percentage))

    # --- Money transfer ---
    from_player = db.query(Player).filter(Player.id == from_id).first() if not from_is_bank else None
    to_player = db.query(Player).filter(Player.id == to_id).first() if not to_is_bank else None

    if from_is_bank and to_player:
        # Bank -> Player: player pays bank (debit player)
        to_player.money = round(to_player.money - total_cost, 2)
        _create_notification(db, to_id, "stock", "📊",
            "Покупка акций у банка",
            f"Куплено {data.percentage}% акций {target.name}\n-${total_cost:,.0f}")
        if to_player.telegram_id:
            await _send_telegram(to_player.telegram_id,
                f"📊 <b>Покупка акций</b>\n━━━━━━━━━━━━━━━━━━━\n"
                f"Куплено {data.percentage}% акций {target.name}\n💰 -${total_cost:,.0f}")
    elif to_is_bank and from_player:
        # Player -> Bank: player receives money
        from_player.money = round(from_player.money + total_cost, 2)
        _create_notification(db, from_id, "stock", "🏦",
            "Продажа акций банку",
            f"Продано {data.percentage}% акций {target.name}\n+${total_cost:,.0f}")
        if from_player.telegram_id:
            await _send_telegram(from_player.telegram_id,
                f"🏦 <b>Продажа акций банку</b>\n━━━━━━━━━━━━━━━━━━━\n"
                f"Продано {data.percentage}% акций {target.name}\n💰 +${total_cost:,.0f}")
    elif from_player and to_player:
        # Player -> Player
        to_player.money = round(to_player.money - total_cost, 2)
        from_player.money = round(from_player.money + total_cost, 2)
        _create_notification(db, to_id, "stock", "📊",
            "Покупка акций",
            f"Куплено {data.percentage}% акций {target.name} у {from_player.name}\n-${total_cost:,.0f}")
        _create_notification(db, from_id, "stock", "📊",
            "Продажа акций",
            f"{to_player.name} купил {data.percentage}% акций {target.name}\n+${total_cost:,.0f}")

    # Determine names for log entry
    from_name = "Банк" if from_is_bank else (from_player.name if from_player else f"id:{from_id}")
    to_name = "Банк" if to_is_bank else (to_player.name if to_player else f"id:{to_id}")
    # Amount sign: negative = player spends money, positive = player receives money
    if from_is_bank:
        # Bank → Player: player buys (spending) → negative
        log_player_id = to_id if not to_is_bank else None
        log_player_name = to_name if not to_is_bank else None
        log_amount = -total_cost
    elif to_is_bank:
        # Player → Bank: player sells (receiving) → positive
        log_player_id = from_id if not from_is_bank else None
        log_player_name = from_name if not from_is_bank else None
        log_amount = total_cost
    else:
        # Player → Player: buyer (to_player) spends → negative
        log_player_id = to_id
        log_player_name = to_name
        log_amount = -total_cost
    _log(db, "stock_transfer",
         f"{from_name} → {to_name}: {data.percentage}% акций {target.name} за ${total_cost:,.0f}",
         player_id=log_player_id if log_player_id and log_player_id != 0 else None,
         player_name=log_player_name,
         amount=log_amount,
         cycle=int(_get_setting(db, "current_cycle", "0")))

    db.commit()
    return {"ok": True}
