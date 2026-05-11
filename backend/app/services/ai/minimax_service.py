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
        """Распознаёт текст из голосового сообщения (STT) через MiniMax API."""
        if not self.api_key:
            raise RuntimeError("MINIMAX_API_KEY не задан")

        # Эндпоинт MiniMax для распознавания речи (ASR)
        # Документация может отличаться, примерный путь:
        url = f"{self.base_url}/a2t/v2"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }
        
        # Формируем multipart/form-data
        files = {"file": ("voice.ogg", audio_bytes, mime_type)}
        data = {"model": "speech-01"}  # Уточнить модель в документации MiniMax
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, files=files, data=data)
            response.raise_for_status()
            resp_data = response.json()
        
        # Парсим ответ (структура зависит от API MiniMax)
        if "text" in resp_data:
            logger.info("[MiniMax STT] текст успешно распознан")
            return resp_data["text"]
        elif "data" in resp_data and "text" in resp_data["data"]:
            return resp_data["data"]["text"]
        
        logger.error(f"[MiniMax STT] неожиданный ответ: {resp_data}")
        raise RuntimeError("Не удалось распознать речь")
