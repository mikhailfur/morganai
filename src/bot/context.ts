import { Context } from 'telegraf';
import type { User } from '../database/schema.js';

export interface BotContext extends Context {
  dbUser: User;
}
