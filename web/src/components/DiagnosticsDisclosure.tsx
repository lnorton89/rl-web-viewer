import { useState } from "react";

import type { LiveModeId } from "../../../src/types/live-view.js";

type DiagnosticsDisclosureProps = {
  currentModeId: LiveModeId | null;
  currentModeLabel: string;
  nextFallbackModeId: LiveModeId | null;
  reason?: string;
  renderKind: "video" | "image";
};

export function DiagnosticsDisclosure({
  currentModeId,
  currentModeLabel,
  nextFallbackModeId,
  reason,
  renderKind,
}: DiagnosticsDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      className="diagnostics-disclosure"
      aria-labelledby="diagnostics-heading"
    >
      <div className="section-heading">
        <p className="support-label">Diagnostics</p>
        <h2 id="diagnostics-heading">Transport details stay secondary</h2>
      </div>

      <button
        aria-controls="diagnostics-panel"
        aria-expanded={isOpen}
        className="diagnostics-toggle"
        type="button"
        onClick={() => {
          setIsOpen((value) => !value);
        }}
      >
        Diagnostics
      </button>

      {isOpen ? (
        <div className="diagnostics-panel" id="diagnostics-panel">
          <div>
            <p className="support-label">Current mode</p>
            <p className="support-value">{currentModeLabel}</p>
            <p className="diagnostics-meta">{currentModeId ?? "No active mode"}</p>
          </div>

          <div>
            <p className="support-label">Last reason</p>
            <p className="support-value">{reason?.trim() || "No recent issue"}</p>
          </div>

          <div>
            <p className="support-label">Next fallback</p>
            <p className="support-value">
              {nextFallbackModeId ?? "No fallback queued"}
            </p>
          </div>

          <div>
            <p className="support-label">Surface</p>
            <p className="support-value">
              {renderKind === "video" ? "Video transport" : "Snapshot image"}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
