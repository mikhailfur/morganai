"""main.py — Точка входа FastAPI + Telegram Webhook."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from app.api.routers.health import router as health_router
from app.api.routers.users import router as users_router
from app.api.routers.characters import router as characters_router
from app.api.routers.payments import router as payments_router
from app.api.routers.admin import router as admin_router
from app.api.routers.telegram_webhook import router as telegram_webhook_router
from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.services.telegram.handlers import (
    error_handler,
    group_message_handler,
    private_message_handler,
    start_command,
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


async def lifespan(app: FastAPI):
    """Lifespan: инициализация webhook при старте."""
    # Создание таблиц (для быстрого старта; в продакшене — Alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Настройка Telegram Application и Webhook
    telegram_app = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()

    # Регистрация хэндлеров
    telegram_app.add_handler(CommandHandler("start", start_command))
    telegram_app.add_handler(
        MessageHandler(filters.ChatType.PRIVATE & ~filters.COMMAND, private_message_handler)
    )
    telegram_app.add_handler(
        MessageHandler(filters.ChatType.GROUPS & ~filters.COMMAND, group_message_handler)
    )
    telegram_app.add_error_handler(error_handler)

    await telegram_app.initialize()
    await telegram_app.start()

    # Установка вебхука
    webhook_url = f"{settings.TELEGRAM_WEBHOOK_URL}/webhook/telegram"
    await telegram_app.bot.set_webhook(
        url=webhook_url,
        secret_token=settings.TELEGRAM_WEBHOOK_SECRET,
    )
    logger.info(f"Webhook установлен: {webhook_url}")

    app.state.telegram_app = telegram_app

    yield

    # Graceful shutdown
    await telegram_app.stop()
    await telegram_app.shutdown()
    logger.info(" Telegram Bot остановлен")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# --- Routers ---
app.include_router(health_router, tags=["health"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(characters_router, prefix="/api/characters", tags=["characters"])
app.include_router(payments_router, prefix="/api/payments", tags=["payments"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(telegram_webhook_router, prefix="/webhook", tags=["webhooks"])


# --- Глобальный обработчик ошибок ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# --- Telegram Webhook endpoint ---
@app.post("/webhook/telegram")
async def telegram_webhook_endpoint(request: Request):
    """Принимает обновления от Telegram."""
    telegram_app: Application = request.app.state.telegram_app

    # Проверка секретного токена
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if settings.TELEGRAM_WEBHOOK_SECRET and secret != settings.TELEGRAM_WEBHOOK_SECRET:
        return JSONResponse(status_code=403, content={"detail": "Forbidden"})

    data = await request.json()
    update = Update.de_json(data, telegram_app.bot)
    await telegram_app.process_update(update)
    return {"status": "ok"}
