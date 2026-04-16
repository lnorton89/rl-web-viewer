# Camera Adapters

`CameraAdapter` is the model boundary for discovery, capability mapping, live-stream resolution, PTZ service creation, settings service creation, and diagnostics classification.

Phase 5 registers one adapter in `src/camera/adapters/index.ts`: the `RLC-423S` adapter used by the current firmware target.

For a future model:

1. Implement `CameraAdapter` for that model and keep model quirks inside adapter-owned modules.
2. Add fixture-backed tests that prove discovery, capability mapping, live view, PTZ, settings, and failure classification behave correctly.
3. Register the adapter in `src/camera/adapters/index.ts`.
4. Use sanitized fixtures as the proof source for firmware-specific behavior instead of leaking those details into shared contracts.

The shared contract should stay free of raw CGI command names, firmware suffixes, and model-specific parsing rules. Those belong behind the adapter seam so future model work extends the camera stack instead of restructuring it.
