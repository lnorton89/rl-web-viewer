# Phase 4: Settings & Safe Configuration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-15T08:05:00-07:00
**Phase:** 04-settings-safe-configuration
**Areas discussed:** Settings scope, Editing workflow, Verification feedback, Failure handling, Read-only versus editable split

---

## Settings Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Safe v1 settings subset | Edit image/display, stream, and time/NTP settings while keeping network, storage, and alarm settings out of Phase 4 writes | x |
| Image/display only | Start with a narrower first pass focused only on image and display settings | |
| Broad admin surface | Expose a much broader editable settings surface including network and other system categories | |

**User's choice:** Safe v1 settings subset
**Notes:** Phase 4 should deliver useful configuration control without risking the LAN connection or expanding into higher-risk system administration yet.

---

## Editing Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Section review and apply | Stage edits per section, then review and apply explicitly for that section | x |
| Immediate save | Save each field as soon as the user changes it | |
| Whole-page apply | Edit the full page and apply everything at once | |

**User's choice:** Section review and apply
**Notes:** The write flow should stay explicit and local to the section being changed rather than mixing all categories together or auto-saving.

---

## Verification Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Verified before/after summary | Re-read from the camera after save, then show a compact before/after summary and mark the result verified | x |
| Generic success + refresh | Refresh values after save with only a simple success message | |
| Manual verify step | Require the user to trigger a separate verify action after applying changes | |

**User's choice:** Verified before/after summary
**Notes:** The app should prove that a write took effect without making the user take a second manual step.

---

## Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Inline + section feedback | Show inline field errors when possible and section-level camera/API feedback for broader failures | x |
| Section banner only | Use a section-level error banner without field-specific mapping | |
| Raw camera errors in main UI | Show raw camera error output directly in the primary interface | |

**User's choice:** Inline + section feedback
**Notes:** Settings failures should be precise and readable without pushing raw protocol noise into the main experience.

---

## Read-Only Versus Editable Split

| Option | Description | Selected |
|--------|-------------|----------|
| Wider read-only plus narrow edit scope | Show a broader inspect-only view while keeping editing limited to the safest confirmed subset | x |
| Editable only | Show only categories that are editable | |
| Edit everything exposed | Treat anything with a setter as editable immediately | |

**User's choice:** Wider read-only plus narrow edit scope
**Notes:** Inspection value and edit safety should be decoupled so the dashboard can be informative without overcommitting on risky writes.

---

## the agent's Discretion

- Exact field and section list inside the approved v1 editable subset
- The visual treatment of the section review/apply state
- The exact presentation of verified before/after summaries
- Which readable categories stay visible as inspect-only versus hidden until future phases

## Deferred Ideas

- Network reconfiguration stays out of scope for Phase 4.
- Storage, alarm, and broader system administration remain deferred or inspect-only until the safe write subset is proven.
