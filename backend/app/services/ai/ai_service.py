"""Сервисный фасад: объединяет персонажа, модули, OpenRouter и MiniMax."""

import io
import logging
from typing import Optional

from telegram import Bot
from telegram.constants import ChatAction

from sqlalchemy.ext.asyncio import AsyncSession

from app.agent_modules import get_module_prompt
from app.characters import get_character
from app.characters.base_character import BaseCharacter
from app.repositories.chat_repository import ChatRepository
from app.services.ai.minimax_service import MiniMaxService
from app.services.ai.openrouter_service import OpenRouterService

logger = logging.getLogger(__name__)


class AIService:
    """Композитный сервис: ИИ-ответы, ChatAction, работа с БД."""

    def __init__(
        self,
        bot: Bot,
        session: AsyncSession,
        openrouter: Optional[OpenRouterService] = None,
        minimax: Optional[MiniMaxService] = None,
    ):
        self.bot = bot
        self.session = session
        self.openrouter = openrouter or OpenRouterService()
        self.minimax = minimax or MiniMaxService()
        self.chat_repo = ChatRepository(session)

    async def _set_typing(self, chat_id: int):
        await self.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)

    async def _set_upload_photo(self, chat_id: int):
        await self.bot.send_chat_action(chat_id=chat_id, action=ChatAction.UPLOAD_PHOTO)

    async def _set_record_voice(self, chat_id: int):
        await self.bot.send_chat_action(chat_id=chat_id, action=ChatAction.RECORD_VOICE)

    async def process_text_message(
        self,
        chat_id: int,
        user_id: int,
        text: str,
        character_name: str = "morgan",
        mode: Optional[str] = None,
        is_premium: bool = False,
    ) -> str:
        """Обрабатывает текстовое сообщение: история + LLM + сохранение."""
        await self._set_typing(chat_id)

        character = get_character(character_name)
        module_prompt = get_module_prompt(mode) if mode else None

        system_prompt = character.build_system_prompt(
            module_prompt=module_prompt,
            is_premium=is_premium,
        )

        # Собираем историю из БД (последние 20 сообщений)
        history = await self.chat_repo.get_recent_messages(chat_id, user_id, limit=20)
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": text})

        # Запрос к LLM
        answer = await self.openrouter.chat(messages, temperature=0.8)

        # Сохраняем в БД
        await self.chat_repo.add_message(chat_id, user_id, role="user", content=text)
        await self.chat_repo.add_message(chat_id, user_id, role="assistant", content=answer)

        return answer

    async def process_image_message(
        self,
        chat_id: int,
        user_id: int,
        photo_bytes: bytes,
        caption: str = "",
        character_name: str = "morgan",
        is_premium: bool = False,
    ) -> str:
        """Обрабатывает фото: описание через OpenRouter Vision."""
        if not is_premium:
            return (
                "📷 Отправка фото доступна только для Premium-пользователей.\n"
                "Оформи подписку, чтобы я мог анализировать изображения!"
            )

        await self._set_upload_photo(chat_id)

        character = get_character(character_name)
        answer = await self.openrouter.describe_image(
            image_bytes=photo_bytes,
            user_text=caption,
        )

        await self.chat_repo.add_message(chat_id, user_id, role="user", content=f"[Фото] {caption}", has_image=True)
        await self.chat_repo.add_message(chat_id, user_id, role="assistant", content=answer)

        return answer

    async def process_voice_request(
        self,
        chat_id: int,
        text: str,
        voice_id: Optional[str] = None,
        is_premium: bool = False,
    ) -> io.BytesIO:
        """Генерирует голосовое сообщение через MiniMax TTS. Возвращает BytesIO."""
        if not is_premium:
            raise PermissionError("Голосовые сообщения доступны только Premium-подписчикам.")

        await self._set_record_voice(chat_id)

        audio_bytes = await self.minimax.text_to_speech(text, voice_id=voice_id)
        buf = io.BytesIO(audio_bytes)
        buf.name = "voice.ogg"
        return buf

    async def process_voice_transcription(self, audio_bytes: bytes) -> str:
        """Транскрибирует голосовое сообщение пользователя (STT)."""
        # TODO: реализовать через Whisper / MiniMax STT
        # Пока возвращаем заглушку, чтобы не ломать flow
        return "[Голосовое сообщение — текст пока не распознан]"
