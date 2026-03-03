from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import GameSetting
from schemas import SettingUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _get_or_create(db: Session, key: str, default: str = "") -> GameSetting:
    setting = db.query(GameSetting).filter(GameSetting.key == key).first()
    if not setting:
        setting = GameSetting(key=key, value=default)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.get("")
def get_all_settings(db: Session = Depends(get_db)):
    settings = db.query(GameSetting).all()
    result = {}
    for s in settings:
        result[s.key] = s.value
    # Ensure defaults
    defaults = {
        "rules": "", "budget": "10000", "current_cycle": "0",
        "timer_running": "false",
        "game_timer_end": "0", "cycle_timer_end": "0",
        "game_timer_remaining": "3600", "cycle_timer_remaining": "300",
        "game_timer_duration": "3600", "cycle_timer_duration": "300",
        "stock_price": "50",
    }
    for key, default in defaults.items():
        if key not in result:
            _get_or_create(db, key, default)
            result[key] = default
    return result


@router.put("")
def update_setting(data: SettingUpdate, db: Session = Depends(get_db)):
    setting = _get_or_create(db, data.key)
    setting.value = data.value
    db.commit()
    return {"ok": True, "key": data.key, "value": data.value}


@router.get("/rules")
def get_rules(db: Session = Depends(get_db)):
    setting = _get_or_create(db, "rules", "")
    return {"rules": setting.value}


@router.put("/rules")
def update_rules(data: dict, db: Session = Depends(get_db)):
    setting = _get_or_create(db, "rules", "")
    setting.value = data.get("rules", "")
    db.commit()
    return {"ok": True, "rules": setting.value}
