"""Конфигурация приложения FastAPI."""

import multiprocessing
import os
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Настройки приложения из переменных окружения."""

    # App
    APP_NAME: str = "Morgan AI"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/morgan_ai"

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_URL: str = ""
    TELEGRAM_WEBHOOK_SECRET: str = ""
    TELEGRAM_PREMIUM_CHANNEL_ID: Optional[str] = None

    # Admin
    ADMIN_SECRET_KEY: str = "change-me"
    ADMIN_IDS: Optional[str] = None  # comma-separated telegram IDs

    # WebApp
    WEBAPP_URL: str = ""  # URL where frontend is served (e.g., https://app.morganai.ru)

    # Tribute
    TRIBUTE_URL_BASE: str = "https://t.me/tribute/app?startapp="

    # OpenRouter
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_DEFAULT_MODEL: str = "anthropic/claude-sonnet-4-20250514"

    # MiniMax (T2A)
    MINIMAX_API_KEY: str = ""
    MINIMAX_BASE_URL: str = "https://api.minimax.chat/v1"

    # Paddle
    PADDLE_API_KEY: str = ""
    PADDLE_WEBHOOK_SECRET: str = ""

    # Scheduler (APScheduler)
    PROACTIVE_MESSAGE_CHECK_INTERVAL_MINUTES: int = 60
    PROACTIVE_MESSAGE_WINDOW_START_HOUR: int = 9
    PROACTIVE_MESSAGE_WINDOW_END_HOUR: int = 21

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Gunicorn-like конфиг (для uvicorn / gunicorn)
workers = multiprocessing.cpu_count() * 2 + 1
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
worker_class = "uvicorn.workers.UvicornWorker"
