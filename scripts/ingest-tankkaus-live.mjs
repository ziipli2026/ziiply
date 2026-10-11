#!/usr/bin/env node
// Retired on 2026-10-11: the legacy four-area / 10 km pilot must never collect
// or write again. Scheduled/manual legacy callers intentionally stop here.
// Active nationwide implementation: scripts/lib/tankkaus-national.mjs on
// preview/legacy-desktop-ui. Do not restore this radius-limited pipeline.
console.log(JSON.stringify({ok:true,skipped:true,reason:"Legacy 10 km Tankkaus pilot collector retired; use the nationwide collector"}));
