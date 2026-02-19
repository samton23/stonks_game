from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Player, PlayerStock, GameSetting
from schemas import StockTransfer, PlayerStockOut
from typing import List
import os
import httpx

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

BOT_TOKEN = os.getenv("BOT_TOKEN", "")


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


@router.get("")
def get_all_stocks(db: Session = Depends(get_db)):
    """Get all stock records with player names."""
    stocks = db.query(PlayerStock).all()
    result = []
    for s in stocks:
        owner = db.query(Player).filter(Player.id == s.owner_id).first()
        target = db.query(Player).filter(Player.id == s.target_player_id).first()
        result.append({
            "id": s.id,
            "owner_id": s.owner_id,
            "owner_name": owner.name if owner else "Неизвестно",
            "target_player_id": s.target_player_id,
            "target_player_name": target.name if target else "Неизвестно",
            "percentage": s.percentage,
        })
    return result


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
        owner = db.query(Player).filter(Player.id == h.owner_id).first()
        holders_list.append({
            "owner_id": h.owner_id,
            "owner_name": owner.name if owner else "Неизвестно",
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
        # Calculate expected income from this stock
        target_revenue = 0.0
        if target:
            for pe in target.enterprises:
                ent = pe.enterprise
                effective = ent.profit * (1 + pe.factory_count * ent.factory_profit_percent / 100)
                target_revenue += effective
        stock_income = target_revenue * (o.percentage / 100)
        owned_list.append({
            "target_player_id": o.target_player_id,
            "target_player_name": target.name if target else "Неизвестно",
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
    """Transfer stocks from target_player to buyer."""
    target = db.query(Player).filter(Player.id == data.target_player_id).first()
    if not target:
        raise HTTPException(404, "Target player not found")

    # Find seller's self-stock
    self_stock = db.query(PlayerStock).filter(
        PlayerStock.owner_id == data.target_player_id,
        PlayerStock.target_player_id == data.target_player_id,
    ).first()
    if not self_stock:
        raise HTTPException(400, "Target player has no self-stock record")

    if self_stock.percentage < data.percentage:
        raise HTTPException(400, f"Not enough stocks: has {self_stock.percentage}%, requested {data.percentage}%")

    # Decrease seller's self-stock
    self_stock.percentage = round(self_stock.percentage - data.percentage, 2)

    # Get stock price
    stock_price_per_10 = float(_get_setting(db, "stock_price", "50"))
    price = data.price_override if data.price_override is not None else stock_price_per_10
    total_cost = price * (data.percentage / 10)

    if data.buyer_id > 0:
        # Real buyer
        buyer = db.query(Player).filter(Player.id == data.buyer_id).first()
        if not buyer:
            raise HTTPException(404, "Buyer not found")

        # Find or create buyer's stock in target
        buyer_stock = db.query(PlayerStock).filter(
            PlayerStock.owner_id == data.buyer_id,
            PlayerStock.target_player_id == data.target_player_id,
        ).first()
        if buyer_stock:
            buyer_stock.percentage = round(buyer_stock.percentage + data.percentage, 2)
        else:
            buyer_stock = PlayerStock(
                owner_id=data.buyer_id,
                target_player_id=data.target_player_id,
                percentage=data.percentage,
            )
            db.add(buyer_stock)

        # Money transfer
        buyer.money = round(buyer.money - total_cost, 2)
        target.money = round(target.money + total_cost, 2)

        # Notifications
        _create_notification(
            db, data.buyer_id, "stock", "📊",
            "Покупка акций",
            f"Куплено {data.percentage}% акций {target.name}\n-${total_cost:,.0f} • Баланс: ${buyer.money:,.0f}",
        )
        _create_notification(
            db, data.target_player_id, "stock", "📊",
            "Продажа акций",
            f"{buyer.name} купил {data.percentage}% ваших акций\n+${total_cost:,.0f} • Баланс: ${target.money:,.0f}",
        )

        # Telegram
        await _send_telegram(buyer.telegram_id,
            f"📊 <b>Покупка акций</b>\n━━━━━━━━━━━━━━━━━━━\n\n"
            f"Куплено {data.percentage}% акций {target.name}\n"
            f"💰 -{total_cost:,.0f}\n💵 Баланс: <b>${buyer.money:,.0f}</b>")
        await _send_telegram(target.telegram_id,
            f"📊 <b>Продажа акций</b>\n━━━━━━━━━━━━━━━━━━━\n\n"
            f"{buyer.name} купил {data.percentage}% ваших акций\n"
            f"💰 +${total_cost:,.0f}\n💵 Баланс: <b>${target.money:,.0f}</b>")
    else:
        # Bank purchase (no money transfer)
        _create_notification(
            db, data.target_player_id, "stock", "🏦",
            "Продажа акций банку",
            f"Банк купил {data.percentage}% ваших акций",
        )

    db.commit()
    return {"ok": True}
