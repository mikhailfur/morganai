"""Admin API endpoints для управления Morgan AI."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import SubscriptionStatus, User, UserRole

router = APIRouter()


class SubscriptionUpdate(BaseModel):
    status: SubscriptionStatus
    days: Optional[int] = 30
    provider: str = "manual"


class ModelUpdate(BaseModel):
    model_name: str


async def _verify_admin(x_admin_secret: str = Header(...)) -> bool:
    expected = getattr(settings, "ADMIN_SECRET_KEY", "")
    if not expected or x_admin_secret != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return True


@router.get("/users")
async def list_users(
    session: AsyncSession = Depends(get_db),
    _: bool = Depends(_verify_admin),
):
    """Возвращает список всех пользователей (с пагинацией — потом добавим)."""
    stmt = select(User).order_by(User.created_at.desc())
    result = await session.execute(stmt)
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "telegram_id": u.telegram_id,
            "username": u.username,
            "first_name": u.first_name,
            "role": u.role,
            "subscription_status": u.subscription_status,
            "is_premium": u.is_premium,
            "messages_count": u.messages_count,
            "last_activity_at": u.last_activity_at.isoformat() if u.last_activity_at else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.get("/users/premium")
async def list_premium_users(
    session: AsyncSession = Depends(get_db),
    _: bool = Depends(_verify_admin),
):
    """Только Premium-подписчики."""
    stmt = select(User).where(User.is_premium.is_(True)).order_by(User.subscription_expires_at.desc())
    result = await session.execute(stmt)
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "telegram_id": u.telegram_id,
            "username": u.username,
            "subscription_status": u.subscription_status,
            "subscription_expires_at": u.subscription_expires_at.isoformat() if u.subscription_expires_at else None,
        }
        for u in users
    ]


@router.post("/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: int,
    payload: SubscriptionUpdate,
    session: AsyncSession = Depends(get_db),
    _: bool = Depends(_verify_admin),
):
    """Ручная выдача или аннулирование подписки по внутреннему ID пользователя."""
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.subscription_status = payload.status
    user.subscription_provider = payload.provider
    from datetime import datetime, timedelta
    if payload.status in (SubscriptionStatus.PREMIUM, SubscriptionStatus.TRIAL):
        user.is_premium = True
        user.subscription_started_at = datetime.utcnow()
        user.subscription_expires_at = datetime.utcnow() + timedelta(days=payload.days)
    else:
        user.is_premium = False
        user.subscription_expires_at = None

    await session.commit()
    return {"detail": "Subscription updated", "user_id": user_id, "new_status": payload.status}


@router.post("/model")
async def set_default_model(
    payload: ModelUpdate,
    _: bool = Depends(_verify_admin),
):
    """Глобально меняет OPENROUTER_DEFAULT_MODEL (в памяти; для персистентности — в БД или .env)."""
    settings.OPENROUTER_DEFAULT_MODEL = payload.model_name
    return {"detail": "Model updated", "new_model": payload.model_name}


@router.get("/stats")
async def get_admin_stats(
    session: AsyncSession = Depends(get_db),
    _: bool = Depends(_verify_admin),
):
    """Быстрая сводная статистика."""
    total = await session.scalar(select(User).count())
    premium = await session.scalar(select(User).where(User.is_premium.is_(True)).count())
    return {
        "total_users": total,
        "premium_users": premium,
        "free_users": total - premium,
        "current_default_model": settings.OPENROUTER_DEFAULT_MODEL,
    }
