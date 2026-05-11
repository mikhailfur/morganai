"""Модель персонажа (ИИ-агента)."""

import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class BehaviorMode(str, enum.Enum):
    """Режимы поведения персонажа."""

    STUDY = "study"
    WORK = "work"
    PSYCHOLOGIST = "psychologist"
    NSFW = "nsfw"


class Character(Base):
    """Персонаж / ИИ-агент, создаваемый пользователем."""

    __tablename__ = "characters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    avatar_url = Column(String(512), nullable=True)
    description = Column(Text, nullable=True)

    # Промпт и настройки поведения
    system_prompt = Column(Text, nullable=False)
    behavior_mode = Column(Enum(BehaviorMode), nullable=True)
    model_override = Column(String(255), nullable=True)  # пользователь может выбрать кастомную модель

    # Флаги
    is_default = Column(Boolean, default=False)  # персонаж по умолчанию для ЛС
    is_nsfw_enabled = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="characters")
    chat_sessions = relationship("ChatSession", back_populates="character", cascade="all, delete-orphan")
