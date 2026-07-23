# Orchard Collection v5

Orchard Collection is a React 19 collection and feeder-management application.
It uses Supabase for authenticated, cross-device PostgreSQL data, private photo
storage, and realtime refreshes. Dexie remains available only as the legacy
local store and import source when cloud configuration is enabled.

## Local development

Requirements: Node.js 20 or newer and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase variables, the application continues to use its existing
Dexie database. To use cloud sync, set:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Never put a Supabase service-role key in a Vite variable or browser bundle.

## Supabase setup

1. Create a Supabase project.
2. Install the Supabase CLI and link the repository to the project.
3. Apply the SQL files in `supabase/migrations` in filename order:

   ```sh
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

4. In Authentication → URL Configuration, set the production Site URL and add
   local and production redirect URLs. Include:

   - `http://localhost:5173/**`
   - `https://YOUR_PRODUCTION_DOMAIN/**`
   - `https://YOUR_PRODUCTION_DOMAIN/auth/reset`

5. Keep email/password authentication enabled. Configure a production SMTP
   provider before inviting users.

The migrations create the private `plant-media` bucket, profile trigger,
updated-at triggers, media consistency functions, feeder reference defaults,
indexes, and Realtime publication entries. No dashboard-created public bucket
is required.

## Security model

Every user-owned table has Row Level Security enabled. Separate SELECT, INSERT,
UPDATE, and DELETE policies require `auth.uid() = user_id`. Composite
owner/record foreign keys prevent one user's row from referencing another
user's data. Storage policies restrict objects to paths whose first folder is
the authenticated user's ID. Photos are displayed with expiring signed URLs.

The browser uses only the anonymous/publishable key; authorization is enforced
by the signed-in JWT and database policies.

## Existing local-data import

After cloud sign-in, Orchard inspects the existing `orchard-collection` Dexie
database. If records exist and that exact source has not been imported for the
account, the import wizard:

1. displays counts for plants, spaces, tasks, timeline, photos, and feeders;
2. uploads tables in dependency order;
3. uploads original photos and thumbnails to private Storage;
4. deterministically maps old non-UUID IDs while preserving all relationships;
5. restores hero images after media exists;
6. verifies imported row counts;
7. records completion in `local_imports`.

Imports use upserts and stable IDs, so a partial import can be retried. The
legacy database is never removed automatically. After verified completion, the
user may explicitly delete it after a separate backup warning.

## Cloud and offline behavior

Supabase is the source of truth whenever both environment variables are set.
The query cache is invalidated after local mutations and by one cleaned-up
Realtime channel per signed-in user. Subscriptions cover plants, spaces, tasks,
timeline events, media, and feeder records.

Previously loaded data remains visible during a temporary disconnection.
Orchard shows an offline banner and cloud repository writes fail with a clear
offline message instead of pretending data was saved. A full bidirectional
offline write queue is intentionally out of scope for this migration.

## Cloudflare Pages deployment

1. Connect this repository in Cloudflare Pages.
2. Use `npm run build` as the build command and `dist` as the output directory.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production and
   Preview.
4. Configure SPA fallback routing to `index.html`.
5. Add the final Pages/custom domain to Supabase Auth redirect URLs.
6. Redeploy after changing a Vite environment variable; values are embedded at
   build time.

## Validation

```sh
npm run format:check
npm run lint
npm run build
npm run test
git diff --check
```

`npm run build` includes strict TypeScript checking.

## Two-device verification

1. On the laptop, sign in and import the local collection if prompted.
2. Create a plant and wait for the success state.
3. Sign in to the same account on an iPhone and confirm the plant appears.
4. Edit the plant on iPhone; confirm the laptop refreshes without reloading.
5. Upload a photo and select it as hero; confirm both devices show it.
6. Create and complete a task; confirm task state and timeline on both devices.
7. Sign in with a different test account and verify none of the first account's
   records or media are visible.
8. Briefly disable networking and confirm cached screens remain visible, the
   offline banner appears, and a write reports that it requires a connection.

## Rollback

Do not delete the legacy Dexie database until cross-device verification is
complete. To roll the frontend back, deploy the last pre-cloud Git commit
without Supabase environment variables; it will resume using the untouched
local database.

Database migrations are forward-only. Before a production migration, create a
Supabase backup. If rollback is required, deploy the prior frontend and restore
the database backup rather than manually reversing schema SQL. Storage objects
must be backed up separately if media has already been uploaded.

Additional architecture notes are in
[`docs/supabase-migration-audit.md`](docs/supabase-migration-audit.md), and the
dashboard action list is in
[`docs/supabase-setup-checklist.md`](docs/supabase-setup-checklist.md).
