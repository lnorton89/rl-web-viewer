# Phase 9: Plugin System & YouTube Streaming - Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 17 proposed new/modified areas
**Analogs found:** 17 / 17

## File Classification

| New/Modified File or Area | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/server/create-server.ts` | server composition | request-response | `src/server/create-server.ts` | exact-modification |
| `src/server/plugins/plugin-system.ts` | plugin | request-response/event-driven | `src/server/plugins/diagnostics.ts` | role-match |
| `src/server/routes/plugins.ts` | route | request-response | `src/server/routes/settings.ts`, `src/server/routes/ptz.ts` | exact |
| `src/server/routes/youtube-streaming.ts` | route | request-response/process-control | `src/server/routes/live-view.ts`, `src/server/routes/ptz.ts` | exact |
| `src/config/plugin-config.ts` | config | file-I/O/validation | `src/config/camera-config.ts` | exact |
| `src/config/youtube-config.ts` | config | file-I/O/validation | `src/config/camera-config.ts` | exact |
| `src/plugins/plugin-registry.ts` | service/registry | event-driven/transform | `src/camera/adapters/index.ts` | exact |
| `src/plugins/plugin-contract.ts` | model/contract | transform | `src/camera/adapters/camera-adapter.ts` | exact |
| `src/plugins/youtube/youtube-plugin.ts` | adapter/service | process-control/event-driven | `src/camera/adapters/reolink-rlc-423s-adapter.ts` | role-match |
| `src/media/youtube-stream-service.ts` | service | process lifecycle/streaming | `src/media/live-view-service.ts` | exact |
| `src/media/youtube-ffmpeg-config.ts` | utility/config | transform/file-I/O | `src/media/mediamtx-config.ts` | exact |
| `src/media/youtube-runtime.ts` | utility/runtime | file-I/O/process bootstrap | `src/media/mediamtx-runtime.ts` | exact |
| `src/types/plugins.ts` | model | transform | `src/types/live-view.ts`, `src/types/settings.ts` | role-match |
| `src/types/youtube-streaming.ts` | model | transform | `src/types/live-view.ts` | role-match |
| `web/src/lib/plugin-api.ts`, `web/src/lib/youtube-streaming-api.ts` | API client | request-response | `web/src/lib/ptz-api.ts`, `web/src/lib/settings-api.ts` | exact |
| `web/src/hooks/use-plugins.ts`, `web/src/hooks/use-youtube-streaming.ts` | hook | request-response/event-driven UI state | `web/src/hooks/use-live-view.ts` | role-match |
| `web/src/components/PluginPanel.tsx`, `web/src/components/YoutubeStreamingPanel.tsx` | component | UI state/action | `web/src/components/ModeSwitcher.tsx`, `web/src/components/SettingsPanel.tsx`, `web/src/App.tsx` | role-match |

## Pattern Assignments

### `src/server/create-server.ts` (server composition, request-response)

**Analog:** `src/server/create-server.ts`

**Imports and dependency option pattern** (lines 8-29):
```typescript
import { diagnosticsPlugin } from "./plugins/diagnostics.js";
import {
  liveViewRoutes,
  type LiveViewRouteDependencies,
} from "./routes/live-view.js";
import { ptzRoutes, type PtzRouteDependencies } from "./routes/ptz.js";

export type CreateServerOptions = {
  audio?: AudioRouteDependencies;
  liveView?: LiveViewRouteDependencies;
  ptz?: PtzRouteDependencies;
  settings?: SettingsRouteDependencies;
  staticRoot?: string;
};
```

**Registration order pattern** (lines 60-65):
```typescript
await app.register(diagnosticsPlugin);

await app.register(liveViewRoutes, options.liveView ?? {});
await app.register(ptzRoutes, options.ptz ?? {});
await app.register(settingsRoutes, options.settings ?? {});
await app.register(audioRoutes, options.audio ?? {});
```

**Apply to Phase 9:** add route dependency options for plugin and YouTube routes, register any global plugin-system decorator before routes, and mount routes through `createServer` so tests can inject mocks.

---

### `src/server/plugins/plugin-system.ts` (plugin, request-response/event-driven)

**Analog:** `src/server/plugins/diagnostics.ts`

**Fastify plugin/decorator pattern** (lines 36-50):
```typescript
export const diagnosticsPlugin: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  app.decorateRequest("diagnostics", null);
  app.addHook("onRequest", async (request) => {
    const requestId = request.id;
    (request as unknown as { diagnostics: DiagnosticsBindings }).diagnostics =
      createOperationDiagnostics({
        requestId: typeof requestId === "string" ? requestId : typeof requestId === "number" ? String(requestId) : null,
        adapterId: "unknown",
        scope: "probe",
        cameraHost: "unknown",
      });
  });
};
```

**Service factory pattern** (lines 11-33, 53-55):
```typescript
function buildDiagnosticsService(_app: FastifyInstance): OperationDiagnosticsService {
  return {
    createForRequest: (request: { id: string | undefined }): DiagnosticsBindings => {
      return createOperationDiagnostics({
        requestId: request.id ?? null,
        adapterId: "unknown",
        scope: "probe",
        cameraHost: "unknown",
      });
    },
    createForScope: (options: {
      adapterId: string;
      scope: "probe" | "live-view" | "ptz" | "settings";
      cameraHost: string;
    }): DiagnosticsBindings => {
      return createDiagnosticsLoggerBindings({
        requestId: null,
        adapterId: options.adapterId,
        scope: options.scope,
        cameraHost: options.cameraHost,
      });
    },
  };
}

export function createDiagnosticsService(app: FastifyInstance): OperationDiagnosticsService {
  return buildDiagnosticsService(app);
}
```

**Apply to Phase 9:** expose a small decorated service or app-level registry accessor. Keep plugin initialization side-effect-light and testable through a factory.

---

### `src/server/routes/plugins.ts` (route, request-response)

**Analogs:** `src/server/routes/settings.ts`, `src/server/routes/ptz.ts`

**Route dependency injection and lazy service creation** (settings lines 20-22, 68-79):
```typescript
export type SettingsRouteDependencies = {
  createSettingsService?: () => Promise<SettingsService> | SettingsService;
};

export const settingsRoutes: FastifyPluginAsync<SettingsRouteDependencies> = async (
  app,
  options,
) => {
  const createService =
    options.createSettingsService ?? createReolinkSettingsService;
  let servicePromise: Promise<SettingsService> | null = null;

  async function resolveService(): Promise<SettingsService> {
    servicePromise ??= Promise.resolve(createService());
    return servicePromise;
  }
```

**Validation and response shape** (ptz lines 211-227, 247-261):
```typescript
function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  reply: FastifyReply,
): z.infer<T> | null {
  const parsed = schema.safeParse(data);

  if (parsed.success) {
    return parsed.data;
  }

  reply.code(400);
  void reply.send({
    error: parsed.error.issues[0]?.message ?? "Invalid request body",
  });
  return null;
}

async function requireControlSupport(
  service: PtzService,
  reply: FastifyReply,
): Promise<boolean> {
  const bootstrap = await service.getBootstrap();

  if (bootstrap.supportsPtzControl) {
    return true;
  }

  reply.code(409);
  await reply.send({
    error: PTZ_CONTROL_UNAVAILABLE_ERROR,
  });
  return false;
}
```

**Browser-safe payload guard** (settings lines 486-494):
```typescript
function assertBrowserSafePayload(payload: unknown): void {
  const serialized = JSON.stringify(payload);

  for (const pattern of UNSAFE_SETTINGS_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new Error("Settings payload contained camera credentials");
    }
  }
}
```

**Apply to Phase 9:** plugin list/detail/config routes should return typed bootstrap/config/status payloads, `400` for malformed input, `409` for unsupported/disabled plugin actions, `422` for validation failures, and should assert no plugin secrets leak.

---

### `src/server/routes/youtube-streaming.ts` (route, request-response/process-control)

**Analogs:** `src/server/routes/live-view.ts`, `src/server/routes/ptz.ts`

**Bootstrap and health route pattern** (live-view lines 29-75):
```typescript
export const liveViewRoutes: FastifyPluginAsync<LiveViewRouteDependencies> = async (
  app,
  options,
) => {
  const resolveBootstrap = options.buildLiveViewBootstrap ?? buildLiveViewBootstrap;
  const resolveSnapshot = options.fetchSnapshot ?? fetchCameraSnapshot;
  const resolveRelayHealth = options.getMediaRelayHealth ?? getMediaRelayHealth;

  app.get("/api/live-view", async (request, reply) => {
    const bootstrap = await resolveBootstrap(
      request.headers.host ?? "127.0.0.1:4000",
    );

    assertBrowserSafeBootstrap(bootstrap);
    reply.send(bootstrap);
  });

  app.get("/api/live-view/health", async (_request, reply) => {
    const health = resolveRelayHealth();

    if (health.relay === "ready") {
      return reply.send({
        relay: health.relay,
      });
    }

    return reply.send({
      relay: health.relay,
      reason: health.reason ?? "Live view is unavailable",
    });
  });
};
```

**202 Accepted action pattern** (ptz lines 81-96, 114-128):
```typescript
app.post("/api/ptz/motion/start", async (request, reply) => {
  const body = parseBody(startMotionBodySchema, request.body, reply);

  if (!body) {
    return;
  }

  const service = await resolveService();

  if (!(await requireControlSupport(service, reply))) {
    return;
  }

  reply.code(202);
  return reply.send(await service.startMotion(body.direction));
});
```

**Apply to Phase 9:** `/api/youtube-streaming` should provide bootstrap/status; start/stop routes should use Zod schemas, lazy service resolution, capability/config guards, `202` for accepted process actions, and browser-safe assertions.

---

### `src/config/plugin-config.ts` and `src/config/youtube-config.ts` (config, file-I/O/validation)

**Analog:** `src/config/camera-config.ts`

**Zod schema and defaults pattern** (lines 4-26):
```typescript
import { z } from "zod";

const snapshotSchema = z.object({
  model: z.string().default(""),
  hardVer: z.string().default(""),
  firmVer: z.string().default(""),
});

export const cameraConfigSchema = z.object({
  baseUrl: z.url(),
  username: z.string(),
  password: z.string(),
  modelHint: z.string().default("RLC-423S"),
  notes: z.string().default(""),
  debugCapture: z.boolean().default(false),
  snapshot: snapshotSchema.default({
    model: "",
    hardVer: "",
    firmVer: "",
  }),
});

export type CameraConfig = z.infer<typeof cameraConfigSchema>;
```

**Load/save pattern** (lines 28-45):
```typescript
export function defaultConfigPath(): string {
  return path.resolve(process.cwd(), ".local", "camera.config.json");
}

export async function loadCameraConfig(
  configPath = defaultConfigPath(),
): Promise<CameraConfig> {
  const raw = await readFile(configPath, "utf8");
  return cameraConfigSchema.parse(JSON.parse(raw));
}

export async function saveCameraConfig(
  config: CameraConfig,
  configPath = defaultConfigPath(),
): Promise<void> {
  await mkdir(path.dirname(configPath), { recursive: true });
  const parsed = cameraConfigSchema.parse(config);
  await writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}
```

**Apply to Phase 9:** put plugin and YouTube stream config under `.local`, validate on both read and write, infer exported types from schemas, and keep secret fields out of browser payloads.

---

### `src/plugins/plugin-contract.ts` (model/contract, transform)

**Analog:** `src/camera/adapters/camera-adapter.ts`

**Capability-aware adapter contract** (lines 52-73):
```typescript
export interface CameraAdapter {
  adapterId: string;
  matchesIdentity(identity: CameraIdentity): boolean;
  probe(session: ReolinkRequestExecutor): Promise<CameraProbeResult>;
  buildCapabilitySnapshot(input: {
    identity: CameraIdentity;
    ports: ReolinkNetPort;
    ability: ReolinkAbility;
    audioNum?: number;
  }): CapabilitySnapshot;
  resolveLiveStreams(
    config: CameraConfig,
    snapshot: CapabilitySnapshot,
  ): ResolvedReolinkLiveStreams;
  createPtzService(options: CameraAdapterPtzServiceOptions): PtzService;
  createSettingsService(
    options: CameraAdapterSettingsServiceOptions,
  ): SettingsService;
  classifyFailure(
    scope: "probe" | "live-view" | "ptz" | "settings",
    error: unknown,
  ): string;
}
```

**Apply to Phase 9:** define a minimal plugin contract with `pluginId`, `capabilities`, `getStatus/bootstrap`, optional `start/stop/configure`, and `classifyFailure`. Do not expose provider secrets or raw streaming URLs through the shared registry surface.

---

### `src/plugins/plugin-registry.ts` (service/registry, event-driven/transform)

**Analog:** `src/camera/adapters/index.ts`

**Registry pattern** (lines 5-24):
```typescript
let registeredAdapters: CameraAdapter[] = [];

export function registerCameraAdapters(): readonly CameraAdapter[] {
  if (registeredAdapters.length === 0) {
    registeredAdapters = [createRlc423sAdapter()];
  }

  return registeredAdapters;
}

export function getRegisteredCameraAdapters(): readonly CameraAdapter[] {
  return registerCameraAdapters();
}

export function resolveCameraAdapter(
  identity: CameraIdentity,
): CameraAdapter | undefined {
  return registerCameraAdapters().find((adapter) =>
    adapter.matchesIdentity(identity),
  );
}
```

**Apply to Phase 9:** use an idempotent in-memory registry, expose readonly arrays, and resolve plugins by `pluginId`/capability. Include tests that repeated registration does not duplicate built-ins.

---

### `src/plugins/youtube/youtube-plugin.ts` (adapter/service, process-control/event-driven)

**Analog:** `src/camera/adapters/reolink-rlc-423s-adapter.ts`

**Adapter object and failure classification pattern** (lines 8-51):
```typescript
export function createRlc423sAdapter(): CameraAdapter {
  return {
    adapterId: "reolink-rlc-423s",
    matchesIdentity(identity) {
      return identity.model.toLowerCase().includes("rlc-423s");
    },
    probe: probeCamera,
    buildCapabilitySnapshot,
    resolveLiveStreams: resolveReolinkLiveStreams,
    createPtzService: createReolinkPtzService,
    createSettingsService: createReolinkSettingsService,
    classifyFailure(scope, error) {
      const message = `${scope} ${normalizeErrorMessage(error)}`.toLowerCase();

      if (message.includes("enoent") || message.includes("missing")) {
        return "Required files are missing";
      }

      if (message.includes("timed out") || message.includes("timeout")) {
        return "Request timed out";
      }

      if (message.includes("unsupported") || message.includes("model mismatch")) {
        return "Firmware or model is unsupported";
      }

      return "Operation failed";
    },
  };
}
```

**Apply to Phase 9:** YouTube plugin should wrap service creation and failure classification behind the plugin contract. Classify missing runtime/config, access denied, YouTube auth/key errors, timeouts, and unsupported live source separately.

---

### `src/media/youtube-stream-service.ts` (service, process lifecycle/streaming)

**Analog:** `src/media/live-view-service.ts`

**Health state and idempotent start pattern** (lines 29-38, 80-90):
```typescript
export type MediaRelayHealth = {
  relay: "starting" | "ready" | "failed";
  reason: string | null;
};

let relayProcess: ChildProcess | null = null;
let relayHealth: MediaRelayHealth = {
  relay: "failed",
  reason: "Media relay not started",
};

export async function startMediaRelay(): Promise<void> {
  if (relayProcess && !relayProcess.killed) {
    return;
  }

  relayHealth = {
    relay: "starting",
    reason: null,
  };
```

**Process spawn and health transitions** (lines 102-145):
```typescript
const streams = resolveReolinkLiveStreams(config, snapshot);
const configPath = await writeMediaMtxConfig(buildMediaMtxSourceMap(streams));
const executablePath = await ensureMediaMtxRuntime();

const processRef = spawn(executablePath, [configPath], {
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
relayProcess = processRef;

processRef.once("spawn", () => {
  relayHealth = {
    relay: "ready",
    reason: null,
  };
});

processRef.stderr?.on("data", (chunk) => {
  const text = chunk.toString().trim();

  if (!text) {
    return;
  }

  relayHealth = {
    relay: "failed",
    reason: classifyLiveViewFailure(new Error(text)),
  };
});

processRef.once("exit", () => {
  relayProcess = null;
  relayHealth = {
    relay: "failed",
    reason: relayHealth.reason ?? "Media relay exited unexpectedly",
  };
});
```

**Failure bootstrap artifact pattern** (lines 232-270):
```typescript
await writeDebugArtifact({
  command: "live-view-bootstrap",
  endpoint: "/api/live-view",
  status: 503,
  responseBody: {
    reason,
    error:
      error instanceof Error
        ? {
            message: error.message,
          }
        : error,
    runtimeConfigExists: await pathExists(defaultMediaMtxConfigPath()),
    runtimeConfigPreview:
      modes.length > 0
        ? buildMediaMtxConfig({
            camera_main: "rtsp://[redacted]@camera/h264Preview_01_main",
            camera_sub: "rtsp://[redacted]@camera/h264Preview_01_sub",
          })
        : null,
  },
});
```

**Apply to Phase 9:** keep YouTube streaming process singleton/idempotent; publish `starting|ready|failed` health with short reasons; collect stderr into sanitized diagnostics; implement explicit stop if required by product behavior.

---

### `src/media/youtube-ffmpeg-config.ts` (utility/config, transform/file-I/O)

**Analog:** `src/media/mediamtx-config.ts`

**Config transform and write pattern** (lines 14-48):
```typescript
export function defaultMediaMtxConfigPath(): string {
  return path.resolve(process.cwd(), ".local", "runtime", "mediamtx.yml");
}

export function buildMediaMtxSourceMap(
  streams: ResolvedReolinkLiveStreams,
): MediaMtxSourceMap {
  return {
    [MEDIAMTX_MAIN_PATH]: streams.main.sourceUrl,
    [MEDIAMTX_SUB_PATH]: streams.sub.sourceUrl,
  };
}

export function buildMediaMtxConfig(sourceMap: MediaMtxSourceMap): string {
  return [
    "hlsAddress: :8888",
    "webrtcAddress: :8889",
    "paths:",
    `  ${MEDIAMTX_MAIN_PATH}:`,
    `    source: ${sourceMap.camera_main}`,
    "    sourceOnDemand: yes",
    `  ${MEDIAMTX_SUB_PATH}:`,
    `    source: ${sourceMap.camera_sub}`,
    "    sourceOnDemand: yes",
    "",
  ].join("\n");
}

export async function writeMediaMtxConfig(
  sourceMap: MediaMtxSourceMap,
  configPath = defaultMediaMtxConfigPath(),
): Promise<string> {
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, buildMediaMtxConfig(sourceMap), "utf8");
  return configPath;
}
```

**Apply to Phase 9:** keep FFmpeg argument/config construction as pure functions first, then write files separately. Redact RTSP credentials and YouTube stream keys in previews/artifacts.

---

### `src/media/youtube-runtime.ts` (utility/runtime, file-I/O/process bootstrap)

**Analog:** `src/media/mediamtx-runtime.ts`

**Pinned runtime and ensure pattern** (lines 6-24, 26-55):
```typescript
export const MEDIAMTX_VERSION = "v1.17.1";
export const MEDIAMTX_DIRECTORY = `mediamtx-${MEDIAMTX_VERSION}`;
export const MEDIAMTX_RELEASE_ZIP = "mediamtx_v1.17.1_windows_amd64.zip";

export function defaultMediaMtxRuntimeDirectory(): string {
  return path.resolve(process.cwd(), ".local", "tools", MEDIAMTX_DIRECTORY);
}

export function defaultMediaMtxExecutablePath(): string {
  return path.resolve(defaultMediaMtxRuntimeDirectory(), "mediamtx.exe");
}

export async function ensureMediaMtxRuntime(options?: {
  fetchImpl?: typeof fetch;
  unzipArchive?: (zipPath: string, destinationDir: string) => Promise<void>;
}): Promise<string> {
  const executablePath = defaultMediaMtxExecutablePath();

  if (await fileExists(executablePath)) {
    return executablePath;
  }

  if (process.platform !== "win32") {
    throw new Error("Pinned MediaMTX bootstrap currently supports Windows only");
  }
```

**Child process wrapper pattern** (lines 73-91):
```typescript
await new Promise<void>((resolve, reject) => {
  const child = spawn(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-Command", command],
    {
      stdio: "ignore",
      windowsHide: true,
    },
  );

  child.once("error", reject);
  child.once("exit", (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`Expand-Archive failed with exit code ${code ?? -1}`));
  });
});
```

**Apply to Phase 9:** if FFmpeg is managed locally, pin version and path under `.local/tools`; inject fetch/unpack helpers in tests; use `windowsHide: true`; fail clearly on unsupported platforms.

---

### `src/types/plugins.ts` and `src/types/youtube-streaming.ts` (model, transform)

**Analogs:** `src/media/live-view-modes.ts`, `src/camera/adapters/camera-adapter.ts`

**String-literal capability/mode model pattern** (live-view-modes lines 10-24, 62-75):
```typescript
type LiveModeDefinition = {
  id: LiveModeId;
  label: string;
  quality: StreamQuality;
  transport: StreamTransport;
};

const LIVE_MODE_DEFINITIONS: readonly LiveModeDefinition[] = [
  {
    id: "webrtc:main",
    label: "WebRTC Main",
    quality: "main",
    transport: "webrtc",
  },
] as const;

export const DEFAULT_MODE_ORDER: LiveModeId[] = [
  "webrtc:main",
  "webrtc:sub",
  "hls:sub",
  "snapshot:main",
];
```

**Apply to Phase 9:** define narrow union types for plugin ids, status states, YouTube stream states, and capability flags. Avoid untyped string status values in routes and UI.

---

### `web/src/lib/plugin-api.ts` and `web/src/lib/youtube-streaming-api.ts` (API client, request-response)

**Analogs:** `web/src/lib/ptz-api.ts`, `web/src/lib/settings-api.ts`

**Typed GET/POST client pattern** (ptz-api lines 110-153):
```typescript
async function requestJson<T>(
  url: string,
  input: {
    body?: unknown;
    method: "GET" | "POST";
    signal?: AbortSignal;
  },
): Promise<T> {
  const response = await fetch(url, {
    method: input.method,
    headers: {
      Accept: "application/json",
      ...(input.body === undefined
        ? {}
        : {
            "Content-Type": "application/json",
          }),
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    signal: input.signal,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, url));
  }

  return (await response.json()) as T;
}
```

**Failure payload passthrough pattern** (settings-api lines 43-56, 66-76):
```typescript
const payload = (await readJson(response)) as SettingsApplyResult<TId> | {
  error?: unknown;
};

if (isSettingsApplyFailure(payload)) {
  return payload;
}

if (!response.ok) {
  throw new Error(getPayloadErrorMessage(payload, url, response.status));
}

return payload as SettingsApplyResult<TId>;
```

**Apply to Phase 9:** keep one API file per server route area, use shared backend types from `src/types`, accept `AbortSignal` for bootstrap/status fetches, and parse `{ error }` responses into user-visible messages.

---

### `web/src/hooks/use-plugins.ts` and `web/src/hooks/use-youtube-streaming.ts` (hook, request-response/event-driven UI state)

**Analog:** `web/src/hooks/use-live-view.ts`

**Hook shape and cleanup pattern** (lines 30-43, 145-184):
```typescript
export function useLiveView(): {
  state: ViewerState;
  modes: LiveMode[];
  currentModeId: LiveModeId | null;
  fallbackOrder: LiveModeId[];
  nextFallbackModeId: LiveModeId | null;
  renderKind: "video" | "image";
  activePlayback: LiveViewPlayback | null;
  videoElement: HTMLVideoElement | null;
  bindVideoElement(node: HTMLVideoElement | null): void;
  bindImageElement(node: HTMLImageElement | null): void;
  selectMode(modeId: LiveModeId): Promise<void>;
  retry(): Promise<void>;
} {
```

```typescript
useEffect(() => {
  const abortController = new AbortController();

  void fetchLiveViewBootstrap(abortController.signal)
    .then((nextBootstrap) => {
      if (abortController.signal.aborted) {
        return;
      }

      setBootstrap(nextBootstrap);
      // derive initial state
    })
    .catch((error: unknown) => {
      if (abortController.signal.aborted) {
        return;
      }

      handleBootstrapFailure(getErrorMessage(error, BOOTSTRAP_FAILURE_MESSAGE));
    });

  return () => {
    abortController.abort();
    clearRetryTimer();
    resetAttachment();
  };
}, [beginMode, clearRetryTimer, handleBootstrapFailure, resetAttachment]);
```

**Retry/fallback pattern** (lines 100-143):
```typescript
const handlePlaybackFailure = useCallback(
  (modeId: LiveModeId, reason: string) => {
    const currentAttempt = activeAttemptRef.current;

    if (currentAttempt === null || currentAttempt.modeId !== modeId) {
      return;
    }

    resetAttachment();

    if (currentAttempt.retryCount < RETRY_DELAYS_MS.length) {
      const nextRetryCount = currentAttempt.retryCount + 1;
      const retryDelay = RETRY_DELAYS_MS[currentAttempt.retryCount];

      activeAttemptRef.current = {
        modeId,
        retryCount: nextRetryCount,
      };
      setState({ kind: "reconnecting", reason });
      clearRetryTimer();
      retryTimerRef.current = window.setTimeout(() => {
        setActivationNonce((value: number) => value + 1);
      }, retryDelay);
      return;
    }
```

**Apply to Phase 9:** use hooks to own async fetch/action state, abort on unmount, expose stable command functions (`start`, `stop`, `saveConfig`, `refresh`), and keep process health/status separate from presentational components.

---

### `web/src/components/PluginPanel.tsx` and `web/src/components/YoutubeStreamingPanel.tsx` (component, UI state/action)

**Analogs:** `web/src/App.tsx`, `web/src/components/ModeSwitcher.tsx`, `web/src/components/LiveViewerFrame.tsx`

**App integration pattern** (App lines 41-100):
```typescript
const renderSectionContent = () => {
  switch (activeSection) {
    case "live":
      return (
        <Box sx={{ display: "flex", gap: 2, height: "100%", flex: 1 }}>
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h5" component="h1">
              Live View
            </Typography>
            <LiveViewerFrame ... />
            <ModeSwitcher ... />
            <DiagnosticsDisclosure ... />
          </Box>
        </Box>
      );
    case "settings":
      return (
        <Box>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Settings
          </Typography>
          <SettingsPanel />
        </Box>
      );
    default:
      return null;
  }
};
```

**List/action control pattern** (ModeSwitcher lines 16-45):
```typescript
<section className="mode-switcher" aria-labelledby="mode-switcher-heading">
  <div className="section-heading">
    <p className="support-label">Mode Selection</p>
    <h2 id="mode-switcher-heading">Switch transport and quality directly</h2>
  </div>

  <div className="mode-switcher-row" role="group" aria-label="Live view modes">
    {modes.map((mode) => {
      const isActive = mode.id === currentModeId;

      return (
        <Tooltip key={mode.id} title={mode.disabledReason || (mode.enabled ? `Switch to ${mode.label}` : 'Mode unavailable')}>
          <span>
            <button
              aria-pressed={isActive}
              className="mode-button"
              data-active={isActive}
              disabled={!mode.enabled}
              type="button"
              onClick={() => void onSelectMode(mode.id)}
            >
              <span>{mode.label}</span>
            </button>
          </span>
        </Tooltip>
      );
    })}
  </div>
</section>
```

**Viewer/status composition pattern** (LiveViewerFrame lines 32-71):
```typescript
<Box component="section" aria-label="Live viewer" sx={{ width: '100%', maxWidth: '100%', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
  <video
    ref={renderKind === "video" ? bindVideoElement : undefined}
    className="viewer-surface"
    autoPlay
    playsInline
    hidden={renderKind !== "video"}
  />

  <ViewerStatusOverlay
    currentModeLabel={currentModeLabel}
    nextFallbackModeId={nextFallbackModeId}
    onRetry={onRetry}
    reason={state.reason}
    stateKind={state.kind}
  />
</Box>
```

**Apply to Phase 9:** add panels as first-class app sections or settings subsections, keep components presentational, use hook-provided state/actions, and hide stream keys/runtime commands from the UI.

## Shared Patterns

### Fastify Routes and API Responses

**Sources:** `src/server/routes/live-view.ts`, `src/server/routes/ptz.ts`, `src/server/routes/settings.ts`

Use `FastifyPluginAsync<Dependencies>`, dependency injection through route options, lazy service promises, Zod `safeParse` for body/params, and `{ error: string }` for simple errors. Use richer domain failure payloads only where the service contract already returns `ok: false`.

### Capability-Aware Services and Adapters

**Sources:** `src/camera/adapters/camera-adapter.ts`, `src/camera/adapters/index.ts`, `src/camera/adapters/reolink-rlc-423s-adapter.ts`

Use contract interfaces with capability checks, idempotent registries, readonly registry exposure, adapter-specific failure classification, and no raw firmware/command leakage from shared registry APIs.

### Config Load/Save Validation

**Source:** `src/config/camera-config.ts`

Use Zod schemas as the single source of truth, `z.infer` exported types, `.local` default paths, read/parse on load, parse before write, `mkdir` parent directories, and pretty JSON with a trailing newline.

### Media Process Lifecycle and Health

**Sources:** `src/media/live-view-service.ts`, `src/media/mediamtx-runtime.ts`, `src/media/mediamtx-config.ts`

Keep process state module-local, make start idempotent, expose copy-returning health getters, spawn child processes with `windowsHide: true`, classify stderr/exit failures into short messages, and separate pure config generation from file writes.

### Secret Redaction and Browser-Safe Guards

**Sources:** `src/diagnostics/debug-capture.ts`, `src/diagnostics/operation-diagnostics.ts`, route-local unsafe payload guards

Use recursive redaction for debug artifacts, mask token-like values, sanitize host strings that contain credentials, and assert route payloads do not contain `password`, `token=`, `rtsp://`, raw CGI paths, or provider stream keys.

### React API, Hook, and Component Boundaries

**Sources:** `web/src/lib/ptz-api.ts`, `web/src/lib/settings-api.ts`, `web/src/hooks/use-live-view.ts`, `web/src/App.tsx`

Keep API clients small and typed, hooks own async state and cleanup, components receive state/actions as props, and App wires sections without embedding server details.

## Test Patterns

### Route Tests

**Sources:** `tests/server/live-view-routes.test.ts`, `tests/server/ptz-routes.test.ts`

**Create-server injection pattern** (live-view test lines 22-67):
```typescript
const app = await createServer({
  staticRoot,
  liveView: {
    buildLiveViewBootstrap: async () => createBootstrap(),
    fetchSnapshot: async () => ({
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    }),
    getMediaRelayHealth: () => ({
      relay: "ready",
      reason: null,
    }),
  },
});

const response = await app.inject({
  method: "GET",
  url: "/api/live-view",
});

expect(response.statusCode).toBe(200);
expect(response.body).not.toContain("token=");
expect(response.body).not.toContain("rtsp://");
```

**Direct route registration pattern** (ptz test lines 219-225):
```typescript
async function createApp(service: PtzService) {
  const app = Fastify();
  await app.register(ptzRoutes, {
    createPtzService: () => service,
  });
  apps.push(app);
  return app;
}
```

**Apply to Phase 9:** test both direct route registration with mocked services and `createServer` mounting with other routes preserved. Assert no stream keys, RTSP credentials, or tokens appear in responses.

### Service and Runtime Tests

**Sources:** `tests/media/live-view-repeatability.test.ts`, `tests/media/mediamtx-runtime-config.test.ts`

**Idempotency and health pattern** (live-view repeatability lines 21-82):
```typescript
const { startMediaRelay, getMediaRelayHealth } = await import(
  "../../src/media/live-view-service.js"
);

await startMediaRelay();
const secondCall = startMediaRelay();
await secondCall;

expect(() => secondCall).not.toThrow();

const healthAfter = getMediaRelayHealth();
expect(healthAfter.relay).toBeDefined();
```

**Config generation pattern** (mediamtx test lines 34-45):
```typescript
const streams = resolveReolinkLiveStreams(createConfig(), createSnapshot());
const yaml = buildMediaMtxConfig(buildMediaMtxSourceMap(streams));

expect(streams.main.rtspPath).toBe("h264Preview_01_main");
expect(streams.sub.rtspPath).toBe("h264Preview_01_sub");
expect(yaml).toContain(`${MEDIAMTX_MAIN_PATH}:`);
expect(yaml).toContain(`${MEDIAMTX_SUB_PATH}:`);
expect(yaml).toContain("sourceOnDemand: yes");
```

**Apply to Phase 9:** add repeatability tests for start/stop/status, pure tests for FFmpeg argument/config builders, runtime path pinning tests, and failure classification tests.

### Adapter/Plugin Registry Tests

**Source:** `tests/camera/adapter-contract.test.ts`

**Registry and shape pattern** (lines 75-89, 115-125):
```typescript
registerCameraAdapters();

const adapters = getRegisteredCameraAdapters();
const resolvedAdapter = resolveCameraAdapter(snapshot.identity);

expect(adapters).toHaveLength(1);
expect(adapters[0]?.adapterId).toBe("reolink-rlc-423s");
expect(resolvedAdapter?.adapterId).toBe("reolink-rlc-423s");
expect(resolvedAdapter).toBe(adapters[0]);

function expectAdapterShape(adapter: CameraAdapter | undefined): asserts adapter is CameraAdapter {
  expect(adapter).toBeDefined();
  expect(typeof adapter?.adapterId).toBe("string");
  expect(typeof adapter?.matchesIdentity).toBe("function");
  expect(typeof adapter?.probe).toBe("function");
  expect(typeof adapter?.classifyFailure).toBe("function");
}
```

**Apply to Phase 9:** assert plugin contract shape, built-in YouTube plugin registration, idempotent registration, capability flags, and normalized failures.

### Diagnostics/Redaction Tests

**Sources:** `tests/debug-capture.test.ts`, `tests/server/diagnostics-logging.test.ts`

**Redaction assertion pattern** (debug-capture lines 13-34):
```typescript
const sanitized = sanitizeForDebug({
  request: {
    User: {
      userName: "admin",
      password: "",
    },
  },
  response: {
    Token: {
      name: "fixture-token",
      leaseTime: 3600,
    },
  },
});
const serialized = JSON.stringify(sanitized);

expect(serialized).toContain("password");
expect(serialized).not.toContain('"password":""');
expect(serialized).not.toContain("fixture-token");
expect(serialized).toContain("[MASKED_TOKEN]");
```

**Logger binding assertion pattern** (diagnostics logging lines 61-78, 94-106):
```typescript
const bindings = createDiagnosticsLoggerBindings({
  requestId: "req-abc",
  adapterId: "reolink-rlc-423s",
  scope: "settings",
  cameraHost: "192.168.1.100",
});

expect(bindings).not.toHaveProperty("password");
expect(bindings).not.toHaveProperty("token");
expect(bindings).not.toHaveProperty("rtspUrl");
```

**Apply to Phase 9:** add explicit tests for YouTube stream keys, RTMP URLs, bearer tokens, and plugin config secrets in artifacts, logs, route payloads, and UI bootstrap payloads.

### Web Component Tests

**Sources:** `tests/web/live-view-controls.test.tsx`, `tests/web/settings-panel.test.tsx`

**Hook mock pattern** (live-view controls lines 8-33):
```typescript
vi.mock("../../web/src/hooks/use-live-view.js", () => ({
  useLiveView: vi.fn(),
}));

const useLiveViewMock = vi.mocked(useLiveView);

beforeEach(() => {
  vi.clearAllMocks();
  useLiveViewMock.mockReturnValue(
    createLiveViewState({
      retry,
      selectMode,
    }),
  );
});
```

**User flow pattern** (settings panel lines 37-77):
```typescript
const user = userEvent.setup();

render(<SettingsPanel />);

const timeCard = await screen.findByTestId("settings-section-time");
await user.click(within(timeCard).getByRole("button", { name: "Edit" }));
await user.clear(within(timeCard).getByLabelText("NTP Server"));
await user.type(within(timeCard).getByLabelText("NTP Server"), "time.nist.gov");
await user.click(within(timeCard).getByRole("button", { name: "Review Changes" }));

expect(
  (
    within(timeCard).getByRole("button", {
      name: "Apply Settings",
    }) as HTMLButtonElement
  ).disabled,
).toBe(false);
```

**Apply to Phase 9:** mock hooks for top-level panel rendering tests, mock API clients for hook/component flow tests, use role/name queries, and assert plugin/streaming controls are disabled when config or capability is unavailable.

## No Analog Found

| File or Area | Role | Data Flow | Reason |
|---|---|---|---|
| None | n/a | n/a | Existing route, registry, runtime, config, diagnostics, UI, and test patterns cover Phase 9. |

## Metadata

**Analog search scope:** `AGENTS.md`, `CLAUDE.md`, `src/server`, `src/config`, `src/media`, `src/camera`, `src/diagnostics`, `web/src`, `tests/server`, `tests/media`, `tests/web`, `tests/camera`
**Files scanned:** 70+ source, test, and planning files via `rg --files` / targeted reads
**Pattern extraction date:** 2026-04-27
