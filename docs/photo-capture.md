# Faster photo capture

The plant Photos tab now starts with **Take photo** and **Add photos**. Camera
capture requests the rear-facing camera on supported mobile browsers; desktop
browsers may show a file picker. Capture again to take another photo, or choose
multiple existing images in one selection. Existing format/25 MB limits still
apply; HEIC/HEIF must be exported as JPEG first. No image-conversion dependency or
Storage policy change was added.

A per-file queue shows Queued, Preparing/uploading, Saved, or Failed. Files are
processed sequentially to bound memory and avoid competing cover-image choices.
Progress measures processed files, not bytes. One failure does not block later
files. Retry one file or all failed files without selecting them again; successful
files are never included in these retries. Duplicate filenames have separate queue
identities. Button, paste, and drop entry points all honor disabled/busy state.

Files remain in memory only while the Photos tab is open. Leaving the tab stops
starting additional queued files; the in-flight save may finish. Reload/close
attempts while uploading request the browser's standard warning. Clearing the
queue does not delete any saved photos. This is not a persistent/offline uploader.

Each gallery card has **Use as cover**, reusing the existing media/plant service.
It remains available for a current cover too, allowing repair of a failed plant
cover-pointer update without uploading the original again.

Saved rows/objects are distinguished from follow-up failures: preview URL access,
cover-pointer updates, and timeline errors produce saved-with-warning results,
not failed uploads. The UI explains the warning. Preview failures never trigger
Storage cleanup after a confirmed insert. Failed inserts still clean up uploaded
objects and retain their diagnostic errors. Existing fingerprint checks remain
in place. Cloud gallery reads are scoped to the plant, and duplicate checks query
fingerprints directly instead of downloading/signing the whole media library.

Import and cover mutations invalidate media, plant, timeline, and dashboard
queries even after partial failure. No migration, RLS, schema, dependency, or
production-data changes are required.
