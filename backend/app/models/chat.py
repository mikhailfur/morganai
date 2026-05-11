"""Модели чат-сессий и сообщений."""

import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class ChatType(str, enum.Enum):
    """Тип чата."""

    PRIVATE = "private"
    GROUP = "group"


class GroupReplyMode(str, enum.Enum):
    """Режим ответа бота в группе."""

    ACTIVE = "active"       # отвечает на всё
    MENTION = "mention"     # только при упоминании
    REPLY = "reply"         # только на reply


class ChatSession(Base):
    """Сессия переписки (в ЛС или группе)."""

    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=True, index=True)

    telegram_chat_id = Column(BigInteger, nullable=False, index=True)
    chat_type = Column(Enum(ChatType), default=ChatType.PRIVATE, nullable=False)
    title = Column(String(255), nullable=True)

    # Настройки группового чата
    group_reply_mode = Column(Enum(GroupReplyMode), default=GroupReplyMode.ACTIVE, nullable=True)
    is_active = Column(Boolean, default=True)

    # Метаданные контекста (сериализованный JSON или просто счётчик сообщений)
    context_summary = Column(Text, nullable=True)
    message_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    character = relationship("Character", back_populates="chat_sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    """История сообщений (для контекста LLM)."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)

    role = Column(Enum("user", "assistant", "system", name="message_role"), nullable=False)
    content = Column(Text, nullable=False)  # текст или JSON для мультимодальных данных
    raw_payload = Column(Text, nullable=True)  # сырое тело запроса/ответа для отладки

    # Мультимодальность
    has_image = Column(Boolean, default=False)
    has_video = Column(Boolean, default=False)
    has_voice = Column(Boolean, default=False)

    # Метаданные
    telegram_message_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
