import {
  pgTable,
  bigint,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';

export const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  username: varchar('username', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  tier: varchar('tier', { length: 20 }).default('free').notNull(),
  activeCharId: integer('active_char_id').references(() => characters.id),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('uq_user_char').on(t.userId, t.charId)],
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
