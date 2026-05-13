from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import CharacterCreate, CharacterResponse
from app.models import Character
from sqlalchemy import select

router = APIRouter()


@router.get("/", response_model=list[CharacterResponse])
async def list_characters(
    include_nsfw: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """List all available characters"""
    query = select(Character)
    if not include_nsfw:
        query = query.where(Character.is_nsfw == False)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(character_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific character"""
    result = await db.execute(select(Character).where(Character.id == character_id))
    character = result.scalars().first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    return character


@router.post("/", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def create_character(character: CharacterCreate, db: AsyncSession = Depends(get_db)):
    """Create a new character"""
    db_character = Character(**character.model_dump())
    db.add(db_character)
    await db.flush()
    await db.refresh(db_character)
    return db_character
