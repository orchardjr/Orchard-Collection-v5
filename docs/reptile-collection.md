# Reptile Collection - deployment and behavior

## Manual migration required

Do not deploy this feature before reviewing and running the complete SQL in `supabase/migrations/20261104022008_reptile_collection.sql` in the Supabase SQL Editor. It is additive and rerunnable against the tracked production schema **after** the existing Care/Tasks migration. No migration has been applied automatically. The existing `exports/` folder is unrelated and has not been modified.

The migration adds:

- `reptiles`: owner, identification, husbandry, sex, lifecycle, attention and deletion state.
- `reptile_events`: timestamped weight, multi-feeder feeding, supplement administration, husbandry, health, milestone and task history; structured payloads retain optional fields without duplicating plant columns.
- `reptile_supplements`: reusable owner-scoped product catalog, category and explicit yes/no/unknown D3 content.
- `reptile_routines`: independent animal schedules, product relationship, recurrence, timezone, start date and enable flag.
- `reptile_media`: same-owner/same-animal photo and optional health-event relationships, original/thumbnail paths and profile-photo flag.
- `tasks.reptile_routine_id`: an owner-checked foreign key. Existing Tasks rows, completion RPC and owner RLS are reused. Reptile tasks use `type=custom` and `recurrence=none`; their routine supplies scheduling so the plant recurrence engine cannot also create a successor.

It adds owner policies, table grants, indexed foreign keys and updated-at triggers on the **new** tables only. It does not change existing Storage policies or buckets. Photos reuse the private `plant-media` bucket under `<user-id>/reptiles/<reptile-id>/<photo-id>/…`; existing first-folder owner policies apply. Existing plant profiles, care records, tasks and data are not backfilled or changed. The new task constraint and index require normal database locks during installation; schedule the deployment appropriately.

All new functions are SECURITY INVOKER, with public execution revoked. Helpers are `reptile_next_due`, `reptile_child_guard`, `reptile_routine_tasks`, `reptile_task_finished`, `reptile_feeding_tasks`, `reptile_archive_tasks` and `create_reptile_routines`. Completion and history/next-task creation run in one PostgreSQL transaction. Repeat completion of a closed occurrence does not generate another successor. Shared assignment uses a transactional bulk creation of independent per-animal routines/tasks, because one animal's administration must not complete another animal's care.

## Scheduling and interpretation

No feeding, supplementation, UVB or other care frequencies are recommended automatically. Start with a one-time reminder and configure a schedule based on veterinary, species, product and equipment guidance. Weekly days use friendly checkboxes; custom recurrence is a list of explicit dates, not arbitrary RRULE strings. Times use the schedule's saved timezone. Monthly recurrence clamps to the next month's last valid day. The next occurrence is calculated after the later of the due and completion time; old missed dates are not silently recorded as administered or backfilled with fictitious doses.

The calendar shows saved task occurrences (including completed, missed and overdue), not forecasts of every future recurrence. Future dates appear as the next occurrence is created. “Every feeding” creates separate pending tasks when a feeding is logged. It never marks products as given, even if the feeding notes mention supplements. Mark as Given records the actual completion timestamp and a product/D3 snapshot. Possible same-day, same-animal D3 overlaps are visible; unknown D3 is never inferred to be absent. Missed tasks are explicitly skipped, with history retained.

Weights are grams; changes and percentages are mathematical only, not health judgments. Temperature targets/logs retain the selected C/F unit without silently converting existing data. Humidity accepts 0-100%. Female profiles expose optional reproductive observations. An attention flag is explicit rather than inferred from growth or weight loss.

The quick + Supplement action records an explicit unscheduled administration with a product/D3 snapshot. It does not complete a scheduled task; use Mark as given for scheduled doses. Feeding history includes the latest seven consumption percentages, without equating different feeder sizes or interpreting them as health diagnoses.

## Archive, deletion and photos

Archiving disables routines and archives open reptile tasks while keeping records. Restoring does not automatically restart schedules. Permanent deletion marks the animal as deleting/archived, prevents new child records, enumerates owner-scoped photo files (including leftover files from unsuccessful saves), removes Storage files through its API, and only then deletes the profile. Foreign keys remove events, routines, photo metadata and dependent reptile tasks; reusable supplement products remain. Failures leave the archived/deleting profile available for retry. Storage and PostgreSQL are separate services, not one atomic transaction: successful file removals are not reversible if the later database delete fails. Do not upload from another device while deleting.

Confirmed pre-insert upload failures receive best-effort file cleanup. An ambiguous database/network response does not delete a potentially committed photo. Refresh before retrying an uncertain upload to avoid duplicate records. Owner-scoped leftover files are included in eventual profile deletion cleanup. No public sharing or new access model is introduced.

## Reports and scope

Print Dusting Calendar is available from the supplement calendar on the reptile dashboard and individual profiles. Select a month and one or more active reptiles, then download a landscape Letter PDF. Daily cells contain reptile/product/D3 labels and paper checkboxes; crowded days continue in full on detail pages. The mobile setup shows a daily agenda preview of the same entries. No database writes, new dependencies or migrations are required.

The printable calendar includes saved non-archived occurrences and projects enabled schedules beyond the latest saved due/completion date, using each routine's timezone and the same day/week/weekday/month-clamping/custom-date rules as task scheduling. Projected dates are estimates assuming on-time completion, not administered doses. Disabled routines retain saved history but do not project. Every-feeding routines list undated reminders and any already-saved tasks, without guessing future feeding dates. D3 overlap markers indicate multiple D3-containing entries for the same animal and calendar date; they are not veterinary advice. Printing does not mark doses given.

Reptile Care Report offers one or multiple animals, section selection, downloadable Letter PDF, opening the PDF for browser printing, and separate weight/feeding CSVs. PDFs use embedded Unicode fonts, vector weight charts, wrapped text, pagination and page numbers. CSV formulas are escaped. Photo attachments remain in the gallery rather than embedded in reports. Reptile data is not automatically imported from legacy `plants.kind=animal` or feeder animal-name records. This release requires a cloud account; it does not silently switch to local-only data on errors. Existing Plant Collection backup is separate from reptile report export.

## Rollback

`docs/reptiles-rollback.sql` is the separate copy/paste-ready rollback. It **destroys new reptile-module data and reptile tasks**; export records/photos first, take a database backup, and stop reptile clients. Remove reptile Storage files through Storage APIs before dropping metadata. It preserves existing plant tables, plant tasks, spaces, templates, auth and all original policies/functions. Do not use CASCADE broadly or delete Storage metadata with SQL.

Validate on a staging copy before production. Automated PostgreSQL tests use PGlite with the tracked production table definitions, actual owner policies and authenticated roles; they do not prove the live project has no drift or exercise the hosted Storage service.
