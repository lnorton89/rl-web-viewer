---
phase: 05
slug: hardening-modular-expansion-base
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 05-01-01 | 01 | 1 | PH5-SC1 | unit | `npx vitest run tests/camera/adapter-contract.test.ts` | MISSING W0 | pending |
| 05-01-02 | 01 | 1 | PH5-SC4 | unit/doc | `npx vitest run tests/camera/adapter-contract.test.ts tests/camera` | MISSING W0 | pending |
| 05-02-01 | 02 | 2 | PH5-SC3 | unit | `npx vitest run tests/server/diagnostics-logging.test.ts tests/debug-capture.test.ts` | MISSING W0 | pending |
| 05-02-02 | 02 | 2 | PH5-SC2 | integration | `npx vitest run tests/media/live-view-repeatability.test.ts tests/server/dashboard-bootstrap-repeatability.test.ts tests/server/live-view-routes.test.ts` | MISSING W0 | pending |
| 05-03-01 | 03 | 3 | PH5-SC2 | jsdom | `npx vitest run tests/web/repeated-use-flows.test.tsx tests/web/live-view-controls.test.tsx --project web` | MISSING W0 | pending |
| 05-03-02 | 03 | 3 | PH5-SC3 | build/jsdom | `npm run build:web && npx vitest run tests/web/repeated-use-flows.test.tsx tests/web/live-view-controls.test.tsx --project web` | MISSING W0 | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

- [ ] `tests/camera/adapter-contract.test.ts` - locks the new adapter interface and one RLC-423S implementation against it
- [ ] `tests/server/diagnostics-logging.test.ts` - verifies request correlation, sanitized log fields, and artifact linkage
- [ ] `tests/web/repeated-use-flows.test.tsx` - exercises retry/reconnect/reapply loops across viewer/PTZ/settings surfaces
- [ ] `tests/media/live-view-repeatability.test.ts` - covers relay startup/restart/failure classification loops
- [ ] `tests/server/dashboard-bootstrap-repeatability.test.ts` - covers repeated dashboard bootstrap/connect/session recovery without process restart

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Repeated local use across connect, live view, PTZ, and settings | PH5-SC2 | Needs the real RLC-423S and operator-visible recovery behavior | Start the local app, cycle live view mode changes, run PTZ movement and stop loops, apply one safe setting change, then confirm the dashboard remains coherent after repeated retries and refreshes |
| Diagnostics remain secondary but actionable during a real failure | PH5-SC3 | Browser-safe copy and operator trust are best judged live | Interrupt the relay or a camera interaction, confirm short readable status remains in the primary UI, and verify deeper diagnostics stay collapsed/secondary while logs or artifact references remain available |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
