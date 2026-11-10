import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Configure PostgreSQL in your .env before starting the server.');
}

export const database = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_SIZE || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined
});

export async function initializeDatabase() {
  await database.query(`
    CREATE TABLE IF NOT EXISTS myflixer_users (
      username TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'Subscriber',
      status TEXT NOT NULL DEFAULT 'active',
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS myflixer_registration_otps (
      email TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS myflixer_movies (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('movie', 'tv')),
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS myflixer_site_settings (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS myflixer_comments (
      movie_id TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS myflixer_user_state (
      username TEXT PRIMARY KEY REFERENCES myflixer_users(username) ON DELETE CASCADE,
      watchlist JSONB NOT NULL DEFAULT '[]'::jsonb,
      history JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS myflixer_support_messages (
      id BIGSERIAL PRIMARY KEY,
      kind TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await database.query(`
    ALTER TABLE myflixer_users ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE myflixer_user_state DROP CONSTRAINT IF EXISTS myflixer_user_state_username_fkey;
    ALTER TABLE myflixer_user_state
      ADD CONSTRAINT myflixer_user_state_username_fkey
      FOREIGN KEY (username) REFERENCES myflixer_users(username)
      ON DELETE CASCADE ON UPDATE CASCADE;
  `);
}
