"""Фоновый сервис инициативных (проактивных) сообщений."""

import logging
import random
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User, SubscriptionStatus
from app.services.ai.openrouter import AIService

logger = logging.getLogger(__name__)


class ProactiveMessageService:
    """Отправляет инициативные сообщения Premium-пользователям."""

    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service
        # Промпты для разных контекстов можно вынести в БД или конфиг
        self.proactive_prompts = [
            "Привет! Давно не общались — скучаю по тебе.",
            "У меня для тебя кое-что интересное... Напиши, когда будет время!",
            "Я тут подумал о нашем последнем разговоре. Хочешь продолжить?",
            "Привет! Как твои дела?",
        ]

    async def get_inactive_premium_users(
        self,
        session: AsyncSession,
        inactive_hours: int = 24,
    ) -> List[User]:
        """
        Возвращает Premium-пользователей, которые не были активны более N часов.
        """
        threshold = datetime.utcnow() - timedelta(hours=inactive_hours)
        stmt = select(User).where(
            User.subscription_status.in_(
                [SubscriptionStatus.PREMIUM, SubscriptionStatus.TRIAL]
            ),
            User.last_activity_at < threshold,
            User.is_active.is_(True),
        )
        result = await session.execute(stmt)
        return result.scalars().all()

    async def generate_proactive_text(
        self,
        user: User,
        character_name: str = "Морган",
        custom_prompt: Optional[str] = None,
    ) -> str:
        """Генерирует персонализированное инициативное сообщение."""
        if custom_prompt:
            messages = [{"role": "user", "content": custom_prompt}]
        else:
            base = random.choice(self.proactive_prompts)
            messages = [{"role": "user", "content": base}]

        try:
            return await self.ai_service.chat(
                messages=messages,
                temperature=0.9,
                max_tokens=200,
            )
        except Exception as exc:
            logger.exception(f"Ошибка генерации proactive сообщения для user={user.id}: {exc}")
            return random.choice(self.proactive_prompts)

    async def send_proactive_message(self, user: User, text: str) -> bool:
        """Заготовка для отправки сообщения через Telegram Bot API.

        В реальности здесь будет вызов bot.send_message.
        """
        logger.info(f"[Proactive] user={user.telegram_id} | text={text[:60]}...")
        # TODO: интегрировать с telegram.Application из main.py через очередь/фоновый воркер
        return True

    async def run_daily_cycle(self, session: AsyncSession) -> int:
        """Один цикл обработки: находит неактивных и шлёт сообщения.

        Returns:
            Количество отправленных сообщений.
        """
        users = await self.get_inactive_premium_users(session)
        sent_count = 0

        # Случайное время внутри дневного окна
        now = datetime.utcnow()
        start_hour = settings.PROACTIVE_MESSAGE_WINDOW_START_HOUR
        end_hour = settings.PROACTIVE_MESSAGE_WINDOW_END_HOUR

        if not (start_hour <= now.hour < end_hour):
            logger.debug("Вне временного окна proactive сообщений")
            return 0

        for user in users:
            # Простая рандомизация: отправляем не всем, а ~30%
            if random.random() > 0.3:
                continue

            text = await self.generate_proactive_text(user)
            success = await self.send_proactive_message(user, text)
            if success:
                sent_count += 1

        logger.info(f"Proactive cycle завершён. Отправлено: {sent_count}")
        return sent_count
