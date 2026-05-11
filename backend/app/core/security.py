"""security.py — Валидация initData от Telegram WebApp.

Использует HMAC-SHA-256 для проверки подлинности данных,
полученных от Telegram WebApp.
"""

import hmac
import hashlib
import urllib.parse
from typing import Dict, Optional

from fastapi import Depends, HTTPException, status, Header
from telegram import Bot

from app.core.config import settings


def validate_init_data(init_data: str, bot_token: str) -> Optional[Dict]:
    """
    Валидирует строку initData, полученную от Telegram WebApp.
    
    Алгоритм:
    1. Парсим строку.
    2. Извлекаем hash.
    3. Сортируем оставшиеся пары key=value.
    4. Создаем секретный ключ: HMAC_SHA256("WebAppData", bot_token).
    5. Считаем HMAC_SHA256(секретный ключ, отсортированная строка данных).
    6. Сравниваем с hash.
    """
    try:
        # Парсим строку запроса
        parsed = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
        
        if "hash" not in parsed:
            return None
            
        received_hash = parsed.pop("hash")
        
        # Сортируем оставшиеся данные
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
        
        # Секретный ключ
        secret_key = hmac.new(
            "WebAppData".encode(),
            bot_token.encode(),
            hashlib.sha256
        ).digest()
        
        # Вычисляем хеш данных
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if computed_hash == received_hash:
            return parsed
        return None
    except Exception as e:
        # Логирование ошибки при необходимости
        return None


async def get_current_telegram_user(
    x_telegram_init_data: Optional[str] = Header(default=None, alias="X-Telegram-Init-Data")
) -> Dict:
    """
    FastAPI Dependency: Проверяет заголовок X-Telegram-Init-Data.
    Возвращает данные пользователя, если подпись верна.
    Выбрасывает 403, если данных нет или подпись не совпала.
    """
    if not x_telegram_init_data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Отсутствуют данные инициализации Telegram (initData)"
        )
    
    validated_data = validate_init_data(x_telegram_init_data, settings.TELEGRAM_BOT_TOKEN)
    
    if not validated_data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неверная подпись initData. Возможно, запрос не из Telegram WebApp."
        )
    
    # Возвращаем распаршенные данные (там есть 'user' в JSON)
    return validated_data
