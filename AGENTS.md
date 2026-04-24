<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Database migrations

Drizzle ORM + Turso (libSQL). Migration files live in `drizzle/`. Applied via `scripts/migrate.ts` (runtime migrator — drizzle-kit CLI is unreliable, it swallows errors).

**Auto-run in dev and build:** `predev` and `prebuild` hooks in `package.json` run `npm run db:migrate` automatically, so `npm run dev` and `npm run build` (including every Vercel deploy) apply pending migrations before starting. The migrator is idempotent — it skips anything already recorded in `__drizzle_migrations`.

### Target resolution

The migrate script reads `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` from `process.env`:

- **Local dev without Turso vars** → falls back to `file:./data/fakecarrier.db` (local SQLite).
- **Vercel build** → uses the Production or Preview env vars configured in the Vercel project.
- **CI safety rail**: if `VERCEL`/`CI` is set but `TURSO_DATABASE_URL` is missing, the script fails loudly instead of silently migrating a throwaway SQLite file in the build container.

Every run prints `[migrate] applying migrations → <target>` — check this line if you're unsure which DB you're pointed at.

### Workflow

1. Change `src/lib/db/schema.ts`.
2. Generate a migration:
   ```
   npm run db:generate
   ```
3. Review the generated SQL in `drizzle/` before committing.
4. `npm run dev` (or next build/deploy) applies it automatically.

### Targeting prod from your laptop

Only needed for out-of-band fixes — normal flow is "push → Vercel build runs the migration". To target prod Turso manually:

```
vercel env pull .env.production.local --environment=production
set -a && . ./.env.production.local && set +a && npm run db:migrate
rm .env.production.local
```

### Hard rules

- **Never** change the prod schema by hand (`turso db shell`, ad-hoc `ALTER`, etc.). If you do, `__drizzle_migrations` gets out of sync with reality and future migrate runs will fail mid-way. See the 2026-04-24 `demo_requests` incident.
- Until BL-046 splits dev preview and prod into separate Turso DBs, preview deploys share the prod DB. Destructive migrations applied from a preview build land in prod — review migration SQL carefully before merging.
