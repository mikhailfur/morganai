import express from 'express';
import type pino from 'pino';
import { env } from '../config/index.js';
import { rawBodyMiddleware } from './middleware/raw-body.js';
import healthRouter from './routes/health.js';
import webappRouter from './routes/webapp.js';
import { createDiditRouter } from './routes/didit.js';
import type { KycService } from '../services/kyc.service.js';
import type { NsfwService } from '../services/nsfw.service.js';

interface TelegramSender {
  telegram: { sendMessage(chatId: number, text: string, extra?: object): Promise<unknown> };
}

export interface ServerDeps {
  kycService: KycService;
  nsfwService: NsfwService;
  bot: TelegramSender;
  logger: pino.Logger;
}

export function createServer(deps: ServerDeps) {
  const app = express();

  // Raw body must be captured BEFORE express.json() parses it
  app.use(rawBodyMiddleware);
  app.use(express.json());

  // Routes
  app.use('/', healthRouter);
  app.use('/', webappRouter);
  app.use('/', createDiditRouter(deps.kycService, deps.nsfwService, deps.bot, deps.logger));

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    deps.logger.error({ err }, 'Unhandled server error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export async function startServer(deps: ServerDeps): Promise<void> {
  const app = createServer(deps);
  const port = env.PORT;

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      deps.logger.info({ port }, 'HTTP server started');
      deps.logger.info(`Webhook URL: ${env.SERVER_URL || `http://localhost:${port}`}/webhooks/didit`);
      deps.logger.info(`WebApp URL:  ${env.SERVER_URL || `http://localhost:${port}`}/webapp`);
      resolve();
    });
    server.on('error', reject);
  });
}
