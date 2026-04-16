---
phase: 05
slug: hardening-modular-expansion-base
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-15
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/server/live-view-routes.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/server/live-view-routes.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | PH5-SC1 | unit | `npx vitest run tests/camera/adapter-contract.test.ts --project node` | created in task 05-01-01 | pending |
| 05-01-02 | 01 | 1 | PH5-SC4 | unit | `npx vitest run tests/camera/adapter-contract.test.ts tests/camera/reolink-ptz.test.ts tests/camera/reolink-settings.test.ts --project node` | uses task 05-01 test ownership | pending |
| 05-02-01 | 02 | 2 | PH5-SC3 | unit | `npx vitest run tests/server/diagnostics-logging.test.ts tests/debug-capture.test.ts --project node` | created in task 05-02-01 | pending |
| 05-02-02 | 02 | 2 | PH5-SC2 | integration | `npx vitest run tests/media/live-view-repeatability.test.ts tests/server/dashboard-bootstrap-repeatability.test.ts tests/server/live-view-routes.test.ts --project node` | created in task 05-02-02 | pending |
| 05-03-01 | 03 | 3 | PH5-SC2 | jsdom | `npx vitest run tests/web/repeated-use-flows.test.tsx tests/web/live-view-controls.test.tsx --project web` | created in task 05-03-01 | pending |
| 05-03-02 | 03 | 3 | PH5-SC3 | build/jsdom | `npm run build:web && npx vitest run tests/web/repeated-use-flows.test.tsx tests/web/live-view-controls.test.tsx --project web` | uses task 05-03-01 test ownership | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Resolution

Phase 05 does not require a separate scaffold-only Wave 0. The current plans satisfy Nyquist by creating missing test files inside the TDD implementation tasks that consume them:

- [x] `tests/camera/adapter-contract.test.ts` is created in plan 05-01 task 1 before adapter implementation work
- [x] `tests/server/diagnostics-logging.test.ts` is created in plan 05-02 task 1 before diagnostics implementation work
- [x] `tests/media/live-view-repeatability.test.ts` is created in plan 05-02 task 2 before repeatability hardening work
- [x] `tests/server/dashboard-bootstrap-repeatability.test.ts` is created in plan 05-02 task 2 before dashboard/session recovery work
- [x] `tests/web/repeated-use-flows.test.tsx` is created in plan 05-03 task 1 before browser recovery work

No task in 05-01, 05-02, or 05-03 relies on a separate unplanned Wave 0 artifact.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Repeated local use across connect, live view, PTZ, and settings | PH5-SC2 | Needs the real RLC-423S and operator-visible recovery behavior | Start the local app, cycle live view mode changes, run PTZ movement and stop loops, apply one safe setting change, then confirm the dashboard remains coherent after repeated retries and refreshes |
| Diagnostics remain secondary but actionable during a real failure | PH5-SC3 | Browser-safe copy and operator trust are best judged live | Interrupt the relay or a camera interaction, confirm short readable status remains in the primary UI, and verify deeper diagnostics stay collapsed/secondary while logs or artifact references remain available |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify and none depend on missing pre-task scaffolds
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 expectations resolved by task-level TDD ownership instead of separate scaffolds
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Nyquist sign-off complete for the current plan structure
