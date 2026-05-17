import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

export interface Config {
  openrouterApiKey: string;
  openrouterModel: string;
  mysqlHost: string;
  mysqlPort: number;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlDatabase: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  minimaxApiToken: string;
  minimaxVoiceId: string;
  adminEmails: string[];
  port: number;
  clientUrl: string;
  // Didit KYC
  diditApiKey: string;
  diditWorkflowId: string;
  diditWebhookSecret: string;
}

export const config: Config = {
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openrouterModel: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v4-0324',
  mysqlHost: process.env.MYSQL_HOST || 'localhost',
  mysqlPort: parseInt(process.env.MYSQL_PORT || '3306'),
  mysqlUser: process.env.MYSQL_USER || 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD || '',
  mysqlDatabase: process.env.MYSQL_DATABASE || 'morganai',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  minimaxApiToken: process.env.MINIMAX_API_TOKEN || '',
  minimaxVoiceId: process.env.MINIMAX_VOICE_ID || '',
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean),
  port: parseInt(process.env.PORT || '3001'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // Didit KYC
  diditApiKey: process.env.DIDIT_API_KEY || '',
  diditWorkflowId: process.env.DIDIT_WORKFLOW_ID || '',
  diditWebhookSecret: process.env.DIDIT_WEBHOOK_SECRET || '',
};

export const validateConfig = (): void => {
  if (!config.openrouterApiKey) {
    console.warn('⚠️  OPENROUTER_API_KEY не установлен — чат не будет работать');
  }
  if (!config.jwtSecret || config.jwtSecret === 'change-this-secret-key') {
    console.warn('⚠️  JWT_SECRET не установлен или использует значение по умолчанию');
  }
};
