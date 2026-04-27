# Deferred Items

## 2026-04-27 - 09-04 Full-Suite Runtime Test Mismatch

- **Scope:** Out of scope for Wave 4 because `tests/plugins/plugin-runtime.test.ts` is not listed in `09-04-PLAN.md` file ownership.
- **Found during:** `npm test` after Wave 4 implementation.
- **Issue:** `tests/plugins/plugin-runtime.test.ts` still expects configuring `privacy: "public"` to reject with validation, but the Phase 09-03 server contract allows public privacy config and enforces explicit confirmation at setup/start time.
- **Observed failure:** `plugin runtime > normalizes unknown plugins, disabled actions, unsupported actions, and validation failures`.
- **Recommended fix:** Update the server/runtime test in a follow-up task to assert public start/setup confirmation behavior instead of public config rejection.
- **Wave 4 impact:** Focused PLUG-04 tests and production build pass; the failing test is not caused by Wave 4 UI files.
