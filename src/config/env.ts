import { z } from 'zod';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),

  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_FREE_PRIMARY_MODEL: z.string().default('meta-llama/llama-3.1-70b-instruct:free'),
  OPENROUTER_FREE_FALLBACK_MODEL: z.string().default('google/gemma-2-9b-it:free'),
  OPENROUTER_PREMIUM_MODEL: z.string().default('deepseek/deepseek-chat'),
  OPENROUTER_WHISPER_MODEL: z.string().default('openai/whisper-1'),
  OPENROUTER_SITE_URL: z.string().default('https://t.me/morganai_bot'),
  OPENROUTER_SITE_NAME: z.string().default('MorganAI'),

  DATABASE_URL: z.string().min(1),

  CONTEXT_WINDOW_SIZE: z.coerce.number().int().positive().default(20),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
