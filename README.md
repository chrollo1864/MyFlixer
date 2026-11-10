# MyFlixer

React/Vite frontend with an Express API and PostgreSQL persistence. The catalog starts empty; add authorized media through the admin UI or TMDB importer.

## Requirements

- Node.js 20.19 or newer
- PostgreSQL 14 or newer

## Local setup

1. Create a PostgreSQL database and copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env`. Passwords may contain any characters and must be 8–128 characters long. `SESSION_SECRET` must be at least 32 characters.
3. Install dependencies and start the app:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

4. Open `http://localhost:3000` and sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env`.

On first startup, the app creates namespaced PostgreSQL tables and bootstraps the administrator configured by the environment. It does not import or seed demo catalog records. New public accounts are disabled by default.

To enable public registration, turn on registration in Admin → Site Settings. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, and (if required by your provider) `SMTP_USER` and `SMTP_PASSWORD` in the server environment. Registration sends a six-digit email code that expires after 10 minutes; codes are limited to five verification attempts and can be resent once per minute.

## Deploy on Render

1. Create a PostgreSQL database on Render. For persistent production data, use a paid database plan; Render's free database is temporary.
2. In Render, create a **Blueprint** from this repository and use the included `render.yaml`.
3. When prompted, set `DATABASE_URL` to the database's **Internal Database URL**, and provide `ADMIN_USERNAME`, `ADMIN_EMAIL`, and an `ADMIN_PASSWORD` that is 8–128 characters long. The Blueprint generates `SESSION_SECRET` for you.
4. Deploy. Render runs the production build and starts the web service; its health check uses `/api/health`.

The web service is configured on Render's free plan, which may spin down after inactivity. Choose a paid web plan in Render if you need it to remain continuously available. To enable registration email, add the SMTP variables listed above in the Render service's environment settings.

## Production build

Build the frontend and Node server bundle, then start with production environment variables:

```sh
npm ci
npm run build
NODE_ENV=production npm start
```

Use HTTPS at the application or reverse proxy. Set `DATABASE_SSL=true` when required by the PostgreSQL host and `TRUST_PROXY=true` when HTTPS terminates at a trusted reverse proxy. Keep `.env` out of version control and use unique credentials for each environment.

Optional: set `TMDB_API_KEY` to enable metadata and episode imports. Configure the player with embed URLs for content you own or are licensed to stream.
