"""Реестр персонажей Morgan AI."""

from typing import Dict, Type
from app.characters.base_character import BaseCharacter
from app.characters.morgan import MorganCharacter

_CHARACTERS: Dict[str, Type[BaseCharacter]] = {
    "morgan": MorganCharacter,
}


def get_character_registry() -> Dict[str, Type[BaseCharacter]]:
    return _CHARACTERS.copy()


def get_character(name: str) -> BaseCharacter:
    char_cls = _CHARACTERS.get(name.lower())
    if not char_cls:
        return MorganCharacter()
    return char_cls()


def list_character_names() -> list:
    return list(_CHARACTERS.keys())
