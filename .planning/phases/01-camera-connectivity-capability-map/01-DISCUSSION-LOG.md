# Phase 1: Camera Connectivity & Capability Map - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 01-Camera Connectivity & Capability Map
**Areas discussed:** Connection setup, Credential handling, Capability discovery, Debug capture

---

## Connection Setup

| Option | Description | Selected |
|--------|-------------|----------|
| First-run local config file | Camera IP, username, password, and room for future model metadata | ✓ |
| Environment variables only | Runtime-configured values without local project config | |
| Hardcoded dev values | Fastest temporary path while probing protocol behavior | |

**User's choice:** Go with the recommended option.
**Notes:** The user accepted the recommended defaults for all Phase 1 gray areas.

---

## Credential Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Persist locally in a simple config file | Best fit for single-user LAN-first v1 speed | ✓ |
| Prompt every run | Never save credentials locally | |
| Save locally with encryption immediately | Stronger secrecy in Phase 1 at the cost of more setup | |

**User's choice:** Go with the recommended option.
**Notes:** This keeps a pragmatic v1 path while leaving hardening for later phases.

---

## Capability Discovery

| Option | Description | Selected |
|--------|-------------|----------|
| Probe on connect/startup and save a capability snapshot | Best fit for firmware-aware behavior on the real camera | ✓ |
| Start from fixed RLC-423S profile with light validation | Faster but more assumption-heavy | |
| Fixed profile only | No probing in Phase 1 | |

**User's choice:** Go with the recommended option.
**Notes:** The user is comfortable grounding Phase 1 in observed firmware behavior.

---

## Debug Capture

| Option | Description | Selected |
|--------|-------------|----------|
| Console logs only | Minimal artifact footprint | |
| Opt-in raw request/response capture to disk | Best support for troubleshooting unsupported behavior | ✓ |
| Always-on verbose logs to disk | Maximum detail but noisy by default | |

**User's choice:** Go with the recommended option.
**Notes:** Debug capture should help future troubleshooting without being enabled all the time.

## the agent's Discretion

- Config file serialization format and storage path
- Capability snapshot schema
- Retry/backoff details
- Debug artifact naming and retention

## Deferred Ideas

None.
