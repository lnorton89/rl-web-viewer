---
phase: 02-ptz-enhancement
wave: 1
depends_on: []
autonomous: false
requirements_addressed:
  - PTZ-04
  - PTZ-05
  - PTZ-06
files_modified:
  - src/types/ptz.ts
  - src/camera/reolink-ptz.ts
  - src/server/routes/ptz.ts
  - web/src/lib/ptz-api.ts
  - web/src/hooks/use-ptz-controls.ts
  - web/src/components/PtzPanel.tsx
  - web/src/components/PtzPanel.module.css
---

<objective>
Add PTZ enhancement controls: Focus (near/far), Iris (open/close), and Speed slider to match the camera's built-in dashboard functionality.
</objective>

<tasks>

<task>
<read_first>
- src/types/ptz.ts
- src/camera/reolink-ptz.ts
- src/server/routes/ptz.ts
</read_first>

<action>
Add focus, iris, and speed types and service methods to backend. Extend `src/types/ptz.ts` with:

```typescript
export type FocusDirection = "near" | "far";
export type IrisDirection = "open" | "close";

export type FocusResult = { focusValue: number };
export type IrisResult = { irisValue: number };
export type SpeedResult = { speedValue: number };

export interface PtzService {
  // ... existing methods
  setFocus(value: number): Promise<FocusResult>;
  setIris(value: number): Promise<IrisResult>;
  setSpeed(value: number): Promise<SpeedResult>;
}
```

Extend `src/camera/reolink-ptz.ts` with methods that call camera API endpoints:
- POST /api/ptz/focus with { focus: 0-100 }
- POST /api/ptz/iris with { iris: 0-100 }  
- POST /api/ptz/speed with { speed: 1-10 }

The camera API commands: 
- Focus: `curl -X POST "http://CAMERA/cgi-bin/api.cgi?cmd=SetFocus" -d "cmd=[{"channel":0,"focus":VALUE,"op":"SetFocus"}]"`
- Iris: `curl -X POST "http://CAMERA/cgi-bin/api.cgi?cmd=SetIris" -d "cmd=[{"channel":0,"iris":VALUE,"op":"SetIris"}]"`
- Speed: `curl -X POST "http://CAMERA/cgi-bin/api.cgi?cmd=SetPtzSpeed" -d "cmd=[{"channel":0,"speed":VALUE,"op":"SetPtzSpeed"}]"`

Extend `src/server/routes/ptz.ts` with:
- GET /api/ptz/advanced - returns current focus, iris, speed values
- POST /api/ptz/focus - body: { focus: number }
- POST /api/ptz/iris - body: { iris: number }
- POST /api/ptz/speed - body: { speed: number }
</action>

<acceptance_criteria>
- src/types/ptz.ts contains FocusDirection, IrisDirection, FocusResult, IrisResult, SpeedResult types
- src/types/ptz.ts PtzService interface includes setFocus, setIris, setSpeed methods
- src/camera/reolink-ptz.ts implements setFocus, setIris, setSpeed methods
- src/server/routes/ptz.ts exposes GET /api/ptz/advanced, POST /api/ptz/focus, POST /api/ptz/iris, POST /api/ptz/speed endpoints
- Backend compiles without TypeScript errors
</acceptance_criteria>
</task>

<task>
<read_first>
- web/src/lib/ptz-api.ts
</read_first>

<action>
Add frontend API functions in `web/src/lib/ptz-api.ts`:

```typescript
export async function fetchPtzAdvanced(signal?: AbortSignal): Promise<{
  focus: number;
  iris: number;
  speed: number;
}> {
  const response = await fetch("/api/ptz/advanced", { signal });
  if (!response.ok) throw new Error("Failed to fetch PTZ advanced settings");
  return response.json();
}

export async function setFocus(focus: number, signal?: AbortSignal): Promise<{ focus: number }> {
  const response = await fetch("/api/ptz/focus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ focus }),
    signal,
  });
  if (!response.ok) throw new Error("Failed to set focus");
  return response.json();
}

export async function setIris(iris: number, signal?: AbortSignal): Promise<{ iris: number }> {
  const response = await fetch("/api/ptz/iris", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iris }),
    signal,
  });
  if (!response.ok) throw new Error("Failed to set iris");
  return response.json();
}

export async function setSpeed(speed: number, signal?: AbortSignal): Promise<{ speed: number }> {
  const response = await fetch("/api/ptz/speed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speed }),
    signal,
  });
  if (!response.ok) throw new Error("Failed to set speed");
  return response.json();
}
```
</action>

<acceptance_criteria>
- web/src/lib/ptz-api.ts exports fetchPtzAdvanced, setFocus, setIris, setSpeed functions
- All functions accept optional AbortSignal parameter
- All functions throw descriptive errors on failure
- Frontend compiles without TypeScript errors
</acceptance_criteria>
</task>

<task>
<read_first>
- web/src/hooks/use-ptz-controls.ts
</read_first>

<action>
Extend the usePtzControls hook to include focus, iris, and speed control:

Add state for advanced settings:
```typescript
const [focusValue, setFocusValue] = useState(50);
const [irisValue, setIrisValue] = useState(50);
const [speedValue, setSpeedValue] = useState(5);
```

Add callback handlers:
```typescript
const setFocus = useCallback(async (value: number) => {
  if (!supportsPtzControl) return;
  try {
    const result = await setFocusApi(value);
    setFocusValue(result.focus);
    setTransientStatus(`Focus set to ${result.focus}`);
  } catch (error) {
    setErrorText(getErrorMessage(error, COMMAND_FAILURE_COPY));
  }
}, [supportsPtzControl]);

const setIris = useCallback(async (value: number) => {
  if (!supportsPtzControl) return;
  try {
    const result = await setIrisApi(value);
    setIrisValue(result.iris);
    setTransientStatus(`Iris set to ${result.iris}`);
  } catch (error) {
    setErrorText(getErrorMessage(error, COMMAND_FAILURE_COPY));
  }
}, [supportsPtzControl]);

const setSpeed = useCallback(async (value: number) => {
  if (!supportsPtzControl) return;
  try {
    const result = await setSpeedApi(value);
    setSpeedValue(result.speed);
    setTransientStatus(`Speed set to ${result.speed}`);
  } catch (error) {
    setErrorText(getErrorMessage(error, COMMAND_FAILURE_COPY));
  }
}, [supportsPtzControl]);
```

Update useEffect to fetch initial advanced settings:
```typescript
// After bootstrap fetch succeeds, fetch advanced settings
if (bootstrap.supportsPtzControl) {
  fetchPtzAdvanced().then(({ focus, iris, speed }) => {
    setFocusValue(focus);
    setIrisValue(iris);
    setSpeedValue(speed);
  }).catch(() => { /* ignore - defaults will be used */ });
}
```

Extend the return type:
```typescript
return {
  // ... existing returns
  focusValue,
  irisValue,
  speedValue,
  setFocus,
  setIris,
  setSpeed,
};
```
</action>

<acceptance_criteria>
- usePtzControls hook exports focusValue, irisValue, speedValue state
- usePtzControls hook exports setFocus, setIris, setSpeed functions
- Initial values fetched from /api/ptz/advanced on bootstrap
- Frontend compiles without TypeScript errors
</acceptance_criteria>
</task>

<task>
<read_first>
- web/src/components/PtzPanel.tsx
- web/src/components/PtzPanel.module.css
</read_first>

<action>
Add speed slider above pan/tilt controls, focus and iris controls below zoom section in PtzPanel.tsx:

After the motion group (line 153), add:

```tsx
<section className="ptz-speed-group" aria-labelledby="ptz-speed-heading">
  <div className="section-heading">
    <p className="support-label">Speed</p>
    <h3 id="ptz-speed-heading">Movement speed (1-10)</h3>
  </div>
  <div className="ptz-slider-row">
    <button
      className="ptz-slider-button"
      disabled={!supportsPtzControl || busyAction !== null}
      type="button"
      onClick={() => setSpeed(Math.max(1, speedValue - 1))}
      aria-label="Decrease speed"
    >
      -
    </button>
    <input
      type="range"
      min="1"
      max="10"
      value={speedValue}
      onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
      disabled={!supportsPtzControl || busyAction !== null}
      className="ptz-speed-slider"
      aria-label={`Speed: ${speedValue}`}
    />
    <button
      className="ptz-slider-button"
      disabled={!supportsPtzControl || busyAction !== null}
      type="button"
      onClick={() => setSpeed(Math.min(10, speedValue + 1))}
      aria-label="Increase speed"
    >
      +
    </button>
    <span className="ptz-slider-value">{speedValue}</span>
  </div>
</section>

<section className="ptz-focus-group" aria-labelledby="ptz-focus-heading">
  <div className="section-heading">
    <p className="support-label">Focus</p>
    <h3 id="ptz-focus-heading">Focus adjustment (Near/Far)</h3>
  </div>
  <div className="ptz-slider-row">
    <button
      className="ptz-slider-button"
      disabled={!supportsPtzControl || busyAction !== null}
      type="button"
      onClick={() => setFocus(Math.max(0, focusValue - 5))}
      aria-label="Focus near"
    >
      Near
    </button>
    <input
      type="range"
      min="0"
      max="100"
      value={focusValue}
      onChange={(e) => setFocus(parseInt(e.target.value, 10))}
      disabled={!supportsPtzControl || busyAction !== null}
      className="ptz-focus-slider"
      aria-label={`Focus: ${focusValue}`}
    />
    <button
      className="ptz-slider-button"
      disabled={!supportsPtzControl || busyAction !== null}
      type="button"
      onClick={() => setFocus(Math.min(100, focusValue + 5))}
      aria-label="Focus far"
    >
      Far
    </button>
    <span className="ptz-slider-value">{focusValue}</span>
  </div>
</section>

<section className="ptz-iris-group" aria-labelledby="ptz-iris-heading">
  <div className="section-heading">
    <p className="support-label">Iris</p>
    <h3 id="ptz-iris-heading">Iris adjustment (Open/Close)</h3>
  </div>
  <div className="ptz-slider-row">
    <button
      className="ptz-slider-button"
      disabled={!supportsPtzControl || busyAction !== null}
      type="button"
      onClick={() => setIris(Math.max(0, irisValue - 5))}
      aria-label="Iris close"
    >
      Close
    </button>
    <input
      type="range"
      min="0"
      max="100"
      value={irisValue}
      onChange={(e) => setIris(parseInt(e.target.value, 10))}
      disabled={!supportsPtzControl || busyAction !== null}
      className="ptz-iris-slider"
      aria-label={`Iris: ${irisValue}`}
    />
    <button
      className="ptz-slider-button"
      disabled={!supportsPtzControl || busyAction !== null}
      type="button"
      onClick={() => setIris(Math.min(100, irisValue + 5))}
      aria-label="Iris open"
    >
      Open
    </button>
    <span className="ptz-slider-value">{irisValue}</span>
  </div>
</section>
```

Add CSS in PtzPanel.module.css:

```css
.ptz-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ptz-slider-button {
  min-width: 60px;
  padding: 8px 12px;
  background: #2a2a2a;
  color: #fff;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
}

.ptz-slider-button:hover:not(:disabled) {
  background: #3a3a3a;
}

.ptz-slider-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ptz-slider-value {
  min-width: 32px;
  text-align: center;
  font-weight: bold;
  color: #90caf9;
}

.ptz-speed-slider,
.ptz-focus-slider,
.ptz-iris-slider {
  flex: 1;
  accent-color: #90caf9;
}

.ptz-speed-group,
.ptz-focus-group,
.ptz-iris-group {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #333;
}
```
</action>

<acceptance_criteria>
- PtzPanel.tsx renders speed slider above pan/tilt controls (range 1-10)
- PtzPanel.tsx renders focus slider with Near/Far buttons below zoom (range 0-100)
- PtzPanel.tsx renders iris slider with Open/Close buttons below focus (range 0-100)
- All sliders display current value
- All controls disabled when PTZ not supported or busy
- CSS module includes proper styling for all new elements
- Browser build completes without errors
</acceptance_criteria>
</task>

<task>
<read_first>
- web/src/components/PtzPanel.tsx
</read_first>

<action>
Update PtzPanel.tsx to destructure new hook returns:

```typescript
const {
  // ... existing destructures
  focusValue,
  irisValue,
  speedValue,
  setFocus,
  setIris,
  setSpeed,
} = usePtzControls();
```
</action>

<acceptance_criteria>
- PtzPanel.tsx properly uses focusValue, irisValue, speedValue from hook
- PtzPanel.tsx properly calls setFocus, setIris, setSpeed on slider input/button events
</acceptance_criteria>
</task>

</tasks>

<verification>
- Verify TypeScript compilation passes for all modified files
- Verify browser build completes successfully
- Verify all new API endpoints respond correctly (manual test with camera or mock)
- Verify PTZ panel renders with all three new control sections
- Verify slider interactions update camera settings
</verification>

<must_haves>
- Focus control slider with Near/Far buttons, range 0-100
- Iris control slider with Open/Close buttons, range 0-100  
- Speed control slider, range 1-10, affects PTZ movement speed
- All controls follow existing PTZ panel patterns (MUI + CSS modules)
- All controls disabled appropriately when PTZ unavailable or busy
</must_haves>