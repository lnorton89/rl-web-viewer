---
phase: 09-plugin-system-youtube-streaming
reviewed: 2026-04-27T04:01:48Z
depth: deep
files_reviewed: 29
files_reviewed_list:
  - src/config/plugin-config.ts
  - src/config/youtube-config.ts
  - src/plugins/plugin-contract.ts
  - src/plugins/plugin-registry.ts
  - src/plugins/youtube/youtube-live-api.ts
  - src/plugins/youtube/youtube-oauth.ts
  - src/plugins/youtube/youtube-plugin.ts
  - src/media/youtube-ffmpeg-config.ts
  - src/media/youtube-runtime.ts
  - src/media/youtube-stream-service.ts
  - src/server/routes/plugins.ts
  - src/server/create-server.ts
  - src/diagnostics/debug-capture.ts
  - src/types/plugins.ts
  - src/types/youtube-streaming.ts
  - web/src/lib/plugin-api.ts
  - web/src/lib/youtube-streaming-api.ts
  - web/src/hooks/use-plugins.ts
  - web/src/hooks/use-youtube-streaming.ts
  - web/src/components/PluginPanel.tsx
  - web/src/components/YoutubeStreamingPanel.tsx
  - web/src/App.tsx
  - web/src/components/LayoutShell.tsx
  - tests/plugins/plugin-runtime.test.ts
  - tests/plugins/youtube-live-workflow.test.ts
  - tests/plugins/youtube-oauth.test.ts
  - tests/media/youtube-egress.test.ts
  - tests/server/plugin-routes.test.ts
  - tests/web/plugin-panel.test.tsx
findings:
  critical: 0
  warning: 4
  info: 1
  total: 5
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-04-27T04:01:48Z
**Depth:** deep
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Reviewed the Phase 9 plugin runtime, YouTube OAuth/token storage, Live API/FFmpeg egress lifecycle, plugin routes, browser API/hooks/UI, and Phase 9 tests. Focused Phase 9 tests passed, and `npm run build` passed with the existing Vite chunk warning.

The main issues are behavioral gaps not covered by the current tests: the generated OAuth callback URL has no browser route, the UI bypasses explicit public setup confirmation, the FFmpeg start path does not poll/transition once YouTube input becomes active, and the plugin-held stream service can retain stale config across requests.

## Warnings

### WR-01: OAuth redirect URL points to a route that does not exist

**File:** `src/plugins/youtube/youtube-oauth.ts:102`
**Issue:** `beginAuth` defaults the Google redirect URI to `/api/plugins/youtube-streaming/oauth/callback`, but `pluginsRoutes` only registers `/api/plugins`, `/api/plugins/:pluginId`, config/enable/disable, and the generic POST action route. A real Google OAuth redirect is a browser GET with `code` and `state`, so the user will land on a 404 and there is no implemented path to complete the loopback flow without manually POSTing `auth.callback`.
**Fix:** Add an explicit callback route that validates query params and dispatches `auth.callback`, then returns a small browser page or redirect back to the SPA.

```typescript
app.get("/api/plugins/youtube-streaming/oauth/callback", async (request, reply) => {
  const query = oauthCallbackQuerySchema.parse(request.query);
  const runtime = await resolveRuntime();
  await runtime.invokeAction("youtube-streaming", "auth.callback", query);
  return reply.type("text/html").send("<!doctype html><p>YouTube connected.</p>");
});
```

### WR-02: Set Up Stream bypasses explicit public-broadcast confirmation

**File:** `web/src/components/YoutubeStreamingPanel.tsx:143`
**Issue:** The setup button sends `confirmPublic: true` whenever current status privacy is `public`, regardless of whether the user checked the public confirmation box. This weakens the Phase 9 safety contract: public setup/start must require explicit confirmation from the UI, not a derived flag.
**Fix:** Use the same confirmation state as start, and disable or no-op setup until checked when privacy is public.

```tsx
const setupDisabled = !status?.auth.connected || isPending || (requiresPublicConfirmation && !publicConfirmed);

<Button
  disabled={setupDisabled}
  onClick={() => void setup({
    confirmPublic: requiresPublicConfirmation ? publicConfirmed : false,
  })}
>
  Set Up Stream
</Button>
```

### WR-03: Stream start never transitions later if YouTube input becomes active after launch

**File:** `src/media/youtube-stream-service.ts:248`
**Issue:** `start` checks stream health once immediately after spawning FFmpeg and transitions to live only if that single read is already `active`. If YouTube reports `ready`/`inactive` first and becomes active seconds later, the process keeps running but lifecycle never transitions. A repeated start returns early as idempotent when `runningProcess` is running, so it also will not recheck health or transition.
**Fix:** Poll `getStreamStatus` after spawn until active or timeout, then transition. Alternatively, make `stream.status` or repeated `stream.start` perform the transition when a running stream has become active.

```typescript
const stream = await waitForActiveStream(config.streamId, {
  getStatus: options.youtube.getStreamStatus,
  timeoutMs: 30_000,
});
if (stream.health === "active") {
  await transitionBroadcastLive(config.broadcastId);
}
```

### WR-04: Cached stream service closes over stale plugin config

**File:** `src/plugins/youtube/youtube-plugin.ts:55`
**Issue:** `streamService` and `localStreamConfig` are cached inside the plugin instance. The service's `loadStreamConfig` reads the cached `localStreamConfig`, and `saveStreamConfig` writes through the `context.config` captured when the service was first created. Later requests can configure a new title/privacy or load a fresh config from disk, but the cached service can still operate on and write back the older config snapshot, causing stale setup/start values or overwriting unrelated plugin values.
**Fix:** Do not capture a per-request `context` inside a long-lived service. Either create the stream service per action, or inject load/save functions that load the latest plugin config from disk each time before merging and saving.

```typescript
loadStreamConfig: async () =>
  extractStreamConfig(getPluginState(await loadPluginConfig(configPath), YOUTUBE_PLUGIN_ID).values),
saveStreamConfig: async (streamConfig) => {
  const latest = await loadPluginConfig(configPath);
  return saveMergedYouTubeStreamConfig(latest, streamConfig);
}
```

## Info

### IN-01: Browser API type does not match server status route

**File:** `web/src/lib/plugin-api.ts:21`
**Issue:** `fetchPluginStatus` is typed as `Promise<PluginSummary>`, but `GET /api/plugins/:pluginId` returns `PluginStatus`. This is not currently surfacing because the helper appears unused, but it will mislead future UI code and can cause runtime field assumptions to be wrong.
**Fix:** Change the return type to `Promise<PluginStatus>` and update the generic passed to `requestJson`.

---

_Reviewed: 2026-04-27T04:01:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
