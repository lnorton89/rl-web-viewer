# Research Summary

## Stack

Use a local Node.js application with a browser dashboard, a camera adapter/session layer for Reolink control APIs, and a separate media layer for browser-safe live view.

## Table Stakes

- LAN authentication and device discovery
- Modern browser live view
- PTZ controls
- Readable and writable camera settings
- Good diagnostics for firmware-specific behavior

## Watch Out For

- RTSP is not directly browser-friendly, so live view needs an explicit media strategy.
- CGI/config behavior may vary by firmware, so the RLC-423S capability map matters.
- Config writes should be phased in carefully and verified after each change.

## Implications For The Roadmap

The roadmap should prove connectivity and capability detection before UI polish, and it should de-risk live view before deeper settings work. Adapter boundaries should appear early even though only one model is supported in v1.
