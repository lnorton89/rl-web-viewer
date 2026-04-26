---
status: resolved
trigger: "investigate a memory issue. ive had the dev server running a few days and the browser tab is using 9gb of memory. the server is still running"
created: "2026-04-21T00:00:00.000Z"
updated: "2026-04-22T04:06:13.927Z"
---

# Debug: Browser Tab Memory Leak

## Symptoms

- **Expected:** Browser tab should not leak memory over time during normal use
- **Actual:** Browser tab grows to excessive memory usage; after a few days it reached about 9 GB while the server kept running
- **Error messages:** None reported
- **Timeline:** Just noticed it; this is a new codebase
- **Reproduction:** Leave the only page open with the dev server running for an extended period

## Evidence
- timestamp: "2026-04-22T04:06:13.927Z"
  source: "web/src/lib/players/snapshot-player.ts"
  note: "Snapshot playback was forcing a unique `?_ts=` URL every refresh, creating an unbounded stream of distinct image resources in a long-lived browser tab."
- timestamp: "2026-04-22T04:06:13.927Z"
  source: "src/server/routes/live-view.ts"
  note: "The snapshot endpoint already returns `Cache-Control: no-store`, so client-side per-frame cache busting was redundant."
- timestamp: "2026-04-22T04:06:13.927Z"
  source: "tests/web/snapshot-player.test.ts"
  note: "Regression coverage now verifies repeated snapshot refreshes reuse a stable request URL, revoke superseded blob URLs, and abort in-flight work during teardown."

## Current Focus

hypothesis: "Snapshot refreshes are leaking browser memory by continuously creating distinct image resources that are never released."
test: "Replace per-refresh cache-busting image URLs with `fetch(..., { cache: \"no-store\" })` plus revocable blob URLs, then run the full test suite."
expecting: "Browser memory stays bounded during long-lived snapshot playback and existing live-view tests remain green."
next_action: "session complete"

## Eliminated

## Resolution

root_cause: "The snapshot player appended a unique timestamp query string on every refresh, causing the browser tab to accumulate an unbounded sequence of distinct snapshot image resources over time."
fix: "Snapshot playback now fetches the stable snapshot endpoint with `cache: \"no-store\"`, renders each frame through a revocable blob URL, aborts in-flight refreshes on teardown, and releases replaced object URLs."
verification: "Ran `npm test` successfully: 26 files passed, 131 tests passed."
files_changed:
- "web/src/lib/players/snapshot-player.ts"
- "tests/web/snapshot-player.test.ts"
