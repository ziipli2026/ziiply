# Fuel photo background recovery

Incomplete or uncertain browser reads are uploaded before report submission. The recovery
queue persists in the active fuel database, independently of the browser and the report's
OK button. The client uses a higher-resolution JPEG (up to 2400 px and 3.8 MB) for recovery
when possible. No photo is sent to a public result endpoint.

The bounded worker tries original vision, normalized/sharpened vision, and overlapping
enlarged crops. Two different treatments must agree on every visible fuel's price. Empty,
uncertain, and conflicting readings are not recovered. Recovered prices fill only empty
fields; existing values and user edits are preserved and an explicit suggestion is shown.
No background result is inserted into public price observations automatically.

A leased DB claim plus Next.js after() performs initial work. The authenticated cron runs
every 15 minutes, so closing the browser does not stop saved jobs. Interrupted leases are
reclaimed; individual jobs are limited to three attempts and expire after 24 hours. Queue
images are set to NULL on successful recovery, user confirmation, exhausted attempts, and
expiry cleanup. Cleanup runs even when the vision provider is unavailable. The original
photo attached to an explicitly submitted report is managed by the existing report flow;
it is not an abandoned queue image.

Confirmed report prices are stored with the case's initial and method-specific readings.
Those values provide evidence for future reader evaluations; this does not automatically
retrain a model or change the reader's code. Unrelated OCR text is not retained. Image
access is never returned through the status API. A random capability token (stored hashed)
protects each case; user confirmation clears the lease so late workers cannot overwrite it.
Uploads are bounded by JPEG size, a per-hour count, and outstanding image count/bytes.

Schema: db/migrations/20261014_fuel_photo_learning.sql.
Apply with scripts/fuel-photo-learning/apply-schema.cjs using a private untracked config.
Queue verification: scripts/fuel-photo-learning/verify-queue.cjs (validation branches only).
Consensus tests: tests/fuel-photo-recovery.test.cjs.
