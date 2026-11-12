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
    CREATE TABLE IF NOT EXISTS myflixer_password_reset_otps (
      username TEXT PRIMARY KEY REFERENCES myflixer_users(username) ON DELETE CASCADE,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reset_token_hash TEXT,
      verified_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS myflixer_movies (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('movie', 'tv')),
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS myflixer_movies_tmdb_id_unique
      ON myflixer_movies ((data->>'tmdbId')) WHERE data ? 'tmdbId';
    CREATE TABLE IF NOT EXISTS myflixer_tv_seasons (
      id TEXT PRIMARY KEY, show_id TEXT NOT NULL REFERENCES myflixer_movies(id) ON DELETE CASCADE,
      tmdb_id TEXT, season_number INTEGER NOT NULL, data JSONB NOT NULL,
      UNIQUE(show_id, season_number)
    );
    CREATE TABLE IF NOT EXISTS myflixer_tv_episodes (
      id TEXT PRIMARY KEY, season_id TEXT NOT NULL REFERENCES myflixer_tv_seasons(id) ON DELETE CASCADE,
      tmdb_id TEXT, episode_number INTEGER NOT NULL, data JSONB NOT NULL,
      UNIQUE(season_id, episode_number)
    );
    CREATE TABLE IF NOT EXISTS myflixer_streaming_sources (
      id TEXT PRIMARY KEY, movie_id TEXT REFERENCES myflixer_movies(id) ON DELETE CASCADE,
      episode_id TEXT REFERENCES myflixer_tv_episodes(id) ON DELETE CASCADE,
      name TEXT NOT NULL, url TEXT NOT NULL, source_type TEXT NOT NULL DEFAULT 'embed',
      is_default BOOLEAN NOT NULL DEFAULT false, is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK ((movie_id IS NOT NULL)::int + (episode_id IS NOT NULL)::int = 1)
    );
    CREATE TABLE IF NOT EXISTS myflixer_playback_progress (
      id BIGSERIAL PRIMARY KEY, username TEXT NOT NULL REFERENCES myflixer_users(username) ON DELETE CASCADE,
      movie_id TEXT REFERENCES myflixer_movies(id) ON DELETE CASCADE,
      episode_id TEXT REFERENCES myflixer_tv_episodes(id) ON DELETE CASCADE,
      position_seconds DOUBLE PRECISION NOT NULL DEFAULT 0, duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK ((movie_id IS NOT NULL)::int + (episode_id IS NOT NULL)::int = 1)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS myflixer_playback_movie_unique ON myflixer_playback_progress(username, movie_id) WHERE movie_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS myflixer_playback_episode_unique ON myflixer_playback_progress(username, episode_id) WHERE episode_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS myflixer_sources_movie_idx ON myflixer_streaming_sources(movie_id) WHERE movie_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS myflixer_sources_episode_idx ON myflixer_streaming_sources(episode_id) WHERE episode_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS myflixer_episodes_season_idx ON myflixer_tv_episodes(season_id);
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
    CREATE TABLE IF NOT EXISTS myflixer_subscriptions (
      username TEXT PRIMARY KEY REFERENCES myflixer_users(username) ON DELETE CASCADE ON UPDATE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'canceled')),
      expires_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS myflixer_subscription_payment_requests (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL REFERENCES myflixer_users(username) ON DELETE CASCADE ON UPDATE CASCADE,
      plan_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK (provider IN ('gcash', 'maya')),
      transaction_reference TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
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
