---
phase: 2
slug: browser-live-view-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 2 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `Vitest 4.1.4` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/live-view/*.test.ts -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/live-view/*.test.ts -x`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | LIVE-01 | unit + integration | `npx vitest run tests/media/live-mode-selection.test.ts tests/server/live-view-routes.test.ts -x` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | LIVE-02 | unit + jsdom | `npx vitest run tests/media/live-mode-selection.test.ts tests/web/live-view-controls.test.tsx -x` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | LIVE-03 | jsdom + unit | `npx vitest run tests/web/live-view-viewer.test.tsx tests/media/live-view-errors.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/media/live-mode-selection.test.ts` - startup ordering and fallback ladder coverage for `LIVE-01` and `LIVE-02`
- [ ] `tests/server/live-view-routes.test.ts` - app-owned URLs, auth boundary, and diagnostics hook coverage for `LIVE-01` and `LIVE-03`
- [ ] `tests/web/live-view-viewer.test.tsx` - overlay states, retry button, and reconnect UX coverage for `LIVE-03`
- [ ] `tests/web/live-view-controls.test.tsx` - manual mode and quality selection coverage for `LIVE-02`
- [ ] `tests/media/live-view-errors.test.ts` - media-layer failure classification coverage for `LIVE-03`
- [ ] Browser-like test environment installs: `jsdom`, `@testing-library/react`, and `@testing-library/user-event`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real camera playback works through the preferred browser transport | LIVE-01 | Requires the physical RLC-423S, live LAN access, and actual browser codec support | Start the app against `http://192.168.1.140`, open the viewer in a browser, confirm the preferred mode renders live video without Flash/plugins |
| The fallback ladder steps down correctly after transport-specific failures | LIVE-02, LIVE-03 | Browser/network/codec failure behavior is hard to simulate faithfully without the real media path | Force the preferred mode to fail, confirm fallback to the next allowed mode, and verify the status reason updates in the viewer |
| In-view reconnect and failure states stay understandable during live network drops | LIVE-03 | Requires interrupting an active live stream or relay process | Drop the relay or network during playback, confirm `reconnecting` appears, then confirm `failed` with retry after retry limits are reached |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
