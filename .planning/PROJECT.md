# Reolink RLC-423S Node Console

## What This Is

This project is a local Node.js application that replaces the legacy Flash-dependent browser dashboard for a Reolink RLC-423S IP camera on the LAN. It is being built first for a single camera and a single user, but the internals should stay modular so future Reolink models can be added without rewriting the whole app.

## Core Value

Reliable local live view and PTZ/control of the RLC-423S from a modern browser without depending on Flash, cloud services, or the old vendor web UI.

## Current State

### v1.0 Delivered ✓

**Shipped:** 2026-04-16

| Feature | Status |
|--------|--------|
| Camera connectivity | ✓ LAN auth, discovery |
| Live view | ✓ WebRTC/HLS/snapshot |
| PTZ control | ✓ Pan/tilt/zoom/presets |
| Settings | ✓ Read/write with verify |
| Adapter contract | ✓ Extension ready |

**Delivery artifacts:**
- `.planning/milestones/v1.0/ROADMAP.md` — full phase archive
- `.planning/milestones/v1.0/REQUIREMENTS.md` — 17 requirements complete
- 123 tests passing

## Requirements

### Validated

- [x] Connect to the RLC-423S over the LAN, authenticate safely
- [x] Provide modern browser-based live view and PTZ control
- [x] Read and update core camera settings

### Active

(Document new requirements in next milestone)

### Out of Scope

- Multi-user access control — single-user LAN tool
- Remote WAN/cloud access — LAN-only priority
- Broad multi-model support in v1 — adapter architecture ready
- Playback/recordings library — future adjacent area

## Context

The camera is a Reolink RLC-423S with hardware `IPC_3816M` and firmware `v2.0.0.1055_17110905_v1.0.0.30`.

## Constraints

- **Tech stack**: Node.js application
- **Network scope**: LAN-only in v1
- **Target hardware**: Reolink RLC-423S first
- **Compatibility**: No Flash or browser plugins
- **Architecture**: Modular camera adapters

## Development Tools

### Material-UI MCP Server
This project uses MUI. When working on UI phases, use the `@mujs/mcp-mui-docs` MCP server for component guidance:
- Enabled MCP server: `mui-mcp`
- Provides access to MUI component documentation and examples
- Use `mui-mcp_useMuiDocs` for searching MUI docs
- Use `mui-mcp_fetchDocs` for fetching specific documentation pages

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local Node.js app | Replace Flash dashboard | ✓ Delivered v1.0 |
| RLC-423S first | Tight scope reduces risk | ✓ Delivered v1.0 |
| Modular adapter boundary | Future model support | ✓ Extension ready |
| Live view, PTZ, settings priority | User-stated replacements | ✓ Delivered v1.0 |

## Next Milestone Goals

**v1.1** — To be defined via `/gsd-new-milestone`

---

*v1.0 shipped: 2026-04-16*
*Last updated: 2026-04-16*