# NFC Tag System — Phase 1

Phase 1 provides permanent, reusable NFC tag records and public URLs. It does
not write to physical NFC hardware.

## Assigning a plant tag

1. Open a plant and select **Overview**.
2. In **NFC Tag**, select **Assign NFC Tag**.
3. Optionally enter a nickname, manufacturer UID, and notes.
4. Save the tag, then copy its permanent `/nfc/:token` URL.

The URL can be encoded into an NFC tag later with any compatible writer. Native
Web NFC writing is intentionally outside Phase 1.

Replacing a tag creates a new token and leaves the old record unassigned for
auditability. Removing a tag also unassigns rather than deleting it.

## Architecture

- `nfc_tags` is a polymorphic assignment table. `resource_type` and
  `resource_id` allow future resource types without adding columns.
- Phase 1 accepts `resource_type = 'plant'`. A database trigger verifies that
  the referenced plant exists and belongs to the same user.
- Authenticated CRUD policies remain scoped to `auth.uid() = user_id`.
- Anonymous scans cannot select `nfc_tags`. They call `scan_nfc_tag`, a
  narrowly scoped function that returns only the public routing fields and
  updates `last_scanned_at`.
- `public_token` is an unguessable UUID and is unique across all users.
- Dexie schema version 8 mirrors the tag model for local/offline mode.

## Migrations

Apply:

`supabase/migrations/202607250001_nfc_tags.sql`

Rollback (only before tags are in use):

`supabase/rollbacks/202607250001_nfc_tags.down.sql`

The rollback deletes the NFC table and must not be run against production data
without a backup and explicit approval.

## Future Web NFC

A future writer can encode the existing public URL and store a hardware `uid`
through the repository. No schema change is required to add Web NFC support or
new resource types; new types need only resource validation and UI routing.
