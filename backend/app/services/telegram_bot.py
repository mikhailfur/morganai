from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, ContentType, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from app.config import settings
from app.database import AsyncSessionLocal
from app.models import User, Character, BehaviorMode, Conversation
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.services.ai_service import openrouter_service
from app.services.prompt_builder import PromptBuilder
import json
from datetime import datetime

# Initialize bot and dispatcher
bot = Bot(token=settings.telegram_bot_token)
dp = Dispatcher()

prompt_builder = PromptBuilder()


class BotStates(StatesGroup):
    """FSM States for conversation"""
    chatting = State()


@dp.message(Command("start"))
async def start_command(message: Message, state: FSMContext):
    """Handle /start command"""
    async with AsyncSessionLocal() as session:
        # Get or create user
        result = await session.execute(
            select(User).where(User.telegram_id == message.from_user.id)
        )
        user = result.scalars().first()

        if not user:
            user = User(
                telegram_id=message.from_user.id,
                username=message.from_user.username,
                first_name=message.from_user.first_name,
                last_name=message.from_user.last_name
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

        # Update activity
        await session.execute(
            update(User).where(User.telegram_id == message.from_user.id).values(
                last_activity_at=datetime.utcnow()
            )
        )
        await session.commit()

    await message.answer(
        f"Привет, {message.from_user.first_name}! Я Morgan AI - твой персональный ИИ-ассистент.\n\n"
        "Выбери персонажа и режим в WebApp, чтобы начать общение!"
    )

    # Send WebApp button
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="Открыть WebApp",
            web_app=types.WebAppInfo(url=settings.webapp_url)
        )]
    ])
    await message.answer("Настрой свои предпочтения:", reply_markup=keyboard)


@dp.message(F.chat.type == "private")
async def handle_private_message(message: Message, state: FSMContext):
    """Handle private messages"""
    if message.voice:
        await handle_voice_message(message, state)
        return

    async with AsyncSessionLocal() as session:
        # Get user with character and mode
        result = await session.execute(
            select(User)
            .options(
                selectinload(User.selected_character),
                selectinload(User.selected_mode)
            )
            .where(User.telegram_id == message.from_user.id)
        )
        user = result.scalars().first()

        if not user or not user.selected_character_id:
            await message.answer("Пожалуйста, сначала выберите персонажа в WebApp!")
            return

        # Get or create conversation
        conv_result = await session.execute(
            select(Conversation)
            .where(
                Conversation.user_id == user.telegram_id,
                Conversation.character_id == user.selected_character_id
            )
            .order_by(Conversation.updated_at.desc())
        )
        conversation = conv_result.scalars().first()

        if not conversation:
            conversation = Conversation(
                user_id=user.telegram_id,
                character_id=user.selected_character_id,
                mode_id=user.selected_mode_id,
                messages="[]"
            )
            session.add(conversation)
            await session.commit()
            await session.refresh(conversation)

        # Parse messages from JSON
        try:
            messages = json.loads(conversation.messages)
        except Exception:
            messages = []

        # Handle photo with caption
        user_message = message.text or ""
        image_base64 = None

        if message.photo:
            # Download and convert to base64
            photo = message.photo[-1]  # Get the largest photo
            file = await bot.get_file(photo.file_id)
            file_url = f"https://api.telegram.org/file/bot{settings.telegram_bot_token}/{file.file_path}"
            # In production, download and convert to base64
            user_message = message.caption or "Что изображено на фото?"

        # Add user message to history
        messages.append({"role": "user", "content": user_message})

        # Keep only last 20 messages
        if len(messages) > 20:
            messages = messages[-20:]

        # Build system prompt
        character = await session.execute(
            select(Character).where(Character.id == user.selected_character_id)
        )
        character = character.scalars().first()

        mode = None
        if user.selected_mode_id:
            mode_result = await session.execute(
                select(BehaviorMode).where(BehaviorMode.id == user.selected_mode_id)
            )
            mode = mode_result.scalars().first()

        system_prompt = prompt_builder.build_system_prompt(
            character=character,
            mode=mode,
            user_name=user.first_name or "Пользователь"
        )

        # Get AI response
        await message.chat.do("typing")
        try:
            ai_response = await openrouter_service.generate_response(
                system_prompt=system_prompt,
                conversation_history=messages[:-1],  # Exclude current message
                user_message=user_message,
                image_base64=image_base64
            )

            # Add AI response to history
            messages.append({"role": "assistant", "content": ai_response})

            # Update conversation
            conversation.messages = json.dumps(messages)
            conversation.updated_at = datetime.utcnow()
            await session.commit()

            # Send response
            await message.answer(ai_response)

        except Exception as e:
            await message.answer("Извините, произошла ошибка. Попробуйте позже.")

        # Update user activity
        await session.execute(
            update(User).where(User.telegram_id == message.from_user.id).values(
                last_activity_at=datetime.utcnow()
            )
        )
        await session.commit()


async def handle_voice_message(message: Message, state: FSMContext):
    """Handle voice messages"""
    await message.answer("Голосовые сообщения пока в разработке...")
    # TODO: Implement MiniMax STT and TTS


@dp.message(F.chat.type.in_({"group", "supergroup"}))
async def handle_group_message(message: Message):
    """Handle group messages with different modes"""
    # Check if bot is mentioned or message is a reply
    bot_user = await bot.get_me()
    is_mentioned = any(
        entity.type == "mention" and f"@{bot_user.username}" in message.text
        for entity in (message.entities or [])
    )
    is_reply = message.reply_to_message is not None

    # In active mode, respond to all messages
    # In mention mode, respond only when mentioned
    # In reply mode, respond only to replies
    # TODO: Implement group mode settings per chat

    if is_mentioned or is_reply:
        await handle_private_message(message, await state.get_data())
