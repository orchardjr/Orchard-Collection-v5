# Feeder Management

Feeder Management is a local-first module inside Orchard Collection. It uses the existing React Router, TanStack Query, shared UI primitives, and the same Dexie database as plants and media.

## Architecture and entities

Dexie schema version 7 adds `feederSpecies`, `feederColonies`, `cricketBatches`, `feederInventory`, `inventoryTransactions`, `maintenanceLogs`, `harvestLogs`, `feedingLogs`, and `feederSettings`. Existing tables are unchanged. Domain validation and atomic multi-table writes live in `FeederService`; React components never write quantities directly.

Inventory quantity is the current cached balance. Every change also appends an immutable transaction with its delta and resulting balance. Feedings subtract the eaten quantity. Inventory-directed harvests add their quantity. A transaction that would make the balance negative is rejected.

Care due dates are derived from the newest matching maintenance event plus the configured interval. If no matching event exists, the colony start date is used. Cricket hatch estimates add the configured incubation period to the date eggs moved to incubation.

## QR labels

Colonies, batches, and inventory receive unique values such as `orchard:colony:DR-B-001`. The scanner validates this format and resolves it to an internal record route. Open a record and choose **Print DYMO label**. The print stylesheet targets a 4 × 2.125 inch black-and-white label; choose the matching DYMO stock and disable browser headers and margins.

## Configuration

Open **Feeders → Settings** to add a species or change care intervals. Reference species and defaults are inserted only when those reference tables are empty. Operational sample records are not seeded in production.

## Development

Run `pnpm dev`, open `/feeders`, and create a colony, batch, or inventory item. Run `pnpm test`, `pnpm lint`, `pnpm format:check`, and `pnpm build` before shipping.
