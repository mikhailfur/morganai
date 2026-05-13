from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, Subscription
from sqlalchemy import select, update
from datetime import datetime

router = APIRouter()


@router.get("/{telegram_id}", response_model=dict)
async def get_user(telegram_id: int, db: AsyncSession = Depends(get_db)):
    """Get user by Telegram ID"""
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{telegram_id}/select-character/{character_id}")
async def select_character(
    telegram_id: int,
    character_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Select a character for the user"""
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.execute(
        update(User).where(User.telegram_id == telegram_id).values(
            selected_character_id=character_id,
            last_activity_at=datetime.utcnow()
        )
    )
    return {"success": True}


@router.post("/{telegram_id}/select-mode/{mode_id}")
async def select_mode(
    telegram_id: int,
    mode_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Select a behavior mode for the user"""
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.execute(
        update(User).where(User.telegram_id == telegram_id).values(
            selected_mode_id=mode_id,
            last_activity_at=datetime.utcnow()
        )
    )
    return {"success": True}
