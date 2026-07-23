# Supabase and Cloudflare setup checklist

## Before deployment

- [ ] Create a production Supabase project in the intended region.
- [ ] Record the project URL and anonymous/publishable key.
- [ ] Enable point-in-time recovery or create a database backup.
- [ ] Install the Supabase CLI and run `supabase link`.
- [ ] Review and apply every file in `supabase/migrations` in order.
- [ ] Confirm all application tables show RLS as enabled.
- [ ] Confirm the `plant-media` bucket exists and is private.
- [ ] Confirm Realtime replication includes `plants`, `spaces`, `tasks`,
      `timeline_events`, and `plant_media`.

## Authentication

- [ ] Keep Email provider enabled.
- [ ] Decide whether email confirmation is required.
- [ ] Configure production SMTP and customize confirmation/reset templates.
- [ ] Set the Supabase Site URL to the production Orchard URL.
- [ ] Add `http://localhost:5173/**` as a development redirect.
- [ ] Add the Cloudflare Pages preview pattern if previews should support auth.
- [ ] Add `https://YOUR_DOMAIN/**` and `/auth/reset` as production redirects.
- [ ] Create two test accounts for user-isolation verification.

## Cloudflare Pages

- [ ] Connect `orchardjr/Orchard-Collection-v5`.
- [ ] Set build command to `npm run build`.
- [ ] Set output directory to `dist`.
- [ ] Select a current Node.js 20+ build image.
- [ ] Add `VITE_SUPABASE_URL` in Preview and Production.
- [ ] Add `VITE_SUPABASE_ANON_KEY` in Preview and Production.
- [ ] Do not add a service-role key.
- [ ] Configure SPA fallback to `/index.html`.
- [ ] Deploy and add the final URL to Supabase redirects.

## Release verification

- [ ] Sign up, confirm email if enabled, log out, and log back in.
- [ ] Close and reopen the browser and confirm session restoration.
- [ ] Import local data; compare every count shown by the wizard.
- [ ] Confirm photos and hero images load after a full refresh.
- [ ] Keep the legacy database until laptop/iPhone verification passes.
- [ ] Complete the README two-device test plan.
- [ ] Confirm the second test account cannot read the first account's rows.
- [ ] Confirm a copied private Storage URL expires or requires authorization.
- [ ] Test offline messaging and reconnect behavior.
- [ ] Only then consider the explicit “Remove legacy data” action.

## Monitoring and recovery

- [ ] Monitor Supabase Auth, Database, Realtime, and Storage logs after launch.
- [ ] Configure database/storage usage alerts.
- [ ] Document who can access the Supabase and Cloudflare dashboards.
- [ ] Keep the last pre-cloud deployment available for frontend rollback.
- [ ] Take a database backup before later destructive schema changes.
