<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Database migrations

Drizzle ORM + Turso (libSQL). Migration files live in `drizzle/`. **There is no deploy-time auto-migration** — missing a migration run results in runtime errors like `no such table: …` on production.

- After changing `src/lib/db/schema.ts`, generate a migration:
  ```
  npm run db:generate
  ```
- Before deploying any commit that adds or edits a file under `drizzle/`, apply migrations against every environment you're shipping to.
  - **Local dev** (SQLite fallback at `data/fakecarrier.db`):
    ```
    npm run db:migrate
    ```
  - **Prod Turso** — pull prod env vars and run against them:
    ```
    vercel env pull .env.production.local --environment=production
    set -a && . ./.env.production.local && set +a && npm run db:migrate
    rm .env.production.local
    ```
- **Never** change the prod schema by hand (e.g. `turso db shell`, ad-hoc ALTER). If you do, `__drizzle_migrations` gets out of sync with reality and future `db:migrate` runs will fail mid-way. See the 2026-04-24 `demo_requests` incident.
- Until BL-046 splits dev preview and prod into separate Turso DBs, preview deploys share the prod DB — be extra careful with destructive migrations.
