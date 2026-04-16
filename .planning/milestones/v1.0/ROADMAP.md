# v1.0 Milestone Roadmap

## Phase Summary

| # | Phase | Goal | Plans | Status |
|---|-------|------|-------|--------|
| 1 | Camera Connectivity & Capability Map | 3 | ✓ complete |
| 2 | Browser Live View Pipeline | 4 | ✓ complete |
| 3 | PTZ Control Surface | 3 | ✓ complete |
| 4 | Settings & Safe Configuration | 3 | ✓ complete |
| 5 | Hardening & Modular Expansion Base | 3 | ✓ complete |
| 6 | Phase 1 Verification & Capability Wiring | 1 | ✓ complete (gap closure) |
| 7 | Real-Camera E2E Hardening | 1 | ✓ complete (gap closure) |

## Phase Details

### Phase 1: Camera Connectivity & Capability Map

**Goal:** Establish reliable local authentication, device discovery, and a firmware-aware adapter boundary for the RLC-423S before deeper UI work begins.

**Plans:**
- [x] 01-01-PLAN.md - Bootstrap login, session, and camera discovery
- [x] 01-02-PLAN.md - Implement device identity and capability normalization
- [x] 01-03-PLAN.md - Add capability adapter and session recovery

**Success:** 5 criteria verified

### Phase 2: Browser Live View Pipeline

**Goal:** Replace the Flash-era viewing path with a browser-safe live-view experience backed by the local app.

**Plans:**
- [x] 02-01-PLAN.md - Bootstrap the live-view workspace, shared contracts, and mode matrix
- [x] 02-02-PLAN.md - Implement the MediaMTX runtime, live-view service, and Fastify routes
- [x] 02-03-PLAN.md - Implement the viewer transport adapters, API client, and state machine
- [x] 02-04-PLAN.md - Build the React viewer shell, controls, and diagnostics surfaces

**Success:** 4 criteria verified

### Phase 3: PTZ Control Surface

**Goal:** Deliver dependable PTZ operations through the dashboard once the live view and capability map are proven.

**Plans:**
- [x] 03-01-PLAN.md - Define the PTZ contracts, Reolink adapter behavior, and fixture-backed camera tests
- [x] 03-02-PLAN.md - Expose browser-safe PTZ Fastify routes and mount them in the local app server
- [x] 03-03-PLAN.md - Build the attached PTZ panel, hook lifecycle, and browser interaction tests

**Success:** 4 criteria verified

### Phase 4: Settings & Safe Configuration

**Goal:** Add read/write configuration management in a way that is explicit, validated, and safe for the known firmware.

**Plans:**
- [x] 04-01-PLAN.md - Define shared settings contracts, safe setter strategies, and verified camera service coverage
- [x] 04-02-PLAN.md - Expose browser-safe settings routes and mount them on the Fastify control plane
- [x] 04-03-PLAN.md - Build the settings panel, section review UX, and browser interaction tests

**Success:** 4 criteria verified

### Phase 5: Hardening & Modular Expansion Base

**Goal:** Reduce operational rough edges, improve observability, and leave a clean foundation for future Reolink model adapters.

**Plans:**
- [x] 05-01-PLAN.md - Define the explicit camera adapter contract, registry, and RLC-423S implementation seam
- [x] 05-02-PLAN.md - Centralize backend diagnostics and harden live-view/runtime repeatability
- [x] 05-03-PLAN.md - Polish repeated-use browser flows and complete a real-camera hardening pass

**Success:** 4 criteria verified

### Phase 6: Phase 1 Verification & Capability Wiring (Gap Closure)

**Goal:** Close v1.0 audit gaps — verify Phase 1 requirements and confirm capability snapshot wiring.

**Plans:**
- [x] 06-01-PLAN.md - Verify Phase 1 requirements and confirm capability snapshot wiring

**Verification:** All 7 Phase 1 requirements verified, cross-phase wiring confirmed

### Phase 7: Real-Camera E2E Hardening (Gap Closure)

**Goal:** Complete the real-camera verification pass for v1.0 milestone completeness.

**Plans:**
- [x] 07-01-PLAN.md - Real-camera E2E verification pass

**E2E Results:**
- Viewer Connect ✅
- Retry Live View ✅
- PTZ Hold/Release ✅
- Settings Apply ✅
- Diagnostics Safety ✅

---

*Archived: 2026-04-16*