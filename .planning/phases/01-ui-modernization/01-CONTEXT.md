---
phase: 01-ui-modernization
context: v1.1
created: 2026-04-16
---

# Phase 1 Context: UI Modernization

## Phase Goal

Rebuild the React dashboard with a modern framework approach that fits in a desktop browser window without scrolling.

**Requirements:**
- UI-01: All controls fit in a 1920x1080 desktop window without scrolling
- UI-02: Navigation provides quick access to Live View, PTZ, and Settings
- UI-03: Use current React best practices with proper component organization

## Decisions Made

### 1. Layout: Sidebar + Main Content

```
┌────────┬─────────────────────────────────────────┐
│        │ Live View (large, takes most space)   │
│ Sidebar│                                         │
│  Nav   ├─────────────────────────────────────────┤
│        │ PTZ Panel (collapsible)              │
│ Live   ├─────────────────────────────────────────┤
│ PTZ    │ Settings (tabbed sections)          │
│ Settings│                                         │
├────────┴─────────────────────────────────────────┤
│ Status Bar (minimal)                          │
└──────────────────────────────────────────────┘
```

**Resolution:** 1920×1080 fits with sidebar at ~200px width.

**Benefits:**
- Sidebar stays fixed, content area scrolls if needed
- Clear navigation with icons + labels
- Live view takes priority space
- Can collapse sidebar on smaller screens

### 2. UI Framework: MUI (Material UI)

- Use MUI v5/v6 components
- Leverage mui components: AppBar, Drawer, Tabs, Slider, TextField, etc.
- Use MUI theming for consistent dark theme

**Dependencies to add:**
- `@mui/material`
- `@mui/icons-material`
- `@emotion/react`
- `@emotion/styled`

### 3. Styling: CSS Modules

- Split current `styles.css` into per-component modules
- Example: `App.module.css`, `LiveViewer.module.css`, `PtzPanel.module.css`
- MUI sx prop for inline styles where appropriate

### 4. State Management: Keep Hooks + Add Context

- Keep existing `useLiveView`, `usePtzControls`, `useSettings` hooks
- Add React Context for theme/dark mode toggle
- No additional state library needed

## Implementation Notes

### Migration Path

1. Install MUI dependencies
2. Create MUI theme matching current dark palette
3. Build layout with MUI Drawer (sidebar) + AppBar
4. Move existing components into layout slots
5. Split CSS into modules as components are touched

### Component Mapping

| Current Component | New Location |
|----------------|-----------|
| App.tsx | Layout shell (MUI) |
| LiveViewerFrame | Main content area |
| PtzPanel | Below viewer or drawer |
| SettingsPanel | Settings tab content |
| ModeSwitcher | Sidebar or toolbar |
| DiagnosticsDisclosure | Status bar or drawer |

### Dark Theme (MUI)

Current colors to preserve in MUI theme:
- `--color-dominant`: #12161b
- `--color-secondary`: #1d242c
- `--color-accent`: #63c7b2
- `--color-border`: rgba(255, 255, 255, 0.08)
- `--color-muted`: #97a4ad
- `--color-danger`: #c65a5a

## What This Enables

- Desktop-friendly dashboard that fits 1920×1080
- Consistent Material Design components
- Proper dark mode theming
- Maintainable component-scoped styles
- Room for expansion (future features)

## Next Steps

After CONTEXT.md:
1. Run `/gsd-plan-phase 1` to create execution plan
2. Execute plan to build new UI

---
*CONTEXT created during discuss-phase 1*