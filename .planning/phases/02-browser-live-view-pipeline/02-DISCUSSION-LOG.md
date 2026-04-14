# Phase 2: Browser Live View Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-13T23:03:31.6390794-07:00
**Phase:** 02-browser-live-view-pipeline
**Areas discussed:** Stream approach, Quality and fallback UX, Viewer behavior, Status and failure display

---

## Stream Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Low-latency first | Optimize for low-latency live view first, with a simpler fallback if the preferred stream fails | x |
| Compatibility-first | Prioritize the broadest browser compatibility even if latency is higher | |
| Simplest first | Ship the simplest possible viewer first and improve later | |

**User's choice:** Low-latency first
**Notes:** Phase 2 should prioritize a modern low-latency live-view experience, but it still needs a fallback mode.

---

## Quality And Fallback UX

| Option | Description | Selected |
|--------|-------------|----------|
| Auto first + manual switch | Auto-pick the best live mode first, but allow manual switching to other qualities or fallback views | x |
| Manual only | Show only a manual quality picker with no automatic choice | |
| Single default mode | Ship one default mode in v1 with no switching UI | |

**User's choice:** Auto first + manual switch
**Notes:** Startup should feel effortless, but the user should retain control over quality and fallback selection.

---

## Viewer Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-start + auto-reconnect | Start the viewer when the page opens and reconnect automatically after drops | x |
| Click-to-start + auto-reconnect | Require a click to start, then reconnect automatically after that | |
| Click-to-start + manual retry | Require explicit user action to start and recover | |

**User's choice:** Auto-start + auto-reconnect
**Notes:** The viewer should feel ready immediately on page load and recover on its own when possible.

---

## Status And Failure Display

| Option | Description | Selected |
|--------|-------------|----------|
| Clear in-view status | Show connecting/live/reconnecting/failed states with retry and a short readable reason | x |
| Minimal status | Show only a spinner and a generic failure message | |
| Technical diagnostics in-view | Put more technical troubleshooting details directly in the viewer from day one | |

**User's choice:** Clear in-view status
**Notes:** The primary viewer should explain what is happening in plain language and give a retry path without becoming a full diagnostics console.

---

## the agent's Discretion

- Exact streaming transport choice
- Exact fallback implementation
- Reconnect policy details
- Viewer visual design and overlay treatment

## Deferred Ideas

None
