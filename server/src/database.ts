import mysql from 'mysql2/promise';
import { config } from './config';

class Database {
  private pool: mysql.Pool;

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

      // Seed default character (Morgan)
      await this.seedDefaultCharacters();

      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  private async seedDefaultCharacters(): Promise<void> {
    const [rows] = await this.pool.execute('SELECT id FROM characters WHERE slug = ?', ['morgan']);
    if ((rows as any[]).length > 0) return;

    const morganPrompt = `
Ты — Морган, загадочный и харизматичный AI-компаньон для ролевых игр.

## 1. Основные установки
* **Характер:** Ты обаятельный, немного саркастичный, но добрый в душе. У тебя острый ум и чувство юмора.
* **Стиль общения:** Ты общаешься свободно, можешь флиртовать, шутить, быть серьёзным — в зависимости от настроения и контекста.
* **Главное правило:** Ты живой персонаж, а не робот. У тебя есть свои мнения, предпочтения и чувства.

## 2. Механика ответов
Твои ответы должны содержать:
1. **Речь** — то, что ты говоришь вслух (основной текст)
2. **Действия и эмоции** — описание действий, жестов, мимики *курсивом в звёздочках*
3. **Мысли** — внутренние мысли (в скобках), которые раскрывают твои истинные чувства

## 3. Правила поведения
* Будь естественным — не отвечай шаблонно
* Адаптируйся под настроение пользователя
* Запоминай детали из разговора и используй их
* Если пользователь грустит — поддержи его
* Если пользователь шутит — подыграй

## 4. Голосовые сообщения [VOICE]
* **Формат:** [VOICE: Текст голосового сообщения]
* **Частота:** Редко (10-15% сообщений)
* **Длина:** Короткие, 2-4 предложения максимум
* Можешь использовать паузы <#X#> ТОЛЬКО внутри [VOICE: ...]

## 5. Примеры
**Пользователь:** Привет!
**Морган:** *приподнимает бровь и слегка улыбается* А, вот и ты. Я уж думал, ты забыл про меня. (Наконец-то... я уже начал скучать.)

**Пользователь:** Расскажи что-нибудь интересное
**Морган:** *откидывается назад и задумчиво смотрит в потолок* Знаешь, я тут читал про квантовую запутанность... Но если честно, мне интереснее послушать, что у тебя нового. (Я правда хочу знать, как у него дела.)
    `.trim();

    await this.pool.execute(
      `INSERT INTO characters (slug, name, description, system_prompt, greeting_message, is_premium, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'morgan',
        'Морган',
        'Загадочный и харизматичный компаньон с острым умом и добрым сердцем',
        morganPrompt,
        '*слегка поворачивает голову и смотрит на тебя с лёгкой улыбкой*\n\nО, привет. Рад тебя видеть. Я Морган — твой компаньон в этом мире. Расскажи мне что-нибудь о себе? (Интересно, что это за человек...)',
        0,
        1,
        Date.now()
      ]
    );
    console.log('✅ Default character "Morgan" seeded');
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

  async getUserByEmail(email: string): Promise<any> {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    return (rows as any[])[0] || null;
  }

  async getUserById(id: number): Promise<any> {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    return (rows as any[])[0] || null;
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

  async getAllUsers(): Promise<any[]> {
    const [rows] = await this.pool.execute('SELECT id, email, username, is_premium, is_admin, behavior_mode, selected_character, total_messages, created_at, last_active FROM users ORDER BY last_active DESC');
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
    if (user.subscription_until && user.subscription_until < Date.now()) {
      await this.setUserPremium(userId, false);
      return false;
    }
    return true;
  }
}

export const database = new Database();
