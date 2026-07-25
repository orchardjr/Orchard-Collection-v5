# NFC Tag System — Phase 1

Phase 1 provides permanent, reusable NFC tag records and public URLs. Phase 2
adds optional Web NFC reading, writing, and read-back verification.

## Assigning a plant tag

1. Open a plant and select **Overview**.
2. In **NFC Tag**, select **Assign NFC Tag**.
3. Optionally enter a nickname, manufacturer UID, and notes.
4. Save the tag, then copy its permanent `/nfc/:token` URL.

On a supported secure-context browser, **Write NFC Tag** encodes only the
canonical `https://app.orchardcollection.ca/nfc/<token>` URL and then asks for
the tag again to verify the stored value. **Read NFC Tag** displays the URL,
available UID, tag type, and NDEF records.

Web NFC capability is detected from `NDEFReader`; browsers are not identified
by name. Unsupported browsers retain URL copying and QR-code download.

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
  atomically increments `scan_count`, sets `first_scanned_at`, updates
  `last_scanned_at`, and stores a best-effort browser/platform description.
- `public_token` is an unguessable UUID and is unique across all users.
- Dexie schema version 8 mirrors the tag model for local/offline mode.

## Migrations

Apply:

`supabase/migrations/202607250001_nfc_tags.sql`

Rollback (only before tags are in use):

`supabase/rollbacks/202607250001_nfc_tags.down.sql`

The rollback deletes the NFC table and must not be run against production data
without a backup and explicit approval.

## Web NFC safety

Hardware actions require HTTPS and browser permission. Rewriting requires
confirmation. Cancellation, permission denial, write failures, and read-back
mismatches are surfaced without changing the database assignment. Internal
database IDs are never written to a tag.
