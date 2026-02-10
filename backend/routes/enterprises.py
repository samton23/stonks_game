from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Enterprise
from schemas import EnterpriseCreate, EnterpriseUpdate, EnterpriseOut

router = APIRouter(prefix="/api/enterprises", tags=["enterprises"])


@router.get("", response_model=List[EnterpriseOut])
def list_enterprises(db: Session = Depends(get_db)):
    return db.query(Enterprise).all()


@router.post("", response_model=EnterpriseOut)
def create_enterprise(data: EnterpriseCreate, db: Session = Depends(get_db)):
    ent = Enterprise(**data.model_dump())
    db.add(ent)
    db.commit()
    db.refresh(ent)
    return ent


@router.put("/{enterprise_id}", response_model=EnterpriseOut)
def update_enterprise(enterprise_id: int, data: EnterpriseUpdate, db: Session = Depends(get_db)):
    ent = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not ent:
        raise HTTPException(404, "Enterprise not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ent, key, value)
    db.commit()
    db.refresh(ent)
    return ent


@router.delete("/{enterprise_id}")
def delete_enterprise(enterprise_id: int, db: Session = Depends(get_db)):
    ent = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not ent:
        raise HTTPException(404, "Enterprise not found")
    db.delete(ent)
    db.commit()
    return {"ok": True}
