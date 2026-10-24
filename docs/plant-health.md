# Plant health and treatment log

Plant details has a Health tab with Healthy, Monitoring, In treatment and Quarantined statuses, notes and an optional reference to an existing plant photo. New photos use the existing Photos tab. Status is independent of Active/Archived; no lifecycle, care routine or task changes occur when recording health.

Each update is one manual `observation` in the existing `timeline_events` table, with `metadata.feature = plant-health-v1`, `healthStatus` and optional `mediaId`. Current health is the newest valid observation by occurredAt, then createdAt and ID for deterministic ties. Plants without an entry are Not recorded, never implicitly Healthy. There are no new tables, columns, policies, dependencies or migrations. Existing owner RLS and local/cloud repositories apply; cloud errors never fall back to local records.

The Collection health filter combines with lifecycle, search, space, tag and attention filters. Health reads are paginated and shared through a timeline query, not one request per plant. Loading/error states do not classify plants as unrecorded. Successful saves invalidate timeline and dashboard queries. Collection JSON backups already include health metadata and notes via timeline records.

After saving, Add follow-up task opens the existing task form with the plant, an inspection type and title prefilled. The user chooses date, recurrence and other details and explicitly saves the task. Cancelling or failing task creation does not undo or repeat the health entry. Tasks are not created automatically or represented as atomic with health updates.

Timeline can edit the description/date or delete an entry. Record a new Health update to change status. Deleting or redating the latest observation can change the derived current status. Deleted photo references are displayed as unavailable; photos are never duplicated into health events. Quarantine is a user-recorded label, not a biological isolation guarantee or treatment recommendation.
