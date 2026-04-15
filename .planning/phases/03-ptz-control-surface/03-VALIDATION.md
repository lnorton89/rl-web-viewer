---
phase: 03
slug: ptz-control-surface
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/camera/reolink-ptz.test.ts tests/server/ptz-routes.test.ts -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/camera/reolink-ptz.test.ts tests/server/ptz-routes.test.ts -x`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | PTZ-01 | unit | `npx vitest run tests/camera/reolink-ptz.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | PTZ-03 | unit | `npx vitest run tests/camera/reolink-ptz.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | PTZ-01 | integration | `npx vitest run tests/server/ptz-routes.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | PTZ-02 | integration | `npx vitest run tests/server/ptz-routes.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | PTZ-01 | jsdom | `npx vitest run tests/web/ptz-controls.test.tsx -x` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | PTZ-02 | jsdom | `npx vitest run tests/web/ptz-controls.test.tsx -x` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 2 | PTZ-03 | jsdom | `npx vitest run tests/web/ptz-controls.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/camera/reolink-ptz.test.ts` - adapter/service coverage for motion commands, stop, and preset normalization
- [ ] `tests/server/ptz-routes.test.ts` - route validation, capability gating, and browser-safe payload coverage
- [ ] `tests/web/ptz-controls.test.tsx` - hold/release stop lifecycle, zoom click behavior, and preset rendering
- [ ] `tests/fixtures/reolink/get-ptz-preset.json` - sanitized preset fixture payload
- [ ] `tests/fixtures/reolink/ptz-ctrl-left.json` - sanitized representative PTZ success payload

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pan/tilt feels responsive while live view stays visible | PTZ-01 | Motion feel and camera response timing cannot be proven fully in unit tests | Start live view, hold each direction briefly, and confirm the camera movement matches the pressed control. |
| Stop-on-release and visible Stop recover from awkward pointer paths | PTZ-02 | Browser pointer edge cases plus real camera stop timing need live confirmation | Hold a direction, release normally, then repeat with pointer leaving the control or window blur if possible, and confirm motion stops promptly each time. |
| Preset list matches enabled slots and recall lands on the expected position | PTZ-03 | The real camera state determines whether presets exist and where they point | With at least one enabled preset, trigger it from the UI and confirm the camera moves to the stored position. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
