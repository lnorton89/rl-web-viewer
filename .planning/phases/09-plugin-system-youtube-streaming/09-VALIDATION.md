---
phase: 9
slug: plugin-system-youtube-streaming
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-27
---

# Phase 9 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 with node and jsdom projects |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- tests/plugins/plugin-runtime.test.ts tests/server/plugin-routes.test.ts tests/plugins/youtube-oauth.test.ts tests/plugins/youtube-live-workflow.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick command for the files touched by the task.
- **After every plan wave:** Run `npm test`.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 30 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | PLUG-01 | T-09-01 | Plugin DTOs contain no provider secrets | unit | `npm test -- tests/plugins/plugin-runtime.test.ts tests/server/plugin-routes.test.ts` | W0 | pending |
| 09-02-01 | 02 | 2 | PLUG-02 | T-09-02 | OAuth tokens remain server-only and redacted | unit/route | `npm test -- tests/plugins/youtube-oauth.test.ts tests/server/plugin-routes.test.ts` | W0 | pending |
| 09-03-01 | 03 | 3 | PLUG-03 | T-09-03 | Stream keys and RTSP credentials are redacted from process status/errors | unit | `npm test -- tests/plugins/youtube-live-workflow.test.ts tests/media/youtube-egress.test.ts` | W0 | pending |
| 09-04-01 | 04 | 4 | PLUG-04 | T-09-04 | Browser UI displays share metadata without token or ingestion details | jsdom | `npm test -- tests/web/plugin-panel.test.tsx` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/plugins/plugin-runtime.test.ts` - covers PLUG-01.
- [ ] `tests/plugins/youtube-oauth.test.ts` - covers PLUG-02.
- [ ] `tests/plugins/youtube-live-workflow.test.ts` - covers PLUG-03.
- [ ] `tests/media/youtube-egress.test.ts` - covers FFmpeg argument redaction and lifecycle.
- [ ] `tests/server/plugin-routes.test.ts` - covers browser-safe plugin API responses.
- [ ] `tests/web/plugin-panel.test.tsx` - covers PLUG-04.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real YouTube OAuth consent | PLUG-02 | Requires user Google account/project and browser consent | Configure a local OAuth client, open auth URL, complete consent, verify UI shows connected without logging tokens |
| Real YouTube streaming | PLUG-03 | Requires YouTube channel live eligibility, FFmpeg, and external network | Use a private/unlisted broadcast, start streaming, verify YouTube reports active input, then stop and verify completion |
| Share URL usefulness | PLUG-04 | Requires real broadcast ID and YouTube watch page | Copy share URL from dashboard and open in browser while broadcast is active |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency < 30s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-04-27
