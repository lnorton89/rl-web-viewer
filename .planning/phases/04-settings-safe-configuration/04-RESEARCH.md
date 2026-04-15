# Phase 4: Settings & Safe Configuration - Research

**Researched:** 2026-04-15
**Domain:** Reolink configuration read/write on the existing Fastify + React control plane
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** The editable v1 subset should focus on image/display settings, stream settings, and time/NTP settings.
- **D-02:** Network, storage, and alarm-oriented settings should stay out of the editable Phase 4 scope even if some of them are readable.
- **D-03:** Settings edits should be staged at the section level rather than saved field-by-field immediately.
- **D-04:** Each editable section should present an explicit Review and Apply step before the app sends writes to the camera.
- **D-05:** After a successful write, the app should perform a fresh re-read from the camera rather than trusting local optimistic state.
- **D-06:** The UI should show a compact before/after summary and mark the section as verified once the re-read confirms the new values.
- **D-07:** The app should show inline field errors when it can map validation failures cleanly to specific inputs.
- **D-08:** Broader rejections should still surface section-level camera or API feedback rather than collapsing into a generic error message.
- **D-09:** Phase 4 should expose a wider read-only settings view where it is safe and useful, even when those settings are not yet editable.
- **D-10:** Only the safest confirmed subset should be editable in Phase 4; readable-only categories must stay clearly inspect-only.

### Claude's Discretion
- Exact settings categories and field list inside the approved v1 subset
- The shape and visual treatment of the section-level review step
- Whether verified before/after output is shown inline, in a compact callout, or as a small diff summary
- The exact boundary between read-only informational sections and hidden unsupported areas

### Deferred Ideas (OUT OF SCOPE)
- Network reconfiguration remains out of scope for this phase because it carries a higher risk of disconnecting the local control path.
- Storage, alarm, and broader system-management categories can stay inspect-only or deferred until the safe write subset is proven.
- Broad "edit everything the API exposes" behavior is intentionally deferred in favor of a smaller verified subset.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONF-01 | User can inspect current camera settings exposed by the app for the connected RLC-423S. | Use a capability-gated read bootstrap backed by `GetOsd`, `GetImage`, `GetEnc`, `GetTime`, `GetNtp`, and read-only `GetIsp`. |
| CONF-02 | User can edit a safe v1 subset of camera settings from the dashboard. | Limit edits to OSD/display, basic image tuning, sub-stream-focused stream settings, and time/NTP formatting/sync fields. |
| CONF-03 | User can submit a settings change and see exact validation or API failure feedback if the camera rejects it. | Use route-layer Zod validation, setter-specific merge rules, and `rspCode` mapping (`-4`, `-6`, `-9`) into field and section errors. |
| CONF-04 | User can refresh settings after a write and confirm the camera reports the updated values. | Treat re-read verification as mandatory after every successful setter call and render a compact before/after verified summary per section. |
</phase_requirements>

## Summary

Phase 4 should extend the existing control-plane shape, not introduce a new subsystem. The repo already has the right primitives: Fastify routes with route-layer Zod parsing, a token-authenticated `ReolinkSession`, persisted capability snapshots for gating, sanitized debug artifact support, and a React dashboard shell that already stages secondary control surfaces beside the viewer. The standard Phase 4 architecture is: local route -> settings service -> capability-aware Reolink adapter -> camera re-read verification -> browser-safe normalized response.

The most important firmware-specific finding is that the exact target camera was reachable during research and the live probe succeeded against firmware `v2.0.0.1055_17110905_v1.0.0.30`. On this camera, `GetTime`, `GetNtp`, `GetImage`, `GetOsd`, `GetIsp`, and `GetEnc` all succeed. No-op writes for `SetOsd`, `SetImage`, `SetNtp`, `SetEnc`, and `SetTime` all returned `rspCode: 200`, and re-reads verified the results. Setter behavior is not uniform, though: `SetEnc` and `SetImage` reject partial payloads with `rspCode: -4`, while `SetOsd`, `SetNtp`, and `SetTime` accepted narrower payloads on this firmware. Plan the phase around that difference.

The safest editable v1 subset is: OSD/display (`GetOsd`/`SetOsd`), basic image tuning (`GetImage`/`SetImage`), NTP/time formatting (`GetNtp`/`SetNtp`, `GetTime`/`SetTime`), and stream settings through `GetEnc`/`SetEnc` with a sub-stream-first UI but full-object write merging. `GetIsp` is useful and supported for inspection, but it should stay read-only in Phase 4 because the live firmware returns a narrower shape than the API guide documents.

**Primary recommendation:** Build a settings service with a per-section setter matrix: patch-friendly sections (`osd`, `ntp`, `time`) can send narrowed payloads, while full-object sections (`image`, `enc`) must read current state, merge the staged edits into the full camera object, write, then re-read and verify.

## Project Constraints (from CLAUDE.md)

- Node.js is the primary application environment.
- v1 is LAN-only and single-user.
- The first supported device is the RLC-423S on firmware `v2.0.0.1055_17110905_v1.0.0.30`.
- No Flash or browser-plugin dependencies are acceptable.
- Camera-specific logic should live behind capability-aware adapters.
- Configuration writes should use read/validate/write/verify flows.
- Stay inside the GSD workflow rather than doing ad hoc implementation outside planning/execution flow.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fastify` | `5.8.5` | Local browser-safe API routes | Already used by the repo; fits current route registration and inject-based tests. |
| `zod` | `4.3.6` | Request validation and normalized camera payload validation | Already the repo standard for route and config parsing. |
| `react` / `react-dom` | `19.2.5` | Dashboard settings surface | Existing dashboard shell is already React-based; Phase 4 should extend it. |
| `vitest` | `4.1.4` | Node and jsdom test runner | Existing repo test infrastructure already uses split node/web projects. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@testing-library/react` | repo-installed | UI interaction tests for staged settings sections | Use for section draft/review/apply/error flows. |
| Existing `ReolinkSession` | local module | Token login, retry, request execution | Use for every settings read/write call. |
| Existing debug capture utilities | local module | Sanitized request/response artifacts for quirks | Use when the camera returns unexpected payloads or rejected writes and `debugCapture` is enabled. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending current Fastify routes | New dedicated config server layer | Unnecessary complexity; the repo already has a stable local control plane. |
| React local draft state + Zod validation | A new form library | Not standard in this repo; adds dependency and abstraction cost for a few section forms. |
| Capability-gated normalized settings service | Direct browser-to-camera CGI calls | Breaks the existing security boundary and leaks camera protocol details into the UI. |

**Installation:**
```bash
npm install
```

No new packages are required for Phase 4.

**Version verification:**
```bash
npm view fastify version
npm view zod version
npm view react version
npm view vitest version
```

Verified on 2026-04-15:
- `fastify@5.8.5` (registry modified 2026-04-14)
- `zod@4.3.6` (registry modified 2026-01-25)
- `react@19.2.5` (registry modified 2026-04-15)
- `vitest@4.1.4` (registry modified 2026-04-09)

## Architecture Patterns

### Recommended Project Structure
```text
src/
+-- camera/
|   `-- reolink-settings.ts     # Reolink GET/SET command pairing and merge rules
+-- server/
|   `-- routes/
|       `-- settings.ts         # Browser-safe settings bootstrap and apply routes
+-- types/
|   `-- settings.ts             # Normalized settings contracts shared by server + web
`-- diagnostics/
    `-- debug-capture.ts        # Reused for rejected/unknown settings payloads

web/src/
+-- components/
|   +-- SettingsPanel.tsx       # Container with read-only and editable sections
|   +-- SettingsSectionCard.tsx # Shared section shell with draft/review/apply states
|   `-- SettingsReviewCallout.tsx
+-- hooks/
|   `-- use-settings.ts         # Fetch, draft state, apply, verify
`-- lib/
    `-- settings-api.ts         # Browser-safe fetch wrapper like ptz-api.ts
```

### Safe Category / Endpoint Matrix
| Section | Read Command | Write Command | Edit in Phase 4 | Write Style | Confidence |
|--------|--------------|---------------|-----------------|-------------|------------|
| OSD / display | `GetOsd` | `SetOsd` | Yes | Patch-friendly on live firmware | HIGH |
| Basic image tuning | `GetImage` | `SetImage` | Yes | Full-object only on live firmware | HIGH |
| Stream settings | `GetEnc` | `SetEnc` | Yes, but sub-stream-first UI | Full-object only on live firmware | HIGH |
| Time / DST / formatting | `GetTime` | `SetTime` | Yes, but keep scope narrow | Patch-friendly for static fields on live firmware | MEDIUM-HIGH |
| NTP sync | `GetNtp` | `SetNtp` | Yes | Patch-friendly on live firmware | HIGH |
| Advanced ISP | `GetIsp` | `SetIsp` | Read-only only | Do not edit in Phase 4 | HIGH |
| Network / storage / alarms | various | various | No | Out of scope | HIGH |

### Recommended Editable Field List

Use these exact editable fields in v1:

| Section | Fields |
|--------|--------|
| OSD / display | `osdChannel.enable`, `osdChannel.name`, `osdChannel.pos`, `osdTime.enable`, `osdTime.pos` |
| Basic image | `bright`, `contrast`, `hue`, `saturation`, `sharpen` |
| Stream | `subStream.size`, `subStream.frameRate`, `subStream.bitRate`, `subStream.profile`; show `audio` as editable only if product wants it, otherwise read-only |
| Time / NTP | `Ntp.enable`, `Ntp.server`, `Ntp.port`, `Ntp.interval`, `Time.timeZone`, `Time.timeFmt`, `Time.hourFmt`, `Dst.*` |

Keep these read-only in Phase 4 even though they are available:
- `Isp.*`
- current wall-clock seconds/minutes/hours as a user-edited field
- main stream encoder controls unless product explicitly wants to risk viewer disruption in v1

### Pattern 1: Read-Normalize-Gate Before Rendering
**What:** Build one settings bootstrap payload in the backend that combines camera values, editability flags, and field metadata. The browser should not infer capability or setter behavior from raw CGI data.

**When to use:** Every settings page load and every post-write refresh.

**Example:**
```typescript
const bootstrap = await settingsService.getBootstrap();

return {
  sections: bootstrap.sections.filter((section) => section.visible),
  profile: bootstrap.profile,
};
```

Use capability snapshot gating first, then firmware-verified setter rules:
- `supportsConfigRead` gates the whole settings surface.
- per-section editability then depends on actual ability flags plus the locked Phase 4 safe subset.

### Pattern 2: Setter Matrix, Not One Generic Apply Path
**What:** Different settings commands need different write strategies.

**When to use:** In the settings service apply path.

**Example:**
```typescript
const setterStrategy = {
  osd: "patch",
  ntp: "patch",
  time: "patch",
  image: "full-object",
  enc: "full-object",
} as const;
```

Live-firmware evidence on 2026-04-15:
- `SetOsd` partial payload: success
- `SetNtp` partial payload: success
- `SetTime` partial static-field payload: success
- `SetImage` partial payload: `rspCode -4`
- `SetEnc` partial payload: `rspCode -4`

### Pattern 3: Read-Validate-Write-Verify
**What:** Every apply flow must:
1. validate browser input
2. read current camera section state if the setter is full-object
3. merge staged edits into the correct camera payload shape
4. write to the camera
5. re-read from the camera
6. compare normalized before/after values

**When to use:** Every editable section apply action.

**Example:**
```typescript
const current = await adapter.getImage();
const payload = mergeImageDraft(current, draft);
await adapter.setImage(payload);
const verified = await adapter.getImage();
return buildVerifiedResult(current, verified);
```

### Pattern 4: Section-Scoped Draft, Review, Apply
**What:** Each settings card owns its own draft state and explicit review/apply step. Do not let edits from one section leak into another.

**When to use:** Browser UI for OSD, image, stream, and time/NTP sections.

**Recommended flow:**
1. User edits fields in one section.
2. UI computes a small diff summary.
3. "Review and Apply" opens an inline review state inside that section card.
4. Apply triggers only that section's request.
5. Success replaces the diff with a verified before/after summary from the re-read.

### Recommended UI Shape

Extend the existing viewer-first shell rather than replacing it:
- add a `SettingsPanel` below the current viewer/PTZ cluster
- reuse the current surface styling pattern from `.ptz-panel`, `.mode-switcher`, and `.diagnostics-disclosure`
- keep editable cards compact and section-local
- use `role="status"` and `aria-live="polite"` for section verification/error copy, matching the PTZ status pattern

Recommended section order:
1. Time & Sync
2. Display Overlay
3. Basic Image Tuning
4. Stream Profile
5. Camera Tuning (read-only `Isp`)

### Anti-Patterns to Avoid
- **Generic "save any field" engine:** Setter behavior differs by command; a single generic merge path will create false assumptions.
- **Optimistic UI without camera re-read:** Locked decision D-05 forbids this.
- **Editing advanced `Isp` in Phase 4:** Live firmware returns a narrower object than the API guide shows.
- **Driving editability from docs alone:** The exact target firmware does not return `range`/`initial` fields even when the API guide documents them.
- **Sending browser requests directly to `api.cgi`:** Breaks the current control-plane boundary and leaks implementation detail.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera auth/session handling | A second login/token stack for settings | Existing `ReolinkSession` | Already handles token reuse and auth retry. |
| Capability gating | Ad hoc UI booleans in React | Persisted capability snapshot + normalized settings bootstrap | Keeps unsupported sections out before render. |
| Error semantics | One generic `"Save failed"` message | `rspCode` mapping + section-specific validation messages | Camera returns actionable rejection details like `-4`, `-6`, `-9`. |
| Debug payload capture | Raw console logging of CGI bodies | Existing sanitized debug artifact flow | Prevents credential/token leakage and creates reusable fixtures. |
| Full diff rendering | A complex settings history/audit system | Compact before/after summary computed from normalized section values | Enough for v1 verification without building history infrastructure. |

**Key insight:** The hard part is not form rendering. The hard part is respecting that Reolink setters are inconsistent. Phase 4 should hand-roll only the minimum merge rules needed for the confirmed safe sections, not a generic config framework.

## Common Pitfalls

### Pitfall 1: The API Guide Overstates What This Firmware Returns
**What goes wrong:** Planner assumes `Get*` commands return `initial` and `range` metadata because the API guide documents that shape.

**Why it happens:** On the live RLC-423S probe, `GetTime`, `GetNtp`, `GetImage`, `GetOsd`, `GetIsp`, and `GetEnc` all returned only `value`.

**How to avoid:** Treat docs as structural hints, but build validation from:
- explicit Zod schemas
- known doc ranges where they are stable
- live fixture captures from this firmware

**Warning signs:** UI waits for range metadata that never appears; validators depend on absent `range` objects.

### Pitfall 2: Some Setters Require Full Objects
**What goes wrong:** Planner treats every setter like a patch API and sends only changed fields.

**Why it happens:** `SetImage` and `SetEnc` rejected partial no-op payloads with `rspCode: -4` on the target camera.

**How to avoid:** Maintain a section strategy table. For full-object setters, always re-read current state, merge the staged draft into that full object, then send the full payload.

**Warning signs:** Camera returns `{ code: 1, error: { rspCode: -4, detail: "SetEnc" } }` or the equivalent for `SetImage`.

### Pitfall 3: Advanced ISP Shape Is Firmware-Specific
**What goes wrong:** Planner assumes `GetIsp` includes all documented fields like `constantFrameRate`, `cdsType`, `bd_*`, and `dayNightThreshold`.

**Why it happens:** The API guide shows a broader shape than the live firmware returns.

**How to avoid:** Keep `Isp` read-only in Phase 4 and instrument unknown responses with debug capture for later phases.

**Warning signs:** Missing fields that docs mark as required; writes that require values the read response did not return.

### Pitfall 4: Stream Changes Can Be More Disruptive Than Other Edits
**What goes wrong:** Stream edits share the same UX as OSD or NTP edits, even though encoder changes can affect viewer continuity.

**Why it happens:** `SetEnc` succeeds as a normal config write, but it is a media-facing setting, not a harmless display toggle.

**How to avoid:** Make stream edits a separate section with a stronger review step, a note that playback may momentarily reset, and a mandatory verified re-read.

**Warning signs:** User loses live view immediately after apply, even though the write succeeded.

### Pitfall 5: Time Verification Is Not Simple Equality
**What goes wrong:** Planner compares full `GetTime` payload equality before/after write.

**Why it happens:** Seconds continue to advance after the write.

**How to avoid:** Verify static fields (`timeZone`, `timeFmt`, `hourFmt`, `Dst.*`) exactly, and treat the current clock fields as time-progressing values.

**Warning signs:** False negatives on successful `SetTime` writes because only `sec` changed.

## Code Examples

Verified patterns from official docs and live firmware:

### Read Stream Configuration
```typescript
const [response] = await session.requestJson([
  { cmd: "GetEnc", action: 1, param: { channel: 0 } },
]);
```

Source:
- Reolink Camera HTTP API User Guide V8, `GetEnc`
- live RLC-423S probe on 2026-04-15

### Patch-Friendly OSD Write
```typescript
const [response] = await session.requestJson([
  {
    cmd: "SetOsd",
    param: {
      Osd: {
        channel: 0,
        osdTime: { enable: 1, pos: "Lower Left" },
      },
    },
  },
]);
```

Source:
- Reolink Camera HTTP API User Guide V8, `SetOsd`
- live partial-payload acceptance check on 2026-04-15

### Full-Object Image Write
```typescript
const current = await getImage();

await session.requestJson([
  {
    cmd: "SetImage",
    param: {
      Image: {
        ...current.Image,
        contrast: 140,
      },
    },
  },
]);
```

Source:
- Reolink Camera HTTP API User Guide V8, `SetImage`
- live partial-payload rejection (`rspCode -4`) on 2026-04-15

### Verified Apply Result
```typescript
return {
  before,
  after: verified,
  changedFields: diffSection(before, verified),
  verified: true,
};
```

Source:
- locked decisions D-05 and D-06
- existing repo pattern of backend-owned control lifecycle

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Trust generic vendor docs for payload shape | Verify against live firmware and fixtures | Required here on 2026-04-15 | Prevents building validators and write paths around fields this firmware does not return. |
| Optimistic save banners | Re-read-verified before/after summaries | Current project direction | Makes config writes trustworthy instead of merely submitted. |
| Uniform "PATCH-like" config writes | Per-command setter strategy | Current research finding | Avoids `rspCode -4` failures on `SetImage` and `SetEnc`. |

**Deprecated/outdated:**
- Treating `Get*` `action:1` as a guaranteed source of `range` metadata: outdated for this exact camera firmware.
- Treating `Isp` as a safe first-wave editable section: outdated for this phase because the live shape is narrower than the guide.

## Open Questions

1. **Should v1 expose main-stream edits or only sub-stream edits?**
   - What we know: `SetEnc` works with the full current object, and the current live values are main `3072x1728` / sub `640x360`.
   - What's unclear: whether users actually need main-stream control in Phase 4, or whether sub-stream-only is enough for safer delivery.
   - Recommendation: Plan sub-stream edits as editable and main stream as inspect-only unless product explicitly wants higher-risk main-stream editing.

2. **Should manual time-of-day editing be in scope, or only format/timezone/DST/NTP?**
   - What we know: `SetTime` accepted a narrowed payload for static fields on the live camera.
   - What's unclear: whether there is a product need for direct wall-clock edits beyond sync and display settings.
   - Recommendation: Plan editable `Ntp.*`, `Time.timeZone`, `Time.timeFmt`, `Time.hourFmt`, and `Dst.*`; keep the live current clock inspect-only in v1.

3. **How much rejected-write capture should be automated?**
   - What we know: the repo already has sanitized debug capture, but Phase 4 does not yet have settings-specific instrumentation.
   - What's unclear: whether every rejected write should create a fixture when `debugCapture` is on, or only unknown/malformed responses.
   - Recommendation: Capture malformed payloads and unexpected camera rejects when `debugCapture` is enabled; do not capture routine client-side validation errors.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | server, Vite build, test runner | Yes | `v22.18.0` | - |
| npm | dependency management, test execution | Yes | `10.9.3` | - |
| Live RLC-423S camera on LAN | live verification of Phase 4 writes | Yes | firmware `v2.0.0.1055_17110905_v1.0.0.30` | Fixture-backed tests for code work |
| HTTP reachability to camera | local settings reads/writes | Yes | `192.168.1.140:80` reachable | Fixture-backed tests only |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None. Live camera verification has a fallback for implementation work, but final high-confidence verification should still include the real camera.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest` `4.1.4` |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/server/settings-routes.test.ts tests/camera/reolink-settings.test.ts tests/web/settings-panel.test.tsx` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONF-01 | Settings bootstrap returns visible sections with read-only vs editable metadata and browser-safe normalized values | node route/service test | `npx vitest run tests/server/settings-routes.test.ts --project node` | No - Wave 0 |
| CONF-02 | Supported sections stage edits and apply only the safe v1 subset | node service + web interaction | `npx vitest run tests/camera/reolink-settings.test.ts tests/web/settings-panel.test.tsx` | No - Wave 0 |
| CONF-03 | Validation failures and camera rejects map to precise field or section errors | node route/service test | `npx vitest run tests/server/settings-routes.test.ts tests/camera/reolink-settings.test.ts --project node` | No - Wave 0 |
| CONF-04 | Successful writes trigger re-read and verified before/after summaries | node service + web interaction + live manual check | `npx vitest run tests/camera/reolink-settings.test.ts tests/web/settings-panel.test.tsx` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/server/settings-routes.test.ts tests/camera/reolink-settings.test.ts tests/web/settings-panel.test.tsx`
- **Per wave merge:** `npm test`
- **Phase gate:** full suite green plus one live-camera verification pass for `SetOsd`, `SetImage`, `SetNtp`, `SetTime`, and `SetEnc`

### Wave 0 Gaps
- [ ] `tests/server/settings-routes.test.ts` - route payload validation, capability gating, browser-safe bootstrap
- [ ] `tests/camera/reolink-settings.test.ts` - command pairing, full-object merge rules, `rspCode` mapping, debug capture behavior
- [ ] `tests/web/settings-panel.test.tsx` - section draft, review/apply, verified before/after summaries, inline field errors
- [ ] `tests/fixtures/reolink/get-time.json` - fixture-backed read path for time
- [ ] `tests/fixtures/reolink/get-ntp.json` - fixture-backed read path for NTP
- [ ] `tests/fixtures/reolink/get-image.json` - fixture-backed read path for image
- [ ] `tests/fixtures/reolink/get-osd.json` - fixture-backed read path for OSD
- [ ] `tests/fixtures/reolink/get-isp.json` - fixture-backed read path for read-only ISP
- [ ] `tests/fixtures/reolink/get-enc.json` - fixture-backed read path for stream settings
- [ ] `tests/fixtures/reolink/set-*.json` or inline mocks - setter response fixtures for success and failure mapping

## Sources

### Primary (HIGH confidence)
- Local live RLC-423S probe on 2026-04-15 against firmware `v2.0.0.1055_17110905_v1.0.0.30`
  - Verified successful reads for `GetTime`, `GetNtp`, `GetImage`, `GetOsd`, `GetIsp`, `GetEnc`
  - Verified no-op writes and re-reads for `SetOsd`, `SetImage`, `SetNtp`, `SetEnc`, `SetTime`
  - Verified partial payload behavior differences across setters
- Reolink Camera HTTP API User Guide V8 (2023-04 mirrored PDF)
  - https://api.library.loxone.com/downloader/file/1374/Camera%20HTTP%20API%20User%20Guide_v8.pdf
  - Checked `GetTime` / `SetTime`, `GetNtp` / `SetNtp`, `GetImage` / `SetImage`, `GetOsd` / `SetOsd`, `GetIsp` / `SetIsp`, `GetEnc` / `SetEnc`, and error codes
- npm registry package metadata
  - `fastify`, `zod`, `react`, `vitest` via `npm view`

### Secondary (MEDIUM confidence)
- Existing repo implementation and tests
  - `src/server/routes/live-view.ts`
  - `src/server/routes/ptz.ts`
  - `src/camera/reolink-session.ts`
  - `src/camera/reolink-ptz.ts`
  - `src/diagnostics/debug-capture.ts`
  - `web/src/App.tsx`
  - `web/src/components/PtzPanel.tsx`
  - `web/src/hooks/use-ptz-controls.ts`
  - `tests/server/ptz-routes.test.ts`
  - `tests/camera/reolink-ptz.test.ts`
  - `tests/web/ptz-controls.test.tsx`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - phase fits the current repo stack and package versions were registry-verified.
- Architecture: HIGH - recommendations are grounded in existing route/service/UI patterns plus live firmware probe results.
- Pitfalls: HIGH - the most important pitfalls were observed directly on the target firmware, not inferred.

**Research date:** 2026-04-15
**Valid until:** 2026-05-15
