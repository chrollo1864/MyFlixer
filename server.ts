import express, { Request, Response } from 'express';
import { createServer as createHttpServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import 'express-async-errors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createHmac, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import nodemailer from 'nodemailer';
import { database, initializeDatabase } from './src/services/database.ts';
import { buildEmbedUrl } from './src/services/embedUrl.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const scrypt = promisify(scryptCallback);
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-myflixer_session' : 'myflixer_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

app.use(express.json({ limit: '1mb' }));
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Vite injects an inline React-refresh preamble in development. Without
      // this development-only allowance, the transformed React entry throws
      // before the app can render. Production builds use external scripts.
      scriptSrc: ["'self'", ...(process.env.NODE_ENV !== 'production' ? ["'unsafe-inline'"] : [])],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      frameSrc: ["'self'", 'https:'],
      connectSrc: ["'self'", ...(process.env.NODE_ENV !== 'production' ? ['ws:', 'wss:'] : [])],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"]
    }
  }
}));

app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/register/verify', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/register/resend', rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false }));

interface SessionUser {
  username: string;
  role: string;
  exp: number;
}

function validProfileImage(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 700_000) return false;
  if (!value) return true;
  if (/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function getTmdbCountries(details: any): string[] {
  const countries = new Set<string>();
  const originNames = new Intl.DisplayNames(['en'], { type: 'region' });
  if (Array.isArray(details.origin_country)) {
    for (const code of details.origin_country) {
      if (typeof code !== 'string' || !/^[A-Z]{2}$/.test(code)) continue;
      const name = originNames.of(code);
      if (name && name !== code) countries.add(name);
    }
  }
  if (Array.isArray(details.production_countries)) {
    for (const country of details.production_countries) {
      if (typeof country?.name === 'string' && country.name.trim()) countries.add(country.name.trim());
    }
  }
  return [...countries];
}

function publicUser(user: { username: string; displayName: string; email: string; avatar: string; role: string }) {
  return {
    username: user.username,
    displayName: user.displayName || user.username,
    email: user.email,
    avatar: user.avatar,
    role: user.role
  };
}

function signSession(user: Omit<SessionUser, 'exp'>) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function getSessionUser(req: Request): SessionUser | null {
  const cookieHeader = req.headers.cookie || '';
  const token = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', SESSION_SECRET).update(payload).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionUser;
    return user.exp > Math.floor(Date.now() / 1000) ? user : null;
  } catch {
    return null;
  }
}

function setSessionCookie(res: Response, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`);
}

function clearSessionCookie(res: Response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function getRegistrationMailer() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.SMTP_FROM?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535
    || Boolean(user) !== Boolean(password)) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, and SMTP_FROM; SMTP_USER and SMTP_PASSWORD must be set together.');
  }
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === 'true'
    : port === 465;
  return {
    from,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && password ? { auth: { user, pass: password } } : {})
    })
  };
}

function hashRegistrationCode(email: string, code: string) {
  return createHmac('sha256', SESSION_SECRET).update(`${email}:${code}`).digest('hex');
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

async function sendRegistrationCode(email: string, code: string, mailer = getRegistrationMailer()) {
  const { from, transporter } = mailer;
  await transporter.sendMail({
    from,
    to: email,
    subject: 'Verify your MyFlixer account',
    text: `Your MyFlixer verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Your MyFlixer verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>`
  });
}

function requireAdmin(req: Request, res: Response, next: express.NextFunction) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in required.' });
  const account = USERS_STORE[user.username];
  if (!account || account.status !== 'active') return res.status(401).json({ error: 'Account is inactive.' });
  if (account.role !== 'Administrator') return res.status(403).json({ error: 'Administrator access required.' });
  next();
}

function requireAuthenticated(req: Request, res: Response, next: express.NextFunction) {
  const user = getSessionUser(req);
  const account = user && USERS_STORE[user.username];
  if (!account || account.status !== 'active') return res.status(401).json({ error: 'Sign in required.' });
  next();
}

// Catalog cache is hydrated from PostgreSQL before the server accepts requests.
interface MovieItem {
  id: string;
  tmdbId?: string;
  metadataSource?: 'tmdb';
  title: string;
  slug: string;
  type: 'movie' | 'tv';
  year: number;
  duration: string;
  quality: 'HD' | 'CAM' | 'FHD' | '4K';
  rating: number;
  ratingCount: number;
  genres: string[];
  country: string;
  countries?: string[];
  director: string;
  cast: string[];
  production: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  viewsCount: number;
  tags: string[];
  releaseDate: string;
  isFeatured?: boolean;
  isRecommended?: boolean;
  isTrending?: boolean;
  videoSources: {
    id: string;
    name: string;
    quality: string;
    speed: string;
    embedUrl: string;
  }[];
  seasons?: {
    seasonNumber: number;
    title?: string;
    episodes: {
      id?: string;
      episodeNumber: number;
      seasonNumber?: number;
      title: string;
      duration: string;
      thumbnail?: string;
      overview?: string;
      embedUrl: string;
    }[];
  }[];
}

const MOVIES_STORE: MovieItem[] = [];
let catalogMetadataRefresh: Promise<void> | null = null;

async function refreshCatalogMetadataIfAvailable() {
  const apiKey = process.env.TMDB_API_KEY || CURRENT_THEME_OPTIONS.tmdb?.apiKey;
  const catalogItems = MOVIES_STORE.filter(movie =>
    movie.tmdbId && movie.metadataSource !== 'tmdb'
  );
  if (!apiKey || String(apiKey).trim().length <= 5 || !catalogItems.length) return;

  let updated = 0;
  let failed = 0;
  const apiKeyParam = `api_key=${encodeURIComponent(String(apiKey).trim())}`;
  for (let index = 0; index < catalogItems.length; index += 4) {
    const batch = catalogItems.slice(index, index + 4);
    const outcomes = await Promise.all(batch.map(async movie => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/${movie.type}/${encodeURIComponent(String(movie.tmdbId))}?${apiKeyParam}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!response.ok) {
          console.error(`TMDB metadata refresh failed for ${movie.id}: HTTP ${response.status}`);
          return false;
        }
        const details = await response.json();
        const genres = Array.isArray(details.genres)
          ? details.genres.map((genre: { name?: string }) => genre.name)
            .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
          : [];
        const countries = getTmdbCountries(details);
        movie.genres = genres;
        movie.country = countries.join(', ');
        movie.countries = countries;
        movie.metadataSource = 'tmdb';
        await database.query(
          'UPDATE myflixer_movies SET data = $2, updated_at = NOW() WHERE id = $1',
          [movie.id, movie]
        );
        return true;
      } catch (error) {
        console.error(`TMDB metadata refresh failed for ${movie.id}:`, error);
        return false;
      }
    }));
    updated += outcomes.filter(Boolean).length;
    failed += outcomes.filter(outcome => !outcome).length;
  }
  console.info(`TMDB catalog metadata refreshed: ${updated}/${catalogItems.length}; failed: ${failed}.`);
}

function ensureCatalogMetadataCurrent() {
  const apiKey = process.env.TMDB_API_KEY || CURRENT_THEME_OPTIONS.tmdb?.apiKey;
  const hasImportedMetadataToRefresh = MOVIES_STORE.some(movie => movie.tmdbId && movie.metadataSource !== 'tmdb');
  if (!apiKey || String(apiKey).trim().length <= 5 || !hasImportedMetadataToRefresh) {
    return Promise.resolve();
  }
  if (!catalogMetadataRefresh) {
    catalogMetadataRefresh = refreshCatalogMetadataIfAvailable().catch(error => {
      console.error('Automatic TMDB catalog metadata refresh failed:', error);
    });
  }
  return catalogMetadataRefresh;
}

// Comment storage
const COMMENTS_STORE: Record<string, any[]> = {};

// Registered users and sessions
const USERS_STORE: Record<string, { username: string; displayName: string; email: string; passwordHash: string; avatar: string; role: string; status: string }> = {};

// User watchlists & histories
const USER_WATCHLISTS: Record<string, string[]> = {};
const USER_HISTORIES: Record<string, any[]> = {};

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// Movies catalog
app.get('/api/movies', async (req: Request, res: Response) => {
  await ensureCatalogMetadataCurrent();
  const { type, quality, genre, year, country, sort, query, a2z } = req.query;

  let results = [...MOVIES_STORE];

  if (type && type !== 'all') {
    results = results.filter(m => m.type === type);
  }
  if (quality && quality !== 'all') {
    results = results.filter(m => m.quality === quality);
  }
  if (genre && genre !== 'All') {
    const selectedGenre = String(genre).trim().toLowerCase();
    results = results.filter(m => Array.isArray(m.genres) && m.genres.some(
      item => typeof item === 'string' && item.trim().toLowerCase() === selectedGenre
    ));
  }
  if (year && year !== 'All') {
    if (year === '2000s') {
      results = results.filter(m => m.year >= 2000 && m.year <= 2009);
    } else if (year === 'Older') {
      results = results.filter(m => m.year < 2000);
    } else {
      results = results.filter(m => m.year.toString() === year);
    }
  }
  if (country && country !== 'All') {
    const selectedCountry = String(country).trim().toLowerCase();
    results = results.filter(m => (Array.isArray(m.countries)
      ? m.countries
      : typeof m.country === 'string' ? m.country.split(',') : [])
      .some(item => item.trim().toLowerCase() === selectedCountry));
  }
  if (a2z) {
    if (a2z === '0-9') {
      results = results.filter(m => /^[0-9]/.test(m.title));
    } else {
      results = results.filter(m => m.title.toLowerCase().startsWith((a2z as string).toLowerCase()));
    }
  }
  if (query && typeof query === 'string' && query.trim() !== '') {
    const q = query.toLowerCase().trim();
    results = results.filter(m => 
      m.title.toLowerCase().includes(q) ||
      m.cast.some(c => c.toLowerCase().includes(q)) ||
      m.director.toLowerCase().includes(q) ||
      m.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // Sort
  if (sort === 'rating') results.sort((a, b) => b.rating - a.rating);
  else if (sort === 'views') results.sort((a, b) => b.viewsCount - a.viewsCount);
  else if (sort === 'title') results.sort((a, b) => a.title.localeCompare(b.title));
  else results.sort((a, b) => b.year - a.year);

  res.json({
    total: results.length,
    movies: results
  });
});

app.get('/api/movies/featured', (_req: Request, res: Response) => {
  const featured = MOVIES_STORE.filter(m => m.isFeatured);
  res.json(featured);
});

app.get('/api/movies/recommended', (req: Request, res: Response) => {
  const { tab } = req.query;
  let items = MOVIES_STORE.filter(m => m.isRecommended || m.isTrending);
  if (tab === 'movies') items = items.filter(m => m.type === 'movie');
  if (tab === 'tv') items = items.filter(m => m.type === 'tv');
  if (tab === 'trending') items = items.filter(m => m.isTrending);
  res.json(items);
});

app.get('/api/movies/most-viewed', (_req: Request, res: Response) => {
  const sorted = [...MOVIES_STORE].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 8);
  res.json(sorted);
});

app.get('/api/movies/:id', async (req: Request, res: Response) => {
  const movie = MOVIES_STORE.find(m => m.id === req.params.id || m.slug === req.params.id);
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' });
  }
  const updated = await database.query(
    `UPDATE myflixer_movies SET data = jsonb_set(data, '{viewsCount}', to_jsonb(COALESCE((data->>'viewsCount')::integer, 0) + 1)), updated_at = NOW()
     WHERE id = $1 RETURNING data`,
    [movie.id]
  );
  if (updated.rows[0]) Object.assign(movie, updated.rows[0].data);
  res.json(movie);
});

app.post('/api/movies/:id/rate', async (req: Request, res: Response) => {
  const { score } = req.body;
  const movie = MOVIES_STORE.find(m => m.id === req.params.id || m.slug === req.params.id);
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' });
  }
  const numericScore = typeof score === 'number' ? score : 8;
  const total = movie.rating * movie.ratingCount + numericScore;
  movie.ratingCount += 1;
  movie.rating = parseFloat((total / movie.ratingCount).toFixed(1));
  await database.query('UPDATE myflixer_movies SET data = $2, updated_at = NOW() WHERE id = $1', [movie.id, movie]);
  res.json({ rating: movie.rating, count: movie.ratingCount });
});

// Comments
app.get('/api/movies/:id/comments', (req: Request, res: Response) => {
  const list = COMMENTS_STORE[req.params.id] || [];
  res.json(list);
});

app.post('/api/movies/:id/comments', async (req: Request, res: Response) => {
  const { author, content, avatar } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  const newComment = {
    id: `c-${Date.now()}`,
    author: author || 'Guest User',
    avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
    date: 'Just now',
    content,
    likes: 0,
    replies: []
  };
  if (!COMMENTS_STORE[req.params.id]) {
    COMMENTS_STORE[req.params.id] = [];
  }
  COMMENTS_STORE[req.params.id].unshift(newComment);
  await database.query(
    `INSERT INTO myflixer_comments (movie_id, data) VALUES ($1, $2::jsonb)
     ON CONFLICT (movie_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [req.params.id, JSON.stringify(COMMENTS_STORE[req.params.id])]
  );
  res.status(201).json(newComment);
});

// Authentication and signed, HTTP-only sessions
app.post('/api/auth/register', async (req: Request, res: Response) => {
  if (!CURRENT_THEME_OPTIONS.general.registrationEnabled) {
    return res.status(403).json({ error: 'New account registration is closed.' });
  }
  const username = String(req.body.username || '').trim();
  const displayName = String(req.body.displayName || username).trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!username || username.length > 64 || !displayName || displayName.length > 80
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
    || password.length < 12 || password.length > 128) {
    return res.status(400).json({ error: 'Name, username, email, and a password of at least 12 characters are required.' });
  }

  let codeHash = '';
  try {
    const mailer = getRegistrationMailer();
    await database.query("DELETE FROM myflixer_registration_otps WHERE expires_at < NOW() - INTERVAL '1 day'");
    const existingAccount = await database.query(
      'SELECT 1 FROM myflixer_users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2) LIMIT 1',
      [username, email]
    );
    if (existingAccount.rowCount) {
      return res.status(409).json({ error: 'Username or email is already registered.' });
    }

    const existingPending = await database.query(
      'SELECT email, username FROM myflixer_registration_otps WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2) LIMIT 1',
      [email, username]
    );
    if (existingPending.rowCount) {
      const pending = existingPending.rows[0];
      if (pending.username.toLowerCase() !== username.toLowerCase()
        || pending.email.toLowerCase() !== email) {
        return res.status(409).json({ error: 'Username or email is already being used for a pending registration.' });
      }
      return res.status(202).json({ requiresVerification: true, email });
    }

    const passwordHash = await hashPassword(password);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    codeHash = hashRegistrationCode(email, code);
    await database.query(
      `INSERT INTO myflixer_registration_otps
        (email, username, display_name, password_hash, code_hash, expires_at, attempts, last_sent_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '10 minutes', 0, NOW())`,
      [email, username, displayName, passwordHash, codeHash]
    );
    await sendRegistrationCode(email, code, mailer);
    return res.status(202).json({ requiresVerification: true, email });
  } catch (error: unknown) {
    if (codeHash) {
      await database.query(
        'DELETE FROM myflixer_registration_otps WHERE email = $1 AND code_hash = $2',
        [email, codeHash]
      ).catch(cleanupError => console.error('Could not clean up failed registration OTP:', cleanupError));
    }
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Username or email is already registered.' });
    console.error('Registration error:', error);
    return res.status(503).json({ error: 'Could not send the verification email. Check SMTP configuration and try again.' });
  }
});

app.post('/api/auth/register/resend', async (req: Request, res: Response) => {
  if (!CURRENT_THEME_OPTIONS.general.registrationEnabled) {
    return res.status(403).json({ error: 'New account registration is closed.' });
  }
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter the email address used for registration.' });
  }

  try {
    const pendingResult = await database.query(
      'SELECT last_sent_at FROM myflixer_registration_otps WHERE email = $1',
      [email]
    );
    const pending = pendingResult.rows[0];
    if (!pending) return res.status(404).json({ error: 'No pending registration was found for this email.' });
    const nextAllowedAt = new Date(pending.last_sent_at).getTime() + 60_000;
    if (Date.now() < nextAllowedAt) {
      return res.status(429).json({ error: 'Please wait a minute before requesting another code.' });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const updated = await database.query(
      `UPDATE myflixer_registration_otps
       SET code_hash = $2, expires_at = NOW() + INTERVAL '10 minutes', attempts = 0, last_sent_at = NOW()
       WHERE email = $1 AND last_sent_at <= NOW() - INTERVAL '60 seconds'
       RETURNING email`,
      [email, hashRegistrationCode(email, code)]
    );
    if (!updated.rowCount) return res.status(429).json({ error: 'Please wait a minute before requesting another code.' });
    await sendRegistrationCode(email, code);
    return res.json({ sent: true });
  } catch (error) {
    console.error('Registration verification resend failed:', error);
    return res.status(503).json({ error: 'Could not send the verification email. Check SMTP configuration and try again.' });
  }
});

app.post('/api/auth/register/verify', async (req: Request, res: Response) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter a valid email address and six-digit verification code.' });
  }

  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT username, display_name, password_hash, code_hash, expires_at, attempts
       FROM myflixer_registration_otps WHERE email = $1 FOR UPDATE`,
      [email]
    );
    const pending = result.rows[0];
    if (!pending) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Verification code is invalid or expired. Request a new code.' });
    }

    if (new Date(pending.expires_at).getTime() <= Date.now()) {
      await client.query('DELETE FROM myflixer_registration_otps WHERE email = $1', [email]);
      await client.query('COMMIT');
      return res.status(400).json({ error: 'Verification code expired. Request a new code.' });
    }
    if (pending.attempts >= 5) {
      await client.query('ROLLBACK');
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
    }

    const expectedHash = Buffer.from(pending.code_hash, 'hex');
    const providedHash = Buffer.from(hashRegistrationCode(email, code), 'hex');
    if (expectedHash.length !== providedHash.length || !timingSafeEqual(expectedHash, providedHash)) {
      await client.query(
        'UPDATE myflixer_registration_otps SET attempts = attempts + 1 WHERE email = $1',
        [email]
      );
      await client.query('COMMIT');
      return res.status(pending.attempts + 1 >= 5 ? 429 : 400).json({
        error: pending.attempts + 1 >= 5
          ? 'Too many incorrect attempts. Request a new code.'
          : 'Verification code is incorrect.'
      });
    }

    await client.query(
      `INSERT INTO myflixer_users (username, display_name, email, password_hash, avatar, role, status)
       VALUES ($1, $2, $3, $4, '', 'Subscriber', 'active')`,
      [pending.username, pending.display_name, email, pending.password_hash]
    );
    await client.query(
      'INSERT INTO myflixer_user_state (username) VALUES ($1) ON CONFLICT (username) DO NOTHING',
      [pending.username]
    );
    await client.query('DELETE FROM myflixer_registration_otps WHERE email = $1', [email]);
    await client.query('COMMIT');

    const user = {
      username: pending.username,
      displayName: pending.display_name,
      email,
      passwordHash: pending.password_hash,
      avatar: '',
      role: 'Subscriber',
      status: 'active'
    };
    USERS_STORE[user.username] = user;
    USER_WATCHLISTS[user.username] = [];
    USER_HISTORIES[user.username] = [];
    setSessionCookie(res, signSession({ username: user.username, role: user.role }));
    return res.status(201).json({ user: publicUser(user) });
  } catch (error: unknown) {
    await client.query('ROLLBACK').catch(rollbackError => console.error('Registration verification rollback failed:', rollbackError));
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Username or email is already registered.' });
    console.error('Registration verification failed:', error);
    return res.status(500).json({ error: 'Could not verify the account.' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const identifier = String(req.body.identifier || req.body.username || '').trim();
  const password = String(req.body.password || '');
  const user = identifier.includes('@')
    ? Object.values(USERS_STORE).find(account => account.email.toLowerCase() === identifier.toLowerCase())
    : Object.values(USERS_STORE).find(account => account.username.toLowerCase() === identifier.toLowerCase());
  if (!user || user.status !== 'active' || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  await database.query('UPDATE myflixer_users SET last_login = NOW() WHERE username = $1', [user.username]);
  setSessionCookie(res, signSession({ username: user.username, role: user.role }));
  return res.json({ user: publicUser(user) });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const session = getSessionUser(req);
  const user = session && USERS_STORE[session.username];
  if (!session || !user || user.status !== 'active') return res.json({ user: null });
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

app.use('/api/admin', requireAdmin);

// User Watchlist & History
app.use('/api/user', requireAuthenticated);

app.get('/api/user/state', (req: Request, res: Response) => {
  const username = getSessionUser(req)!.username;
  res.json({ favorites: USER_WATCHLISTS[username] || [], watchHistory: USER_HISTORIES[username] || [] });
});

app.post('/api/user/state', async (req: Request, res: Response) => {
  const username = getSessionUser(req)!.username;
  const favorites = Array.isArray(req.body.favorites) ? req.body.favorites.filter((id: unknown) => typeof id === 'string') : [];
  const watchHistory = Array.isArray(req.body.watchHistory) ? req.body.watchHistory : [];
  await database.query(
    `INSERT INTO myflixer_user_state (username, watchlist, history) VALUES ($1, $2::jsonb, $3::jsonb)
     ON CONFLICT (username) DO UPDATE SET watchlist = EXCLUDED.watchlist, history = EXCLUDED.history, updated_at = NOW()`,
    [username, JSON.stringify(favorites), JSON.stringify(watchHistory)]
  );
  USER_WATCHLISTS[username] = favorites;
  USER_HISTORIES[username] = watchHistory;
  res.json({ success: true });
});

app.put('/api/user/profile', async (req: Request, res: Response) => {
  const sessionUser = getSessionUser(req)!;
  const currentUser = USERS_STORE[sessionUser.username];
  const displayName = String(req.body.displayName || '').trim();
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');
  const avatar = req.body.avatar;

  if (!displayName || displayName.length > 80 || !username || username.length > 64
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter a valid name, username, and email address.' });
  }
  if (!currentPassword || !(await verifyPassword(currentPassword, currentUser.passwordHash))) {
    return res.status(403).json({ error: 'Your current password is incorrect.' });
  }
  if (newPassword && (newPassword.length < 12 || newPassword.length > 128)) {
    return res.status(400).json({ error: 'New password must be between 12 and 128 characters.' });
  }
  if (!validProfileImage(avatar)) {
    return res.status(400).json({ error: 'Profile image must be a JPG, PNG, WebP, or GIF up to 500 KB.' });
  }

  const passwordHash = newPassword ? await hashPassword(newPassword) : currentUser.passwordHash;
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE myflixer_users SET username = $2, display_name = $3, email = $4, avatar = $5, password_hash = $6 WHERE username = $1',
      [currentUser.username, username, displayName, email, avatar, passwordHash]
    );
    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'That username or email is already in use.' });
    throw error;
  } finally {
    client.release();
  }

  const oldUsername = currentUser.username;
  const updatedUser = { ...currentUser, username, displayName, email, avatar, passwordHash };
  delete USERS_STORE[oldUsername];
  USERS_STORE[username] = updatedUser;
  if (oldUsername !== username) {
    USER_WATCHLISTS[username] = USER_WATCHLISTS[oldUsername] || [];
    USER_HISTORIES[username] = USER_HISTORIES[oldUsername] || [];
    delete USER_WATCHLISTS[oldUsername];
    delete USER_HISTORIES[oldUsername];
  }
  const adminUser = ADMIN_USERS.find(user => user.username === oldUsername);
  if (adminUser) Object.assign(adminUser, { id: username, username, displayName, email, avatar });
  setSessionCookie(res, signSession({ username, role: updatedUser.role }));
  return res.json({ user: publicUser(updatedUser) });
});

app.get('/api/user/watchlist', (req: Request, res: Response) => {
  const username = getSessionUser(req)!.username;
  const ids = USER_WATCHLISTS[username] || [];
  const items = MOVIES_STORE.filter(m => ids.includes(m.id));
  res.json(items);
});

app.post('/api/user/watchlist', async (req: Request, res: Response) => {
  const username = getSessionUser(req)!.username;
  const { movieId } = req.body;
  if (!USER_WATCHLISTS[username]) USER_WATCHLISTS[username] = [];
  if (!USER_WATCHLISTS[username].includes(movieId)) {
    USER_WATCHLISTS[username].push(movieId);
  }
  await database.query('UPDATE myflixer_user_state SET watchlist = $2::jsonb, updated_at = NOW() WHERE username = $1', [username, JSON.stringify(USER_WATCHLISTS[username])]);
  res.json({ watchlist: USER_WATCHLISTS[username] });
});

app.delete('/api/user/watchlist/:id', async (req: Request, res: Response) => {
  const username = getSessionUser(req)!.username;
  const id = req.params.id;
  if (USER_WATCHLISTS[username]) {
    USER_WATCHLISTS[username] = USER_WATCHLISTS[username].filter(item => item !== id);
  }
  await database.query('UPDATE myflixer_user_state SET watchlist = $2::jsonb, updated_at = NOW() WHERE username = $1', [username, JSON.stringify(USER_WATCHLISTS[username] || [])]);
  res.json({ success: true, watchlist: USER_WATCHLISTS[username] || [] });
});

// Support forms (Contact, Request, Report) matching help.txt and theme forms
app.post('/api/support/contact', async (req: Request, res: Response) => {
  const { email, subject, message } = req.body;
  await database.query('INSERT INTO myflixer_support_messages (kind, payload) VALUES ($1, $2)', ['contact', { email, subject, message }]);
  res.json({ success: true, message: 'Message sent successfully. Our support team will reply within 24 hours.' });
});

app.post('/api/support/request', async (req: Request, res: Response) => {
  const { email, title, type, note } = req.body;
  await database.query('INSERT INTO myflixer_support_messages (kind, payload) VALUES ($1, $2)', ['request', { email, title, type, note }]);
  res.json({ success: true, message: `Request for "${title}" has been added to our ingestion queue.` });
});

app.post('/api/support/report', async (req: Request, res: Response) => {
  const { movieId, issueType, details } = req.body;
  await database.query('INSERT INTO myflixer_support_messages (kind, payload) VALUES ($1, $2)', ['report', { movieId, issueType, details }]);
  res.json({ success: true, message: 'Thank you for reporting. Our streaming server team has been alerted.' });
});

// ----------------------------------------------------
// THEME OPTIONS & ADMIN MANAGEMENT (FMovies Architecture)
// ----------------------------------------------------
const INITIAL_THEME_OPTIONS = {
  general: {
    siteName: 'MyFlixer',
    siteDescription: 'Browse the movie and television catalog.',
    siteLogo: '',
    siteFavicon: '',
    siteUrl: '',
    defaultLanguage: 'English (US)',
    timezone: 'UTC',
    defaultThemeMode: 'dark',
    maintenanceMode: false,
    registrationEnabled: false,
    guestBrowsingEnabled: true
  },
  homepageSections: [
    { id: 'sec-hero', key: 'hero', title: 'Featured Hero Banner', enabled: true, itemsCount: 5, displayOrder: 1 },
    { id: 'sec-recommended', key: 'recommended', title: 'Recommended Titles', enabled: true, itemsCount: 7, displayOrder: 2 },
    { id: 'sec-trending', key: 'trending', title: 'Trending Series', enabled: true, itemsCount: 7, displayOrder: 3 },
    { id: 'sec-latestMovies', key: 'latestMovies', title: 'Latest Movies', enabled: true, itemsCount: 14, displayOrder: 4 },
    { id: 'sec-a2z', key: 'a2z', title: 'A-Z Directory Navigation', enabled: true, itemsCount: 26, displayOrder: 5 },
    { id: 'sec-mostViewed', key: 'mostViewed', title: 'Sidebar Most Viewed', enabled: true, itemsCount: 8, displayOrder: 6 }
  ],
  movieTv: {
    enableMovies: true,
    enableTvSeries: true,
    defaultMovieSort: 'updated',
    defaultTvSort: 'views',
    moviesPerPage: 14,
    tvPerPage: 14,
    displayRating: true,
    displayYear: true,
    displayRuntime: true,
    displayGenres: true,
    displayQuality: true
  },
  player: {
    defaultPlayer: 'Standard Responsive Player',
    defaultServerId: 'custom-default',
    playerAspectRatio: '16:9',
    autoplay: false,
    enableFullscreen: true,
    enableSubtitles: true,
    displayServerSelection: true,
    displayErrorMessages: true,
    enableResumePlayback: true
  },
  streamingServers: [
    { id: 'custom-default', name: 'Licensed media server', serverType: 'custom', embedTemplate: 'https://your-media-server.example/embed/movie/{id}', tvEmbedTemplate: 'https://your-media-server.example/embed/tv/{id}/{season}/{ep}', quality: 'HD', priority: 1, enabled: true, isDefault: true, iframeSandboxEnabled: false }
  ],
  tmdb: {
    apiKey: '',
    autoSync: false,
    cacheExpirationHours: 24,
    defaultImageSize: 'w780',
    importCast: true,
    importTrailers: true,
    defaultQuality: 'HD'
  },
  appearance: {
    primaryColor: '#db6937',
    secondaryColor: '#4f83d3',
    accentColor: '#6366f1',
    headerBg: '#292d38',
    cardBg: '#242832',
    borderRadius: '1.25rem',
    themeMode: 'dark'
  },
  headerFooter: {
    showSearch: true,
    showLoginButton: true,
    footerDescription: 'Browse the movie and television catalog.',
    copyrightText: '© {year} MyFlixer. All rights reserved.',
    disclaimerText: 'This site does not store any files on our server, we only linked to the media which is hosted on 3rd party services.',
    socialLinks: { twitter: 'https://twitter.com', telegram: 'https://t.me', discord: 'https://discord.gg' }
  },
  seo: {
    metaTitle: 'MyFlixer - Movies & TV Catalog',
    metaDescription: 'Browse the movie and television catalog.',
    keywords: 'movies, television, series, catalog',
    ogImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
    sitemapEnabled: true,
    robotsIndexing: true
  },
  ads: {
    headerAdEnabled: false,
    headerAdHtml: '<div class="p-3 bg-neutral-800 text-neutral-400 text-center text-xs rounded-xl">Authorized Header Banner Advertisement Placement (728x90)</div>',
    sidebarAdEnabled: false,
    sidebarAdHtml: '<div class="p-4 bg-neutral-800 text-neutral-400 text-center text-xs rounded-xl">Authorized Sidebar Advertisement Placement (300x250)</div>',
    playerAdEnabled: false,
    playerAdHtml: '<div class="p-2 bg-neutral-900 text-neutral-400 text-center text-xs rounded-lg">Pre-roll Banner Placement</div>'
  }
};

let CURRENT_THEME_OPTIONS = { ...INITIAL_THEME_OPTIONS };

// Admin Users Store
let ADMIN_USERS: any[] = [];

async function loadPersistentState() {
  const [movieRows, userRows, stateRows, commentRows, settingsRows] = await Promise.all([
    database.query('SELECT data FROM myflixer_movies ORDER BY updated_at DESC'),
    database.query('SELECT username, display_name, email, password_hash, avatar, role, status, last_login FROM myflixer_users ORDER BY created_at'),
    database.query('SELECT username, watchlist, history FROM myflixer_user_state'),
    database.query('SELECT movie_id, data FROM myflixer_comments'),
    database.query("SELECT data FROM myflixer_site_settings WHERE key = 'primary'")
  ]);

  MOVIES_STORE.splice(0, MOVIES_STORE.length, ...movieRows.rows.map((row: any) => row.data as MovieItem));
  for (const row of userRows.rows) {
    USERS_STORE[row.username] = {
      username: row.username,
      displayName: row.display_name || row.username,
      email: row.email,
      passwordHash: row.password_hash,
      avatar: row.avatar || '',
      role: row.role,
      status: row.status
    };
    ADMIN_USERS.push({
      id: row.username,
      username: row.username,
      displayName: row.display_name || row.username,
      email: row.email,
      role: row.role,
      status: row.status,
      lastLogin: row.last_login ? new Date(row.last_login).toLocaleString() : 'Never',
      avatar: row.avatar || ''
    });
  }
  for (const row of stateRows.rows) {
    USER_WATCHLISTS[row.username] = row.watchlist || [];
    USER_HISTORIES[row.username] = row.history || [];
  }
  for (const row of commentRows.rows) COMMENTS_STORE[row.movie_id] = row.data || [];

  if (settingsRows.rows[0]?.data) {
    CURRENT_THEME_OPTIONS = { ...INITIAL_THEME_OPTIONS, ...settingsRows.rows[0].data };
    if (CURRENT_THEME_OPTIONS.headerFooter.disclaimerText === 'Playback sources must be content you own or are authorized to stream.') {
      CURRENT_THEME_OPTIONS.headerFooter.disclaimerText = INITIAL_THEME_OPTIONS.headerFooter.disclaimerText;
    }
    CURRENT_THEME_OPTIONS.streamingServers = CURRENT_THEME_OPTIONS.streamingServers.map((server: any) => ({
      ...server,
      tvEmbedTemplate: server.tvEmbedTemplate || server.embedTemplate
        .replace('/embed/movie/{id}', '/embed/tv/{id}/{season}/{ep}')
        .replace('/movie/', '/tv/')
    }));
    await database.query("UPDATE myflixer_site_settings SET data = $1, updated_at = NOW() WHERE key = 'primary'", [CURRENT_THEME_OPTIONS]);
  } else {
    await database.query("INSERT INTO myflixer_site_settings (key, data) VALUES ('primary', $1) ON CONFLICT (key) DO NOTHING", [INITIAL_THEME_OPTIONS]);
  }
}

async function bootstrapAdmin() {
  const username = String(process.env.ADMIN_USERNAME || '').trim();
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!username || !email || password.length < 16) {
    throw new Error('Set ADMIN_USERNAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 16 characters before startup.');
  }

  const passwordHash = await hashPassword(password);
  await database.query(
    `INSERT INTO myflixer_users (username, email, password_hash, avatar, role, status)
     VALUES ($1, $2, $3, '', 'Administrator', 'active')
     ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, role = 'Administrator', status = 'active'`,
    [username, email, passwordHash]
  );
  await database.query('INSERT INTO myflixer_user_state (username) VALUES ($1) ON CONFLICT (username) DO NOTHING', [username]);
}

// Theme Settings Endpoints
app.get('/api/site/settings', (_req: Request, res: Response) => {
  const publicSettings = JSON.parse(JSON.stringify(CURRENT_THEME_OPTIONS));
  if (publicSettings.tmdb) publicSettings.tmdb.apiKey = '';
  res.json(publicSettings);
});

app.get('/api/admin/settings', (_req: Request, res: Response) => {
  res.json(CURRENT_THEME_OPTIONS);
});

app.post('/api/admin/settings', async (req: Request, res: Response) => {
  try {
    CURRENT_THEME_OPTIONS = { ...CURRENT_THEME_OPTIONS, ...req.body };
    await database.query("UPDATE myflixer_site_settings SET data = $1, updated_at = NOW() WHERE key = 'primary'", [CURRENT_THEME_OPTIONS]);
    res.json({ success: true, settings: CURRENT_THEME_OPTIONS });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Media Management
app.get('/api/admin/media', (_req: Request, res: Response) => {
  res.json(MOVIES_STORE);
});

app.post('/api/admin/media', async (req: Request, res: Response) => {
  const newMovie = {
    ...req.body,
    id: req.body.id || `movie-${Date.now()}`,
    slug: req.body.slug || (req.body.title ? req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `title-${Date.now()}`),
    ratingCount: req.body.ratingCount || 1,
    viewsCount: req.body.viewsCount || 0,
    videoSources: Array.isArray(req.body.videoSources) ? req.body.videoSources : []
  };
  await database.query('INSERT INTO myflixer_movies (id, slug, type, data) VALUES ($1, $2, $3, $4)', [newMovie.id, newMovie.slug, newMovie.type, newMovie]);
  MOVIES_STORE.unshift(newMovie);
  res.status(201).json(newMovie);
});

app.put('/api/admin/media/:id', async (req: Request, res: Response) => {
  const idx = MOVIES_STORE.findIndex(m => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Media not found' });
  }
  MOVIES_STORE[idx] = { ...MOVIES_STORE[idx], ...req.body };
  await database.query('UPDATE myflixer_movies SET slug = $2, type = $3, data = $4, updated_at = NOW() WHERE id = $1', [req.params.id, MOVIES_STORE[idx].slug, MOVIES_STORE[idx].type, MOVIES_STORE[idx]]);
  res.json(MOVIES_STORE[idx]);
});

app.delete('/api/admin/media/:id', async (req: Request, res: Response) => {
  const idx = MOVIES_STORE.findIndex(m => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Media not found' });
  }
  const deleted = MOVIES_STORE.splice(idx, 1)[0];
  await database.query('DELETE FROM myflixer_movies WHERE id = $1', [req.params.id]);
  res.json({ success: true, deleted });
});

// Admin Users Endpoints
app.get('/api/admin/users', (_req: Request, res: Response) => {
  res.json(ADMIN_USERS);
});

app.post('/api/admin/users', async (req: Request, res: Response) => {
  const { id, username, displayName, email, role, status, password, avatar } = req.body;
  if (id) {
    const idx = ADMIN_USERS.findIndex(u => u.id === id || u.username === id);
    if (idx === -1) return res.status(404).json({ error: 'User account not found.' });

    const existing = ADMIN_USERS[idx];
    const oldUsername = existing.username;
    const nextUsername = String(username ?? oldUsername).trim();
    const nextDisplayName = String(displayName ?? existing.displayName ?? oldUsername).trim();
    const nextEmail = String(email ?? existing.email).trim().toLowerCase();
    const nextRole = ['Administrator', 'Editor', 'Subscriber'].includes(role) ? role : existing.role;
    const nextStatus = status === 'suspended' || status === 'active' ? status : existing.status;
    const nextAvatar = avatar === undefined ? existing.avatar : avatar;
    const nextPassword = String(password || '');

    if (!nextUsername || nextUsername.length > 64 || !nextDisplayName || nextDisplayName.length > 80
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail) || nextEmail.length > 254) {
      return res.status(400).json({ error: 'Enter a valid name, username, and email address.' });
    }
    if (nextPassword && (nextPassword.length < 12 || nextPassword.length > 128)) {
      return res.status(400).json({ error: 'Password must be between 12 and 128 characters.' });
    }
    if (!validProfileImage(nextAvatar)) {
      return res.status(400).json({ error: 'Profile image must be a JPG, PNG, WebP, or GIF up to 500 KB.' });
    }

    const currentAccount = USERS_STORE[oldUsername];
    const passwordHash = nextPassword ? await hashPassword(nextPassword) : currentAccount.passwordHash;
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE myflixer_users SET username = $2, display_name = $3, email = $4, password_hash = $5, avatar = $6, role = $7, status = $8 WHERE username = $1',
        [oldUsername, nextUsername, nextDisplayName, nextEmail, passwordHash, nextAvatar, nextRole, nextStatus]
      );
      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error.code === '23505') return res.status(409).json({ error: 'That username or email is already in use.' });
      throw error;
    } finally {
      client.release();
    }

    const updatedAccount = {
      ...currentAccount,
      username: nextUsername,
      displayName: nextDisplayName,
      email: nextEmail,
      passwordHash,
      avatar: nextAvatar,
      role: nextRole,
      status: nextStatus
    };
    delete USERS_STORE[oldUsername];
    USERS_STORE[nextUsername] = updatedAccount;
    if (oldUsername !== nextUsername) {
      USER_WATCHLISTS[nextUsername] = USER_WATCHLISTS[oldUsername] || [];
      USER_HISTORIES[nextUsername] = USER_HISTORIES[oldUsername] || [];
      delete USER_WATCHLISTS[oldUsername];
      delete USER_HISTORIES[oldUsername];
    }
    Object.assign(existing, {
      id: nextUsername,
      username: nextUsername,
      displayName: nextDisplayName,
      email: nextEmail,
      avatar: nextAvatar,
      role: nextRole,
      status: nextStatus
    });

    const sessionUser = getSessionUser(req);
    if (sessionUser?.username === oldUsername) {
      if (nextStatus !== 'active' || nextRole !== 'Administrator') clearSessionCookie(res);
      else setSessionCookie(res, signSession({ username: nextUsername, role: nextRole }));
    }
    return res.json(existing);
  }

  const newUsername = String(username || '').trim();
  const newDisplayName = String(displayName || newUsername).trim();
  const newEmail = String(email || '').trim().toLowerCase();
  const newPassword = String(password || '');
  const newAvatar = avatar === undefined ? '' : avatar;
  if (!newUsername || newUsername.length > 64 || !newDisplayName || newDisplayName.length > 80
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) || newEmail.length > 254
    || newPassword.length < 12 || newPassword.length > 128) {
    return res.status(400).json({ error: 'Name, username, email, and a password of at least 12 characters are required.' });
  }
  if (!validProfileImage(newAvatar)) return res.status(400).json({ error: 'Profile image must be a JPG, PNG, WebP, or GIF up to 500 KB.' });
  const passwordHash = await hashPassword(newPassword);
  const newRole = ['Administrator', 'Editor', 'Subscriber'].includes(role) ? role : 'Subscriber';
  try {
    await database.query(
      'INSERT INTO myflixer_users (username, display_name, email, password_hash, avatar, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [newUsername, newDisplayName, newEmail, passwordHash, newAvatar, newRole, status === 'suspended' ? 'suspended' : 'active']
    );
    await database.query('INSERT INTO myflixer_user_state (username) VALUES ($1) ON CONFLICT (username) DO NOTHING', [newUsername]);
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ error: 'Username or email is already registered.' });
    throw error;
  }
  USERS_STORE[newUsername] = { username: newUsername, displayName: newDisplayName, email: newEmail, passwordHash, avatar: newAvatar, role: newRole, status: status === 'suspended' ? 'suspended' : 'active' };
  USER_WATCHLISTS[newUsername] = [];
  USER_HISTORIES[newUsername] = [];
  const newUser = { id: newUsername, username: newUsername, displayName: newDisplayName, email: newEmail, role: newRole, status: USERS_STORE[newUsername].status, lastLogin: 'Never', avatar: newAvatar };
  ADMIN_USERS.push(newUser);
  return res.status(201).json(newUser);
});

app.delete('/api/admin/users/:id', async (req: Request, res: Response) => {
  if (req.params.id === getSessionUser(req)?.username) return res.status(400).json({ error: 'You cannot delete your own account.' });
  const target = ADMIN_USERS.find(user => user.id === req.params.id || user.username === req.params.id);
  const remainingAdmins = ADMIN_USERS.filter(user => user.role === 'Administrator' && user.status === 'active' && user.username !== target?.username);
  if (target?.role === 'Administrator' && remainingAdmins.length === 0) return res.status(400).json({ error: 'At least one active administrator must remain.' });
  await database.query('DELETE FROM myflixer_users WHERE username = $1', [req.params.id]);
  ADMIN_USERS = ADMIN_USERS.filter(u => u.id !== req.params.id && u.username !== req.params.id);
  delete USERS_STORE[req.params.id];
  delete USER_WATCHLISTS[req.params.id];
  delete USER_HISTORIES[req.params.id];
  res.json({ success: true });
});

// TMDB Proxy Search & Import
app.post('/api/admin/tmdb/search', async (req: Request, res: Response) => {
  const { query = '', apiKey: requestedApiKey, mediaType = 'all', genres = [], year = 'All', page = 1 } = req.body;
  const apiKey = process.env.TMDB_API_KEY || requestedApiKey;
  if (!apiKey || String(apiKey).trim().length <= 5) {
    return res.status(503).json({ error: 'TMDB is unavailable. Check your API key and connection.' });
  }
  const requestedPage = Math.max(1, Math.min(667, Number(page) || 1));
  const pageSize = 30;
  const movieGenreIds: Record<string, string> = {
    Action: '28', 'Action & Adventure': '28|12', Adventure: '12', Animation: '16', Comedy: '35', Crime: '80',
    Documentary: '99', Drama: '18', Family: '10751', Fantasy: '14', History: '36',
    Horror: '27', Music: '10402', Mystery: '9648', Romance: '10749',
    'Science Fiction': '878', 'Sci-Fi & Fantasy': '878', 'TV Movie': '10770',
    Thriller: '53', War: '10752', 'War & Politics': '10752', Western: '37',
  };
  const tvGenreIds: Record<string, string> = {
    Action: '10759', 'Action & Adventure': '10759', Adventure: '10759', Animation: '16', Comedy: '35',
    Crime: '80', Documentary: '99', Drama: '18', Family: '10751', Fantasy: '10765',
    Kids: '10762', Mystery: '9648', News: '10763', Reality: '10764',
    'Science Fiction': '10765', 'Sci-Fi & Fantasy': '10765', Soap: '10766',
    Talk: '10767', War: '10768', 'War & Politics': '10768'
  };
  const mediaTypes: Array<'movie' | 'tv'> = mediaType === 'movie' || mediaType === 'tv'
    ? [mediaType]
    : ['movie', 'tv'];
  const perTypePageSize = mediaTypes.length > 1 ? pageSize / mediaTypes.length : pageSize;
  const fetchPages = async (type: 'movie' | 'tv') => {
    const offset = (requestedPage - 1) * perTypePageSize;
    const firstTmdbPage = Math.floor(offset / 20) + 1;
    const genreMap = type === 'movie' ? movieGenreIds : tvGenreIds;
    const selectedGenres = Array.isArray(genres) ? genres : [];
    const genreIds = Array.from(new Set(selectedGenres.flatMap((genre: string) =>
      (genreMap[genre] || '').split('|').filter(Boolean)
    )));
    if (selectedGenres.length > 0 && genreIds.length === 0) {
      return { results: [], totalPages: 1, totalResults: 0 };
    }
    const availableCount = Math.max(0, Math.min(perTypePageSize, 10000 - offset));
    if (availableCount === 0) return { results: [], totalPages: 500, totalResults: 0 };
    const lastTmdbPage = Math.floor((offset + availableCount - 1) / 20) + 1;
    const queryParams = new URLSearchParams({
      api_key: String(apiKey).trim(),
      include_adult: 'false',
      sort_by: 'popularity.desc',
      page: String(firstTmdbPage)
    });
    if (query.trim()) queryParams.set('with_text_query', query.trim());
    if (genreIds.length) queryParams.set('with_genres', genreIds.join('|'));
    if (year !== 'All' && /^\d{4}$/.test(String(year))) {
      queryParams.set(type === 'movie' ? 'primary_release_year' : 'first_air_date_year', String(year));
    }

    const pageData = await Promise.all(Array.from(
      { length: lastTmdbPage - firstTmdbPage + 1 },
      async (_, index) => {
        const pageParams = new URLSearchParams(queryParams);
        pageParams.set('page', String(firstTmdbPage + index));
        const response = await fetch(`https://api.themoviedb.org/3/discover/${type}?${pageParams.toString()}`);
        if (!response.ok) throw new Error(`TMDB ${type} search failed (${response.status}).`);
        return response.json();
      }
    ));
    const allItems = pageData.flatMap(data => data.results || []);
    const results = allItems.slice(offset % 20, (offset % 20) + availableCount).map((item: any) => ({
      tmdbId: item.id,
      title: item.title || item.name || 'Untitled',
      type,
      year: item.release_date ? parseInt(item.release_date.slice(0, 4), 10) : (item.first_air_date ? parseInt(item.first_air_date.slice(0, 4), 10) : 2024),
      overview: item.overview || '',
      rating: item.vote_average ? parseFloat(item.vote_average.toFixed(1)) : 7.0,
      posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=600&auto=format&fit=crop',
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1600&auto=format&fit=crop',
      releaseDate: item.release_date || item.first_air_date || '2024-01-01',
      popularity: Number(item.popularity) || 0
    }));
    return {
      results,
      totalPages: Number(pageData[0]?.total_pages) || 1,
      totalResults: Number(pageData[0]?.total_results) || 0
    };
  };

  try {
    const responses = await Promise.all(mediaTypes.map(fetchPages));
    const results = responses.flatMap(response => response.results)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, pageSize);
    const totalResults = responses.reduce((sum, response) => sum + Math.min(response.totalResults, 10000), 0);
    const pageCapacity = responses.reduce((sum, response) =>
      sum + (response.totalResults > 0 ? perTypePageSize : 0), 0);
    const totalPages = Math.max(1, Math.ceil(totalResults / (pageCapacity || pageSize)));
    return res.json({ results, source: 'tmdb_live', totalPages, totalResults });
  } catch (error) {
    console.error('TMDB API fetch error:', error);
    return res.status(502).json({ error: 'TMDB search failed. Verify the API key and try again.' });
  }
});

app.post('/api/admin/tmdb/sync-catalog-metadata', async (req: Request, res: Response) => {
  const apiKey = process.env.TMDB_API_KEY || req.body.apiKey || CURRENT_THEME_OPTIONS.tmdb.apiKey;
  if (!apiKey || String(apiKey).trim().length <= 5) {
    return res.status(503).json({ error: 'TMDB is unavailable. Configure a valid API key first.' });
  }

  const catalogItems = MOVIES_STORE.filter(movie => movie.tmdbId);
  let updated = 0;
  let failed = 0;
  const apiKeyParam = `api_key=${encodeURIComponent(String(apiKey).trim())}`;

  for (let index = 0; index < catalogItems.length; index += 4) {
    const batch = catalogItems.slice(index, index + 4);
    const outcomes = await Promise.all(batch.map(async movie => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/${movie.type}/${encodeURIComponent(String(movie.tmdbId))}?${apiKeyParam}`
        );
        if (!response.ok) return false;
        const details = await response.json();
        const genres = Array.isArray(details.genres)
          ? details.genres.map((genre: { name?: string }) => genre.name).filter((name: unknown): name is string => typeof name === 'string' && name.length > 0)
          : [];
        const countries = getTmdbCountries(details);

        movie.genres = genres;
        movie.country = countries.join(', ');
        movie.countries = countries;
        movie.metadataSource = 'tmdb';
        await database.query(
          'UPDATE myflixer_movies SET data = $2, updated_at = NOW() WHERE id = $1',
          [movie.id, movie]
        );
        return true;
      } catch (error) {
        console.error(`TMDB metadata refresh failed for ${movie.id}:`, error);
        return false;
      }
    }));

    updated += outcomes.filter(Boolean).length;
    failed += outcomes.filter(outcome => !outcome).length;
  }

  if (catalogItems.length > 0 && updated === 0) {
    return res.status(502).json({
      error: 'TMDB returned no metadata for the catalog. Check the API key and each title’s TMDB ID, then try again.'
    });
  }

  return res.json({ updated, failed, total: catalogItems.length });
});

// Import from TMDB
app.post('/api/admin/tmdb/import', async (req: Request, res: Response) => {
  const { tmdbId, apiKey: requestedApiKey, title, type, year, overview, rating, posterUrl, backdropUrl, releaseDate, publishStatus } = req.body;
  const apiKey = process.env.TMDB_API_KEY || requestedApiKey;
  const mediaType: 'tv' | 'movie' = type === 'tv' ? 'tv' : 'movie';
  
  // Check duplicate
  const exists = MOVIES_STORE.find(m => m.id === `tmdb-${tmdbId}` || m.title.toLowerCase() === title?.toLowerCase());
  const refreshExistingSeries = Boolean(exists && mediaType === 'tv' && !exists.seasons?.length);
  if (exists && !refreshExistingSeries) {
    return res.status(409).json({ error: 'Title already exists in catalog', movie: exists });
  }

  if (!tmdbId) return res.status(400).json({ error: 'A TMDB title ID is required.' });
  if (!apiKey || String(apiKey).trim().length <= 5) {
    return res.status(503).json({ error: 'TMDB is unavailable. Configure a valid API key first.' });
  }

  let seasons: MovieItem['seasons'] = [];
  let importedGenres: string[] = [];
  let importedCountries: string[] = [];
  const apiKeyParam = `api_key=${encodeURIComponent(String(apiKey).trim())}`;
  let details: any;
  try {
    const detailsResponse = await fetch(`https://api.themoviedb.org/3/${mediaType}/${encodeURIComponent(String(tmdbId))}?${apiKeyParam}`);
    if (!detailsResponse.ok) {
      return res.status(502).json({ error: 'Could not retrieve title metadata from TMDB. Verify the API key and try again.' });
    }
    details = await detailsResponse.json();
  } catch (error) {
    console.error('TMDB metadata import error:', error);
    return res.status(502).json({ error: 'Could not retrieve title metadata from TMDB. Verify the network and API key, then try again.' });
  }
  importedGenres = Array.isArray(details.genres)
    ? details.genres.map((genre: { name?: string }) => genre.name).filter((name: unknown): name is string => typeof name === 'string' && name.length > 0)
    : [];
  importedCountries = getTmdbCountries(details);

  if (mediaType === 'tv') {
    try {
      const seasonDetails = await Promise.all((details.seasons || [])
        .filter((season: any) => Number(season.season_number) > 0)
        .map(async (season: any) => {
          const seasonNumber = Number(season.season_number);
          const seasonResponse = await fetch(`https://api.themoviedb.org/3/tv/${encodeURIComponent(String(tmdbId))}/season/${seasonNumber}?${apiKeyParam}`);
          if (!seasonResponse.ok) return null;
          const seasonData = await seasonResponse.json();
          return {
            seasonNumber,
            title: seasonData.name || season.name || `Season ${seasonNumber}`,
            episodes: (seasonData.episodes || []).map((episode: any) => ({
              id: `tmdb-${tmdbId}-s${seasonNumber}-e${episode.episode_number}`,
              episodeNumber: Number(episode.episode_number),
              seasonNumber,
              title: episode.name || `Episode ${episode.episode_number}`,
              duration: episode.runtime ? `${episode.runtime} min` : '45 min',
              thumbnail: episode.still_path
                ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
                : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop',
              overview: episode.overview || '',
              embedUrl: ''
            }))
          };
        }));
      seasons = seasonDetails.filter((season: any) => season && season.episodes.length > 0);
    } catch (error) {
      console.error(`TMDB season import failed for ${tmdbId}:`, error);
    }
  }

  const importedItem = {
    id: exists?.id || `tmdb-${tmdbId || Date.now()}`,
    tmdbId: tmdbId ? String(tmdbId) : undefined,
    metadataSource: 'tmdb' as const,
    title: title || 'Imported TMDB Title',
    slug: (title || `title-${Date.now()}`).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    type: mediaType,
    year: year || 2024,
    duration: type === 'tv' ? '50 min/ep' : '115 min',
    quality: 'HD' as const,
    rating: rating || 7.8,
    ratingCount: 150,
    genres: importedGenres,
    country: importedCountries.join(', '),
    countries: importedCountries,
    director: 'Hollywood Director',
    cast: ['Lead Actor', 'Supporting Cast'],
    production: 'Studio Productions',
    synopsis: overview || 'Imported via TMDB Metadata Engine.',
    posterUrl: posterUrl || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=600&auto=format&fit=crop',
    backdropUrl: backdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1600&auto=format&fit=crop',
    viewsCount: 120,
    tags: ['tmdb', 'imported'],
    releaseDate: releaseDate || '2024-01-01',
    isRecommended: publishStatus === 'publish',
    isTrending: false,
    ...(mediaType === 'tv' ? { seasons } : {}),
    videoSources: (() => {
      const defaultServer = CURRENT_THEME_OPTIONS.streamingServers.find((server: any) => server.enabled && server.isDefault)
        || CURRENT_THEME_OPTIONS.streamingServers.find((server: any) => server.enabled);
      const template = defaultServer?.embedTemplate || 'https://your-media-server.example/embed/movie/{id}';
      const mediaTemplate = mediaType === 'tv'
        ? defaultServer?.tvEmbedTemplate || template.replace('/embed/movie/{id}', '/embed/tv/{id}/{season}/{ep}').replace('/movie/', '/tv/')
        : template;
      return [{
        id: defaultServer?.id || 'my-server',
        name: defaultServer?.name || 'My Server',
        quality: defaultServer?.quality || '1080p HD',
        speed: 'Fast',
        embedUrl: buildEmbedUrl(mediaTemplate, mediaType, String(tmdbId))
      }];
    })()
  };

  if (exists) {
    Object.assign(exists, importedItem);
    await database.query('UPDATE myflixer_movies SET slug = $2, type = $3, data = $4, updated_at = NOW() WHERE id = $1', [exists.id, exists.slug, exists.type, exists]);
    return res.json({ success: true, movie: exists, refreshed: true });
  }

  await database.query('INSERT INTO myflixer_movies (id, slug, type, data) VALUES ($1, $2, $3, $4)', [importedItem.id, importedItem.slug, importedItem.type, importedItem]);
  MOVIES_STORE.unshift(importedItem);
  res.status(201).json({ success: true, movie: importedItem });
});

// Cache Clear
app.post('/api/admin/cache/clear', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'No application cache is currently enabled.' });
});

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  await database.query('SELECT 1');
  res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
});

// ----------------------------------------------------
// VITE DEV SERVER / PRODUCTION STATIC SERVING
// ----------------------------------------------------
async function startServer() {
  if (SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  await initializeDatabase();
  await bootstrapAdmin();
  await loadPersistentState();

  const isDev = process.env.NODE_ENV !== 'production';
  const httpServer = createHttpServer(app);

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      // Attach Vite's HMR websocket to the same server as Express. This avoids
      // Vite opening its fallback port (24678) and conflicting with another run.
      server: { middlewareMode: true, ws: { server: httpServer } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend build
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.use((error: any, _req: Request, res: Response, _next: express.NextFunction) => {
    console.error('Request failed:', error);
    if (res.headersSent) return;
    res.status(500).json({ error: 'An internal server error occurred.' });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  const shutdown = () => {
    httpServer.close(() => {
      database.end().finally(() => process.exit(0));
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((error) => {
  console.error('Application startup failed:', error);
  process.exit(1);
});
