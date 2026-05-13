from app.models import Character, BehaviorMode


class PromptBuilder:
    """Build dynamic prompts by combining character and behavior mode prompts"""

    def build_system_prompt(
        self,
        character: Character,
        mode: BehaviorMode = None,
        user_name: str = "Пользователь"
    ) -> str:
        """Build combined system prompt"""
        prompt = character.system_prompt

        # Add behavior mode prompt if selected
        if mode:
            prompt += f"\n\n## Режим: {mode.name}\n{mode.prompt_addition}"

        # Add user context
        prompt += f"\n\nИмя пользователя: {user_name}"
        prompt += "\nОтвечай на русском языке, если не указано иное."

        return prompt
