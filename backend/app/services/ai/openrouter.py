"""Сервис для работы с OpenRouter API."""

import base64
import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIService:
    """Интерфейс для мультимодального ИИ через OpenRouter."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.base_url = base_url or settings.OPENROUTER_BASE_URL
        self.default_model = settings.OPENROUTER_DEFAULT_MODEL
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
        """
        Отправляет запрос чата к OpenRouter.

        Args:
            messages: Список сообщений в формате OpenAI-compatible:
                      [{"role": "user", "content": "..."}, ...]
            model: Модель для использования (переопределяет дефолтную).
            temperature: Температура семплирования.
            max_tokens: Максимальное количество токенов в ответе.

        Returns:
            Текст ответа от ассистента.
        """
        payload = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
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
            logger.info(f"OpenRouter ответ получен (model={payload['model']})")
            return content
        except (KeyError, IndexError) as exc:
            logger.error(f"Неожиданный формат ответа OpenRouter: {data}")
            raise RuntimeError("Invalid OpenRouter response") from exc

    # --- Мультимодальные заготовки ---

    async def chat_with_image(
        self,
        text: str,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        **kwargs,
    ) -> str:
        """Отправляет текст + изображение (base64) в LLM."""
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": text},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{b64_image}"},
                    },
                ],
            }
        ]
        return await self.chat(messages, **kwargs)

    async def chat_with_video(
        self,
        text: str,
        video_bytes: bytes,
        mime_type: str = "video/mp4",
        **kwargs,
    ) -> str:
        """Отправляет текст + видео (base64) в LLM."""
        b64_video = base64.b64encode(video_bytes).decode("utf-8")
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": text},
                    {
                        "type": "video",
                        "video": f"data:{mime_type};base64,{b64_video}",
                    },
                ],
            }
        ]
        return await self.chat(messages, **kwargs)

    # --- Голос (заготовки) ---

    async def transcribe_voice(self, audio_bytes: bytes, mime_type: str = "audio/ogg") -> str:
        """Заготовка для транскрибации голосового сообщения (STT).

        Реальная реализация может использовать OpenRouter Whisper или MiniMax.
        """
        logger.warning("STT/transcribe_voice — заготовка, требует реализации")
        return "[Voice transcription placeholder]"

    async def text_to_speech(self, text: str, voice_id: Optional[str] = None) -> bytes:
        """Заготовка для синтеза речи через MiniMax.

        Returns:
            Байты аудиофайла (например, MP3).
        """
        logger.warning("TTS/text_to_speech — заготовка, требует реализации MiniMax")
        return b""

    # --- Утилиты для контекста ---

    @staticmethod
    def build_system_prompt(
        character_name: str,
        system_prompt: str,
        behavior_mode: Optional[str] = None,
        is_premium: bool = False,
    ) -> str:
        """Собирает финальный системный промпт на основе персонажа и режима."""
        parts = [
            f"Ты — персонаж по имени {character_name}.",
            system_prompt,
        ]
        if behavior_mode:
            parts.append(f"Текущий режим поведения: {behavior_mode}.")
        if not is_premium:
            parts.append(
                "Пользователь использует бесплатную версию. "
                "Голос, NSFW и фото недоступны без подписки Premium."
            )
        return "\n".join(parts)

    @staticmethod
    def trim_context(messages: List[Dict[str, Any]], max_messages: int = 20) -> List[Dict[str, Any]]:
        """Обрезает историю до max_messages последних сообщений."""
        if len(messages) <= max_messages:
            return messages
        return messages[-max_messages:]
