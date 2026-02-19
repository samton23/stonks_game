import os
import time
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Player, Enterprise, PlayerEnterprise, GameSetting, Notification, PlayerStock, Event
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


def _set_setting(db: Session, key: str, value: str):
    setting = db.query(GameSetting).filter(GameSetting.key == key).first()
    if not setting:
        setting = GameSetting(key=key, value=value)
        db.add(setting)
    else:
        setting.value = value


def _calc_revenue(player: Player) -> float:
    total = 0.0
    for pe in player.enterprises:
        ent = pe.enterprise
        effective = ent.profit * (1 + pe.factory_count * ent.factory_profit_percent / 100)
        total += effective
    return round(total, 2)


def _get_event_modifier(enterprise_id: int, active_events: list) -> float:
    """Calculate combined event modifier for an enterprise."""
    modifier = 1.0
    for event in active_events:
        affected = event.affected_enterprises
        if affected == "all":
            modifier *= event.profit_modifier
        else:
            try:
                ids = json.loads(affected)
                if enterprise_id in ids:
                    modifier *= event.profit_modifier
            except (json.JSONDecodeError, TypeError):
                pass
    return modifier


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


# ──────────────────────────────────────────────
#  GAME STATE
# ──────────────────────────────────────────────

@router.get("/state")
def get_game_state(db: Session = Depends(get_db)):
    current_cycle = int(_get_setting(db, "current_cycle", "0"))
    players = db.query(Player).all()
    return {
        "current_cycle": current_cycle,
        "players": [_build_player_detail(p) for p in players],
    }


# ──────────────────────────────────────────────
#  TIMERS
# ──────────────────────────────────────────────

@router.get("/timers")
def get_timers(db: Session = Depends(get_db)):
    """Return timer state for frontend."""
    return {
        "timer_running": _get_setting(db, "timer_running", "false") == "true",
        "game_timer_end": float(_get_setting(db, "game_timer_end", "0")),
        "cycle_timer_end": float(_get_setting(db, "cycle_timer_end", "0")),
        "game_timer_remaining": float(_get_setting(db, "game_timer_remaining", "3600")),
        "cycle_timer_remaining": float(_get_setting(db, "cycle_timer_remaining", "300")),
        "game_timer_duration": float(_get_setting(db, "game_timer_duration", "3600")),
        "cycle_timer_duration": float(_get_setting(db, "cycle_timer_duration", "300")),
    }


@router.post("/timers/start")
def start_timers(db: Session = Depends(get_db)):
    """Start both timers."""
    now_ms = time.time() * 1000

    game_remaining = float(_get_setting(db, "game_timer_remaining", "3600"))
    cycle_remaining = float(_get_setting(db, "cycle_timer_remaining", "300"))

    # If remaining is 0, use full duration
    if game_remaining <= 0:
        game_remaining = float(_get_setting(db, "game_timer_duration", "3600"))
    if cycle_remaining <= 0:
        cycle_remaining = float(_get_setting(db, "cycle_timer_duration", "300"))

    _set_setting(db, "timer_running", "true")
    _set_setting(db, "game_timer_end", str(now_ms + game_remaining * 1000))
    _set_setting(db, "cycle_timer_end", str(now_ms + cycle_remaining * 1000))
    _set_setting(db, "game_timer_remaining", "0")
    _set_setting(db, "cycle_timer_remaining", "0")

    db.commit()
    return {"ok": True}


@router.post("/timers/pause")
def pause_timers(db: Session = Depends(get_db)):
    """Pause both timers."""
    now_ms = time.time() * 1000

    game_end = float(_get_setting(db, "game_timer_end", "0"))
    cycle_end = float(_get_setting(db, "cycle_timer_end", "0"))

    game_remaining = max(0, (game_end - now_ms) / 1000) if game_end > 0 else 0
    cycle_remaining = max(0, (cycle_end - now_ms) / 1000) if cycle_end > 0 else 0

    _set_setting(db, "timer_running", "false")
    _set_setting(db, "game_timer_end", "0")
    _set_setting(db, "cycle_timer_end", "0")
    _set_setting(db, "game_timer_remaining", str(round(game_remaining, 1)))
    _set_setting(db, "cycle_timer_remaining", str(round(cycle_remaining, 1)))

    db.commit()
    return {"ok": True}


@router.post("/timers/reset-game")
def reset_game_timer(db: Session = Depends(get_db)):
    """Reset game timer to full duration."""
    duration = float(_get_setting(db, "game_timer_duration", "3600"))
    is_running = _get_setting(db, "timer_running", "false") == "true"

    if is_running:
        now_ms = time.time() * 1000
        _set_setting(db, "game_timer_end", str(now_ms + duration * 1000))
        _set_setting(db, "game_timer_remaining", "0")
    else:
        _set_setting(db, "game_timer_remaining", str(duration))
        _set_setting(db, "game_timer_end", "0")

    db.commit()
    return {"ok": True}


@router.post("/timers/reset-cycle")
def reset_cycle_timer(db: Session = Depends(get_db)):
    """Reset cycle timer to full duration."""
    duration = float(_get_setting(db, "cycle_timer_duration", "300"))
    is_running = _get_setting(db, "timer_running", "false") == "true"

    if is_running:
        now_ms = time.time() * 1000
        _set_setting(db, "cycle_timer_end", str(now_ms + duration * 1000))
        _set_setting(db, "cycle_timer_remaining", "0")
    else:
        _set_setting(db, "cycle_timer_remaining", str(duration))
        _set_setting(db, "cycle_timer_end", "0")

    db.commit()
    return {"ok": True}


# ──────────────────────────────────────────────
#  CYCLE MANAGEMENT
# ──────────────────────────────────────────────

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

    # Get active events
    active_events = db.query(Event).filter(Event.is_active == True, Event.remaining_cycles > 0).all()

    # Calculate gross revenue for each player (before stock distribution)
    players = db.query(Player).all()
    player_gross_revenues = {}

    for player in players:
        gross_revenue = 0.0
        details = []
        for pe in player.enterprises:
            ent = pe.enterprise
            if current_cycle % ent.profit_cycle_interval == 0:
                base_profit = ent.profit * (1 + pe.factory_count * ent.factory_profit_percent / 100)
                event_mod = _get_event_modifier(ent.id, active_events)
                effective = base_profit * event_mod
                gross_revenue += effective
                mod_text = f" (x{event_mod:.1f})" if event_mod != 1.0 else ""
                details.append(f"{ent.emoji} {ent.name}: +${effective:,.0f}{mod_text}")

        player_gross_revenues[player.id] = {
            "gross": gross_revenue,
            "details": details,
        }

    # Distribute revenue according to stock ownership
    for player in players:
        gross = player_gross_revenues[player.id]["gross"]
        details = player_gross_revenues[player.id]["details"]

        if gross > 0:
            # Get all stock holders for this player
            stock_holders = db.query(PlayerStock).filter(
                PlayerStock.target_player_id == player.id,
                PlayerStock.percentage > 0,
            ).all()

            for stock in stock_holders:
                share = gross * (stock.percentage / 100)
                if share > 0:
                    owner = db.query(Player).filter(Player.id == stock.owner_id).first()
                    if owner:
                        owner.money = round(owner.money + share, 2)

                        if stock.owner_id == player.id:
                            # Self-income notification (existing pattern)
                            pass
                        else:
                            # Stock income notification for external holder
                            _create_notification(
                                db, stock.owner_id, "stock", "📊",
                                f"Доход от акций (цикл {current_cycle})",
                                f"+${share:,.0f} от акций {player.name} ({stock.percentage}%)",
                            )

            # Notification for the player about their own cycle income
            self_stock = db.query(PlayerStock).filter(
                PlayerStock.owner_id == player.id,
                PlayerStock.target_player_id == player.id,
            ).first()
            own_pct = self_stock.percentage if self_stock else 100
            own_income = gross * (own_pct / 100)

            detail_text = "\n".join(details)
            _create_notification(
                db, player.id, "cycle", "🔄",
                f"Цикл {current_cycle}",
                f"+${own_income:,.0f} дохода ({own_pct}% своих акций)\n{detail_text}",
            )
        else:
            _create_notification(
                db, player.id, "cycle", "🔄",
                f"Цикл {current_cycle}",
                "Нет дохода в этом цикле",
            )

        # Telegram message
        gross = player_gross_revenues[player.id]["gross"]
        details = player_gross_revenues[player.id]["details"]
        msg_lines = [f"🔄  <b>Цикл {current_cycle}</b>", "━━━━━━━━━━━━━━━━━━━", ""]
        if details:
            msg_lines.append("📈  Доход за цикл:")
            msg_lines.append("")
            for d in details:
                msg_lines.append(f"    {d}")
            msg_lines.append("")

            self_stock = db.query(PlayerStock).filter(
                PlayerStock.owner_id == player.id,
                PlayerStock.target_player_id == player.id,
            ).first()
            own_pct = self_stock.percentage if self_stock else 100
            own_income = gross * (own_pct / 100)
            msg_lines.append(f"💰  <b>+${own_income:,.0f}</b> (ваши {own_pct}%)")
        else:
            msg_lines.append("📊  Нет дохода в этом цикле")
        msg_lines.append("")
        msg_lines.append(f"💵  Баланс:  <b>${player.money:,.0f}</b>")
        await send_telegram_message(player.telegram_id, "\n".join(msg_lines))

    # Decrement event remaining_cycles
    for event in active_events:
        event.remaining_cycles -= 1
        if event.remaining_cycles <= 0:
            event.is_active = False

    # Reset cycle timer
    is_running = _get_setting(db, "timer_running", "false") == "true"
    cycle_duration = float(_get_setting(db, "cycle_timer_duration", "300"))
    if is_running:
        now_ms = time.time() * 1000
        _set_setting(db, "cycle_timer_end", str(now_ms + cycle_duration * 1000))
        _set_setting(db, "cycle_timer_remaining", "0")
    else:
        _set_setting(db, "cycle_timer_remaining", str(cycle_duration))
        _set_setting(db, "cycle_timer_end", "0")
        # Also start timers when advancing cycle
        now_ms = time.time() * 1000
        game_remaining = float(_get_setting(db, "game_timer_remaining", "3600"))
        if game_remaining > 0:
            _set_setting(db, "timer_running", "true")
            _set_setting(db, "game_timer_end", str(now_ms + game_remaining * 1000))
            _set_setting(db, "game_timer_remaining", "0")
            _set_setting(db, "cycle_timer_end", str(now_ms + cycle_duration * 1000))
            _set_setting(db, "cycle_timer_remaining", "0")

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


# ──────────────────────────────────────────────
#  ENTERPRISE MANAGEMENT
# ──────────────────────────────────────────────

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

    # Deduct factory price * count
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


# ──────────────────────────────────────────────
#  MONEY & NOTIFICATIONS
# ──────────────────────────────────────────────

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


# ──────────────────────────────────────────────
#  DASHBOARD / LEADERBOARD
# ──────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    players = db.query(Player).all()

    # Calculate remaining cycles from game timer
    game_timer_end = float(_get_setting(db, "game_timer_end", "0"))
    game_timer_remaining_s = float(_get_setting(db, "game_timer_remaining", "3600"))
    cycle_timer_duration = float(_get_setting(db, "cycle_timer_duration", "300"))
    is_running = _get_setting(db, "timer_running", "false") == "true"

    now_ms = time.time() * 1000
    if is_running and game_timer_end > 0:
        game_remaining_s = max(0, (game_timer_end - now_ms) / 1000)
    else:
        game_remaining_s = game_timer_remaining_s

    remaining_cycles = game_remaining_s / cycle_timer_duration if cycle_timer_duration > 0 else 0

    # Get active events
    active_events = db.query(Event).filter(Event.is_active == True, Event.remaining_cycles > 0).all()

    def calc_future_income(player_obj):
        """Calculate future income for a player considering event durations."""
        total = 0.0
        for pe in player_obj.enterprises:
            ent = pe.enterprise
            base_profit = ent.profit * (1 + pe.factory_count * ent.factory_profit_percent / 100)
            profit_per_cycle = base_profit / ent.profit_cycle_interval

            # For each active event affecting this enterprise,
            # compute income in two periods: during event and after event
            combined_modifier = 1.0
            min_event_remaining = remaining_cycles  # shortest event duration remaining

            applicable_events = []
            for event in active_events:
                affected = event.affected_enterprises
                applies = False
                if affected == "all":
                    applies = True
                else:
                    try:
                        ids = json.loads(affected)
                        if ent.id in ids:
                            applies = True
                    except (json.JSONDecodeError, TypeError):
                        pass
                if applies:
                    applicable_events.append(event)

            if applicable_events:
                # Simplified: use the shortest event remaining for split calculation
                # and multiply modifiers together
                modifier = 1.0
                shortest_remaining = remaining_cycles
                for evt in applicable_events:
                    modifier *= evt.profit_modifier
                    shortest_remaining = min(shortest_remaining, evt.remaining_cycles)

                event_cycles = min(shortest_remaining, remaining_cycles)
                after_event_cycles = max(0, remaining_cycles - event_cycles)

                # During event: modified profit
                total += profit_per_cycle * modifier * event_cycles
                # After event: normal profit
                total += profit_per_cycle * after_event_cycles
            else:
                total += profit_per_cycle * remaining_cycles

        return total

    result = []
    for p in players:
        # Own stocks percentage
        self_stock = db.query(PlayerStock).filter(
            PlayerStock.owner_id == p.id,
            PlayerStock.target_player_id == p.id,
        ).first()
        own_pct = (self_stock.percentage if self_stock else 100) / 100

        # Component 1: own_stocks * own_enterprise_future_income
        own_future = calc_future_income(p)
        score = own_pct * own_future

        # Component 2: current budget
        score += p.money

        # Component 3: stocks in other players
        stocks_in_others = db.query(PlayerStock).filter(
            PlayerStock.owner_id == p.id,
            PlayerStock.target_player_id != p.id,
            PlayerStock.percentage > 0,
        ).all()
        for stock in stocks_in_others:
            target = db.query(Player).filter(Player.id == stock.target_player_id).first()
            if target:
                target_future = calc_future_income(target)
                score += (stock.percentage / 100) * target_future

        total_factories = sum(pe.factory_count for pe in p.enterprises)
        result.append(DashboardPlayer(
            id=p.id,
            name=p.name,
            score=round(score, 0),
            enterprises_count=len(p.enterprises),
            factories_count=total_factories,
        ))

    result.sort(key=lambda x: x.score, reverse=True)
    return result


# ──────────────────────────────────────────────
#  BOT ENDPOINTS
# ──────────────────────────────────────────────

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


# ──────────────────────────────────────────────
#  RESET
# ──────────────────────────────────────────────

@router.post("/reset")
async def reset_game(db: Session = Depends(get_db)):
    """Reset the game: set cycle to 0, give all players the starting budget, remove all enterprises."""
    budget = float(_get_setting(db, "budget", "10000"))

    setting = db.query(GameSetting).filter(GameSetting.key == "current_cycle").first()
    if setting:
        setting.value = "0"
    else:
        db.add(GameSetting(key="current_cycle", value="0"))

    # Reset timers
    _set_setting(db, "timer_running", "false")
    _set_setting(db, "game_timer_end", "0")
    _set_setting(db, "cycle_timer_end", "0")
    game_dur = float(_get_setting(db, "game_timer_duration", "3600"))
    cycle_dur = float(_get_setting(db, "cycle_timer_duration", "300"))
    _set_setting(db, "game_timer_remaining", str(game_dur))
    _set_setting(db, "cycle_timer_remaining", str(cycle_dur))

    # Deactivate all events
    active_events = db.query(Event).filter(Event.is_active == True).all()
    for event in active_events:
        event.is_active = False
        event.remaining_cycles = 0

    players = db.query(Player).all()
    for player in players:
        player.money = budget
        db.query(PlayerEnterprise).filter(PlayerEnterprise.player_id == player.id).delete()

        # Reset stocks: delete all non-self stocks, set self-stock to 100%
        db.query(PlayerStock).filter(
            PlayerStock.target_player_id == player.id,
            PlayerStock.owner_id != player.id,
        ).delete()
        db.query(PlayerStock).filter(
            PlayerStock.owner_id == player.id,
            PlayerStock.target_player_id != player.id,
        ).delete()
        self_stock = db.query(PlayerStock).filter(
            PlayerStock.owner_id == player.id,
            PlayerStock.target_player_id == player.id,
        ).first()
        if self_stock:
            self_stock.percentage = 100
        else:
            db.add(PlayerStock(owner_id=player.id, target_player_id=player.id, percentage=100))

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
