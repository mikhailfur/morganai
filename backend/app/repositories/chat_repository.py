"""Репозиторий для работы с историей сообщений (Message) и сессиями (ChatSession)."""

from typing import List, Optional

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatSession, Message
from app.models.user import User


class ChatRepository:
    """CRUD для chat-сессий и сообщений."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create_session(self, telegram_chat_id: int, user_id: int) -> ChatSession:
        stmt = select(ChatSession).where(
            ChatSession.telegram_chat_id == telegram_chat_id,
            ChatSession.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        session_obj = result.scalar_one_or_none()
        if not session_obj:
            session_obj = ChatSession(
                telegram_chat_id=telegram_chat_id,
                user_id=user_id,
            )
            self.session.add(session_obj)
            await self.session.commit()
            await self.session.refresh(session_obj)
        return session_obj

    async def get_recent_messages(
        self,
        telegram_chat_id: int,
        user_id: int,
        limit: int = 20,
    ) -> List[Message]:
        """Возвращает последние N сообщений сессии."""
        session_obj = await self.get_or_create_session(telegram_chat_id, user_id)
        stmt = (
            select(Message)
            .where(Message.session_id == session_obj.id)
            .order_by(desc(Message.created_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        messages = result.scalars().all()
        return list(reversed(messages))

    async def add_message(
        self,
        telegram_chat_id: int,
        user_id: int,
        role: str,
        content: str,
        has_image: bool = False,
        has_video: bool = False,
        has_voice: bool = False,
    ) -> Message:
        session_obj = await self.get_or_create_session(telegram_chat_id, user_id)
        msg = Message(
            session_id=session_obj.id,
            role=role,
            content=content,
            has_image=has_image,
            has_video=has_video,
            has_voice=has_voice,
        )
        self.session.add(msg)
        await self.session.commit()
        await self.session.refresh(msg)
        return msg
