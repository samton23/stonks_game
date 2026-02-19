from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, BigInteger, Boolean, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    money = Column(Float, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    enterprises = relationship("PlayerEnterprise", back_populates="player", cascade="all, delete-orphan")


class Enterprise(Base):
    __tablename__ = "enterprises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    emoji = Column(String(10), default="🏭")
    price = Column(Float, default=0)
    profit = Column(Float, default=0)
    profit_cycle_interval = Column(Integer, default=1)
    factory_price = Column(Float, default=0)
    factory_profit_percent = Column(Float, default=10)

    player_enterprises = relationship("PlayerEnterprise", back_populates="enterprise", cascade="all, delete-orphan")


class PlayerEnterprise(Base):
    __tablename__ = "player_enterprises"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False)
    factory_count = Column(Integer, default=0)

    player = relationship("Player", back_populates="enterprises")
    enterprise = relationship("Enterprise", back_populates="player_enterprises")

    __table_args__ = (
        UniqueConstraint("player_id", "enterprise_id", name="uq_player_enterprise"),
    )


class GameSetting(Base):
    __tablename__ = "game_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, index=True, nullable=False)
    value = Column(Text, default="")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    notification_type = Column(String(50), default="info")  # money, cycle, message, enterprise, factory, reset
    emoji = Column(String(10), default="📢")
    title = Column(String(255), default="")
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    player = relationship("Player")


class PlayerStock(Base):
    __tablename__ = "player_stocks"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    target_player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    percentage = Column(Float, default=0)  # 10, 20, 30...

    owner = relationship("Player", foreign_keys=[owner_id], backref="owned_stocks")
    target_player = relationship("Player", foreign_keys=[target_player_id], backref="stocks_issued")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    affected_enterprises = Column(Text, default="[]")  # JSON: list of enterprise IDs or "all"
    profit_modifier = Column(Float, default=1.0)  # 0.5 = -50%, 1.5 = +50%, 2.0 = x2
    duration_cycles = Column(Integer, default=1)
    remaining_cycles = Column(Integer, default=0)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
