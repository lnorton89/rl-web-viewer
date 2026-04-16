---
phase: 04
slug: settings-safe-configuration
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `Vitest 4.1.4` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/server/settings-routes.test.ts tests/camera/reolink-settings.test.ts tests/web/settings-panel.test.tsx -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/server/settings-routes.test.ts tests/camera/reolink-settings.test.ts tests/web/settings-panel.test.tsx -x`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CONF-02, CONF-03 | unit | `npx vitest run tests/camera/reolink-settings.test.ts --testNamePattern "bootstrap|strategy" -x` | No - Wave 0 | pending |
| 04-01-02 | 01 | 1 | CONF-01, CONF-03, CONF-04 | unit | `npx vitest run tests/camera/reolink-settings.test.ts -x` | No - Wave 0 | pending |
| 04-02-01 | 02 | 2 | CONF-01, CONF-03, CONF-04 | integration | `npx vitest run tests/server/settings-routes.test.ts --project node -x` | No - Wave 0 | pending |
| 04-02-02 | 02 | 2 | CONF-01, CONF-03, CONF-04 | build + integration | `npm run build:server && npx vitest run tests/server/settings-routes.test.ts --project node -x` | No - Wave 0 | pending |
| 04-03-01 | 03 | 3 | CONF-01, CONF-02, CONF-03, CONF-04 | jsdom | `npx vitest run tests/web/settings-panel.test.tsx -x` | No - Wave 0 | pending |
| 04-03-02 | 03 | 3 | CONF-01, CONF-02, CONF-03, CONF-04 | production build + jsdom | `npm run build:web && npx vitest run tests/web/settings-panel.test.tsx tests/web/live-view-controls.test.tsx -x` | No - Wave 0 | pending |

*Status: pending · green · red · flaky*

## Wave 0 Requirements

- [ ] `tests/server/settings-routes.test.ts` - route payload validation, capability gating, and browser-safe bootstrap coverage
- [ ] `tests/camera/reolink-settings.test.ts` - command pairing, full-object merge rules, `rspCode` mapping, and debug capture behavior
- [ ] `tests/web/settings-panel.test.tsx` - section draft, review/apply, verified before/after summaries, and inline field-error coverage
- [ ] `tests/fixtures/reolink/get-time.json` - fixture-backed read path for time settings
- [ ] `tests/fixtures/reolink/get-ntp.json` - fixture-backed read path for NTP settings
- [ ] `tests/fixtures/reolink/get-image.json` - fixture-backed read path for image settings
- [ ] `tests/fixtures/reolink/get-osd.json` - fixture-backed read path for OSD settings
- [ ] `tests/fixtures/reolink/get-isp.json` - fixture-backed read path for read-only ISP settings
- [ ] `tests/fixtures/reolink/get-enc.json` - fixture-backed read path for stream settings
- [ ] `tests/fixtures/reolink/set-*.json` or inline mocks - setter response fixtures for success and failure mapping

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Safe editable sections show current values and correct read-only versus editable boundaries on the real camera | CONF-01, CONF-02 | Capability and live setting values depend on the connected RLC-423S firmware state | Open the dashboard against the live camera, confirm Time & Sync, Display Overlay, Basic Image Tuning, and Stream Profile render as editable, and confirm Camera Tuning renders inspect-only. |
| Successful settings writes are re-read and verified against live camera state | CONF-04 | The real firmware must confirm the new values, especially for mixed patch versus full-object setter behavior | Change one safe field in each editable section, apply the section, then confirm the UI shows a verified before/after summary that matches a fresh camera-backed read. |
| Camera reject paths remain understandable during invalid or conflicting writes | CONF-03 | Some failure semantics only surface against the real firmware and live state | Attempt an invalid setting or a payload known to the live camera to reject, then confirm the UI shows inline field errors where applicable or a section-level rejection message with actionable guidance. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
