"""Асинхронный HTTP/WebSocket клиент для MiniMax API (T2A Text-to-Audio)."""

import binascii
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class MiniMaxService:
    """Реальный сервис для MiniMax Text-to-Audio (TTS) и Audio-to-Text (STT)."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or settings.MINIMAX_API_KEY
        self.base_url = base_url or settings.MINIMAX_BASE_URL

    async def text_to_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        speed: float = 1.0,
        model: str = "speech-01",
    ) -> bytes:
        """Превращает текст в аудиофайл (mp3/ogg). Возвращает bytes."""
        if not self.api_key:
            raise RuntimeError("MINIMAX_API_KEY не задан")

        payload = {
            "model": model,
            "text": text,
            "voice_id": voice_id or "male-qn-qingse",
            "speed": speed,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/t2a_v2",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            resp_data = response.json()

        data = resp_data.get("data", {})
        # MiniMax v2 может возвращать audio_hex или audio (base64)
        if "audio_hex" in data:
            logger.info("[MiniMax] получен audio_hex")
            return binascii.unhexlify(data["audio_hex"])
        if "audio" in data:
            import base64
            logger.info("[MiniMax] получен audio (base64)")
            return base64.b64decode(data["audio"])

        logger.error(f"[MiniMax] неизвестный формат ответа: {resp_data}")
        raise RuntimeError("MiniMax TTS response does not contain audio")

    async def transcribe_voice(self, audio_bytes: bytes, mime_type: str = "audio/ogg") -> str:
        """Распознаёт текст из голосового (STT). Заготовка для MiniMax STT endpoint."""
        # MiniMax STT API пока в beta / различается по документации.
        # Реализация через multipart upload.
        raise NotImplementedError("MiniMax STT endpoint not implemented yet")
