import mysql from 'mysql2/promise';
import { config } from './config';

export interface PlanLimits {
  plan_type: string;
  daily_message_limit: number;
  context_messages: number;
  context_chars: number;
  voice_limit: number;
  voice_window_hours: number;
}

class Database {
  private pool: mysql.Pool;
  private planLimitsCache: Record<string, PlanLimits> = {};
  private planLimitsCacheTime = 0;

  constructor() {
    this.pool = mysql.createPool({
      host: config.mysqlHost,
      port: config.mysqlPort,
      user: config.mysqlUser,
      password: config.mysqlPassword,
      database: config.mysqlDatabase,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  private async addColumnIfNotExists(table: string, column: string, definition: string): Promise<void> {
    try {
      await this.pool.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
    } catch (err: any) {
      if (err.errno !== 1060) throw err;
    }
  }

  async init(): Promise<void> {
    try {
      // Users
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          avatar_url VARCHAR(500) DEFAULT NULL,
          is_premium BOOLEAN DEFAULT 0,
          is_admin BOOLEAN DEFAULT 0,
          subscription_until BIGINT DEFAULT NULL,
          behavior_mode VARCHAR(50) DEFAULT 'default',
          selected_character VARCHAR(100) DEFAULT 'morgan',
          trial_used BOOLEAN DEFAULT 0,
          total_messages INT DEFAULT 0,
          created_at BIGINT NOT NULL,
          last_active BIGINT DEFAULT NULL,
          INDEX idx_email (email),
          INDEX idx_last_active (last_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // New user columns (idempotent)
      await this.addColumnIfNotExists('users', 'kyc_verified', 'BOOLEAN DEFAULT FALSE');
      await this.addColumnIfNotExists('users', 'is_banned', 'BOOLEAN DEFAULT FALSE');
      await this.addColumnIfNotExists('users', 'subscription_expires_at', 'BIGINT NULL');
      await this.addColumnIfNotExists('users', 'subscription_type', "ENUM('free','premium','premium_plus') DEFAULT 'free'");
      await this.addColumnIfNotExists('users', 'daily_messages_count', 'INT DEFAULT 0');
      await this.addColumnIfNotExists('users', 'daily_messages_reset', 'BIGINT DEFAULT 0');
      await this.addColumnIfNotExists('users', 'google_id', 'VARCHAR(255) NULL');
      await this.addColumnIfNotExists('users', 'telegram_id', 'BIGINT NULL');

      // Characters
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS characters (
          id INT AUTO_INCREMENT PRIMARY KEY,
          slug VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          avatar_url VARCHAR(500) DEFAULT NULL,
          system_prompt TEXT NOT NULL,
          greeting_message TEXT DEFAULT NULL,
          is_premium BOOLEAN DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          sort_order INT DEFAULT 0,
          created_at BIGINT NOT NULL,
          INDEX idx_slug (slug),
          INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Chat history
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS chat_history (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          character_slug VARCHAR(100) NOT NULL DEFAULT 'morgan',
          role ENUM('user', 'assistant') NOT NULL,
          content TEXT NOT NULL,
          has_voice BOOLEAN DEFAULT 0,
          has_image BOOLEAN DEFAULT 0,
          image_url VARCHAR(500) DEFAULT NULL,
          timestamp BIGINT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_char_ts (user_id, character_slug, timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Subscriptions
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          plan VARCHAR(50) NOT NULL,
          started_at BIGINT NOT NULL,
          expires_at BIGINT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Voice messages tracking
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS voice_messages (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          timestamp BIGINT NOT NULL,
          INDEX idx_user_ts (user_id, timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Plan limits (configurable from admin)
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS plan_limits (
          plan_type ENUM('free','premium','premium_plus') PRIMARY KEY,
          daily_message_limit INT NOT NULL DEFAULT 50,
          context_messages INT NOT NULL DEFAULT 20,
          context_chars INT NOT NULL DEFAULT 12000,
          voice_limit INT NOT NULL DEFAULT 20,
          voice_window_hours INT NOT NULL DEFAULT 5,
          updated_at BIGINT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Admin event log
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS admin_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          admin_id INT NOT NULL,
          target_user_id INT NULL,
          action VARCHAR(100) NOT NULL,
          details JSON NULL,
          created_at BIGINT NOT NULL,
          INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // User-created characters
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS user_characters (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          avatar_url VARCHAR(500) DEFAULT NULL,
          system_prompt TEXT NOT NULL,
          greeting_message TEXT DEFAULT NULL,
          is_public BOOLEAN DEFAULT 0,
          sort_order INT DEFAULT 0,
          created_at BIGINT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_public (is_public)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // New user columns
      await this.addColumnIfNotExists('users', 'is_support', 'BOOLEAN DEFAULT FALSE');

      // New user_characters columns (moderation)
      await this.addColumnIfNotExists('user_characters', 'moderation_status', "ENUM('pending','approved','rejected') DEFAULT 'pending'");
      await this.addColumnIfNotExists('user_characters', 'is_nsfw', 'BOOLEAN DEFAULT FALSE');
      await this.addColumnIfNotExists('user_characters', 'rejection_reason', 'TEXT NULL');
      await this.addColumnIfNotExists('user_characters', 'reviewed_by', 'INT NULL');
      await this.addColumnIfNotExists('user_characters', 'reviewed_at', 'BIGINT NULL');
      try {
        await this.pool.execute('ALTER TABLE user_characters ADD INDEX idx_mod_status (moderation_status)');
      } catch (err: any) { if (err.errno !== 1061) throw err; }

      // Approve existing public user characters (migration for existing data)
      await this.pool.execute(
        "UPDATE user_characters SET moderation_status = 'approved' WHERE is_public = 1 AND moderation_status = 'pending'"
      );

      // Support tickets
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS support_tickets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          subject VARCHAR(500) NOT NULL,
          status ENUM('open','in_progress','closed') DEFAULT 'open',
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS ticket_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ticket_id INT NOT NULL,
          sender_id INT NOT NULL,
          sender_role ENUM('user','support') NOT NULL,
          content TEXT NOT NULL,
          created_at BIGINT NOT NULL,
          FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_ticket_id (ticket_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Per-character module settings
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS user_character_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          character_slug VARCHAR(100) NOT NULL,
          active_module_id VARCHAR(100) NULL,
          updated_at BIGINT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_user_char (user_id, character_slug),
          INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Campaigns
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS campaigns (
          id INT AUTO_INCREMENT PRIMARY KEY,
          character_slug VARCHAR(100) NOT NULL,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          cover_url VARCHAR(500) DEFAULT NULL,
          is_active BOOLEAN DEFAULT 1,
          sort_order INT DEFAULT 0,
          created_at BIGINT NOT NULL,
          INDEX idx_character (character_slug),
          INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS campaign_scenes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          campaign_id INT NOT NULL,
          scene_order INT NOT NULL,
          title VARCHAR(500) NOT NULL,
          location VARCHAR(500) DEFAULT NULL,
          situation TEXT,
          context_prompt TEXT NOT NULL,
          FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
          INDEX idx_campaign_order (campaign_id, scene_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS user_campaign_progress (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          campaign_id INT NOT NULL,
          current_scene_id INT NOT NULL,
          is_completed BOOLEAN DEFAULT 0,
          started_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
          FOREIGN KEY (current_scene_id) REFERENCES campaign_scenes(id),
          UNIQUE KEY uq_user_campaign (user_id, campaign_id),
          INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Seed plan limits defaults
      await this.pool.execute(`
        INSERT IGNORE INTO plan_limits (plan_type, daily_message_limit, context_messages, context_chars, voice_limit, voice_window_hours, updated_at)
        VALUES
          ('free',         50,   20,  12000, 20, 5, 0),
          ('premium',      500,  50,  50000, 20, 5, 0),
          ('premium_plus', 9999, 100, 100000, 9999, 5, 0)
      `);

      // Seed default character (Morgan)
      await this.seedDefaultCharacters();

      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  private async seedDefaultCharacters(): Promise<void> {
    const { characters } = await import('./characters/index');
    for (const char of characters) {
      const [rows] = await this.pool.execute('SELECT id FROM characters WHERE slug = ?', [char.slug]);
      if ((rows as any[]).length > 0) continue;
      await this.pool.execute(
        `INSERT INTO characters (slug, name, description, system_prompt, greeting_message, is_premium, is_active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [char.slug, char.name, char.description, char.systemPrompt, char.greetingMessage, char.isPremium ? 1 : 0, char.isActive ? 1 : 0, char.sortOrder, Date.now()]
      );
      console.log(`✅ Character "${char.name}" seeded`);
    }
  }

  // === User methods ===

  async createUser(email: string, username: string, passwordHash: string): Promise<number> {
    const now = Date.now();
    const isAdmin = config.adminEmails.includes(email);
    const [result] = await this.pool.execute(
      `INSERT INTO users (email, username, password_hash, is_admin, created_at, last_active) VALUES (?, ?, ?, ?, ?, ?)`,
      [email, username, passwordHash, isAdmin ? 1 : 0, now, now]
    );
    return (result as any).insertId;
  }

  async createUserOAuth(email: string, username: string, googleId?: string, telegramId?: number): Promise<number> {
    const now = Date.now();
    const isAdmin = config.adminEmails.includes(email);
    const [result] = await this.pool.execute(
      `INSERT INTO users (email, username, password_hash, is_admin, google_id, telegram_id, created_at, last_active) VALUES (?, ?, '', ?, ?, ?, ?, ?)`,
      [email, username, isAdmin ? 1 : 0, googleId || null, telegramId || null, now, now]
    );
    return (result as any).insertId;
  }

  async getUserByEmail(email: string): Promise<any> {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    return (rows as any[])[0] || null;
  }

  async getUserById(id: number): Promise<any> {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    return (rows as any[])[0] || null;
  }

  async getUserByGoogleId(googleId: string): Promise<any> {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE google_id = ?', [googleId]);
    return (rows as any[])[0] || null;
  }

  async getUserByTelegramId(telegramId: number): Promise<any> {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    return (rows as any[])[0] || null;
  }

  async updateUserGoogleId(userId: number, googleId: string): Promise<void> {
    await this.pool.execute('UPDATE users SET google_id = ? WHERE id = ?', [googleId, userId]);
  }

  async updateUserActivity(userId: number): Promise<void> {
    await this.pool.execute(
      'UPDATE users SET last_active = ?, total_messages = total_messages + 1 WHERE id = ?',
      [Date.now(), userId]
    );
  }

  async setUserBehaviorMode(userId: number, mode: string): Promise<void> {
    await this.pool.execute('UPDATE users SET behavior_mode = ? WHERE id = ?', [mode, userId]);
  }

  async setUserCharacter(userId: number, slug: string): Promise<void> {
    await this.pool.execute('UPDATE users SET selected_character = ? WHERE id = ?', [slug, userId]);
  }

  async setUserPremium(userId: number, isPremium: boolean, expiresAt?: number): Promise<void> {
    await this.pool.execute(
      'UPDATE users SET is_premium = ?, subscription_until = ? WHERE id = ?',
      [isPremium ? 1 : 0, expiresAt || null, userId]
    );
  }

  async setUserSubscription(userId: number, type: 'free' | 'premium' | 'premium_plus', expiresAt?: number | null): Promise<void> {
    const isPremium = type !== 'free';
    await this.pool.execute(
      'UPDATE users SET subscription_type = ?, is_premium = ?, subscription_expires_at = ?, subscription_until = ? WHERE id = ?',
      [type, isPremium ? 1 : 0, expiresAt ?? null, expiresAt ?? null, userId]
    );
  }

  async setUserBanned(userId: number, isBanned: boolean): Promise<void> {
    await this.pool.execute('UPDATE users SET is_banned = ? WHERE id = ?', [isBanned ? 1 : 0, userId]);
  }

  async setUserKycVerified(userId: number): Promise<void> {
    await this.pool.execute('UPDATE users SET kyc_verified = TRUE WHERE id = ?', [userId]);
  }

  async changeUserPassword(userId: number, passwordHash: string): Promise<void> {
    await this.pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
  }

  async deleteUser(userId: number): Promise<void> {
    await this.pool.execute('DELETE FROM users WHERE id = ?', [userId]);
  }

  async setUserSupport(userId: number, isSupport: boolean): Promise<void> {
    await this.pool.execute('UPDATE users SET is_support = ? WHERE id = ?', [isSupport ? 1 : 0, userId]);
  }

  async getAllUsers(): Promise<any[]> {
    const [rows] = await this.pool.execute(
      'SELECT id, email, username, is_premium, is_admin, is_support, is_banned, kyc_verified, subscription_type, subscription_expires_at, behavior_mode, selected_character, total_messages, created_at, last_active FROM users ORDER BY last_active DESC'
    );
    return rows as any[];
  }

  async getUsersStats(): Promise<any> {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const [rows] = await this.pool.execute(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_premium = 1 THEN 1 END) as premium_users,
        COUNT(CASE WHEN last_active > ? THEN 1 END) as active_users,
        SUM(total_messages) as total_messages
      FROM users
    `, [dayAgo]);
    return (rows as any[])[0] || {};
  }

  // === Daily message limits ===

  async checkAndIncrementDailyMessages(userId: number, planType: string): Promise<{ allowed: boolean; remaining: number }> {
    const limits = await this.getPlanLimits();
    const plan = limits[planType] || limits['free'];
    const limit = plan.daily_message_limit;

    if (limit >= 9999) return { allowed: true, remaining: 9999 };

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    // Reset count if it's a new day
    await this.pool.execute(
      'UPDATE users SET daily_messages_count = 0, daily_messages_reset = ? WHERE id = ? AND daily_messages_reset < ?',
      [todayMs, userId, todayMs]
    );

    const [rows] = await this.pool.execute(
      'SELECT daily_messages_count FROM users WHERE id = ?',
      [userId]
    );
    const count = (rows as any[])[0]?.daily_messages_count ?? 0;

    if (count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await this.pool.execute(
      'UPDATE users SET daily_messages_count = daily_messages_count + 1, daily_messages_reset = ? WHERE id = ?',
      [todayMs, userId]
    );

    return { allowed: true, remaining: limit - count - 1 };
  }

  // === Plan limits ===

  async getPlanLimits(): Promise<Record<string, PlanLimits>> {
    const now = Date.now();
    if (now - this.planLimitsCacheTime < 5 * 60 * 1000 && Object.keys(this.planLimitsCache).length > 0) {
      return this.planLimitsCache;
    }
    const [rows] = await this.pool.execute('SELECT * FROM plan_limits');
    const result: Record<string, PlanLimits> = {};
    for (const row of rows as PlanLimits[]) {
      result[row.plan_type] = row;
    }
    this.planLimitsCache = result;
    this.planLimitsCacheTime = now;
    return result;
  }

  async updatePlanLimits(planType: string, limits: Partial<PlanLimits>): Promise<void> {
    const fields = Object.keys(limits).filter(k => k !== 'plan_type');
    if (fields.length === 0) return;
    const sets = fields.map(f => `${f} = ?`).join(', ');
    const vals = fields.map(f => (limits as any)[f]);
    await this.pool.execute(
      `UPDATE plan_limits SET ${sets}, updated_at = ? WHERE plan_type = ?`,
      [...vals, Date.now(), planType]
    );
    this.planLimitsCacheTime = 0; // invalidate cache
  }

  // === Admin events ===

  async logAdminEvent(adminId: number, action: string, targetUserId?: number, details?: object): Promise<void> {
    await this.pool.execute(
      'INSERT INTO admin_events (admin_id, target_user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [adminId, targetUserId ?? null, action, details ? JSON.stringify(details) : null, Date.now()]
    );
  }

  // Системное событие (не от администратора) — admin_id = 0 (LEFT JOIN вернёт NULL для email)
  async logSystemEvent(action: string, targetUserId?: number, details?: object): Promise<void> {
    await this.pool.execute(
      'INSERT INTO admin_events (admin_id, target_user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)',
      [0, targetUserId ?? null, action, details ? JSON.stringify(details) : null, Date.now()]
    );
  }

  async getAdminEvents(limit: number = 50): Promise<any[]> {
    const safeLimit = Math.min(limit, 200);
    const [rows] = await this.pool.execute(
      `SELECT e.*, u.email as admin_email, t.email as target_email
       FROM admin_events e
       LEFT JOIN users u ON e.admin_id = u.id
       LEFT JOIN users t ON e.target_user_id = t.id
       ORDER BY e.created_at DESC LIMIT ${safeLimit}`
    );
    return rows as any[];
  }

  // === Character methods ===

  async getCharacters(includeInactive: boolean = false): Promise<any[]> {
    const sql = includeInactive
      ? 'SELECT * FROM characters ORDER BY sort_order ASC'
      : 'SELECT * FROM characters WHERE is_active = 1 ORDER BY sort_order ASC';
    const [rows] = await this.pool.execute(sql);
    return rows as any[];
  }

  async getCharacterBySlug(slug: string): Promise<any> {
    const [rows] = await this.pool.execute('SELECT * FROM characters WHERE slug = ?', [slug]);
    return (rows as any[])[0] || null;
  }

  // === User characters methods ===

  async createUserCharacter(userId: number, data: {
    name: string; description?: string; system_prompt: string;
    greeting_message?: string; avatar_url?: string; is_public?: boolean; is_nsfw?: boolean;
  }): Promise<number> {
    const moderationStatus = data.is_public ? 'pending' : 'approved';
    const [result] = await this.pool.execute(
      `INSERT INTO user_characters (user_id, name, description, system_prompt, greeting_message, avatar_url, is_public, is_nsfw, moderation_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, data.name, data.description || null, data.system_prompt, data.greeting_message || null, data.avatar_url || null, data.is_public ? 1 : 0, data.is_nsfw ? 1 : 0, moderationStatus, Date.now()]
    );
    return (result as any).insertId;
  }

  async getUserCharacters(userId: number): Promise<any[]> {
    const [rows] = await this.pool.execute(
      'SELECT * FROM user_characters WHERE user_id = ? ORDER BY sort_order, created_at DESC',
      [userId]
    );
    return rows as any[];
  }

  async getPublicUserCharacters(includeNsfw: boolean = false): Promise<any[]> {
    const nsfwFilter = includeNsfw ? '' : ' AND uc.is_nsfw = 0';
    const [rows] = await this.pool.execute(
      `SELECT uc.*, u.username as author_name FROM user_characters uc JOIN users u ON uc.user_id = u.id WHERE uc.is_public = 1 AND uc.moderation_status = 'approved'${nsfwFilter} ORDER BY uc.sort_order, uc.created_at DESC LIMIT 100`
    );
    return rows as any[];
  }

  async getCharactersForModeration(status?: string, page: number = 0): Promise<any[]> {
    const limit = 20;
    const offset = page * limit;
    const statusFilter = status ? ` AND uc.moderation_status = '${status}'` : '';
    const [rows] = await this.pool.execute(
      `SELECT uc.*, u.username as author_name FROM user_characters uc JOIN users u ON uc.user_id = u.id WHERE 1=1${statusFilter} ORDER BY uc.created_at DESC LIMIT ${limit} OFFSET ${offset}`
    );
    return rows as any[];
  }

  async moderateUserCharacter(id: number, status: 'approved' | 'rejected', reviewedBy: number, rejectionReason?: string): Promise<void> {
    const now = Date.now();
    await this.pool.execute(
      `UPDATE user_characters SET moderation_status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = ?${status === 'rejected' ? ', is_public = 0' : ''} WHERE id = ?`,
      [status, rejectionReason || null, reviewedBy, now, id]
    );
  }

  async setUserCharacterNsfw(id: number, isNsfw: boolean): Promise<void> {
    await this.pool.execute('UPDATE user_characters SET is_nsfw = ? WHERE id = ?', [isNsfw ? 1 : 0, id]);
  }

  async getUserCharacterById(id: number, userId?: number): Promise<any> {
    const sql = userId
      ? 'SELECT * FROM user_characters WHERE id = ? AND user_id = ?'
      : 'SELECT * FROM user_characters WHERE id = ?';
    const params = userId ? [id, userId] : [id];
    const [rows] = await this.pool.execute(sql, params);
    return (rows as any[])[0] || null;
  }

  async updateUserCharacter(id: number, userId: number, data: {
    name?: string; description?: string; system_prompt?: string;
    greeting_message?: string; avatar_url?: string; is_public?: boolean;
    is_nsfw?: boolean; moderation_status?: string;
  }): Promise<void> {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description || null); }
    if (data.system_prompt !== undefined) { sets.push('system_prompt = ?'); vals.push(data.system_prompt); }
    if (data.greeting_message !== undefined) { sets.push('greeting_message = ?'); vals.push(data.greeting_message || null); }
    if (data.avatar_url !== undefined) { sets.push('avatar_url = ?'); vals.push(data.avatar_url || null); }
    if (data.is_public !== undefined) { sets.push('is_public = ?'); vals.push(data.is_public ? 1 : 0); }
    if (data.is_nsfw !== undefined) { sets.push('is_nsfw = ?'); vals.push(data.is_nsfw ? 1 : 0); }
    if (data.moderation_status !== undefined) { sets.push('moderation_status = ?'); vals.push(data.moderation_status); }
    if (sets.length === 0) return;
    vals.push(id, userId);
    await this.pool.execute(`UPDATE user_characters SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, vals);
  }

  async deleteUserCharacter(id: number, userId: number): Promise<void> {
    await this.pool.execute('DELETE FROM user_characters WHERE id = ? AND user_id = ?', [id, userId]);
  }

  // === Chat history methods ===

  async saveMessage(userId: number, characterSlug: string, role: 'user' | 'assistant', content: string, hasVoice: boolean = false, hasImage: boolean = false, imageUrl?: string): Promise<void> {
    await this.pool.execute(
      `INSERT INTO chat_history (user_id, character_slug, role, content, has_voice, has_image, image_url, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, characterSlug, role, content.substring(0, 10000), hasVoice ? 1 : 0, hasImage ? 1 : 0, imageUrl || null, Date.now()]
    );
  }

  async getChatHistory(userId: number, characterSlug: string, limit: number = 50): Promise<any[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const [rows] = await this.pool.execute(
      `SELECT id, role, content, has_voice, has_image, image_url, timestamp
       FROM chat_history
       WHERE user_id = ? AND character_slug = ?
       ORDER BY timestamp DESC LIMIT ${safeLimit}`,
      [userId, characterSlug]
    );
    return (rows as any[]).reverse();
  }

  async clearChatHistory(userId: number, characterSlug: string): Promise<void> {
    await this.pool.execute(
      'DELETE FROM chat_history WHERE user_id = ? AND character_slug = ?',
      [userId, characterSlug]
    );
  }

  async getUserStats(userId: number): Promise<any> {
    const [rows] = await this.pool.execute(`
      SELECT
        COUNT(*) as total_messages,
        MIN(timestamp) as first_message,
        MAX(timestamp) as last_message
      FROM chat_history WHERE user_id = ?
    `, [userId]);
    return (rows as any[])[0] || { total_messages: 0 };
  }

  // === Voice tracking ===

  async trackVoiceMessage(userId: number): Promise<void> {
    await this.pool.execute(
      'INSERT INTO voice_messages (user_id, timestamp) VALUES (?, ?)',
      [userId, Date.now()]
    );
  }

  async getVoiceMessageCount(userId: number, hours: number = 5): Promise<number> {
    const since = Date.now() - (hours * 60 * 60 * 1000);
    const [rows] = await this.pool.execute(
      'SELECT COUNT(*) as count FROM voice_messages WHERE user_id = ? AND timestamp > ?',
      [userId, since]
    );
    return (rows as any[])[0]?.count || 0;
  }

  // === Subscription ===

  async checkSubscription(userId: number): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user || !user.is_premium) return false;
    const expiry = user.subscription_expires_at || user.subscription_until;
    if (expiry && expiry < Date.now()) {
      await this.setUserSubscription(userId, 'free');
      return false;
    }
    return true;
  }

  getUserPlanType(user: any): string {
    if (!user.is_premium) return 'free';
    const expiry = user.subscription_expires_at || user.subscription_until;
    if (expiry && expiry < Date.now()) return 'free';
    return user.subscription_type || 'premium';
  }

  // === Support tickets ===

  async createTicket(userId: number, subject: string): Promise<number> {
    const now = Date.now();
    const [result] = await this.pool.execute(
      'INSERT INTO support_tickets (user_id, subject, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [userId, subject, 'open', now, now]
    );
    return (result as any).insertId;
  }

  async getTicketsByUser(userId: number): Promise<any[]> {
    const [rows] = await this.pool.execute(
      `SELECT t.*, (SELECT content FROM ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM support_tickets t WHERE t.user_id = ? ORDER BY t.updated_at DESC`,
      [userId]
    );
    return rows as any[];
  }

  async getAllTickets(status?: string, page: number = 0): Promise<any[]> {
    const limit = 20;
    const offset = page * limit;
    const statusFilter = status ? ` AND t.status = '${status}'` : '';
    const [rows] = await this.pool.execute(
      `SELECT t.*, u.email as user_email, u.username as user_name
       FROM support_tickets t JOIN users u ON t.user_id = u.id
       WHERE 1=1${statusFilter}
       ORDER BY t.updated_at DESC LIMIT ${limit} OFFSET ${offset}`
    );
    return rows as any[];
  }

  async getTicketWithMessages(ticketId: number): Promise<any> {
    const [tRows] = await this.pool.execute(
      'SELECT t.*, u.email as user_email, u.username as user_name FROM support_tickets t JOIN users u ON t.user_id = u.id WHERE t.id = ?',
      [ticketId]
    );
    const ticket = (tRows as any[])[0];
    if (!ticket) return null;
    const [mRows] = await this.pool.execute(
      `SELECT m.*, u.username as sender_name FROM ticket_messages m JOIN users u ON m.sender_id = u.id WHERE m.ticket_id = ? ORDER BY m.created_at ASC`,
      [ticketId]
    );
    ticket.messages = mRows as any[];
    return ticket;
  }

  async updateTicketStatus(id: number, status: string): Promise<void> {
    await this.pool.execute(
      'UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?',
      [status, Date.now(), id]
    );
  }

  async addTicketMessage(ticketId: number, senderId: number, senderRole: 'user' | 'support', content: string): Promise<number> {
    const now = Date.now();
    const [result] = await this.pool.execute(
      'INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, content, created_at) VALUES (?, ?, ?, ?, ?)',
      [ticketId, senderId, senderRole, content, now]
    );
    await this.pool.execute('UPDATE support_tickets SET updated_at = ? WHERE id = ?', [now, ticketId]);
    return (result as any).insertId;
  }

  // === User character settings (per-character module) ===

  async getUserCharacterModule(userId: number, characterSlug: string): Promise<string | null> {
    const [rows] = await this.pool.execute(
      'SELECT active_module_id FROM user_character_settings WHERE user_id = ? AND character_slug = ?',
      [userId, characterSlug]
    );
    return (rows as any[])[0]?.active_module_id || null;
  }

  async setUserCharacterModule(userId: number, characterSlug: string, moduleId: string): Promise<void> {
    await this.pool.execute(
      `INSERT INTO user_character_settings (user_id, character_slug, active_module_id, updated_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE active_module_id = VALUES(active_module_id), updated_at = VALUES(updated_at)`,
      [userId, characterSlug, moduleId, Date.now()]
    );
  }

  // === Campaigns ===

  async getCampaigns(userId: number, characterSlug?: string): Promise<any[]> {
    const slugFilter = characterSlug ? ' AND c.character_slug = ?' : '';
    const params: any[] = characterSlug ? [userId, characterSlug] : [userId];
    const [rows] = await this.pool.execute(
      `SELECT c.*,
        (SELECT COUNT(*) FROM campaign_scenes WHERE campaign_id = c.id) as scene_count,
        p.current_scene_id, p.is_completed, p.started_at as progress_started_at
       FROM campaigns c
       LEFT JOIN user_campaign_progress p ON p.campaign_id = c.id AND p.user_id = ?
       WHERE c.is_active = 1${slugFilter}
       ORDER BY c.sort_order ASC`,
      params
    );
    return rows as any[];
  }

  async getCampaignById(id: number): Promise<any> {
    const [cRows] = await this.pool.execute('SELECT * FROM campaigns WHERE id = ?', [id]);
    const campaign = (cRows as any[])[0];
    if (!campaign) return null;
    const [sRows] = await this.pool.execute(
      'SELECT * FROM campaign_scenes WHERE campaign_id = ? ORDER BY scene_order ASC',
      [id]
    );
    campaign.scenes = sRows as any[];
    return campaign;
  }

  async getCampaignSceneById(sceneId: number): Promise<any> {
    const [rows] = await this.pool.execute(
      'SELECT cs.*, c.title as campaign_title, c.character_slug FROM campaign_scenes cs JOIN campaigns c ON cs.campaign_id = c.id WHERE cs.id = ?',
      [sceneId]
    );
    return (rows as any[])[0] || null;
  }

  async getUserCampaignProgress(userId: number, campaignId: number): Promise<any> {
    const [rows] = await this.pool.execute(
      'SELECT * FROM user_campaign_progress WHERE user_id = ? AND campaign_id = ?',
      [userId, campaignId]
    );
    return (rows as any[])[0] || null;
  }

  async startCampaign(userId: number, campaignId: number, firstSceneId: number): Promise<void> {
    const now = Date.now();
    await this.pool.execute(
      `INSERT INTO user_campaign_progress (user_id, campaign_id, current_scene_id, is_completed, started_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)
       ON DUPLICATE KEY UPDATE current_scene_id = VALUES(current_scene_id), is_completed = 0, updated_at = VALUES(updated_at)`,
      [userId, campaignId, firstSceneId, now, now]
    );
  }

  async updateCampaignProgress(userId: number, campaignId: number, currentSceneId: number, isCompleted: boolean = false): Promise<void> {
    await this.pool.execute(
      'UPDATE user_campaign_progress SET current_scene_id = ?, is_completed = ?, updated_at = ? WHERE user_id = ? AND campaign_id = ?',
      [currentSceneId, isCompleted ? 1 : 0, Date.now(), userId, campaignId]
    );
  }

  // Admin campaign CRUD
  async createCampaign(data: { character_slug: string; title: string; description?: string; cover_url?: string; sort_order?: number }): Promise<number> {
    const [result] = await this.pool.execute(
      'INSERT INTO campaigns (character_slug, title, description, cover_url, is_active, sort_order, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
      [data.character_slug, data.title, data.description || null, data.cover_url || null, data.sort_order || 0, Date.now()]
    );
    return (result as any).insertId;
  }

  async updateCampaign(id: number, data: Partial<{ title: string; description: string; cover_url: string; is_active: boolean; sort_order: number }>): Promise<void> {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.title !== undefined) { sets.push('title = ?'); vals.push(data.title); }
    if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description || null); }
    if (data.cover_url !== undefined) { sets.push('cover_url = ?'); vals.push(data.cover_url || null); }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); vals.push(data.is_active ? 1 : 0); }
    if (data.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(data.sort_order); }
    if (sets.length === 0) return;
    vals.push(id);
    await this.pool.execute(`UPDATE campaigns SET ${sets.join(', ')} WHERE id = ?`, vals);
  }

  async deleteCampaign(id: number): Promise<void> {
    await this.pool.execute('DELETE FROM campaigns WHERE id = ?', [id]);
  }

  async createCampaignScene(data: { campaign_id: number; scene_order: number; title: string; location?: string; situation?: string; context_prompt: string }): Promise<number> {
    const [result] = await this.pool.execute(
      'INSERT INTO campaign_scenes (campaign_id, scene_order, title, location, situation, context_prompt) VALUES (?, ?, ?, ?, ?, ?)',
      [data.campaign_id, data.scene_order, data.title, data.location || null, data.situation || null, data.context_prompt]
    );
    return (result as any).insertId;
  }

  async updateCampaignScene(id: number, data: Partial<{ scene_order: number; title: string; location: string; situation: string; context_prompt: string }>): Promise<void> {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.scene_order !== undefined) { sets.push('scene_order = ?'); vals.push(data.scene_order); }
    if (data.title !== undefined) { sets.push('title = ?'); vals.push(data.title); }
    if (data.location !== undefined) { sets.push('location = ?'); vals.push(data.location || null); }
    if (data.situation !== undefined) { sets.push('situation = ?'); vals.push(data.situation || null); }
    if (data.context_prompt !== undefined) { sets.push('context_prompt = ?'); vals.push(data.context_prompt); }
    if (sets.length === 0) return;
    vals.push(id);
    await this.pool.execute(`UPDATE campaign_scenes SET ${sets.join(', ')} WHERE id = ?`, vals);
  }

  async deleteCampaignScene(id: number): Promise<void> {
    await this.pool.execute('DELETE FROM campaign_scenes WHERE id = ?', [id]);
  }

  async getAllCampaigns(): Promise<any[]> {
    const [rows] = await this.pool.execute(
      `SELECT c.*, (SELECT COUNT(*) FROM campaign_scenes WHERE campaign_id = c.id) as scene_count FROM campaigns c ORDER BY c.sort_order ASC`
    );
    return rows as any[];
  }
}

export const database = new Database();
