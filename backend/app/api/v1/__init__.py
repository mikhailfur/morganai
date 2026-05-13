from fastapi import APIRouter
from app.api.v1 import characters, modes, auth, users, subscriptions, admin

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(characters.router, prefix="/characters", tags=["Characters"])
router.include_router(modes.router, prefix="/modes", tags=["Behavior Modes"])
router.include_router(subscriptions.router, prefix="/subscription", tags=["Subscriptions"])
router.include_router(admin.router, prefix="/admin", tags=["Admin"])
