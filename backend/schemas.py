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
    profit_cycle_interval: int = 1
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
    score: float
    enterprises_count: int
    factories_count: int


# --- Stocks ---
class StockTransfer(BaseModel):
    buyer_id: int  # 0 = bank
    target_player_id: int
    percentage: float  # e.g. 10, 20
    price_override: Optional[float] = None  # None = use stock_price setting


class PlayerStockOut(BaseModel):
    id: int
    owner_id: int
    owner_name: str
    target_player_id: int
    target_player_name: str
    percentage: float

    class Config:
        from_attributes = True


# --- Events ---
class EventCreate(BaseModel):
    name: str
    description: str = ""
    affected_enterprises: str = "[]"  # JSON string
    profit_modifier: float = 1.0
    duration_cycles: int = 1


class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    affected_enterprises: Optional[str] = None
    profit_modifier: Optional[float] = None
    duration_cycles: Optional[int] = None


class EventOut(BaseModel):
    id: int
    name: str
    description: str
    affected_enterprises: str
    profit_modifier: float
    duration_cycles: int
    remaining_cycles: int
    is_active: bool

    class Config:
        from_attributes = True
