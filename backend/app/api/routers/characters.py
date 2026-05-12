"""FastAPI router: Characters.

Возвращает список доступных персонажей.
Работает с БД, но имеет захардкоженный фоллбэк,
если таблица пуста или недоступна (чтобы фронтенд не падал).
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter()

# Дефолтные персонажи на случай, если БД пуста
FALLBACK_CHARACTERS = [
    {
        "id": 1,
        "name": "Морган",
        "description": "Твой личный ИИ-ассистент и собеседник",
        "avatar_url": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80",
        "behavior_mode": "psychologist",
        "is_default": True,
    },
    {
        "id": 2,
        "name": "Алекса",
        "description": "Эксперт по продуктивности и учёбе",
        "avatar_url": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80",
        "behavior_mode": "study",
        "is_default": False,
    },
]


@router.get("/")
async def list_characters(session: AsyncSession = Depends(get_db)):
    """
    Возвращает список персонажей.
    Пытается прочитать из БД, если не получается — возвращает фоллбэк.
    """
    try:
        # Пытаемся импортировать модель Character
        from app.models.character import Character
        
        result = await session.execute(select(Character).where(Character.is_active.is_(True)))
        chars = result.scalars().all()
        
        if not chars:
            # Если в БД пусто, возвращаем дефолтные
            return FALLBACK_CHARACTERS
        
        # Преобразуем объекты SQLAlchemy в словари
        return [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "avatar_url": c.avatar_url,
                "behavior_mode": c.behavior_mode,
                "is_default": c.is_default,
            }
            for c in chars
        ]
    except Exception as e:
        # Любая ошибка (нет таблицы, нет модели) — возвращаем фоллбэк
        print(f"Ошибка чтения персонажей из БД: {e}. Используем фоллбэк.")
        return FALLBACK_CHARACTERS
