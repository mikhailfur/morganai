from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import UserResponse
from app.models import User
from sqlalchemy import select
import hashlib
import hmac
import json
from app.config import settings


router = APIRouter()


@router.post("/validate")
async def validate_init_data(request: Request, db: AsyncSession = Depends(get_db)):
    """Validate Telegram WebApp initData using HMAC-SHA-256"""
    body = await request.json()
    init_data = body.get("initData", "")

    # Parse init_data
    parsed_data = dict(item.split("=") for item in init_data.split("&") if "=" in item)

    # Verify HMAC
    received_hash = parsed_data.get("hash", "")
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()) if k != "hash")

    secret_key = hmac.new(
        key=b"WebAppData",
        msg=settings.telegram_bot_token.encode(),
        digestmod=hashlib.sha256
    ).digest()

    computed_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode(),
        digestmod=hashlib.sha256
    ).hexdigest()

    if computed_hash != received_hash:
        return {"valid": False, "user": None}

    # Extract user data
    user_data = json.loads(parsed_data.get("user", "{}"))
    telegram_id = user_data.get("id")

    # Get or create user
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalars().first()

    if not user:
        user = User(
            telegram_id=telegram_id,
            username=user_data.get("username"),
            first_name=user_data.get("first_name"),
            last_name=user_data.get("last_name")
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

    return {"valid": True, "user": user}
