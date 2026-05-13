from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import SubscriptionCreate, SubscriptionResponse
from app.models import Subscription
from sqlalchemy import select
from fastapi.security import HTTPBearer

router = APIRouter()
security = HTTPBearer()


@router.get("/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {
        "1_month": {"name": "1 месяц", "price_rub": 299, "price_usd": 4.99},
        "3_months": {"name": "3 месяца", "price_rub": 799, "price_usd": 12.99},
        "6_months": {"name": "6 месяцев", "price_rub": 1499, "price_usd": 24.99},
        "12_months": {"name": "12 месяцев", "price_rub": 2499, "price_usd": 39.99},
    }


@router.post("/create")
async def create_subscription(
    user_id: int,
    plan_type: str,
    payment_gateway: str,
    db: AsyncSession = Depends(get_db)
):
    """Create a new subscription (calls payment gateway)"""
    # This will be handled by payment service
    return {"message": "Subscription creation initiated"}


@router.get("/user/{user_id}", response_model=list[SubscriptionResponse])
async def get_user_subscriptions(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get all subscriptions for a user"""
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    return result.scalars().all()
