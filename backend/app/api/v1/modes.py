from fastapi import APIRouter, Depends, HTTPException, Security
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import BehaviorModeResponse
from app.models import BehaviorMode
from sqlalchemy import select
from fastapi.security import HTTPBearer

router = APIRouter()
security = HTTPBearer()


@router.get("/", response_model=list[BehaviorModeResponse])
async def list_modes(
    db: AsyncSession = Depends(get_db),
    credentials=Security(security)
):
    """List all available behavior modes"""
    result = await db.execute(select(BehaviorMode))
    return result.scalars().all()


@router.get("/{mode_id}", response_model=BehaviorModeResponse)
async def get_mode(mode_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific behavior mode"""
    result = await db.execute(select(BehaviorMode).where(BehaviorMode.id == mode_id))
    mode = result.scalars().first()
    if not mode:
        raise HTTPException(status_code=404, detail="Mode not found")
    return mode
