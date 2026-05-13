from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from app.database import init_db
from app.api.v1 import router as api_v1_router
from app.config import settings
from app.tasks.proactive_msg import start_scheduler, stop_scheduler
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("Starting up Morgan AI...")
    await init_db()
    logger.info("Database initialized")

    # Start Telegram bot polling in background
    from app.services.telegram_bot import dp, bot
    from aiogram.enums import ParseMode
    bot.parse_mode = ParseMode.HTML

    # Start polling in background task
    import asyncio
    asyncio.create_task(dp.start_polling(bot))
    logger.info("Telegram bot started")

    # Start scheduler for proactive messages
    start_scheduler()
    logger.info("Scheduler started")

    yield

    logger.info("Shutting down Morgan AI...")
    stop_scheduler()
    await bot.session.close()


app = FastAPI(
    title="Morgan AI API",
    description="Morgan AI Telegram Bot Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# Include routers
app.include_router(api_v1_router)


@app.get("/")
async def root():
    return {"message": "Morgan AI API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Webhook endpoints for payment gateways
@app.post("/webhooks/tribute")
async def tribute_webhook(request: Request):
    """Handle Tribute payment webhooks"""
    payload = await request.json()
    logger.info(f"Tribute webhook: {payload}")
    return {"status": "ok"}


@app.post("/webhooks/paddle")
async def paddle_webhook(request: Request):
    """Handle Paddle payment webhooks"""
    payload = await request.json()
    logger.info(f"Paddle webhook: {payload}")
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.debug)
