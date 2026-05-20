import { z } from 'zod';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),

  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_FREE_PRIMARY_MODEL: z.string().default('meta-llama/llama-3.1-70b-instruct:free'),
  OPENROUTER_FREE_FALLBACK_MODEL: z.string().default('google/gemma-2-9b-it:free'),
  OPENROUTER_PREMIUM_MODEL: z.string().default('deepseek/deepseek-chat'),
  OPENROUTER_WHISPER_MODEL: z.string().default('openai/whisper-1'),
  OPENROUTER_NAMING_MODEL: z.string().default('meta-llama/llama-3.1-8b-instruct:free'),
  OPENROUTER_SITE_URL: z.string().default('https://t.me/morganai_bot'),
  OPENROUTER_SITE_NAME: z.string().default('MorganAI'),

  DATABASE_URL: z.string().min(1),

  ADMIN_IDS: z.string().default(''),
  BOT_LINK: z.string().default('https://t.me/morganai_bot'),
  TELEGRAM_CHANNEL_URL: z.string().default(''),
  FEEDBACK_URL: z.string().default(''),

  DIDIT_API_KEY: z.string().default(''),
  DIDIT_WORKFLOW_ID: z.string().default(''),
  DIDIT_WEBHOOK_SECRET: z.string().default(''),

  PORT: z.coerce.number().int().positive().default(3000),
  SERVER_URL: z.string().default(''),

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

export const env = {
  ...parsed.data,
  adminIds: parsed.data.ADMIN_IDS
    ? parsed.data.ADMIN_IDS.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
    : [] as number[],
};
