"""Модель пользователя."""

import enum
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Enum, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    """Роли пользователей."""

    USER = "user"
    ADMIN = "admin"


class SubscriptionStatus(str, enum.Enum):
    """Статусы подписки."""

    FREE = "free"
    TRIAL = "trial"
    PREMIUM = "premium"
    EXPIRED = "expired"


class SubscriptionProvider(str, enum.Enum):
    """Провайдеры оплаты подписки."""

    TRIBUTE = "tribute"
    PADDLE = "paddle"
    MANUAL = "manual"


class User(Base):
    """Пользователь бота / платформы."""

    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    username = Column(String(255), nullable=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)

    # Роли и разрешения
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)

    # Подписка
    subscription_status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.FREE, nullable=False)
    subscription_provider = Column(Enum(SubscriptionProvider), nullable=True)
    subscription_started_at = Column(DateTime(timezone=True), nullable=True)
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Статистика / метаданные
    messages_count = Column(Integer, default=0)
    last_activity_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    characters = relationship("Character", back_populates="user", cascade="all, delete-orphan")

    def is_subscription_active(self) -> bool:
        """Проверяет, активна ли у пользователя подписка."""
        if self.subscription_expires_at is None:
            return self.is_premium and self.subscription_status == SubscriptionStatus.PREMIUM
        return datetime.utcnow() < self.subscription_expires_at and self.is_premium
