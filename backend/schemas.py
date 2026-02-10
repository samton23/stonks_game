from pydantic import BaseModel
from typing import Optional, List


# --- Players ---
class PlayerCreate(BaseModel):
    telegram_id: int
    name: str


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    money: Optional[float] = None


class PlayerEnterpriseOut(BaseModel):
    id: int
    enterprise_id: int
    enterprise_name: str
    enterprise_emoji: str
    profit: float
    factory_count: int
    factory_profit_percent: float
    effective_profit: float

    class Config:
        from_attributes = True


class PlayerOut(BaseModel):
    id: int
    telegram_id: int
    name: str
    money: float
    enterprises: List[PlayerEnterpriseOut] = []
    revenue: float = 0

    class Config:
        from_attributes = True


# --- Enterprises ---
class EnterpriseCreate(BaseModel):
    name: str
    emoji: str = "🏭"
    price: float = 0
    profit: float = 0
    profit_cycle_interval: int = 1
    factory_price: float = 0
    factory_profit_percent: float = 10


class EnterpriseUpdate(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None
    price: Optional[float] = None
    profit: Optional[float] = None
    profit_cycle_interval: Optional[int] = None
    factory_price: Optional[float] = None
    factory_profit_percent: Optional[float] = None


class EnterpriseOut(BaseModel):
    id: int
    name: str
    emoji: str
    price: float
    profit: float
    profit_cycle_interval: int
    factory_price: float
    factory_profit_percent: float

    class Config:
        from_attributes = True


# --- Settings ---
class SettingUpdate(BaseModel):
    key: str
    value: str


# --- Game Actions ---
class MoneyAdjust(BaseModel):
    amount: float
    reason: str = ""


class SendNotification(BaseModel):
    message: str


class FactoryAdjust(BaseModel):
    count: int = 1


# --- Dashboard ---
class DashboardPlayer(BaseModel):
    id: int
    name: str
    money: float
    revenue: float
    enterprises_count: int
    factories_count: int
