import {
  pgTable,
  bigint,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  systemPrompt: text('system_prompt').notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  nsfwCapable: boolean('nsfw_capable').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const characterModes = pgTable('character_modes', {
  id: serial('id').primaryKey(),
  charId: integer('char_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  promptAddon: text('prompt_addon'),
  isNsfw: boolean('is_nsfw').default(false).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const users = pgTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  username: varchar('username', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  tier: varchar('tier', { length: 20 }).default('free').notNull(),
  activeCharId: integer('active_char_id').references(() => characters.id),
  referralCode: varchar('referral_code', { length: 32 }).unique(),
  referralSource: varchar('referral_source', { length: 32 }),
  kycVerified: boolean('kyc_verified').default(false).notNull(),
  kycSessionId: varchar('kyc_session_id', { length: 255 }),
  kycNationality: varchar('kyc_nationality', { length: 3 }),
  nsfwUnlocked: boolean('nsfw_unlocked').default(false).notNull(),
  blocked: boolean('blocked').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const chats = pgTable(
  'chats',
  {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    charId: integer('char_id')
      .notNull()
      .references(() => characters.id),
    name: varchar('name', { length: 255 }),
    activeModeId: integer('active_mode_id').references(() => characterModes.id),
    isActive: boolean('is_active').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_chats_user_char').on(t.userId, t.charId),
    index('idx_chats_user_active').on(t.userId, t.isActive),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    chatId: integer('chat_id')
      .notNull()
      .references(() => chats.id),
    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull(),
    mediaType: varchar('media_type', { length: 20 }),
    modelUsed: varchar('model_used', { length: 100 }),
    tokensPrompt: integer('tokens_prompt'),
    tokensCompletion: integer('tokens_completion'),
    tokensCacheRead: integer('tokens_cache_read'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_messages_chat_created').on(t.chatId, t.createdAt)],
);

export const referralLinks = pgTable('referral_links', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 32 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdBy: bigint('created_by', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const referralClicks = pgTable(
  'referral_clicks',
  {
    id: serial('id').primaryKey(),
    linkId: integer('link_id')
      .notNull()
      .references(() => referralLinks.id),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_referral_clicks_link').on(t.linkId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type CharacterMode = typeof characterModes.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ReferralLink = typeof referralLinks.$inferSelect;
export type ReferralClick = typeof referralClicks.$inferSelect;
