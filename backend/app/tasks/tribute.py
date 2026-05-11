"""Фоновая проверка подписок Tribute через APScheduler.

Каждые 5 минут проверяем, остались ли Premium/Trial-подписчики Tribute
в закрытом Telegram-канале. Если ушли — аннулируем подписку в БД.
"""

import logging

from sqlalchemy import select
from telegram import Bot

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.user import SubscriptionStatus, User

logger = logging.getLogger(__name__)


async def check_tribute_subscriptions():
    """Проверяет участников Premium-канала и снимает подписку, если кто-то вышел."""
    if not settings.TELEGRAM_PREMIUM_CHANNEL_ID or not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("Tribute checker: TELEGRAM_PREMIUM_CHANNEL_ID или TELEGRAM_BOT_TOKEN не заданы")
        return

    bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
    revoked = 0

    async with AsyncSessionLocal() as session:
        stmt = select(User).where(
            User.subscription_status.in_([SubscriptionStatus.PREMIUM, SubscriptionStatus.TRIAL]),
            User.subscription_provider == "tribute",
        )
        result = await session.execute(stmt)
        users = result.scalars().all()

        if not users:
            logger.debug("Tribute checker: нет активных Tribute-подписчиков")
            return

        for user in users:
            try:
                member = await bot.get_chat_member(
                    chat_id=int(settings.TELEGRAM_PREMIUM_CHANNEL_ID),
                    user_id=user.telegram_id,
                )
                if member.status in ("left", "kicked"):
                    logger.warning(
                        f"User {user.telegram_id} ({user.username}) покинул premium channel. "
                        "Аннулируем подписку."
                    )
                    user.subscription_status = SubscriptionStatus.FREE
                    user.is_premium = False
                    user.subscription_expires_at = None
                    revoked += 1
            except Exception:
                logger.exception(f"Ошибка проверки user {user.telegram_id} в канале")

        if revoked:
            await session.commit()
            logger.info(f"Tribute checker: аннулировано подписок: {revoked}")
        else:
            logger.debug("Tribute checker: все подписчики на месте")
