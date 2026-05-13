import httpx
from app.config import settings
from typing import List, Optional


class OpenRouterService:
    """OpenRouter API integration for LLM + Vision"""

    def __init__(self):
        self.api_key = settings.openrouter_api_key
        self.model = settings.openrouter_model
        self.base_url = "https://openrouter.ai/api/v1"

    async def generate_response(
        self,
        system_prompt: str,
        conversation_history: List[dict],
        user_message: str,
        image_base64: Optional[str] = None
    ) -> str:
        """Generate response from LLM"""
        messages = [
            {"role": "system", "content": system_prompt},
            *conversation_history,
            {"role": "user", "content": user_message}
        ]

        # Handle image (Vision)
        if image_base64:
            messages[-1]["content"] = [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                {"type": "text", "text": user_message}
            ]

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "HTTP-Referer": settings.webapp_url,
                    "X-Title": "Morgan AI"
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2000
                }
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]


openrouter_service = OpenRouterService()
