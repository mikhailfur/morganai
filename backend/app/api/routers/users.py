"""FastAPI router: Users (защищено через Telegram WebApp)."""

from fastapi import Depends, APIRouter

from app.core.security import get_current_telegram_user

router = APIRouter()


@router.get("/me")
async def get_me(telegram_data: dict = Depends(get_current_telegram_user)):
    """
    Возвращает данные текущего пользователя из initData.
    Доступно только из Telegram WebApp.
    """
    # Данные пользователя приходят в JSON-строке 'user'
    import json
    user_json = telegram_data.get("user", "{}")
    user_info = json.loads(user_json)
    
    return {
        "message": "Доступ разрешен",
        "telegram_user": user_info,
        "raw_data": telegram_data
    }
