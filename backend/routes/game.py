import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Player, Enterprise, PlayerEnterprise, GameSetting, Notification
from schemas import MoneyAdjust, SendNotification, FactoryAdjust, DashboardPlayer
from typing import List

router = APIRouter(prefix="/api/game", tags=["game"])

BOT_TOKEN = os.getenv("BOT_TOKEN", "")


async def send_telegram_message(chat_id: int, text: str):
    if not BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
            })
        except Exception:
            pass


def _create_notification(
    db: Session, player_id: int,
    notification_type: str, emoji: str, title: str, message: str,
):
    notif = Notification(
        player_id=player_id,
        notification_type=notification_type,
        emoji=emoji,
        title=title,
        message=message,
    )
    db.add(notif)


def _get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(GameSetting).filter(GameSetting.key == key).first()
    if not setting:
        setting = GameSetting(key=key, value=default)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting.value


def _calc_revenue(player: Player) -> float:
    total = 0.0
    for pe in player.enterprises:
        ent = pe.enterprise
        effective = ent.profit * (1 + pe.factory_count * ent.factory_profit_percent / 100)
        total += effective
    return round(total, 2)


def _build_player_detail(player: Player) -> dict:
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
        "enterprises": enterprises,
    }


@router.get("/state")
def get_game_state(db: Session = Depends(get_db)):
    current_cycle = int(_get_setting(db, "current_cycle", "0"))
    players = db.query(Player).all()
    return {
        "current_cycle": current_cycle,
        "players": [_build_player_detail(p) for p in players],
    }


@router.post("/cycle/advance")
async def advance_cycle(db: Session = Depends(get_db)):
    setting = db.query(GameSetting).filter(GameSetting.key == "current_cycle").first()
    if not setting:
        setting = GameSetting(key="current_cycle", value="0")
        db.add(setting)
        db.commit()
        db.refresh(setting)

    current_cycle = int(setting.value) + 1
    setting.value = str(current_cycle)
    db.commit()

    # Calculate profits
    players = db.query(Player).all()
    for player in players:
        cycle_profit = 0.0
        details = []
        for pe in player.enterprises:
            ent = pe.enterprise
            if current_cycle % ent.profit_cycle_interval == 0:
                effective = ent.profit * (1 + pe.factory_count * ent.factory_profit_percent / 100)
                cycle_profit += effective
                details.append(f"{ent.emoji} {ent.name}: +${effective:,.0f}")

        if cycle_profit > 0:
            player.money = round(player.money + cycle_profit, 2)

        # In-app notification
        if cycle_profit > 0:
            detail_text = "\n".join(details)
            _create_notification(
                db, player.id, "cycle", "🔄",
                f"Цикл {current_cycle}",
                f"+${cycle_profit:,.0f} дохода\n{detail_text}",
            )
        else:
            _create_notification(
                db, player.id, "cycle", "🔄",
                f"Цикл {current_cycle}",
                "Нет дохода в этом цикле",
            )

        # Telegram message
        msg_lines = [f"🔄  <b>Цикл {current_cycle}</b>", "━━━━━━━━━━━━━━━━━━━", ""]
        if details:
            msg_lines.append("📈  Доход за цикл:")
            msg_lines.append("")
            for d in details:
                msg_lines.append(f"    {d}")
            msg_lines.append("")
            msg_lines.append(f"💰  <b>+${cycle_profit:,.0f}</b>")
        else:
            msg_lines.append("📊  Нет дохода в этом цикле")
        msg_lines.append("")
        msg_lines.append(f"💵  Баланс:  <b>${player.money:,.0f}</b>")
        await send_telegram_message(player.telegram_id, "\n".join(msg_lines))

    db.commit()
    return {"ok": True, "current_cycle": current_cycle}


@router.post("/cycle/set")
def set_cycle(data: dict, db: Session = Depends(get_db)):
    cycle = data.get("cycle", 0)
    setting = db.query(GameSetting).filter(GameSetting.key == "current_cycle").first()
    if not setting:
        setting = GameSetting(key="current_cycle", value=str(cycle))
        db.add(setting)
    else:
        setting.value = str(cycle)
    db.commit()
    return {"ok": True, "current_cycle": cycle}


@router.post("/players/{player_id}/enterprises/{enterprise_id}")
def add_enterprise_to_player(player_id: int, enterprise_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(404, "Player not found")
    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not enterprise:
        raise HTTPException(404, "Enterprise not found")

    existing = db.query(PlayerEnterprise).filter(
        PlayerEnterprise.player_id == player_id,
        PlayerEnterprise.enterprise_id == enterprise_id,
    ).first()
    if existing:
        raise HTTPException(400, "Player already has this enterprise")

    # Deduct enterprise price
    player.money = round(player.money - enterprise.price, 2)

    pe = PlayerEnterprise(player_id=player_id, enterprise_id=enterprise_id, factory_count=0)
    db.add(pe)

    _create_notification(
        db, player_id, "enterprise", enterprise.emoji,
        "Новое предприятие!",
        f"Вам добавлено: {enterprise.name}\n-${enterprise.price:,.0f} • Баланс: ${player.money:,.0f}",
    )

    db.commit()
    return {"ok": True}


@router.delete("/players/{player_id}/enterprises/{enterprise_id}")
def remove_enterprise_from_player(player_id: int, enterprise_id: int, db: Session = Depends(get_db)):
    pe = db.query(PlayerEnterprise).filter(
        PlayerEnterprise.player_id == player_id,
        PlayerEnterprise.enterprise_id == enterprise_id,
    ).first()
    if not pe:
        raise HTTPException(404, "Player does not have this enterprise")

    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    ent_name = enterprise.name if enterprise else "Предприятие"

    db.delete(pe)

    _create_notification(
        db, player_id, "enterprise", "🚫",
        "Предприятие убрано",
        f"Удалено: {ent_name}",
    )

    db.commit()
    return {"ok": True}


@router.post("/players/{player_id}/enterprises/{enterprise_id}/factories/add")
def add_factory(player_id: int, enterprise_id: int, data: FactoryAdjust, db: Session = Depends(get_db)):
    pe = db.query(PlayerEnterprise).filter(
        PlayerEnterprise.player_id == player_id,
        PlayerEnterprise.enterprise_id == enterprise_id,
    ).first()
    if not pe:
        raise HTTPException(404, "Player enterprise not found")

    player = db.query(Player).filter(Player.id == player_id).first()
    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    ent_name = enterprise.name if enterprise else "предприятие"

    # Deduct factory price × count
    cost = enterprise.factory_price * data.count if enterprise else 0
    if player and cost > 0:
        player.money = round(player.money - cost, 2)

    pe.factory_count = max(0, pe.factory_count + data.count)

    _create_notification(
        db, player_id, "factory", "🏗",
        "Новый завод!",
        f"+{data.count} завод для {ent_name}\n-${cost:,.0f} • Баланс: ${player.money:,.0f}" if player else f"+{data.count} завод для {ent_name}",
    )

    db.commit()
    return {"ok": True, "factory_count": pe.factory_count}


@router.post("/players/{player_id}/enterprises/{enterprise_id}/factories/remove")
def remove_factory(player_id: int, enterprise_id: int, data: FactoryAdjust, db: Session = Depends(get_db)):
    pe = db.query(PlayerEnterprise).filter(
        PlayerEnterprise.player_id == player_id,
        PlayerEnterprise.enterprise_id == enterprise_id,
    ).first()
    if not pe:
        raise HTTPException(404, "Player enterprise not found")
    pe.factory_count = max(0, pe.factory_count - data.count)

    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    ent_name = enterprise.name if enterprise else "предприятие"

    _create_notification(
        db, player_id, "factory", "🔧",
        "Завод убран",
        f"-{data.count} завод у {ent_name}\nОсталось заводов: {pe.factory_count}",
    )

    db.commit()
    return {"ok": True, "factory_count": pe.factory_count}


@router.post("/players/{player_id}/money")
async def adjust_money(player_id: int, data: MoneyAdjust, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(404, "Player not found")

    player.money = round(player.money + data.amount, 2)

    is_positive = data.amount >= 0
    sign = "+" if is_positive else ""
    emoji = "📈" if is_positive else "📉"
    ntype = "money_plus" if is_positive else "money_minus"
    title = "Пополнение" if is_positive else "Списание"
    msg = f"{sign}${data.amount:,.0f}"
    if data.reason:
        msg += f"\n{data.reason}"

    _create_notification(db, player_id, ntype, emoji, title, msg)

    # Telegram message
    msg_lines = [
        f"{emoji}  <b>Изменение баланса</b>",
        "━━━━━━━━━━━━━━━━━━━", "",
        f"💰  {sign}${data.amount:,.0f}",
    ]
    if data.reason:
        msg_lines.append(f"📝  {data.reason}")
    msg_lines.append("")
    msg_lines.append(f"💵  Новый баланс:  <b>${player.money:,.0f}</b>")
    await send_telegram_message(player.telegram_id, "\n".join(msg_lines))

    db.commit()
    return {"ok": True, "money": player.money}


@router.post("/players/{player_id}/notify")
async def notify_player(player_id: int, data: SendNotification, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(404, "Player not found")

    _create_notification(db, player_id, "message", "📢", "Сообщение от организатора", data.message)

    msg = f"📢  <b>Уведомление</b>\n━━━━━━━━━━━━━━━━━━━\n\n{data.message}"
    await send_telegram_message(player.telegram_id, msg)

    db.commit()
    return {"ok": True}


@router.get("/dashboard", response_model=List[DashboardPlayer])
def get_dashboard(db: Session = Depends(get_db)):
    players = db.query(Player).all()
    result = []
    for p in players:
        revenue = _calc_revenue(p)
        total_factories = sum(pe.factory_count for pe in p.enterprises)
        result.append(DashboardPlayer(
            id=p.id,
            name=p.name,
            money=p.money,
            revenue=revenue,
            enterprises_count=len(p.enterprises),
            factories_count=total_factories,
        ))
    result.sort(key=lambda x: x.revenue, reverse=True)
    return result


# --- Bot endpoints ---
@router.get("/bot/player/{telegram_id}")
def get_player_by_telegram(telegram_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.telegram_id == telegram_id).first()
    if not player:
        raise HTTPException(404, "Player not found")
    current_cycle = int(_get_setting(db, "current_cycle", "0"))
    detail = _build_player_detail(player)
    detail["current_cycle"] = current_cycle
    return detail


@router.get("/bot/rules")
def get_rules_for_bot(db: Session = Depends(get_db)):
    return {"rules": _get_setting(db, "rules", "Правила ещё не установлены.")}


@router.get("/bot/prices")
def get_prices_for_bot(db: Session = Depends(get_db)):
    enterprises = db.query(Enterprise).all()
    return [{
        "name": e.name, "emoji": e.emoji,
        "price": e.price, "factory_price": e.factory_price,
    } for e in enterprises]


@router.post("/reset")
async def reset_game(db: Session = Depends(get_db)):
    """Reset the game: set cycle to 0, give all players the starting budget, remove all enterprises."""
    budget = float(_get_setting(db, "budget", "10000"))

    setting = db.query(GameSetting).filter(GameSetting.key == "current_cycle").first()
    if setting:
        setting.value = "0"
    else:
        db.add(GameSetting(key="current_cycle", value="0"))

    players = db.query(Player).all()
    for player in players:
        player.money = budget
        db.query(PlayerEnterprise).filter(PlayerEnterprise.player_id == player.id).delete()

        _create_notification(
            db, player.id, "reset", "🔄",
            "Игра сброшена!",
            f"Начальный бюджет: ${budget:,.0f}",
        )

        await send_telegram_message(
            player.telegram_id,
            "🔄  <b>Игра сброшена!</b>\n━━━━━━━━━━━━━━━━━━━\n\n💰  Начальный бюджет:  <b>${:,.0f}</b>".format(budget)
        )

    db.commit()
    return {"ok": True}
