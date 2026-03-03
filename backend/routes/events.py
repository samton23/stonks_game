import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Event
from schemas import EventCreate, EventUpdate, EventOut
from typing import List

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=List[EventOut])
def get_events(db: Session = Depends(get_db)):
    """Get all events."""
    return db.query(Event).order_by(Event.is_active.desc(), Event.id).all()


@router.post("", response_model=EventOut)
def create_event(data: EventCreate, db: Session = Depends(get_db)):
    """Create a new event."""
    event = Event(
        name=data.name,
        description=data.description,
        affected_enterprises=data.affected_enterprises,
        profit_modifier=data.profit_modifier,
        duration_cycles=data.duration_cycles,
        remaining_cycles=0,
        is_active=False,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=EventOut)
def update_event(event_id: int, data: EventUpdate, db: Session = Depends(get_db)):
    """Update an existing event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event not found")

    if data.name is not None:
        event.name = data.name
    if data.description is not None:
        event.description = data.description
    if data.affected_enterprises is not None:
        event.affected_enterprises = data.affected_enterprises
    if data.profit_modifier is not None:
        event.profit_modifier = data.profit_modifier
    if data.duration_cycles is not None:
        event.duration_cycles = data.duration_cycles

    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    """Delete an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event not found")
    db.delete(event)
    db.commit()
    return {"ok": True}


@router.post("/{event_id}/activate", response_model=EventOut)
def activate_event(event_id: int, db: Session = Depends(get_db)):
    """Activate an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event not found")
    event.is_active = True
    event.remaining_cycles = event.duration_cycles
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/deactivate", response_model=EventOut)
def deactivate_event(event_id: int, db: Session = Depends(get_db)):
    """Deactivate an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event not found")
    event.is_active = False
    event.remaining_cycles = 0
    db.commit()
    db.refresh(event)
    return event


@router.post("/random", response_model=EventOut)
def random_event(db: Session = Depends(get_db)):
    """Pick a random inactive event and activate it."""
    inactive = db.query(Event).filter(Event.is_active == False).all()
    if not inactive:
        raise HTTPException(400, "No inactive events available")
    event = random.choice(inactive)
    event.is_active = True
    event.remaining_cycles = event.duration_cycles
    db.commit()
    db.refresh(event)
    return event


@router.get("/active", response_model=List[EventOut])
def get_active_events(db: Session = Depends(get_db)):
    """Get only currently active events."""
    return db.query(Event).filter(
        Event.is_active == True,
        Event.remaining_cycles > 0,
    ).all()
