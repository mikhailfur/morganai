import type { MiddlewareFn } from 'telegraf';
import type { BotContext } from '../context.js';
import type { UserService } from '../../services/user.service.js';

export function authMiddleware(userService: UserService): MiddlewareFn<BotContext> {
  return async (ctx, next) => {
    const from = ctx.from;
    if (!from) return next();

    ctx.dbUser = await userService.getOrCreate({
      id: from.id,
      username: from.username,
      first_name: from.first_name,
    });

    return next();
  };
}
