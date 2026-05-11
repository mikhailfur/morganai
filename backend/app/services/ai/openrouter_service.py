"""Асинхронный HTTP-клиент для OpenRouter API (LLM + Vision)."""

import base64
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenRouterService:
    """Реальный сервис для вызова OpenRouter API."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, default_model: Optional[str] = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.base_url = base_url or settings.OPENROUTER_BASE_URL
        self.default_model = default_model or settings.OPENROUTER_DEFAULT_MODEL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://morgan-ai.app",
            "X-Title": "Morgan AI",
        }

    async def chat(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        temperature: float = 0.8,
        max_tokens: Optional[int] = None,
        **extra_kwargs,
    ) -> str:
        """Отправляет запрос чата к OpenRouter."""
        payload = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        payload.update(extra_kwargs)

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        try:
            content = data["choices"][0]["message"]["content"]
            logger.info(f"[OpenRouter] ответ получен, модель={payload['model']}")
            return content
        except (KeyError, IndexError) as exc:
            logger.error(f"[OpenRouter] неожиданный формат ответа: {data}")
            raise RuntimeError("Invalid OpenRouter response") from exc

    async def describe_image(
        self,
        image_bytes: bytes,
        user_text: str = "",
        mime_type: str = "image/jpeg",
        model: Optional[str] = None,
    ) -> str:
        """Отправляет текст + изображение (base64) в LLM и возвращает описание/ответ."""
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text or "Опиши, что на изображении."},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
                ],
            }
        ]
        return await self.chat(messages, model=model, temperature=0.5, max_tokens=1024)

    async def generate_image_prompt(self, user_message: str) -> str:
        """Генерирует английский промпт для генерации изображения."""
        system_msg = (
            "Ты — помощник по созданию промптов для генерации изображений. "
            "Переведи запрос пользователя на английский язык и сделай его детальным, атмосферным и визуальным."
        )
        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": f"Создай промпт для картинки: {user_message}"},
        ]
        return await self.chat(messages, temperature=0.7, max_tokens=512)
