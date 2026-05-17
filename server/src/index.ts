import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { config, validateConfig } from './config';
import { database } from './database';
import { authMiddleware, adminMiddleware } from './auth';
import { geoBlockMiddleware } from './middleware/geoblock';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import imageRoutes from './routes/image.routes';
import voiceRoutes from './routes/voice.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import supportRoutes from './routes/support.routes';
import campaignRoutes from './routes/campaigns.routes';
import { kycProtectedRouter, kycWebhookRouter } from './routes/kyc.routes';

const app = express();

const corsOrigin: string | boolean = config.clientUrl === '*' ? true : config.clientUrl;
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Гео-блокировка NSFW — применяется глобально, флаг nsfwGeoBlocked проверяется в роутах
app.use(geoBlockMiddleware);

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/kyc-webhook', kycWebhookRouter);  // Didit webhook, без авторизации

// Protected routes
app.use('/api/auth/me', authMiddleware);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/image', authMiddleware, imageRoutes);
app.use('/api/voice', authMiddleware, voiceRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/kyc', authMiddleware, kycProtectedRouter);  // /session
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/api/support', authMiddleware, supportRoutes);
app.use('/api/campaigns', authMiddleware, campaignRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve built frontend
const publicPath = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

async function start() {
  validateConfig();

  try {
    await database.init();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`🚀 Morgan AI Server running on port ${config.port}`);
    console.log(`📡 Client URL: ${config.clientUrl}`);
  });
}

start();
