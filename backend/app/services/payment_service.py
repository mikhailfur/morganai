import httpx
from app.config import settings
from typing import Optional


class TributeService:
    """Tribute payment gateway for Russian users"""

    def __init__(self):
        self.api_key = settings.tribute_api_key
        self.base_url = "https://api.tribute.tg"

    async def create_payment(
        self,
        user_id: int,
        plan_type: str,
        amount_rub: int
    ) -> dict:
        """Create payment in Tribute"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/create",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "amount": amount_rub,
                    "description": f"Morgan AI Premium - {plan_type}",
                    "user_id": str(user_id),
                    "callback_url": f"{settings.webapp_url}/webhooks/tribute"
                }
            )
            response.raise_for_status()
            return response.json()


class PaddleService:
    """Paddle payment gateway for global users"""

    def __init__(self):
        self.api_key = settings.paddle_api_key
        self.base_url = "https://api.paddle.com"

    async def create_checkout(
        self,
        user_id: int,
        plan_type: str,
        amount_usd: float
    ) -> dict:
        """Create Paddle checkout session"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/checkout-links",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "items": [{
                        "price_id": f"price_{plan_type}",
                        "quantity": 1
                    }],
                    "custom_data": {"user_id": user_id, "plan_type": plan_type}
                }
            )
            response.raise_for_status()
            return response.json()


tribute_service = TributeService()
paddle_service = PaddleService()
