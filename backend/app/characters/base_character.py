"""Базовый класс персонажа Morgan AI."""

import enum
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class CharacterTrait(str, enum.Enum):
    """Черты характера персонажа."""

    FRIENDLY = "friendly"
    STRICT = "strict"
    PLAYFUL = "playful"
    SUPPORTIVE = "supportive"
    MYSTERIOUS = "mysterious"


class BaseCharacter(ABC):
    """Абстрактный класс ИИ-персонажа.

    Каждый персонаж определяет:
    - base_prompt: корневую системную инструкцию (кто он, его манера речи, правила);
    - name: имя;
    - allowed_modules: список режимов, которые этот персонаж может использовать.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Имя персонажа."""
        ...

    @property
    @abstractmethod
    def base_prompt(self) -> str:
        """Корневой system prompt персонажа."""
        ...

    @property
    def welcome_message(self) -> str:
        """Приветственное сообщение при /start."""
        return f"Привет! Я {self.name}. Давай общаться!"

    @property
    def allowed_modules(self) -> List[str]:
        """Какие режимы (agent_modules) доступны этому персонажу."""
        return ["nsfw", "psychologist", "study", "work"]

    @property
    def avatar_url(self) -> Optional[str]:
        """URL аватара (опционально)."""
        return None

    @property
    def description(self) -> str:
        """Короткое описание персонажа."""
        return "ИИ-персонаж Morgan AI"

    @property
    def voice_id(self) -> Optional[str]:
        """ID голоса для MiniMax TTS (опционально)."""
        return None

    def build_system_prompt(
        self,
        module_prompt: Optional[str] = None,
        user_context: Optional[str] = None,
        is_premium: bool = False,
    ) -> str:
        """Склеивает base_prompt + module_prompt + user_context в финальный system prompt."""
        parts: List[str] = [self.base_prompt.strip()]

        if module_prompt:
            parts.append(f"\n[Режим поведения]\n{module_prompt.strip()}")

        if user_context:
            parts.append(f"\n[Контекст пользователя]\n{user_context.strip()}")

        if not is_premium:
            parts.append(
                "\n[Ограничения Free]\n"
                "Пользователь на бесплатном тарифе. "
                "Голосовые сообщения, фото, видео и NSFW-контент недоступны без Premium-подписки."
            )

        return "\n".join(parts)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "avatar_url": self.avatar_url,
            "allowed_modules": self.allowed_modules,
        }

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name}>"
