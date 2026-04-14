---
phase: 1
slug: camera-connectivity-capability-map
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (or Node test runner if kept dependency-light) |
| **Config file** | none - Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | CONN-01 | unit | `npx vitest run session-config` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | CONN-02 | unit | `npx vitest run dev-info` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | CONN-04 | unit | `npx vitest run auth-retry` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | COMP-01 | unit | `npx vitest run capability-snapshot` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | COMP-02 | unit | `npx vitest run capability-normalization` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 2 | COMP-03 | unit | `npx vitest run debug-capture` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` - add test script and dev dependencies for the chosen test runner
- [ ] `vitest.config.*` or equivalent - baseline test configuration
- [ ] `test/fixtures/reolink/` - stored Login, GetDevInfo, GetAbility, and GetNetPort fixture payloads
- [ ] `test/helpers/` - reusable camera-response fixture loaders and redaction assertions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real camera responds to login and discovery probes on the LAN | CONN-01, CONN-02 | Requires the physical RLC-423S and network access | Run the app or probe command against `http://192.168.1.140/`, verify login succeeds and identity matches the known firmware |
| Debug capture avoids leaking sensitive fields | COMP-03 | Best confirmed by inspecting emitted artifacts | Enable debug mode, trigger a failing/unsupported request, inspect the written artifact for redacted password/token handling |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
