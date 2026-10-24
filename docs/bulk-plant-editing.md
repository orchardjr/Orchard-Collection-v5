# Bulk plant editing

In Collection, choose **Select**, select individual plants or **Select all
filtered plants**, then **Edit selected**. The dialog displays the full selection,
including any explicitly selected archived plants. Normal Collection scope remains
Active; editing never changes a plant's archived status.

All fields start at **Leave unchanged**. You can move plants to an active space,
clear their location, add comma-separated tag names, remove specific existing tags,
or set/disable watering and fertilizing intervals (1–3650 days). Review shows the
plant count and the exact proposed changes; no writes happen before Apply.

Tags use the existing `tags` and `plant_tag_links` tables. Adding a tag preserves
other assignments and is idempotent. New names create owner-scoped reusable tags.
Removing a tag deletes only the selected plants' links, never the shared tag.
Tag editing is cloud-only because the existing local database has no plant-tag
store; location and care editing work locally as well.

Care saves reuse `TaskService.saveCare` and the existing `save_plant_care` RPC.
Each plant and its task choices are read again before saving. Last-completed dates,
notes, mounted/moss-pole settings, and the other interval are preserved. Existing
managed routines follow the changed interval without duplicate tasks; disabling
a routine archives its managed task. User-created/shared tasks are not adopted or
archived by bulk editing, and new managed routines are not enabled. Use the Care
tab to enable recurring tasks explicitly. As with the existing Care editor,
simultaneous edits from another device are not protected by optimistic locking.

The batch is deliberately **not one database transaction**. A plant may have some
changes saved before a later operation fails. Results identify failed plants and
include the underlying error. Retry targets only failed plants; location, tag,
and care edits can be safely reapplied. Queries for plants, tasks, spaces, timeline,
dashboard, and tag assignments are invalidated after every attempt, including
partial/global failures. New tag definitions may remain available even if a later
plant update fails.

No migration, schema, RLS, dependency, or production-data changes are required.
Existing authenticated owner policies and compound tag foreign keys are reused.
