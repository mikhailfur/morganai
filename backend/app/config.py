from pydantic_settings import BaseSettings
from typing import List
from pydantic import Field


class Settings(BaseSettings):
    # Telegram
    telegram_bot_token: str
    admin_ids: List[int] = Field(default_factory=list)

    # OpenRouter
    openrouter_api_key: str
    openrouter_model: str = "google/gemini-flash-1.5"

    # MiniMax
    minimax_api_key: str

    # Payment
    tribute_api_key: str
    paddle_api_key: str

    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/morganai"

    # WebApp
    webapp_url: str = "https://webapp.morganai.com"
    webapp_secret_key: str

    # Environment
    debug: bool = False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


settings = Settings()
