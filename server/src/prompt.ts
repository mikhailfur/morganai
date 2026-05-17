import type { BehaviorModule } from './characters/types';

export const getModulePrompt = (
  modules: BehaviorModule[],
  activeModuleId: string | null,
  voiceCount: number = 0,
  canNsfw: boolean = false,
  nsfwEnabled: boolean = false,
): string => {
  const voiceLimit = voiceCount > 0
    ? `\n\n## Ограничение голосовых\nЗа последние 5 часов отправлено ${voiceCount} голосовых. ${voiceCount >= 20 ? 'НЕ используй голосовые.' : voiceCount >= 10 ? 'Используй голосовые КРАЙНЕ РЕДКО (2-4%).' : 'Голосовые допустимы, но редко (10-15%).'}`
    : '';

  let module = modules.find(m => m.id === activeModuleId) || modules[0];

  // Fallback: если модуль NSFW, но нет доступа — использовать default
  if (module.isNsfw && (!canNsfw || !nsfwEnabled)) {
    module = modules[0];
  }

  const nsfwCheck = (!module.isNsfw && !(nsfwEnabled && canNsfw))
    ? `\n\n## Фильтр безопасности\nЕсли пользователь отправляет NSFW контент — верни: [NSFW_BLOCKED]\nРомантика, объятия, поцелуи — разрешены.`
    : '';

  return module.promptAddition + nsfwCheck + voiceLimit;
};

export const getBehaviorPrompt = (mode: string, voiceCount: number = 0): string => {
  const voiceLimit = voiceCount > 0
    ? `\n\n## Ограничение голосовых\nЗа последние 5 часов отправлено ${voiceCount} голосовых. ${voiceCount >= 20 ? 'НЕ используй голосовые.' : voiceCount >= 10 ? 'Используй голосовые КРАЙНЕ РЕДКО (2-4%).' : 'Голосовые допустимы, но редко (10-15%).'}`
    : '';

  const nsfwCheck = mode !== 'nsfw'
    ? `\n\n## Фильтр безопасности\nЕсли пользователь отправляет NSFW контент — верни: [NSFW_BLOCKED]\nРомантика, объятия, поцелуи — разрешены.`
    : '';

  switch (mode) {
    case 'study':
      return nsfwCheck + voiceLimit + `\n\n## Режим: УЧЁБА\nБудь терпеливым репетитором. Помогай с заданиями. НЕ используй голосовые для формул и математики.`;
    case 'work':
      return nsfwCheck + voiceLimit + `\n\n## Режим: РАБОТА\nПомогай с рабочими задачами, планированием, организацией.`;
    case 'psychologist':
      return nsfwCheck + voiceLimit + `\n\n## Режим: ПСИХОЛОГ\nВнимательно слушай, поддерживай, помогай разобраться в эмоциях. Будь мягким.`;
    case 'nsfw':
      return voiceLimit + `\n\n## Режим: NSFW (18+)\nВзрослый контент разрешён. Будь раскрепощённым, но в рамках взаимного согласия персонажей.`;
    default:
      return nsfwCheck + voiceLimit;
  }
};

export interface PromptContext {
  userName: string;
  userTime?: string;
  currentDate?: string;
}

export const injectPromptVariables = (prompt: string, ctx: PromptContext): string => {
  const now = new Date();
  const date = ctx.currentDate || now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = ctx.userTime || now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return prompt
    .replace(/\{\{user_name\}\}/g, ctx.userName || 'пользователь')
    .replace(/\{\{user_time\}\}/g, time)
    .replace(/\{\{current_date\}\}/g, date);
};
