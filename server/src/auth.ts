import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { database } from './database';
import { Request, Response, NextFunction } from 'express';

export interface JwtPayload {
  userId: number;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
};

export const COOKIE_NAME = 'morgan_token';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Try cookie first, then Authorization header for backward compat
    const cookieToken = (req as any).cookies?.[COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

    if (!token) {
      res.status(401).json({ error: 'Необходима авторизация' });
      return;
    }

    const payload = verifyToken(token);
    const user = await database.getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    if (user.is_banned) {
      res.status(403).json({ error: 'Аккаунт заблокирован' });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
};

export const adminMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Необходима авторизация' });
      return;
    }

    const user = await database.getUserById(req.user.userId);
    if (!user || !user.is_admin) {
      res.status(403).json({ error: 'Доступ запрещён' });
      return;
    }

    next();
  } catch (error) {
    res.status(403).json({ error: 'Доступ запрещён' });
  }
};

export const supportMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Необходима авторизация' });
      return;
    }

    const user = await database.getUserById(req.user.userId);
    if (!user || (!user.is_admin && !user.is_support)) {
      res.status(403).json({ error: 'Доступ запрещён' });
      return;
    }

    next();
  } catch (error) {
    res.status(403).json({ error: 'Доступ запрещён' });
  }
};
