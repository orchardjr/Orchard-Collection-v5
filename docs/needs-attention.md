# Needs attention

Dashboard now has six active-plant attention categories. Each count links to a
durable Collection URL (`?attention=noPhotos`, for example). That Collection view
uses the same classification and full plant dataset, and intersects it with
search, space, and tag filters. Select all filtered plants can feed the existing
bulk editor, task assignment, or label workflow. Clearing attention removes only
that URL parameter. Explicit local-collection mode is retained in links.

- **Overdue watering / fertilizing:** an open assigned care task due before
  today, or a care-profile next date before today. Dates use the device's local
  calendar; due-today tasks are not overdue. Managed-task due dates take precedence
  over profile calculations. Unknown last-completed dates do not invent overdue
  dates. Shared tasks count each active assigned plant once, not once per task.
- **No photos / NFC:** reuses Print Collection's audit of actual media records
  and NFC assignments. Placeholder/hero URLs are not media records.
- **No location:** no assigned space ID.
- **No care schedule:** neither a positive watering/fertilizing interval nor
  an open recurring Water/Fertilize task. Explicitly disabled schedules can
  appear here; the category never enables a routine automatically.

Archived plants are excluded from every category. The overall attention total
deduplicates plants across categories. These are data-completeness and scheduling
indicators, not a plant-health diagnosis. Nothing is changed merely by opening
the dashboard or following a link.

Data uses the existing paginated collection reader and local repositories, without
silent cloud-to-local fallback. Attention reads media metadata without signing or
loading images, and bulk-reads task assignments instead of requesting each plant.
Counts/results remain unavailable while loading or after a failed read, with a
Retry action rather than misleading zero/missing counts. Existing query-key
invalidation refreshes results after changes. A cleaned-up minute timer and focus
listener re-evaluate calendar boundaries while a page remains open.

No migration, RLS, schema, dependencies, or production data changes are required.
