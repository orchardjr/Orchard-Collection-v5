# Collection Backup & Export

Settings offers CSV plant export and a versioned JSON collection backup. All plants is the default; Active and Archived scopes are available. Exports are read-only and use existing authenticated reads and Storage permissions. No migration or dependency change is required.

JSON preserves plant care fields, tasks, shared assignments, timeline, media metadata, custom properties, tags, locations, plant NFC assignments and label templates. Shared tasks retain their assignments even when some assigned plants are outside the chosen scope. Reference catalogs (spaces, tags and templates) are retained in full. Local device exports contain only records available on that device; local tags/properties have no backing tables. No cloud failure falls back to local data.

Optional original photos and available thumbnails are embedded as data URLs, with sequential progress. A missing original or failed download aborts the entire export. There is a 50 MiB binary photo limit; base64 increases download size by approximately one third. This is a browser-memory export, not a streaming archive. Large collections should omit photos. No file download starts until export preparation succeeds.

CSV quotes all cells, preserves multiline text and Unicode, and prefixes spreadsheet formula-like values to prevent formula execution. It is a convenience view, not a lossless backup. JSON preserves the full exported record fields and ISO timestamps, omitting temporary signed URLs and in-memory Blob fields.

Exports contain private notes and NFC identifiers: store them securely. This is not a full Supabase backup, a transactionally consistent snapshot, or an automatic restore feature. Avoid collection edits while exporting. Feeder records, auth accounts, settings, database definitions and Storage policies are excluded. Data can change between paginated reads. No production data is modified by export or by the automated tests.
