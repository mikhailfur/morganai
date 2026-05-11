"""proactive.py — Задачи APScheduler для проактивных сообщений.

Периодически проверяет пользователей и отправляет
им сообщения от лица персонажа, если они давно не писали.
"""

import logging
from datetime import datetime, timedelta

from telegram import Bot
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.services.ai.openrouter_service import OpenRouterService

logger = logging.getLogger(__name__)

# Время (в часах), после которого считаем, что пользователь "пропал"
INACTIVITY_THRESHOLD_HOURS = 24
# Максимальное количество сообщений за раз, чтобы не спамить
MAX_MESSAGES_PER_CYCLE = 10


async def run_proactive_cycle():
    """
    Основная функция цикла проактивных сообщений.
    Вызывается APScheduler-ом.
    """
    logger.info("🚀 Запуск цикла проактивных сообщений...")

    if not settings.PROACTIVE_ENABLED:
        logger.info("Проактивные сообщения отключены в настройках.")
        return

    async with AsyncSessionLocal() as session:
        try:
            # 1. Находим пользователей, которые давно не писали и имеют Premium
            threshold_time = datetime.utcnow() - timedelta(hours=INACTIVITY_THRESHOLD_HOURS)
            
            stmt = (
                select(User)
                .where(
                    User.is_premium.is_(True),
                    User.last_activity_at < threshold_time,
                    User.last_activity_at.isnot(None),
                    User.proactive_enabled.is_(True)  # Флаг, что юзер не отключал это
                )
                .limit(MAX_MESSAGES_PER_CYCLE)
            )
            
            result = await session.execute(stmt)
            users = result.scalars().all()

            if not users:
                logger.info("Нет пользователей для проактивных сообщений.")
                return

            bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
            ai_service = OpenRouterService()  # Используем напрямую или через AIService

            for user in users:
                try:
                    # Генерируем текст "из ниоткуда"
                    prompt = (
                        "Ты — Морган, ИИ-ассистент. Напиши короткое, дружелюбное сообщение "
                        "пользователю, с которым давно не общался. Спроси, как дела, "
                        "чем занимается. Не будь слишком навязчивым. Имя пользователя: "
                        f"{user.first_name or 'друг'}."
                    )
                    
                    # Используем OpenRouter для генерации
                    message_text = await ai_service.generate_text(
                        character_name="morgan",
                        user_text=prompt,
                        history=[]  # Без истории для проактивного сообщения
                    )

                    if message_text:
                        await bot.send_message(
                            chat_id=user.telegram_id,
                            text=message_text
                        )
                        logger.info(f"✉️ Отправлено проактивное сообщение user={user.telegram_id}")

                        # Обновляем last_activity_at, чтобы не спамить каждый час
                        user.last_activity_at = datetime.utcnow()
                        await session.commit()
                    else:
                        logger.warning(f"Пустой ответ от ИИ для user={user.telegram_id}")

                except Exception as e:
                    logger.error(f"Ошибка отправки проактивного сообщения user={user.telegram_id}: {e}")

            await bot.close()

        except Exception as e:
            logger.exception(f"❌ Ошибка в цикле проактивных сообщений: {e}")
