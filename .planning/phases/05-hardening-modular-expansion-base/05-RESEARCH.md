# Phase 05: Hardening & Modular Expansion Base - Research

**Researched:** 2026-04-15
**Domain:** Node.js/Fastify hardening, browser control-plane reliability, structured observability, adapter modularization
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Hardening Scope
- **D-01:** Phase 5 should focus on repeated-use reliability of the existing v1 flows rather than introducing net-new camera features.
- **D-02:** The hardening target should cover connect, live view, PTZ, and settings as one continuous local dashboard experience instead of treating each area in isolation.

### Adapter Expansion Base
- **D-03:** The codebase should end Phase 5 with an explicit documented adapter contract for future Reolink models.
- **D-04:** Firmware- or model-specific quirks should stay behind adapter-owned modules and fixtures instead of leaking further into routes, UI hooks, or shared browser contracts.

### Diagnostics and Observability
- **D-05:** Diagnostics should stay secondary in the main UI, but logging and debug artifacts should become more actionable for future unsupported models and firmware gaps.
- **D-06:** The app should favor structured, sanitized diagnostics and operator-readable failure states over raw protocol dumps in the main flow.

### UX and Operational Polish
- **D-07:** Phase 5 should prioritize low-friction polish that improves trust during normal local use, especially around refresh, retry, verified state, and repeated interaction loops.
- **D-08:** UX polish should preserve the existing viewer-first layout rather than reshaping the dashboard architecture late in v1.

### Verification and Readiness
- **D-09:** Phase 5 should strengthen repeatability tests and end-to-end confidence around the existing feature set before opening follow-on work for additional models.
- **D-10:** The final output should leave clear extension points and documentation so a future phase can add another model adapter without restructuring the foundations.

### Claude's Discretion
- The exact split between backend hardening, browser polish, and documentation work inside Phase 5
- The specific adapter-contract format and where it lives
- Which reliability gaps should be addressed through tests only versus runtime behavior changes
- How much additional diagnostics surface belongs in the UI versus files, summaries, or backend responses

### Deferred Ideas (OUT OF SCOPE)
- Multi-camera management and additional model implementations remain future work even though this phase should prepare for them.
- Playback, recordings, alarms, patrol editing, and remote access stay out of scope.
- A large visual redesign is deferred; Phase 5 should polish and stabilize the current dashboard language instead.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- Node.js is the core application environment.
- v1 stays LAN-only.
- Initial hardware target remains the RLC-423S before broader expansion.
- No Flash or browser plugins are acceptable.
- Camera-specific behavior must stay behind model/capability-aware adapters.
- Configuration writes must remain conservative and read/validate/write/verify based.
- Use GSD workflow artifacts; research/planning must not recommend bypassing them.

## Summary

Phase 5 should be planned as a hardening pass over the existing architecture, not as a feature phase. The repo already has the right coarse layers: camera session/discovery/services in `src/camera/`, media relay in `src/media/`, browser-safe Fastify routes in `src/server/routes/`, React hooks/components in `web/src/`, and fixture-backed Vitest coverage in `tests/`. The missing piece is not another subsystem; it is consistency across these seams.

The two highest-value planning targets are: first, make the single-model Reolink code conform to an explicit adapter contract so future models plug into a stable surface; second, centralize structured sanitized logging and failure classification so repeated-use bugs can be diagnosed without leaking credentials. The current code already sanitizes debug artifacts well and keeps browser payloads safe, but logging is still fragmented and only `ReolinkSession` uses Pino directly.

**Primary recommendation:** Plan Phase 5 around one adapter contract, one observability path, and one repeated-use verification matrix spanning connect, live view, PTZ, and settings.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 22.18.0 available locally | Runtime for server, CLI, and tooling | Already the project base and fully available in the environment |
| TypeScript | 6.0.2 | Shared contracts across camera/server/web layers | Repo is already contract-first and typed end to end |
| Fastify | 5.8.5 | Local control plane and static hosting | Encapsulation, route plugins, request logging, and low overhead fit this app well |
| Zod | 4.3.6 | Runtime validation of camera payloads and browser inputs | Essential because firmware responses vary and negative cases must stay typed |
| React | 19.2.5 | Browser dashboard shell and stateful control surfaces | Existing UI already uses hook-driven boundaries that should be preserved |
| Vite | 8.0.8 | Browser build and backend integration manifest | Matches current web workspace and Fastify-hosted frontend |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.4 | Node and jsdom test runner | Use for all Phase 5 reliability and regression coverage |
| Pino | 10.3.1 | Structured JSON logging | Use for request-scoped, service-scoped, and artifact-linked logs |
| `@fastify/static` | 9.1.0 | Serve built web assets | Keep current Fastify-hosted UI pattern |
| MediaMTX | pinned `v1.17.1` in repo code | RTSP-to-browser relay via WebRTC/HLS | Keep as the live-view relay; do not replace it in Phase 5 |
| hls.js | 1.6.16 | Browser HLS playback fallback | Keep for fallback playback only |
| tsx | 4.21.0 | Local TS execution for `dev` and `probe` | Keep current dev/probe workflow |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fastify route plugins | Flat route wiring in `create-server.ts` | Faster short-term edits, worse encapsulation and observability growth |
| Adapter contract | Keep exporting `createReolink*` functions directly | Lowest immediate effort, but future model support keeps leaking Reolink assumptions upward |
| Pino + Fastify logger | Hand-built `console` logging and JSON files | Easier to start, much worse correlation and redaction discipline |
| Vitest targeted repeatability suites | Manual-only soak testing | Necessary eventually, but insufficient for planning-grade confidence |

**Installation:**
```bash
npm install
```

**Version verification:** Verified from npm registry on 2026-04-15 with `npm view`. Current registry versions matched repo selections for `fastify`, `@fastify/static`, `pino`, `react`, `vite`, `vitest`, `zod`, `hls.js`, and `typescript`. MediaMTX is pinned in repo code to `v1.17.1`; treat that as an intentional runtime pin, not as latest-verified.

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── camera/
│   ├── adapters/              # contract + per-model implementations
│   ├── session/               # auth + request execution
│   ├── services/              # PTZ/settings/live bootstrap orchestration
│   └── diagnostics/           # classification helpers for camera failures
├── server/
│   ├── plugins/               # Fastify logging/diagnostics/shared decorators
│   └── routes/                # browser-safe route plugins only
├── media/                     # MediaMTX runtime + live-view orchestration
└── types/                     # shared contracts only, no model-specific quirks
```

### Pattern 1: Explicit Adapter Contract
**What:** Introduce a top-level camera adapter interface that owns discovery, capability snapshot mapping, live stream resolution, PTZ bootstrap/ops, settings bootstrap/writes, and firmware-specific diagnostics classification.
**When to use:** Any camera/model-specific behavior, even if only RLC-423S implements it in Phase 5.
**Example:**
```typescript
// Inference from current repo seams:
// src/camera/reolink-discovery.ts, reolink-live-streams.ts, reolink-ptz.ts, reolink-settings.ts
export interface CameraAdapter {
  readonly adapterId: string;
  matches(identity: CameraIdentity): boolean;
  probe(session: ReolinkRequestExecutor): Promise<ProbeResult>;
  buildCapabilitySnapshot(input: ProbeResult): CapabilitySnapshot;
  resolveLiveStreams(config: CameraConfig, snapshot: CapabilitySnapshot): ResolvedLiveStreams;
  createPtzService(deps: AdapterDeps): PtzService;
  createSettingsService(deps: AdapterDeps): SettingsService;
  classifyError(error: unknown, scope: "probe" | "live" | "ptz" | "settings"): string;
}
```

### Pattern 2: Fastify Plugin Boundaries for Hardening
**What:** Move shared observability and diagnostics wiring into Fastify plugins/decorators, then keep route files focused on input validation, capability gating, and response shaping.
**When to use:** Any cross-cutting concern that currently repeats in routes or services.
**Example:**
```typescript
// Source: https://fastify.dev/docs/latest/Reference/Plugins/
export default async function diagnosticsPlugin(fastify: FastifyInstance) {
  fastify.decorate("diagnostics", createDiagnosticsService());
}
```

### Pattern 3: Hook-Owned Browser Lifecycles
**What:** Keep external-system effects inside focused hooks and keep `App.tsx` compositional.
**When to use:** Live-view retries, PTZ pointer lifecycle, settings review/apply state, and future adapter-aware browser bootstraps.
**Example:**
```typescript
// Source pattern: https://react.dev/learn/reusing-logic-with-custom-hooks
// Existing repo examples: web/src/hooks/use-live-view.ts, use-ptz-controls.ts, use-settings.ts
function useAdapterDiagnostics() {
  // own polling/effects here, return view-ready state
}
```

### Anti-Patterns to Avoid
- **Reolink leakage into shared contracts:** Do not let raw CGI command names or model checks escape adapter-owned modules.
- **Observability by file write alone:** Debug artifacts are useful, but Phase 5 also needs structured runtime logs and correlation IDs.
- **Hardening in `App.tsx`:** Do not move retry or diagnostics logic upward into the shell component.
- **Scope creep via “small” features:** Multi-camera, new model support, playback, and alarm work remain out of scope.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request correlation | Custom ad hoc IDs in each route | Fastify request logging + request IDs | Standardized per-request context already exists in Fastify |
| Log redaction | String replace over serialized JSON | Pino/Fastify redaction + serializers | Safer and lower-risk for auth-bearing payloads |
| Route validation | Manual object checks | Zod schemas at boundaries | Firmware and browser payloads are already schema-driven |
| Browser transport retries | Component-local timers in multiple components | Keep effectful retry state in hooks | Existing `useLiveView` pattern is the right place |
| Media relay | Custom FFmpeg wrapper or browser RTSP hacks | Keep MediaMTX relay | MediaMTX already bridges RTSP to browser-safe protocols |
| Soak verification | One giant e2e suite | Targeted Vitest route/hook/service loops + manual camera pass | Faster, more stable, and aligned with current test stack |

**Key insight:** Phase 5 should remove custom glue, not add more of it. The repo already has solid primitives; the planning job is to connect them consistently.

## Common Pitfalls

### Pitfall 1: Adapter Contract That Is Too Narrow
**What goes wrong:** A contract covers only discovery or capability checks, while PTZ/settings/live-view still call Reolink-specific functions directly.
**Why it happens:** It is tempting to create a “contract” document without moving the actual ownership boundary.
**How to avoid:** The contract must own all model-specific seams already visible in `src/camera/`.
**Warning signs:** Routes or hooks still import `createReolink*` or `resolveReolink*` directly after Phase 5.

### Pitfall 2: Logs Without Correlation
**What goes wrong:** Failures are still diagnosable only by reading separate debug JSON files.
**Why it happens:** Artifact capture exists already, so planners may overestimate current observability.
**How to avoid:** Add request-scoped/service-scoped logs that include operation, adapter, camera host, and artifact path when applicable.
**Warning signs:** A repeated-use failure requires reproducing under `--debug` to know which operation failed.

### Pitfall 3: Browser-Safe Payload Discipline Regresses
**What goes wrong:** Hardening adds richer diagnostics that accidentally expose credentials, tokens, RTSP URLs, or camera endpoints.
**Why it happens:** More diagnostics often means more payload surface.
**How to avoid:** Keep existing browser-safe assertions and expand them alongside new diagnostics fields.
**Warning signs:** New tests do not assert payload sanitization on `/api/live-view`, `/api/ptz`, and `/api/settings`.

### Pitfall 4: “Reliability” Reduced to Retries
**What goes wrong:** The plan adds more retry buttons or timers but does not improve stale-state handling, verified refresh, or error classification.
**Why it happens:** Retries are visible; state coherence is harder.
**How to avoid:** Define reliability as repeated interaction loops ending in verified state, not just automatic retry.
**Warning signs:** Phase tasks mention retry counts but not refresh, verified summaries, reconnect status, or post-error recovery.

### Pitfall 5: Overly Broad Test Scope
**What goes wrong:** Planning collapses all hardening into one end-to-end soak plan.
**Why it happens:** Cross-cutting work feels like it needs broad coverage.
**How to avoid:** Keep service, route, and browser repeatability tests separate, then add one manual camera pass for the full loop.
**Warning signs:** Test tasks cannot finish in under 30 seconds locally.

## Code Examples

Verified patterns from official sources and current repo:

### Fastify Plugin Encapsulation
```typescript
// Source: https://fastify.dev/docs/latest/Reference/Plugins/
export default async function adapterRoutes(fastify: FastifyInstance) {
  fastify.get("/api/health", async () => ({ ok: true }));
}
```

### Pino Child Logger for Operation Context
```typescript
// Source: https://github.com/pinojs/pino
const logger = pino();
const child = logger.child({ adapterId: "reolink-rlc-423s", scope: "ptz" });
child.info("starting PTZ operation");
```

### Vitest Multi-Project Pattern
```typescript
// Source: https://vitest.dev/guide/projects
export default defineConfig({
  test: {
    projects: [
      defineProject({ test: { name: "node", environment: "node" } }),
      defineProject({ test: { name: "web", environment: "jsdom" } }),
    ],
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vitest `workspace` naming | Vitest `projects` config | Deprecated since 3.2 | Keep current `projects` layout; do not plan new workspace syntax |
| UI effects scattered in components | Custom hooks own effectful logic | Current React guidance | Preserve `useLiveView` / `usePtzControls` / `useSettings` style |
| Browser consuming raw media endpoints | Browser uses server-owned playback URLs and relay paths | Already adopted in Phase 2 | Future adapters must resolve media internally, not in the browser |
| Raw log capture or console logs | Structured request/service logging with redaction | Current Fastify/Pino guidance | Phase 5 should centralize this, not invent a parallel diagnostics system |

**Deprecated/outdated:**
- Vitest `workspace` terminology for new config: use `projects`.
- Direct browser RTSP assumptions: keep WebRTC/HLS/snapshot through MediaMTX and server-owned URLs.

## Open Questions

1. **Should the adapter contract be one interface or split interfaces?**
   - What we know: current seams naturally cluster into discovery, live view, PTZ, and settings.
   - What's unclear: whether future models will need partial capability modules or one adapter object.
   - Recommendation: plan one top-level adapter interface with optional capability methods; avoid four unrelated registries.

2. **How much diagnostics belongs in the UI?**
   - What we know: Phase context requires diagnostics to stay secondary.
   - What's unclear: whether new operator-visible diagnostics should be panel-only or inline status summaries.
   - Recommendation: keep the main UI to short failure summaries plus artifact/log references; deeper detail should stay collapsed or file-based.

3. **Will manual repeated-use verification run against the real camera during Phase 5?**
   - What we know: fixture-backed tests are strong, but full confidence for repeated local use needs a real camera pass.
   - What's unclear: whether the hardware will be available during execution.
   - Recommendation: plan automated repeatability suites regardless, plus one explicit manual verification task if the camera is reachable.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | App runtime, build, tests | ✓ | 22.18.0 | — |
| npm | Package scripts | ✓ | 10.9.3 | — |
| Vitest | Validation architecture | ✓ | 4.1.4 | — |
| MediaMTX binary | Live-view relay runtime | ✗ system-wide | — | Repo auto-downloads pinned Windows binary via `ensureMediaMtxRuntime()` |
| PowerShell `Expand-Archive` | MediaMTX bootstrap on Windows | ✓ inferred from environment | PowerShell | — |
| Physical RLC-423S on LAN | Full repeated-use manual verification | not probed | — | Fixture-backed automated tests only |

**Missing dependencies with no fallback:**
- None for planning and code/test work.

**Missing dependencies with fallback:**
- MediaMTX is not installed globally, but the repo already bootstraps a pinned Windows runtime on demand.
- Real-camera validation may not be available in-session; use fixture and browser tests until manual verification is possible.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/server/live-view-routes.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PH5-SC1 | Adapter contract and extension seams are explicit and stable | unit | `npx vitest run tests/camera` | ❌ Wave 0 |
| PH5-SC2 | Connect/view/PTZ/settings survive repeated-use loops | unit/integration | `npx vitest run tests/server tests/web` | ◐ strengthen existing |
| PH5-SC3 | Diagnostics are structured, sanitized, and actionable | unit | `npx vitest run tests/debug-capture.test.ts tests/server` | ◐ strengthen existing |
| PH5-SC4 | Foundations support future adapter work without restructuring | unit/doc | `npx vitest run tests/camera tests/media` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted `npx vitest run ...`
- **Per wave merge:** `npm test`
- **Phase gate:** full suite green plus one manual repeated-use pass if camera is available

### Wave 0 Gaps
- [ ] `tests/camera/adapter-contract.test.ts` — locks the new adapter interface and one RLC-423S implementation against it
- [ ] `tests/server/diagnostics-logging.test.ts` — verifies request correlation, sanitized log fields, and artifact linkage
- [ ] `tests/web/repeated-use-flows.test.tsx` — exercises retry/reconnect/reapply loops across viewer/PTZ/settings surfaces
- [ ] `tests/media/live-view-repeatability.test.ts` — covers relay startup/restart/failure classification loops

## Sources

### Primary (HIGH confidence)
- npm registry via `npm view` - current versions and publish timestamps for `fastify`, `@fastify/static`, `pino`, `react`, `vite`, `vitest`, `zod`, `hls.js`, `typescript`, `tsx`
- Fastify Plugins - https://fastify.dev/docs/latest/Reference/Plugins/
- Fastify Logging - https://fastify.dev/docs/latest/Reference/Logging/
- Vitest Test Projects - https://vitest.dev/guide/projects
- Vite Backend Integration - https://vite.dev/guide/backend-integration.html
- React Custom Hooks guidance - https://react.dev/learn/reusing-logic-with-custom-hooks
- MediaMTX read features - https://mediamtx.org/docs/features/read
- MediaMTX repository and releases - https://github.com/bluenviron/mediamtx and https://github.com/bluenviron/mediamtx/releases
- Pino official repository docs - https://github.com/pinojs/pino

### Secondary (MEDIUM confidence)
- Current repo architecture and tests in `src/`, `web/src/`, and `tests/`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - repo stack matches current registry versions and official docs
- Architecture: HIGH - recommendations are grounded in current repo seams plus Fastify/React guidance
- Pitfalls: HIGH - directly observed from current implementation gaps and framework constraints

**Research date:** 2026-04-15
**Valid until:** 2026-05-15
