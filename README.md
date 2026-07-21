# Orchard Collection v5

Local-first collection management built with React, TypeScript, Vite, and Dexie.

## Setup

```sh
pnpm install
pnpm dev
```

The Feeder Management migration runs automatically when the application opens. Dexie schema version 7 adds feeder tables without rewriting or deleting plants, media Blobs, spaces, tasks, or timeline history. See [Feeder Management](docs/feeder-management.md) for architecture, quantity rules, QR labels, and care settings.
