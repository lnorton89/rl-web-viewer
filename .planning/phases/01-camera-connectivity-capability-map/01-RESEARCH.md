# Phase 1: Camera Connectivity & Capability Map - Research

**Researched:** 2026-04-13
**Domain:** Reolink local camera authentication, capability discovery, and Node.js adapter design
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Phase 1 should use a first-run local config file for camera connection details rather than environment variables or hardcoded values.
- The config format should be designed to leave room for future per-camera metadata and adapter-related fields, even though v1 supports only one RLC-423S.
- Credentials may be persisted locally in v1 for speed and practicality on the LAN-first single-user workflow.
- Credential persistence should be implemented in a way that keeps a clear upgrade path to stronger secret handling later, rather than baking in a throwaway format.
- The app should actively probe the camera on connect/startup and derive capability information from the real firmware instead of relying only on a static RLC-423S profile.
- The probed result should be saved as a capability snapshot for this known camera/firmware so later phases can build against observed behavior.
- Raw request/response capture should be opt-in, not always on.
- When debug capture is enabled, the app should write raw request/response snapshots to disk for unsupported or unexpected behavior so future model support and troubleshooting have concrete evidence.

### the agent's Discretion
- Exact local config file format and storage path
- The internal shape of the capability snapshot
- Log rotation and redaction details for debug artifacts
- Retry/backoff mechanics around reconnect and session renewal

### Deferred Ideas (OUT OF SCOPE)
- None - discussion stayed within phase scope.

</user_constraints>

<research_summary>
## Summary

Phase 1 should be built around the camera's real CGI behavior, not only generic Reolink references. Safe live probes against the target device confirmed that the legacy HTML UI is reachable over HTTP, direct `GetDevInfo` requests succeed, token-based `Login` works with a 3600-second lease, and `GetAbility` returns a rich capability tree that includes the exact surfaces later phases care about: `live`, `ptzCtrl`, `ptzPatrol`, `ptzPreset`, `image`, `isp`, `snap`, `rec*`, `log`, `http`, `https`, `mediaPort`, `onvif`, and `rtsp`.

The most important planning implication is that the Phase 1 adapter should support both the auth/session path and the discovery path as first-class features. This firmware already proves that capability probing is practical, and the `GetAbility` response is a better source of truth than model-name assumptions. Another key finding is that not every seemingly useful API exists as a direct command on this firmware: `GetRtspUrl` returned `not support`, so later phases should derive stream URLs from known port/protocol conventions or other supported endpoints rather than expecting a convenience command.

**Primary recommendation:** Build Phase 1 as a small, testable Node/TypeScript camera-core layer with four primitives: config loading, authenticated request execution, device/capability discovery, and opt-in debug capture.
</research_summary>

<standard_stack>
## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | current LTS | Runtime for local app and HTTP tooling | Native `fetch`, file APIs, and low-friction local tooling fit a LAN camera controller well |
| TypeScript | current stable | Typed adapter, config, and capability models | Firmware responses vary; strong typing reduces drift and parsing mistakes |
| Zod | current stable | Runtime validation of camera responses and config files | Prevents silent breakage when firmware payloads differ from assumptions |
| Built-in `fetch`/undici | current runtime | HTTP requests to `cgi-bin/api.cgi` | Sufficient for Phase 1 without adding a heavier HTTP client |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Pino | current stable | Structured logging | Use for request tracing, session events, and debug artifact references |
| Vitest or Node test runner | current stable | Fast adapter-level tests | Use once the first request/response fixtures are captured |
| `fast-xml-parser` | current stable | Only if a response path or imported config is XML-based | Use if firmware paths return XML or exported configs need parsing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in `fetch`/undici | Axios | Axios is fine, but unnecessary for the initial CGI request layer |
| Zod | Hand-written validators | Faster to start, but much worse when firmware fields drift |
| Pino | Console logging only | Console is okay for scratch work, but structured logs help Phase 1 debugging immediately |

**Installation:**
```bash
npm install zod pino
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
src/
├── config/             # local config loading and persistence
├── camera/             # session, request, capability, and model adapter code
├── diagnostics/        # opt-in debug capture, redaction, log helpers
├── fixtures/           # captured request/response examples for tests
└── types/              # validated payload shapes and capability models
```

### Pattern 1: Session Manager + Request Executor
**What:** Centralize login, token lease tracking, retry-on-auth-failure, and request dispatch in one camera session object.
**When to use:** For every request path that talks to `cgi-bin/api.cgi`.
**Example:**
```ts
type CameraCredentials = {
  baseUrl: string
  username: string
  password: string
}

type SessionToken = {
  value: string
  expiresAt: number
}

class ReolinkSession {
  private token: SessionToken | null = null

  constructor(private readonly creds: CameraCredentials) {}

  async login(): Promise<SessionToken> {
    const payload = [{ cmd: 'Login', action: 0, param: { User: { userName: this.creds.username, password: this.creds.password } } }]
    const response = await fetch(`${this.creds.baseUrl}/cgi-bin/api.cgi`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await response.json()
    const token = json?.[0]?.value?.Token
    this.token = {
      value: token.name,
      expiresAt: Date.now() + token.leaseTime * 1000,
    }
    return this.token
  }
}
```

### Pattern 2: Probe-First Capability Snapshot
**What:** Use `GetDevInfo`, `GetAbility`, and other safe reads to construct a stored capability snapshot for the exact camera/firmware.
**When to use:** Immediately after successful login and whenever the firmware identity changes.
**Example:**
```ts
type CapabilitySnapshot = {
  identity: {
    model: string
    hardVer: string
    firmVer: string
  }
  ports: {
    http?: number
    https?: number
    rtsp?: number
    onvif?: number
    media?: number
  }
  features: Record<string, { permit: number; ver: number }>
  channelFeatures: Record<string, { permit: number; ver: number }>
}
```

### Pattern 3: Debug Capture as Sidecar Artifacts
**What:** When debug mode is enabled, persist request metadata, sanitized payloads, response bodies, and failure details to disk.
**When to use:** Unsupported endpoints, schema mismatches, auth failures, and capability changes.
**Example:**
```ts
type DebugArtifact = {
  timestamp: string
  request: { command: string; url: string; tokenUsed: boolean }
  response: { status: number; body: unknown }
  note?: string
}
```

### Anti-Patterns to Avoid
- **Scattering HTTP calls across the codebase:** Later phases need one reliable request path with shared auth and logging behavior.
- **Treating model name as capability truth:** `GetAbility` already proves the firmware exposes a better source of truth.
- **Logging raw credentials/tokens into debug files:** Debugging should preserve evidence without turning artifacts into secrets leaks.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Response validation | Ad hoc `if` checks scattered across files | Schema validation with Zod | Firmware payload drift becomes explicit and testable |
| Logging format | Custom string concatenation | Structured JSON logging with Pino | Easier to correlate requests, retries, and artifact files |
| Capability truth | Manual hardcoded feature lists | Stored `GetAbility`-derived snapshot | Reduces model/firmware mismatch bugs |
| Re-auth heuristics | Per-call login hacks | Single session/token manager | Prevents inconsistent token handling and retry logic |

**Key insight:** The risky part of this phase is not raw HTTP mechanics; it is consistency under firmware variance. The implementation should optimize for observability and repeatability more than cleverness.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Mixing Query-Param Auth and Token Auth Randomly
**What goes wrong:** Some requests use `user/password`, others use `token`, and later code cannot reason clearly about session state.
**Why it happens:** Early read-only probes often work with direct credentials, so teams never unify the request path.
**How to avoid:** Standardize on one request executor that prefers token auth after login, while still allowing a tiny bootstrap path for initial device info if needed.
**Warning signs:** Requests work in isolation but fail unpredictably after token expiry or when debug logging changes the call path.

### Pitfall 2: Assuming a Convenience Endpoint Exists for Every Need
**What goes wrong:** Planning assumes commands like `GetRtspUrl` exist, but the firmware returns `not support`.
**Why it happens:** Generic docs and community libraries often normalize differences that older firmware does not.
**How to avoid:** Treat unsupported commands as normal capability findings and keep fallback derivation logic or alternate probe paths.
**Warning signs:** `code: 1`, `rspCode: -9`, or "not support" errors during seemingly standard discovery.

### Pitfall 3: Leaking Secrets Into Debug Artifacts
**What goes wrong:** Debug capture solves troubleshooting but writes admin credentials or live tokens to disk.
**Why it happens:** The quickest logging path is often "dump the whole request".
**How to avoid:** Redact passwords, consider masking tokens, and write explicit artifact schemas instead of raw transport dumps when possible.
**Warning signs:** Artifact files contain `password`, `token`, or reusable request URLs with embedded credentials.

### Pitfall 4: Coupling Later Feature UI Directly to Raw Ability Fields
**What goes wrong:** Future PTZ/settings/live-view code relies on raw permit/version keys everywhere.
**Why it happens:** `GetAbility` looks rich enough to consume directly.
**How to avoid:** Normalize raw fields into adapter-level capability flags now, even if the first snapshot is simple.
**Warning signs:** UI planning starts depending on names like `ptzTattern` or raw permit integers instead of app-level capability terms.
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from live probes and official Reolink behavior:

### Bootstrap Device Info Read
```http
GET /cgi-bin/api.cgi?cmd=GetDevInfo&user=admin&password=
```

Observed response shape:
```json
[
  {
    "cmd": "GetDevInfo",
    "code": 0,
    "value": {
      "DevInfo": {
        "model": "RLC-423S",
        "hardVer": "IPC_3816M",
        "firmVer": "v2.0.0.1055_17110905_v1.0.0.30"
      }
    }
  }
]
```

### Token Login
```json
[
  {
    "cmd": "Login",
    "action": 0,
    "param": {
      "User": {
        "userName": "admin",
        "password": ""
      }
    }
  }
]
```

Observed response shape:
```json
[
  {
    "cmd": "Login",
    "code": 0,
    "value": {
      "Token": {
        "leaseTime": 3600,
        "name": "68f0aa65c72f90a"
      }
    }
  }
]
```

### Capability Probe
```json
[
  {
    "cmd": "GetAbility",
    "action": 0,
    "param": {
      "User": {
        "userName": "admin"
      }
    }
  }
]
```

Observed findings:
```text
abilityChn[0].live
abilityChn[0].ptzCtrl
abilityChn[0].ptzPreset
abilityChn[0].ptzPatrol
abilityChn[0].image
abilityChn[0].isp
abilityChn[0].snap
rtsp
onvif
mediaPort
log
performance
exportCfg
```
</code_examples>

<sota_updates>
## State of the Art (2024-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vendor web UI as primary interface | Local custom app using documented/observed CGI endpoints | Ongoing as Flash-era UIs age out | Rebuild around APIs and media paths, not browser plugins |
| Model-name-only support assumptions | Capability probing and adapter-driven behavior | Common modern integration pattern | Better long-term support for firmware variance |
| Console-only debugging | Structured logs plus targeted artifacts | Became standard as integrations grew more stateful | Faster troubleshooting and safer iteration |

**New tools/patterns to consider:**
- Built-in Node `fetch` is strong enough for many adapter layers; no mandatory heavy HTTP client is needed.
- Schema validation at the integration boundary is more valuable than broad type declarations alone when talking to older device firmware.

**Deprecated/outdated:**
- Flash/browser-plugin assumptions from the vendor UI should not shape the app architecture.
- Treating undocumented camera APIs as stable without captured evidence is outdated and too fragile for this project.
</sota_updates>

## Validation Architecture

The best validation strategy for this phase is adapter-first and fixture-driven:

- Build request/response probes as testable functions, not inline scripts.
- Capture the known-good `Login`, `GetDevInfo`, `GetAbility`, and `GetNetPort` responses as fixtures.
- Add smoke tests for token parsing, identity extraction, capability normalization, and unsupported-command handling.
- Treat debug-artifact redaction as a verification target, not just a logging nicety.

Planning implication: Wave 0 should establish the minimal Node test harness and fixture shape before the adapter grows.

<open_questions>
## Open Questions

1. **Which additional read-only probes should define the initial capability snapshot?**
   - What we know: `GetDevInfo`, `Login`, `GetAbility`, and `GetNetPort` all work on the target camera.
   - What's unclear: Whether Phase 1 should also capture `GetPerformance`, `GetLocalLink`, `GetTime`, `GetUser`, or a narrower set.
   - Recommendation: Keep the initial snapshot small and safe, then allow later phases to extend it.

2. **What is the cleanest RTSP derivation path for this firmware?**
   - What we know: RTSP capability and port 554 are present; `GetRtspUrl` itself is not supported.
   - What's unclear: Whether there is a better supported alternative endpoint or whether conventional Reolink RTSP URL construction is enough.
   - Recommendation: Keep this as a planning note for later phases and avoid blocking Phase 1 on it.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- Live camera probe at `http://192.168.1.140/` - verified legacy UI reachability, `GetDevInfo`, `Login`, `GetAbility`, and `GetNetPort`
- `camera_stats.txt` - local reference for known camera identity and firmware
- `.planning/phases/01-camera-connectivity-capability-map/01-CONTEXT.md` - locked user decisions for this phase

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` - project-level architectural recommendation for adapter/media separation
- `.planning/research/ARCHITECTURE.md` - project-level component and build-order guidance
- `.planning/research/PITFALLS.md` - anticipated firmware/session/capability risks
- Reolink support snapshot API article - confirms `cgi-bin/api.cgi` patterns for compatible cameras
- `ReolinkCameraAPI/reolinkapigo` repository - community-supported reference for token auth, CGI command discovery, PTZ coverage, and stream-related integration behavior

### Tertiary (LOW confidence - needs validation)
- Any undocumented command assumptions beyond the directly probed endpoints
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Reolink CGI auth and discovery from Node.js
- Ecosystem: local adapter design, response validation, diagnostics
- Patterns: session manager, probe-first capability snapshot, debug sidecar artifacts
- Pitfalls: mixed auth paths, unsupported commands, secret leakage, raw ability coupling

**Confidence breakdown:**
- Standard stack: HIGH - grounded in common Node patterns and the project's actual needs
- Architecture: HIGH - aligns with both project-level research and live camera evidence
- Pitfalls: HIGH - directly supported by observed device behavior and phase context
- Code examples: HIGH - derived from live device probes and known CGI patterns

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days - stable local integration domain, but firmware behavior should still be revalidated on change)
</metadata>

---

*Phase: 01-camera-connectivity-capability-map*
*Research completed: 2026-04-13*
*Ready for planning: yes*
