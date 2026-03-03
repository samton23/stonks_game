import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Player, PlayerStock, GameSetting
from schemas import BrowserJoinRequest, BrowserJoinResponse

router = APIRouter(prefix="/api/join", tags=["join"])


def _get_setting(db: Session, key: str, default: str = "") -> str:
    s = db.query(GameSetting).filter(GameSetting.key == key).first()
    return s.value if s else default


@router.get("/room-code")
def get_room_code(db: Session = Depends(get_db)):
    code = _get_setting(db, "room_code", "")
    if not code:
        raise HTTPException(404, "Room code not set")
    return {"room_code": code}


@router.post("", response_model=BrowserJoinResponse)
def join_game(data: BrowserJoinRequest, db: Session = Depends(get_db)):
    room_code = _get_setting(db, "room_code", "")
    if not room_code or data.room_code.upper() != room_code.upper():
        raise HTTPException(400, "Неверный код комнаты")

    if _get_setting(db, "game_finished", "false") == "true":
        raise HTTPException(400, "Игра уже завершена")

    name = data.name.strip()
    if not name or len(name) > 50:
        raise HTTPException(400, "Некорректное имя")

    token = str(uuid.uuid4())

    budget_setting = db.query(GameSetting).filter(GameSetting.key == "budget").first()
    initial_budget = float(budget_setting.value) if budget_setting else 10000

    player = Player(telegram_id=None, name=name, money=initial_budget, browser_token=token)
    db.add(player)
    db.commit()
    db.refresh(player)

    db.add(PlayerStock(owner_id=player.id, target_player_id=player.id, percentage=100))
    db.commit()

    return BrowserJoinResponse(token=token, player_id=player.id, name=player.name, money=player.money)


@router.post("/validate-token")
def validate_token(data: dict, db: Session = Depends(get_db)):
    token = data.get("token", "")
    if not token:
        raise HTTPException(400, "No token")

    player = db.query(Player).filter(Player.browser_token == token).first()
    if not player:
        raise HTTPException(404, "Token invalid")

    return {"player_id": player.id, "name": player.name, "valid": True}
