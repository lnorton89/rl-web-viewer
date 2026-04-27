# Phase 9: Plugin System & YouTube Streaming - Research

**Researched:** 2026-04-27  
**Domain:** Fastify plugin runtime, YouTube OAuth 2.0, YouTube Live Streaming API, RTSP-to-RTMPS media egress  
**Confidence:** HIGH

## Summary

Phase 9 should add a server-owned plugin runtime with stable extension contracts for configuration, status, actions, and share metadata. [VERIFIED: codebase grep] The existing app already uses dependency-injected Fastify route modules, Zod validation, typed service contracts, and explicit browser-safe payload guards under `src/server/routes/*`, so the plugin system should follow that shape instead of exposing plugin internals directly to React. [VERIFIED: codebase grep]

The YouTube plugin should use Google OAuth's desktop/installed-app flow with a loopback redirect handled by the local Node server, request offline access, and keep OAuth credentials and YouTube ingestion secrets server-side only. [CITED: https://developers.google.com/youtube/v3/live/guides/auth/installed-apps] YouTube Live setup is a two-resource lifecycle: create a `liveStream`, create a `liveBroadcast`, bind them, push media to the stream ingestion URL, poll stream health until active, transition the broadcast, and later transition to complete or rely on auto-stop when configured. [CITED: https://developers.google.com/youtube/v3/live/life-of-a-broadcast]

Media egress should be implemented as a separate process-managed pipeline, likely FFmpeg reading the existing RTSP camera source or MediaMTX relay and pushing FLV over RTMPS to YouTube. [VERIFIED: codebase grep] Existing MediaMTX support is for browser-safe local playback via HLS/WebRTC and does not currently provide a YouTube egress process manager. [VERIFIED: codebase grep] FFmpeg is not installed on this machine, so the plan must include install/discovery/configuration work or a clear disabled state for the YouTube streaming action. [VERIFIED: environment probe]

**Primary recommendation:** Build a server-side plugin registry plus a first-party YouTube plugin with injected OAuth client, YouTube API client, token store, and process runner; expose only redacted status/control/share DTOs to the browser. [VERIFIED: codebase grep] [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/insert]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Plugin discovery, enable/disable, status, actions | API / Backend | Browser / Client | Fastify already owns API route registration and dependency-injected services; browser should render typed DTOs and invoke actions only. [VERIFIED: codebase grep] |
| YouTube OAuth code exchange, refresh, revoke, token storage | API / Backend | Browser / Client | Google installed-app OAuth uses a browser consent page, but token exchange and storage belong on the local Node server. [CITED: https://developers.google.com/youtube/v3/live/guides/auth/installed-apps] |
| YouTube stream/broadcast lifecycle | API / Backend | External YouTube API | `liveStreams`, `liveBroadcasts`, bind, transition, list/status, and error handling are server-to-YouTube control-plane calls. [CITED: https://developers.google.com/youtube/v3/live/docs/liveStreams/insert] [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/bind] |
| RTSP/MediaMTX/FFmpeg media push | API / Backend | Database / Storage | Node should supervise the process and keep stream keys out of UI/logs; the camera and MediaMTX remain media sources. [VERIFIED: codebase grep] |
| Shareable stream metadata UI | Browser / Client | API / Backend | UI can show title, privacy, lifecycle state, watch URL, and copy/share controls using browser-safe API responses. [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts] |

## Project Constraints (from CLAUDE.md / AGENTS.md)

- Node.js is the primary application environment. [VERIFIED: AGENTS.md]
- v1 is LAN-only and single-user. [VERIFIED: AGENTS.md]
- The first supported camera is Reolink RLC-423S on firmware `v2.0.0.1055_17110905_v1.0.0.30`. [VERIFIED: AGENTS.md]
- No Flash or browser-plugin dependencies are acceptable. [VERIFIED: AGENTS.md]
- Camera-specific logic should live behind capability-aware adapters. [VERIFIED: AGENTS.md]
- Configuration writes should use read/validate/write/verify flows. [VERIFIED: AGENTS.md]
- GSD planning artifacts should stay aligned with implementation work. [VERIFIED: CLAUDE.md]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fastify` | 5.8.5 installed | Local HTTP API and route registration | Existing server uses Fastify and route-level dependency injection. [VERIFIED: package.json] |
| `zod` | 4.3.6 installed | Runtime validation for config/action bodies and plugin manifests | Existing routes use Zod for request validation and shared type-safe contracts. [VERIFIED: package.json] |
| `googleapis` | 171.4.0 current, modified 2026-02-05 | YouTube Data API / Live Streaming API client | Official Google Node client supports OAuth2 clients and YouTube API calls. [VERIFIED: npm registry] [CITED: https://googleapis.dev/nodejs/googleapis/latest/index.html] |
| `google-auth-library` | 10.6.2 current, modified 2026-03-16 | OAuth2 client and token refresh behavior | Google client docs show `setCredentials`, `getToken`, refresh token handling, and token events. [VERIFIED: npm registry] [CITED: https://googleapis.dev/nodejs/googleapis/latest/index.html] |
| Node `child_process` | Node 22.18.0 available | FFmpeg process supervision | Existing MediaMTX runtime already uses `spawn` with `windowsHide: true`, so reuse the same process-management style. [VERIFIED: environment probe] [VERIFIED: codebase grep] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `open` | 11.0.0 current, modified 2025-11-15 | Open system browser for OAuth consent | Use only if the planner wants browser auto-open; otherwise expose the auth URL for manual launch. [VERIFIED: npm registry] |
| FFmpeg CLI | missing locally | RTSP input to RTMPS/FLV output | Required for local YouTube media push unless an alternate encoder is installed. [VERIFIED: environment probe] [CITED: https://ffmpeg.org/ffmpeg-all.html] |
| MediaMTX | v1.17.1 pinned by code, CLI missing from PATH | Existing local RTSP/HLS/WebRTC relay | Use existing pinned runtime for local relay; do not assume a global `mediamtx` command. [VERIFIED: codebase grep] [VERIFIED: environment probe] |
| React / MUI | React 19.2.5, MUI 7.0.0 installed | Plugin dashboard UI | Existing app uses React/MUI navigation and panels. [VERIFIED: package.json] [VERIFIED: codebase grep] |
| Vitest | 4.1.4 installed | Unit/integration tests | Existing test config has node and jsdom projects. [VERIFIED: package.json] [VERIFIED: vitest.config.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `googleapis` | Raw `fetch` to Google REST endpoints | Raw REST reduces dependency size but increases OAuth/error/pagination boilerplate. [CITED: https://googleapis.dev/nodejs/googleapis/latest/index.html] |
| OAuth desktop loopback | Device code flow | Device flow is for limited-input devices; this app runs on a desktop with a browser and local server. [CITED: https://developers.google.com/identity/protocols/oauth2/limited-input-device] |
| FFmpeg process runner | MediaMTX-only egress | Existing MediaMTX config is local relay/read path; FFmpeg is the standard encoder/transmuxer for RTSP-to-RTMP(S) push. [VERIFIED: codebase grep] [CITED: https://ffmpeg.org/ffmpeg-all.html] |

**Installation:**

```bash
npm install googleapis google-auth-library
npm install open
```

**Version verification:** `npm view googleapis version`, `npm view google-auth-library version`, and `npm view open version` were run on 2026-04-27. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Browser dashboard
  | GET /api/plugins, POST /api/plugins/:id/actions/*
  v
Fastify plugin routes
  | validate action body with Zod
  | assert browser-safe response
  v
Plugin runtime / registry
  | discovers first-party plugin descriptors
  | loads config via read/validate/write/verify
  | dispatches typed actions
  v
YouTube plugin
  +--> OAuth service -> Google auth endpoint -> loopback callback -> token store
  +--> YouTube Live service -> liveStreams/liveBroadcasts/bind/transition/status
  +--> Media egress service -> FFmpeg process -> YouTube RTMPS ingestion
  |
  v
Redacted status/share DTO
  | auth state, lifecycle, health, title/privacy/watch URL
  v
Browser plugin panel
```

### Recommended Project Structure

```text
src/
├── plugins/
│   ├── plugin-contract.ts          # generic manifest/config/status/action types
│   ├── plugin-runtime.ts           # registry, lifecycle, dispatch, safe DTO checks
│   └── youtube/
│       ├── youtube-plugin.ts       # descriptor + action handlers
│       ├── youtube-config.ts       # read/validate/write/verify token/config store
│       ├── youtube-oauth.ts        # auth URL, callback, refresh, revoke
│       ├── youtube-live-api.ts     # liveStreams/liveBroadcasts adapter
│       └── youtube-egress.ts       # FFmpeg process runner
src/server/routes/
└── plugins.ts                      # stable /api/plugins surface
src/types/
└── plugins.ts                      # browser-safe DTO contracts
web/src/
├── lib/plugins-api.ts              # fetch helpers
├── hooks/use-plugins.ts            # state/actions
└── components/PluginsPanel.tsx     # status, auth, stream controls, share metadata
tests/
├── plugins/
├── server/plugin-routes.test.ts
└── web/plugin-panel.test.tsx
```

### Pattern 1: Server-Owned Plugin Contract

**What:** A plugin should expose metadata, redacted status, optional configuration schema, and action handlers through a typed server interface. [VERIFIED: codebase grep]  
**When to use:** Use for all plugins, including YouTube, so the React UI never imports plugin implementation code or secret-bearing types. [VERIFIED: codebase grep]

```typescript
// Source: local Fastify route/service dependency-injection pattern in src/server/routes/*.ts
export type PluginRuntime = {
  list(): Promise<PluginSummary[]>;
  getStatus(pluginId: string): Promise<PluginStatus>;
  invoke(pluginId: string, actionId: string, body: unknown): Promise<PluginActionResult>;
};
```

### Pattern 2: OAuth Desktop Loopback Flow

**What:** Generate an auth URL with YouTube scopes and offline access, send the user to the system browser, receive the callback on a loopback route, exchange the code, and store tokens server-side. [CITED: https://developers.google.com/youtube/v3/live/guides/auth/installed-apps]  
**When to use:** Use for PLUG-02 because the app is a local desktop/LAN Node app and can listen on loopback. [CITED: https://developers.google.com/identity/protocols/oauth2/native-app]

```typescript
// Source: googleapis OAuth2 docs via Context7 CLI
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/youtube"],
});
const { tokens } = await oauth2Client.getToken(code);
oauth2Client.setCredentials(tokens);
```

### Pattern 3: Read/Validate/Write/Verify Config

**What:** Load the current plugin config, validate requested changes, write to `.local`, reload/parse the file, and verify no browser-safe DTO contains tokens or ingestion keys. [VERIFIED: codebase grep]  
**When to use:** Use for enabling plugins, saving OAuth client config, token persistence, selected YouTube broadcast options, and persisted YouTube resource IDs. [VERIFIED: AGENTS.md]

### Anti-Patterns to Avoid

- **Browser-side OAuth token handling:** Do not send access tokens, refresh tokens, client secrets, RTMP stream names, or ingestion URLs to React. [CITED: https://developers.google.com/youtube/v3/live/guides/auth/installed-apps] [VERIFIED: codebase grep]
- **Generic dynamic plugin loading from arbitrary paths:** Do not execute untrusted plugin code in v1; first-party registry keeps the single-user local app simpler and testable. [ASSUMED]
- **Transitioning YouTube broadcast before stream is active:** YouTube requires the bound stream's `status.streamStatus` to be `active` before transition to `testing` or `live`. [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/transition]
- **Using full YouTube resources for update calls casually:** YouTube `part` controls both response fields and write fields; omitting a modifiable property inside an update part can delete its value. [CITED: https://developers.google.com/youtube/v3/guides/implementation/partial]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YouTube OAuth protocol | Manual PKCE/token refresh/revoke implementation | `google-auth-library` / `googleapis` OAuth2 client | Google docs and client library handle token exchange and refresh patterns. [CITED: https://googleapis.dev/nodejs/googleapis/latest/index.html] |
| YouTube Live API REST wrapper | Ad hoc `fetch` wrappers for each endpoint | `googleapis.youtube("v3")` behind `YouTubeLiveApi` adapter | Keeps retries, auth client use, and mocks centralized. [VERIFIED: npm registry] |
| RTSP-to-RTMPS encoding | Custom media bridge | FFmpeg CLI process | FFmpeg supports RTSP input and FLV/RTMP output formats. [CITED: https://ffmpeg.org/ffmpeg-all.html] |
| Secret redaction | Per-call string replacements only | Shared safe-payload assertions and diagnostics sanitizer extensions | Existing app already guards live-view/settings/PTZ browser payloads. [VERIFIED: codebase grep] |
| Test doubles | Real YouTube credentials in tests | Mock YouTube API adapter, fake OAuth client, fake process runner, temp token store | Existing tests already inject fake services into route modules. [VERIFIED: codebase grep] |

**Key insight:** The hard parts are state machines and secret boundaries, not route creation; use adapters and process runners so the planner can test every YouTube state without real YouTube credentials or a real FFmpeg process. [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: OAuth Works Once, Then Refresh Breaks

**What goes wrong:** The plugin stores only an access token or loses the refresh token, requiring repeated user consent. [CITED: https://developers.google.com/youtube/v3/live/guides/auth/installed-apps]  
**Why it happens:** Access tokens expire; refresh tokens must be stored securely in a long-lived location. [CITED: https://developers.google.com/youtube/v3/live/guides/auth/installed-apps]  
**How to avoid:** Store full token response server-side, listen for token refresh events, and provide explicit reconnect/revoke actions. [CITED: https://googleapis.dev/nodejs/googleapis/latest/index.html]  
**Warning signs:** `invalid_grant`, missing `refresh_token`, or auth state oscillating between connected and disconnected. [CITED: https://developers.google.com/youtube/v3/live/guides/auth/installed-apps]

### Pitfall 2: YouTube Stream Secret Leaks

**What goes wrong:** `cdn.ingestionInfo.streamName`, ingestion URL, OAuth token, or RTSP URL appears in API responses, logs, debug artifacts, or test snapshots. [CITED: https://developers.google.com/youtube/v3/live/docs/liveStreams]  
**Why it happens:** YouTube returns ingestion details in the `liveStream` resource and the existing camera RTSP URL includes credentials. [CITED: https://developers.google.com/youtube/v3/live/docs/liveStreams] [VERIFIED: codebase grep]  
**How to avoid:** Mark ingestion details secret-bearing, redact process args/logs, and add route tests that serialize responses and assert absence of secret patterns. [VERIFIED: codebase grep]  
**Warning signs:** Response bodies contain `rtmp://`, `rtmps://`, `streamName`, `refresh_token`, `access_token`, `password`, or `rtsp://`. [VERIFIED: codebase grep]

### Pitfall 3: Broadcast Lifecycle Race

**What goes wrong:** The plugin creates resources but fails to go live because it transitions before YouTube has detected active input. [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/transition]  
**Why it happens:** YouTube stream status can be `ready`, `inactive`, `active`, `error`, or `noData`; live transition needs active input. [CITED: https://developers.google.com/youtube/v3/live/docs/liveStreams]  
**How to avoid:** Start FFmpeg first, poll `liveStreams.list(part=id,snippet,cdn,status,id=...)`, surface health issues, then transition. [CITED: https://developers.google.com/youtube/v3/live/docs/liveStreams/list]  
**Warning signs:** `errorStreamInactive`, `invalidTransition`, `redundantTransition`, `noData`, or `bad` health. [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/transition]

### Pitfall 4: FFmpeg Process State Drifts from YouTube State

**What goes wrong:** The UI says streaming while FFmpeg exited, or YouTube is live while local process is stopped. [ASSUMED]  
**Why it happens:** Process lifecycle and YouTube lifecycle are separate systems. [CITED: https://developers.google.com/youtube/v3/live/life-of-a-broadcast]  
**How to avoid:** Persist process state only as observed runtime state, poll YouTube status separately, and make stop idempotent: stop process, then transition broadcast to `complete` when applicable. [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/transition]

## Code Examples

### YouTube Stream Creation Shape

```typescript
// Source: https://developers.google.com/youtube/v3/live/docs/liveStreams/insert
await youtube.liveStreams.insert({
  part: ["snippet", "cdn", "contentDetails", "status"],
  requestBody: {
    snippet: { title },
    cdn: {
      ingestionType: "rtmp",
      resolution: "variable",
      frameRate: "variable",
    },
    contentDetails: { isReusable: true },
  },
});
```

### YouTube Broadcast Creation and Bind Shape

```typescript
// Sources:
// https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/insert
// https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/bind
const broadcast = await youtube.liveBroadcasts.insert({
  part: ["snippet", "contentDetails", "status"],
  requestBody: {
    snippet: {
      title,
      scheduledStartTime: new Date(Date.now() + 60_000).toISOString(),
    },
    status: {
      privacyStatus: "unlisted",
      selfDeclaredMadeForKids: false,
    },
    contentDetails: {
      enableAutoStart: false,
      enableAutoStop: false,
      monitorStream: { enableMonitorStream: true },
    },
  },
});

await youtube.liveBroadcasts.bind({
  id: broadcast.data.id!,
  streamId,
  part: ["id", "snippet", "contentDetails", "status"],
});
```

### Process Runner Contract

```typescript
// Source: local src/media/mediamtx-runtime.ts spawn pattern
export type StreamProcessRunner = {
  start(inputRtspUrl: string, outputRtmpsUrl: SecretString): Promise<RunningStreamProcess>;
};

export type RunningStreamProcess = {
  pid: number | null;
  stop(reason: "user" | "shutdown" | "failure"): Promise<void>;
  getStatus(): { state: "starting" | "running" | "exited"; reason: string | null };
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual copy/paste OAuth out-of-band code | Loopback redirect for desktop apps | OOB is no longer supported per Google native app docs | Use local callback route, not manual copy/paste. [CITED: https://developers.google.com/identity/protocols/oauth2/native-app] |
| Custom URI scheme OAuth redirect | Loopback redirect for desktop apps | Custom URI schemes are no longer supported due to impersonation risk | Use Desktop app OAuth client and loopback redirect. [CITED: https://developers.google.com/identity/protocols/oauth2/native-app] |
| RTMP-only YouTube ingestion | Prefer RTMPS ingestion URL when available | YouTube recommends RTMPS for live encoder streams | Build output URL from `rtmpsIngestionAddress` + `streamName` when present. [CITED: https://support.google.com/youtube/answer/2853702] [CITED: https://developers.google.com/youtube/v3/live/docs/liveStreams] |

**Deprecated/outdated:**

- OAuth OOB manual copy/paste redirect is not supported. [CITED: https://developers.google.com/identity/protocols/oauth2/native-app]
- `contentDetails.enableClosedCaptions` is deprecated; use `closedCaptionsType` if captions ever enter scope. [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts]

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLUG-01 | Plugin runtime and extension contract | Use server-side plugin registry with typed manifest/status/action contracts and Fastify routes matching existing dependency-injection patterns. [VERIFIED: codebase grep] |
| PLUG-02 | YouTube authentication and credential storage flow | Use Google desktop/installed-app OAuth with loopback redirect, offline access, secure token storage, refresh, and revoke support. [CITED: https://developers.google.com/youtube/v3/live/guides/auth/installed-apps] |
| PLUG-03 | YouTube stream setup, start/stop control, and status reporting | Implement liveStream/liveBroadcast creation, bind, FFmpeg RTMPS push, stream health polling, transition to testing/live/complete. [CITED: https://developers.google.com/youtube/v3/live/life-of-a-broadcast] |
| PLUG-04 | Shareable stream metadata and UI integration | Expose redacted broadcast metadata such as title, privacy status, lifecycle, health, and watch URL; keep ingestion/token details server-only. [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | v1 plugin loading should be first-party/static rather than arbitrary user-installed code. | Architecture Patterns | Planner might underbuild if user expects third-party plugin installation in Phase 9. |
| A2 | FFmpeg is the preferred local encoder/transmuxer for RTSP-to-RTMPS in this project. | Standard Stack / Don't Hand-Roll | Planner may need an alternate encoder path if the user wants MediaMTX-only or OBS integration. |
| A3 | YouTube watch URL can be derived from the broadcast/video ID as `https://www.youtube.com/watch?v={id}`. | PLUG-04 | Planner should verify with a mocked response or official sample before locking UI copy. |

## Open Questions (RESOLVED)

1. **OAuth client provisioning**
   - What we know: Google requires an OAuth client and enabled YouTube Data API for the project. [CITED: https://developers.google.com/youtube/v3/live/getting-started]
   - What's unclear: Whether the app should ask the user for a downloaded desktop client JSON, use env vars, or include a project-owned OAuth client. [ASSUMED]
   - Recommendation: Plan for a local `.local/plugins/youtube/client.json` import flow plus validation and redacted status. [ASSUMED]
   - **RESOLVED:** Phase 9 will support a local Desktop OAuth client JSON import/configuration flow under `.local/plugins/youtube/`. The app will not ship a project-owned OAuth client secret and will not require env vars for the first implementation.

2. **FFmpeg installation**
   - What we know: `ffmpeg` is not currently available on PATH. [VERIFIED: environment probe]
   - What's unclear: Whether to pin/download FFmpeg like MediaMTX or require user installation. [ASSUMED]
   - Recommendation: Plan a detection step and disabled UI state first; choose pin/download or documented install as a separate implementation decision. [ASSUMED]
   - **RESOLVED:** Phase 9 will implement FFmpeg discovery/configuration and a safe disabled state when FFmpeg is unavailable. It will not add a mandatory FFmpeg downloader in this phase.

3. **Manual vs auto-start broadcast**
   - What we know: YouTube supports `enableAutoStart` and `enableAutoStop`, and auto-stop ends about a minute after transmission stops. [CITED: https://developers.google.com/youtube/v3/live/life-of-a-broadcast]
   - What's unclear: Whether the user wants manual testing/go-live controls or simplified auto-start. [ASSUMED]
   - Recommendation: Default to explicit controls and surface auto-start as a future enhancement. [ASSUMED]
   - **RESOLVED:** Phase 9 will use explicit manual setup/start/stop/status controls. Auto-start/auto-stop tuning is deferred unless it is needed to make the manual flow safe.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Server/plugin runtime | yes | 22.18.0 | none needed. [VERIFIED: environment probe] |
| npm | Package installation/version checks | yes | 10.9.3 | none needed. [VERIFIED: environment probe] |
| FFmpeg | YouTube media egress | no | - | Disable streaming action until configured or add pinned installer. [VERIFIED: environment probe] |
| MediaMTX global CLI | Existing relay if global lookup were used | no | - | Existing code bootstraps pinned MediaMTX under `.local/tools`. [VERIFIED: codebase grep] |
| YouTube Data API | OAuth and Live API | external | API docs current through 2025-12-12 transition page | Mock in tests; real use requires Google account/project/API enablement. [CITED: https://developers.google.com/youtube/v3/live/getting-started] |

**Missing dependencies with no fallback:**

- Real YouTube streaming cannot start without an encoder such as FFmpeg. [VERIFIED: environment probe]

**Missing dependencies with fallback:**

- Global MediaMTX is missing, but existing code downloads/uses a pinned local Windows runtime. [VERIFIED: codebase grep]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 with node and jsdom projects. [VERIFIED: package.json] |
| Config file | `vitest.config.ts`. [VERIFIED: codebase grep] |
| Quick run command | `npm test -- tests/server/plugin-routes.test.ts tests/plugins/youtube-plugin.test.ts` [VERIFIED: package.json] |
| Full suite command | `npm test` [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLUG-01 | Plugin list/status/action routes validate input and return browser-safe DTOs | node route/unit | `npm test -- tests/server/plugin-routes.test.ts tests/plugins/plugin-runtime.test.ts` | no - Wave 0 |
| PLUG-02 | OAuth begin/callback/refresh/revoke store tokens server-side and never leak secrets | node unit/route | `npm test -- tests/plugins/youtube-oauth.test.ts tests/server/plugin-routes.test.ts` | no - Wave 0 |
| PLUG-03 | Stream setup creates stream/broadcast, binds, starts fake process, polls status, stops idempotently | node unit | `npm test -- tests/plugins/youtube-live-workflow.test.ts` | no - Wave 0 |
| PLUG-04 | React plugin panel renders auth/status/start/stop/share states from redacted API data | jsdom component | `npm test -- tests/web/plugin-panel.test.tsx` | no - Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- tests/plugins/youtube-live-workflow.test.ts tests/server/plugin-routes.test.ts` [VERIFIED: package.json]
- **Per wave merge:** `npm test` [VERIFIED: package.json]
- **Phase gate:** Full suite green before `/gsd-verify-work`. [VERIFIED: CLAUDE.md]

### Wave 0 Gaps

- [ ] `tests/plugins/plugin-runtime.test.ts` - covers PLUG-01. [VERIFIED: codebase grep]
- [ ] `tests/plugins/youtube-oauth.test.ts` - covers PLUG-02. [VERIFIED: codebase grep]
- [ ] `tests/plugins/youtube-live-workflow.test.ts` - covers PLUG-03. [VERIFIED: codebase grep]
- [ ] `tests/server/plugin-routes.test.ts` - covers PLUG-01/02/03 browser-safe API contract. [VERIFIED: codebase grep]
- [ ] `tests/web/plugin-panel.test.tsx` - covers PLUG-04. [VERIFIED: codebase grep]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Google OAuth 2.0 installed-app flow; do not collect Google passwords. [CITED: https://developers.google.com/youtube/v3/live/guides/auth/installed-apps] |
| V3 Session Management | yes | Token refresh/revoke lifecycle with server-side token store. [CITED: https://developers.google.com/identity/protocols/oauth2/native-app] |
| V4 Access Control | yes | LAN-only single-user server route access; do not expose plugin actions outside local app assumptions. [VERIFIED: AGENTS.md] |
| V5 Input Validation | yes | Zod schemas for plugin config/action bodies. [VERIFIED: package.json] |
| V6 Cryptography | yes | Use Google OAuth over HTTPS and YouTube RTMPS ingestion when available; do not implement cryptography. [CITED: https://developers.google.com/youtube/v3/live/docs/liveStreams] |
| V7 Error Handling and Logging | yes | Extend diagnostics redaction for OAuth tokens, RTSP URLs, RTMP(S) URLs, and ingestion stream names. [VERIFIED: codebase grep] |
| V9 Communications | yes | YouTube API calls use HTTPS; RTMPS should be preferred for media push. [CITED: https://developers.google.com/youtube/v3/live/docs/liveStreams] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| OAuth refresh token leak via browser response | Information Disclosure | Route-level browser-safe assertions and DTOs without token fields. [VERIFIED: codebase grep] |
| YouTube stream key leak via logs/process errors | Information Disclosure | Redact command args and child-process stderr before storing/logging. [CITED: https://developers.google.com/youtube/v3/live/docs/liveStreams] |
| CSRF-like local action from another browser tab/site | Spoofing / Tampering | Require JSON content type and consider local-only action nonce for destructive plugin actions. [ASSUMED] |
| Starting a public broadcast accidentally | Tampering / Privacy | Default privacy to `private` or `unlisted`, require explicit confirmation for `public`. [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts] |
| Broadcast left live after local process failure | Denial / Privacy | Process exit handler should poll/transition broadcast to `complete` or show immediate manual recovery action. [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/transition] |

## Sources

### Primary (HIGH confidence)

- Google OAuth installed/desktop docs - OAuth flow, local redirect, offline tokens, secure storage. https://developers.google.com/youtube/v3/live/guides/auth/installed-apps
- Google native app OAuth docs - loopback redirect, revoke endpoint, deprecated custom URI/OOB flows. https://developers.google.com/identity/protocols/oauth2/native-app
- YouTube Live Streaming API overview - Data API ownership and resources. https://developers.google.com/youtube/v3/live/getting-started
- YouTube `liveStreams` resource and insert/list docs - ingestion info, stream status, health, required fields. https://developers.google.com/youtube/v3/live/docs/liveStreams and https://developers.google.com/youtube/v3/live/docs/liveStreams/insert
- YouTube `liveBroadcasts` resource, insert, bind, transition, and lifecycle docs - broadcast metadata, status, bind, transition constraints. https://developers.google.com/youtube/v3/live/docs/liveBroadcasts
- Google APIs Node client docs via Context7 CLI - OAuth2 `getToken`, `setCredentials`, refresh token event behavior. https://googleapis.dev/nodejs/googleapis/latest/index.html
- npm registry - `googleapis` 171.4.0, `google-auth-library` 10.6.2, `open` 11.0.0. [VERIFIED: npm registry]
- Local codebase - `src/server/create-server.ts`, `src/server/routes/*`, `src/media/*`, `web/src/App.tsx`, `vitest.config.ts`, `package.json`. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)

- YouTube Help encoder settings - RTMPS recommendation and encoder guidance. https://support.google.com/youtube/answer/2853702
- FFmpeg documentation - RTSP input and RTMP/FLV output support. https://ffmpeg.org/ffmpeg-all.html
- MediaMTX docs - protocol support and architecture context. https://mediamtx.org/docs/features/architecture

### Tertiary (LOW confidence)

- Assumptions listed in the Assumptions Log require user confirmation before being treated as locked decisions. [ASSUMED]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - current package versions were checked against npm and existing installed dependencies. [VERIFIED: npm registry]
- Architecture: HIGH - derived from existing Fastify/Zod/service/test patterns and official YouTube lifecycle docs. [VERIFIED: codebase grep] [CITED: https://developers.google.com/youtube/v3/live/life-of-a-broadcast]
- Pitfalls: HIGH for OAuth/YouTube lifecycle/secret leakage; MEDIUM for FFmpeg process drift because it is based on standard process-supervision risk plus existing local patterns. [CITED: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/transition] [ASSUMED]

**Research date:** 2026-04-27  
**Valid until:** 2026-05-27 for codebase/plugin architecture; 2026-05-04 for YouTube API/OAuth behavior and package versions.
