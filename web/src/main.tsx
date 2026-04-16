import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DarkTheme } from "./theme/DarkTheme.js";

import App from "./App.js";
import "./styles.css";

const rootElement = document.getElementById("app");

if (rootElement === null) {
  throw new Error("Expected #app root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <DarkTheme>
      <App />
    </DarkTheme>
  </StrictMode>,
);
