import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config, validateConfig } from './config';
import { database } from './database';
import { authMiddleware, adminMiddleware } from './auth';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import imageRoutes from './routes/image.routes';
import voiceRoutes from './routes/voice.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Middleware
// Allow wildcard (*) or specific origin; JWT in headers — credentials not needed for cross-origin
const corsOrigin: string | boolean = config.clientUrl === '*' ? true : config.clientUrl;
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/auth/me', authMiddleware);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/image', authMiddleware, imageRoutes);
app.use('/api/voice', authMiddleware, voiceRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve built frontend (production: public/ folder exists next to dist/)
const publicPath = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Start server
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
