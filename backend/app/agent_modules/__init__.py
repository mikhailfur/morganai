"""Реестр агент-модулей (режимов поведения)."""

from typing import Dict, Optional

from app.agent_modules.psychologist import PSYCHOLOGIST_PROMPT
from app.agent_modules.nsfw import NSFW_PROMPT
from app.agent_modules.study import STUDY_PROMPT
from app.agent_modules.work import WORK_PROMPT

_MODULES: Dict[str, str] = {
    "nsfw": NSFW_PROMPT,
    "psychologist": PSYCHOLOGIST_PROMPT,
    "study": STUDY_PROMPT,
    "work": WORK_PROMPT,
}


def get_module_prompt(mode: str) -> Optional[str]:
    return _MODULES.get(mode.lower())


def list_modules() -> list:
    return list(_MODULES.keys())
