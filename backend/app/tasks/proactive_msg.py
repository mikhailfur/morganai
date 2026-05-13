from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import cron
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models import User, Conversation
from sqlalchemy import select, update
from datetime import datetime, timedelta
from app.services.ai_service import openrouter_service
from app.services.prompt_builder import PromptBuilder
from app.config import settings
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()
prompt_builder = PromptBuilder()


async def generate_proactive_message(user, character, mode) -> str:
    """Generate personalized proactive message"""
    system_prompt = prompt_builder.build_system_prompt(
        character=character,
        mode=mode,
        user_name=user.first_name or "Пользователь"
    )

    # Add context about inactivity
    system_prompt += f"\n\nПользователь не был активен более 24 часов. "
    system_prompt += "Напиши дружелюбное сообщение, чтобы возобновить общение. "
    system_prompt += "Не упоминай точное время неактивности."

    try:
        message = await openrouter_service.generate_response(
            system_prompt=system_prompt,
            conversation_history=[],
            user_message="Привет! Как дела?"
        )
        return message
    except Exception as e:
        logger.error(f"Failed to generate proactive message for user {user.telegram_id}: {e}")
        return f"Привет, {user.first_name}! Как прошел твой день? 😊"


async def send_proactive_messages():
    """Check Premium users and send proactive messages if inactive > 24 hours"""
    from app.services.telegram_bot import bot

    logger.info("Running proactive messages check...")

    async with AsyncSessionLocal() as session:
        # Find Premium users inactive > 24 hours
        cutoff = datetime.utcnow() - timedelta(hours=24)
        result = await session.execute(
            select(User).where(
                User.is_premium == True,
                User.last_activity_at < cutoff
            )
        )
        inactive_users = result.scalars().all()

        logger.info(f"Found {len(inactive_users)} inactive Premium users")

        for user in inactive_users:
            try:
                # Get user's selected character and mode
                char_result = await session.execute(
                    select(Character).where(Character.id == user.selected_character_id)
                )
                character = char_result.scalars().first()

                if not character:
                    continue

                mode_result = await session.execute(
                    select(BehaviorMode).where(BehaviorMode.id == user.selected_mode_id)
                )
                mode = mode_result.scalars().first()

                # Generate and send message
                message = await generate_proactive_message(user, character, mode)

                await bot.send_message(
                    chat_id=user.telegram_id,
                    text=message
                )

                # Update last activity to prevent re-sending
                await session.execute(
                    update(User)
                    .where(User.telegram_id == user.telegram_id)
                    .values(last_activity_at=datetime.utcnow())
                )
                await session.commit()

                logger.info(f"Sent proactive message to user {user.telegram_id}")

            except Exception as e:
                logger.error(f"Failed to process user {user.telegram_id}: {e}")
                continue


def start_scheduler():
    """Start the scheduler for proactive messages"""
    # Run every day at 10:00
    scheduler.add_job(
        send_proactive_messages,
        trigger=cron(hour=10, minute=0),
        id='proactive_messages',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler():
    """Stop the scheduler"""
    scheduler.shutdown()
    logger.info("Scheduler stopped")
