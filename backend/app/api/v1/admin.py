from fastapi import APIRouter, Depends, HTTPException, Security
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, Subscription, AdminSetting
from sqlalchemy import select, func
from fastapi.security import HTTPBearer
from app.config import settings

router = APIRouter()
security = HTTPBearer()


async def verify_admin(credentials=Security(security)):
    """Verify admin rights by checking against ADMIN_IDS"""
    # In production, implement proper JWT or API key validation
    # For now, simplified
    return True


@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_admin)
):
    """Get system statistics"""
    # Total users
    total_users = await db.execute(select(func.count()).select_from(User))
    total_users = total_users.scalar()

    # Premium users
    premium_users = await db.execute(
        select(func.count()).select_from(User).where(User.is_premium == True)
    )
    premium_users = premium_users.scalar()

    # Active subscriptions
    active_subs = await db.execute(
        select(func.count()).select_from(Subscription)
        .where(Subscription.expires_at > func.now())
    )
    active_subs = active_subs.scalar()

    return {
        "total_users": total_users or 0,
        "premium_users": premium_users or 0,
        "active_subscriptions": active_subs or 0,
        "premium_percentage": round(
            (premium_users / total_users * 100) if total_users > 0 else 0, 2
        )
    }


@router.post("/users/{user_id}/grant-premium")
async def grant_premium(
    user_id: int,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_admin)
):
    """Manually grant premium to a user"""
    from sqlalchemy import update
    from datetime import datetime, timedelta

    user_result = await db.execute(select(User).where(User.telegram_id == user_id))
    user = user_result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    expires_at = datetime.utcnow() + timedelta(days=days)
    await db.execute(
        update(User)
        .where(User.telegram_id == user_id)
        .values(is_premium=True, premium_expires_at=expires_at)
    )
    await db.commit()

    return {"success": True, "expires_at": expires_at}


@router.get("/settings")
async def get_admin_settings(
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_admin)
):
    """Get admin settings"""
    result = await db.execute(select(AdminSetting))
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}


@router.post("/settings/{key}")
async def update_admin_setting(
    key: str,
    value: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_admin)
):
    """Update admin setting"""
    from sqlalchemy import update
    await db.execute(
        update(AdminSetting).where(AdminSetting.key == key).values(value=value)
    )
    await db.commit()
    return {"success": True}
