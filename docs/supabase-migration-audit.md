# Supabase migration audit

## Current persistence

Orchard Collection uses one Dexie database named `orchard-collection`, currently
at schema version **7**. Versions 1–6 introduced the collection, normalized plant
fields, media blobs, task/space/timeline operations, and their legacy upgrades.
Version 7 added Feeder Management and upgrades legacy `parentId`, task status,
priority, type, and recurrence values.

The current tables and indexes are defined in `src/db/database.ts`:

- `plants`: `id`, nickname, scientific name, status, favorite, purchase date,
  space, hero media, created time.
- `spaces`: `id`, name, type, parent, archive time, created time.
- `tasks`: `id`, plant, space, status, type, priority, due time, recurrence
  source, archive time, created time.
- `timeline`: `id`, plant, space, event type, occurrence time, manual flag,
  created time.
- `media`: `id`, plant, fingerprint, hero/favorite flags, capture/upload/update
  times, and multi-entry tags.
- `feederSpecies`, `feederColonies`, `cricketBatches`, `feederInventory`,
  `inventoryTransactions`, `maintenanceLogs`, `harvestLogs`, `feedingLogs`, and
  `feederSettings`.

Dexie stores JavaScript `Date` values and media `Blob` values directly. Seed data
is inserted only when the corresponding local tables are empty.

## Stored entities and relationships

All entities have a string `id`, `createdAt`, and `updatedAt`.

- **Plant**: nickname, scientific/common names, cultivar, vendor, plant/animal
  kind, active/archive status, favorite, purchase date, legacy hero URL, hero
  media ID, space ID, water/fertilizer intervals, mounted/moss-pole flags, care
  notes, and general notes.
- **Space**: name, description, type, parent space, archive time, and light,
  temperature, and humidity notes. Plants and tasks reference spaces.
- **Task**: optional plant/space, title, description, due time, priority, status,
  type, recurrence mode/interval/source, completion time, and archive time.
- **TimelineEvent**: optional plant/space, title, description, type, occurrence
  time, JSON-compatible metadata, and manual/system flag. Plant, task, and media
  services create system events.
- **MediaAsset**: plant, original filename/MIME/blob, optional thumbnail blob,
  dimensions, size, capture/upload times, hero/favorite flags, notes, string
  tags, camera/lens/orientation metadata, and duplicate fingerprint. A plant may
  additionally reference its hero media ID. Media deletion promotes the newest
  remaining image.
- **FeederSpecies**: name, scientific name, active flag.
- **FeederColony**: human code, name/species/type/status, start/source/bin/
  location, population breakdown, environmental/care fields, production status,
  notes, QR value, and archive time.
- **CricketBatch**: human code, parent colony, lifecycle dates, incubation
  conditions, hatch counts, size/quantity/bin/stage, last-care dates, notes, QR,
  and archive time.
- **FeederInventoryItem**: human code, species/variety/size/quantity/unit,
  source colony/batch, storage/date/supplier/cost/gut-load/care/use-by fields,
  minimum stock, status, notes, QR, and archive time.
- **InventoryTransaction**: inventory item, permanent action/delta/balance,
  occurrence time, source, and notes.
- **MaintenanceLog**: optional colony/batch, action/time, material/amount,
  temperature/humidity, observations/mortality/notes/user.
- **HarvestLog**: human code, time, optional colony/batch, species, size,
  quantity/unit/destination, optional animal/inventory/mortality, and notes.
- **FeedingLog**: time, optional animal identity, species/size, offered/eaten
  quantities, optional inventory/colony/batch, supplements, and notes.
- **FeederSettings**: key, numeric value, label.

Plant dynamic properties are currently stored in the plant fields above rather
than a separate Dexie table. Media tags are currently an array on `MediaAsset`;
the cloud schema normalizes them to `tags` and `plant_tag_links`.

## Read/write architecture

- `BaseRepository` provides Dexie CRUD and client-side ID/timestamps.
- Specialized repositories add task selectors, space nesting/counts, timeline
  ordering/manual-event protection, and atomic media hero/favorite/delete rules.
- `PlantService`, `TaskService`, and `MediaService` coordinate related timeline
  writes. `TaskService` creates recurring occurrences. `FeederService` coordinates
  lifecycle and permanent inventory/log transactions.
- `useOrchardData` uses repositories/services through TanStack Query and
  invalidates related query keys after writes.
- `useFeederData` currently reads feeder tables directly and wraps service or
  repository mutations.
- `ensureSeedData` and `ensureFeederReferenceData` write local example/reference
  records.

Direct database dependencies that must be removed from cloud runtime are:
`PlantService`, `TaskService`, `FeederService`, `useFeederData`, and seed
initialization. Dexie remains intentionally available only for legacy detection,
backup, import, verification, and explicitly confirmed cleanup.

## Existing persistence tests

The test suite covers:

- Plant CRUD, timeline writes, archive behavior, and ID fallback.
- Space CRUD, hierarchy, archive/restore, plant counts, and reassignment.
- Task CRUD, selectors, recurring completion, lifecycle, and timeline events.
- Timeline ordering, manual CRUD, and system-event immutability.
- Media CRUD, plant scoping, one-hero atomicity, hero promotion, batch partial
  failure, media timeline activity, thumbnail generation, selectors, and object
  URL cleanup.
- Feeder colony lifecycle, cricket hatch stages, permanent inventory
  transactions, harvest/feed effects, and validation.

There was no authentication, user-isolation, remote repository, import,
Realtime-cleanup, or network/offline test coverage before this migration.

## Migration constraints and plan

1. Keep the existing TypeScript domain models and UI contracts.
2. Add authenticated Supabase repositories behind shared repository interfaces.
3. Convert database snake_case/timestamp rows at the repository boundary.
4. Use PostgreSQL UUID IDs while accepting valid legacy text IDs during import
   through a stable UUID mapping, preserving every relationship.
5. Store media objects in a private `plant-media` bucket and only paths/metadata
   in PostgreSQL.
6. Import in dependency order: spaces/species, plants/colonies, batches/media/
   tasks/timeline, inventory, then logs/transactions/settings and tag links.
7. Verify counts and uploaded objects before marking the per-user import complete.
8. Subscribe once per authenticated session to the selected cloud tables and
   invalidate TanStack Query keys; always remove the channel on cleanup.
9. Keep cached query data visible during temporary disconnection, but block
   cloud writes with a clear error and offline indicator.

