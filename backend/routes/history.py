from fastapi import APIRouter, Depends
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db
from models import GameLog

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
def get_history(player_id: Optional[int] = None, limit: int = 300, db: Session = Depends(get_db)):
    q = db.query(GameLog).order_by(GameLog.timestamp.desc())
    if player_id is not None:
        q = q.filter(GameLog.player_id == player_id)
    return q.limit(limit).all()
