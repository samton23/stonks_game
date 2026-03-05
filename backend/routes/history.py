from fastapi import APIRouter, Depends
from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from database import get_db
from models import GameLog

router = APIRouter(prefix="/api/history", tags=["history"])

SYSTEM_TYPES = ('cycle', 'game_start', 'game_end', 'event_start', 'event_end')


@router.get("")
def get_history(
    player_id: Optional[int] = None,
    include_system: bool = False,
    limit: int = 300,
    db: Session = Depends(get_db),
):
    q = db.query(GameLog).order_by(GameLog.timestamp.desc())
    if player_id is not None:
        if include_system:
            # Show player's own entries + system events (cycles, events, game state)
            q = q.filter(or_(
                GameLog.player_id == player_id,
                GameLog.action_type.in_(SYSTEM_TYPES),
            ))
        else:
            q = q.filter(GameLog.player_id == player_id)
    return q.limit(limit).all()
