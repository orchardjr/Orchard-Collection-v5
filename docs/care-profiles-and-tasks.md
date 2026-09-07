# Care profiles and plant tasks

## Supabase deployment (manual, before deploying this application version)

1. Open the Orchard Collection project in Supabase Dashboard → SQL Editor → New query.
2. Copy the complete contents of `supabase/migrations/202609060001_care_profiles_task_assignments.sql` into the editor. Keep its `begin` / `commit` wrapper intact. Reruns against the same schema version are supported: the migration recreates only its own assignment policy, preserves rows, and avoids duplicate backfill links. It is not a repair script for a divergent schema.
3. Confirm the query succeeds, then deploy the application. No existing plant or task data needs deleting or reimporting.

The migration adds `plants.last_watered_at`, `plants.last_fertilized_at`, and `tasks.care_managed`, plus a `task_plants` association table. It reuses the existing interval, due-date, recurrence, completion, and timeline columns. Existing single-plant assignments are backfilled into the association table. Existing tables' RLS policies, credentials, and Storage settings are unchanged. The new table has owner-only RLS and composite foreign keys that prohibit cross-account assignments.

The three mutation functions are `save_collection_task`, `save_plant_care`, and `complete_collection_task`. Each uses the authenticated user's identity, owner checks, and a transaction-scoped per-user lock. A completed occurrence, its successor, all affected care dates, and timeline events commit together or roll back together. Repeating completion is a no-op. A partial unique index allows only one open profile-managed routine per plant/type.

## Behavior

- `recurrence_source_id` points to the immediately completed occurrence, not a stable series root. This preserves the existing task-service contract; three consecutive completions are tested.
- Adoption intentionally transfers schedule management to Care. Disabling then archives the adopted user-created routine. The edit form explains this before saving; unrelated single-plant tasks and shared tasks remain unchanged.

- A zero/absent care interval means disabled. Last-completed dates are optional. Without a date, enabling a recurring care task schedules the first occurrence one interval from today. Subsequent interval edits use that routine's original creation date until care is first completed.
- Enabling a routine reuses an existing single-plant recurring Water/Fertilize task when possible; shared tasks are never adopted. Disabling a routine archives only its managed open task. Completed history and unrelated tasks remain.
- Repeat intervals advance from the completion date (including overdue tasks). Monthly recurrence uses the same day next month, clamped to month end. Local calendar arithmetic and the browser's time zone are used, including daylight-saving transitions.
- Completing a shared task completes it for every assigned plant. There is one task, one next occurrence, and one assignment link per plant—not duplicated tasks. Water/Fertilize updates each assigned plant's last-completed date and any open profile-managed due date. Individual care intervals may differ from a shared task's interval.
- Completed recurring occurrences are history; use the successor rather than reopening them. Manage a profile-generated routine in Care rather than editing its task independently.
- Pickers default to active plants. Archived plants are available through an explicit filter, and existing archived assignments are preserved when editing a task. Space selection, plant/animal categories, and existing Supabase plant tags are supported. The local-only model currently has no plant tags.
- Deleting a plant removes its assignment links; shared tasks remain for their other plants. Existing single-plant deletion behavior remains intact.

## Validation

The compatibility tests use the tracked initial table definitions, exact owner policies, and updated-at triggers. Both required `unique(user_id,id)` constraints are verified. Subsequent tracked migrations do not redefine these task/care columns or owner policies. Tests separately model Supabase's platform table grants: the initial schema does not explicitly grant table privileges for these tables, so tracked RLS compatibility does not prove the current live project's grants. No live production inspection or migration application was performed.

`src/data/careTasksMigration.test.ts` runs the actual migration against embedded PostgreSQL (PGlite, development-only), using the existing table definitions and owner RLS. It checks SQL execution, ownership, idempotency, multi-plant assignments, and transaction rollback. Service and component tests cover IndexedDB transactions, care editing, task forms, and Collection/plant shortcuts.

Run focused tests with `pnpm exec vitest run src/data/careTasksMigration.test.ts src/services/CareTasks.test.ts src/services/TaskService.test.ts src/features/tasks/TaskFormDialog.test.tsx src/features/tasks/PlantTaskFlows.test.tsx src/features/plant-details/tabs/CareTab.test.tsx`, then `pnpm test`, `pnpm exec tsc -b`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and `git diff --check`.
