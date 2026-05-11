"""main.py — Точка входа FastAPI + Telegram Webhook + APScheduler."""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from telegram import Bot, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    MessageHandler,
    filters,
)

from app.api.routers.admin import router as admin_router
from app.api.routers.characters import router as characters_router
from app.api.routers.health import router as health_router
from app.api.routers.payments import router as payments_router
from app.api.routers.telegram_webhook import router as telegram_webhook_router
from app.api.routers.users import router as users_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.services.telegram.handlers import (
    admin_command,
    callback_handler,
    error_handler,
    group_message_handler,
    menu_button_handler,
    premium_command,
    private_message_handler,
    profile_command,
    settings_command,
    start_command,
)
from app.tasks.tribute import check_tribute_subscriptions

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


async def lifespan(app: FastAPI):
    """Инициализация: БД, Telegram Application/Webhook, Scheduler."""
    # --- БД ---
    logger.info("Инициализация БД...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Таблицы БД готовы")

    # --- Telegram Application ---
    logger.info("Инициализация Telegram Application...")
    telegram_app = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()

    # Регистрация хэндлеров
    telegram_app.add_handler(CommandHandler("start", start_command))
    telegram_app.add_handler(CommandHandler("profile", profile_command))
    telegram_app.add_handler(CommandHandler("settings", settings_command))
    telegram_app.add_handler(CommandHandler("premium", premium_command))
    telegram_app.add_handler(CommandHandler("admin", admin_command))

    # Inline-кнопки
    telegram_app.add_handler(CallbackQueryHandler(callback_handler))

    # Reply-кнопки меню (текстовые)
    telegram_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, menu_button_handler))

    # Все остальные приватные сообщения (фото, голос, текст)
    telegram_app.add_handler(
        MessageHandler(filters.ChatType.PRIVATE & ~filters.COMMAND, private_message_handler)
    )
    telegram_app.add_handler(
        MessageHandler(filters.ChatType.GROUPS & ~filters.COMMAND, group_message_handler)
    )
    telegram_app.add_error_handler(error_handler)

    await telegram_app.initialize()
    await telegram_app.start()
    logger.info("Telegram Application запущена")

    # --- Webhook ---
    if not settings.TELEGRAM_WEBHOOK_URL:
        logger.error("!!! TELEGRAM_WEBHOOK_URL не задан в .env !!! Webhook НЕ будет установлен. Бот молчит.")
    else:
        webhook_url = f"{settings.TELEGRAM_WEBHOOK_URL.rstrip('/')}/webhook/telegram"
        try:
            await telegram_app.bot.set_webhook(
                url=webhook_url,
                secret_token=settings.TELEGRAM_WEBHOOK_SECRET,
            )
            info = await telegram_app.bot.get_webhook_info()
            if info.url == webhook_url:
                logger.info(f"✅ Webhook успешно установлен: {info.url}")
            else:
                logger.warning(f"⚠️ Webhook URL не совпал: ожидалось {webhook_url}, получено {info.url}")
        except Exception as exc:
            logger.exception(f"❌ Ошибка установки webhook: {exc}")

    app.state.telegram_app = telegram_app

    # --- APScheduler (Tribute checker) ---
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        check_tribute_subscriptions,
        "interval",
        minutes=5,
        id="tribute_checker",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler запущен (Tribute checker каждые 5 мин)")
    app.state.scheduler = scheduler

    yield

    # --- Graceful shutdown ---
    logger.info("Остановка Telegram Bot и Scheduler...")
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown(wait=False)
    await telegram_app.stop()
    await telegram_app.shutdown()
    logger.info("Telegram Bot остановлен")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# --- FastAPI Routers ---
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
    logger.info("📩 Получен POST /webhook/telegram от Telegram")
    telegram_app: Application = request.app.state.telegram_app

    # Проверка секретного токена
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if settings.TELEGRAM_WEBHOOK_SECRET and secret != settings.TELEGRAM_WEBHOOK_SECRET:
        logger.warning(f"⛔ Неверный secret_token: {secret[:10]}...")
        return JSONResponse(status_code=403, content={"detail": "Forbidden"})

    try:
        data = await request.json()
        logger.debug(f"Update data: {data}")
        update = Update.de_json(data, telegram_app.bot)
        await telegram_app.process_update(update)
        logger.info("✅ Update успешно обработан")
    except Exception as exc:
        logger.exception(f"❌ Ошибка при обработке update: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Failed to process update"},
        )

    return {"status": "ok"}


@app.get("/webhook/status")
async def get_telegram_webhook_status():
    """Диагностика: возвращает текущий webhook-статус из Telegram."""
    if not settings.TELEGRAM_BOT_TOKEN:
        return JSONResponse(status_code=500, content={"error": "TELEGRAM_BOT_TOKEN не задан"})

    try:
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        info = await bot.get_webhook_info()
        return {
            "webhook_url": info.url,
            "has_custom_certificate": info.has_custom_certificate,
            "pending_update_count": info.pending_update_count,
            "last_error_date": info.last_error_date.isoformat() if info.last_error_date else None,
            "last_error_message": info.last_error_message,
            "max_connections": info.max_connections,
            "ip_address": info.ip_address,
            "expected_webhook_url": f"{settings.TELEGRAM_WEBHOOK_URL.rstrip('/')}/webhook/telegram" if settings.TELEGRAM_WEBHOOK_URL else None,
        }
    except Exception as exc:
        logger.exception("Ошибка получения webhook info")
        return JSONResponse(status_code=500, content={"error": str(exc)})
