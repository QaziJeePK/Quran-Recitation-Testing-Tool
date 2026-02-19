import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";

const rootEl = document.getElementById("root");

if (!rootEl) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(135deg,#065f46,#0d9488);color:white;font-family:sans-serif;
      flex-direction:column;gap:1rem;padding:2rem;text-align:center;">
      <div style="font-size:4rem">🕌</div>
      <h1 style="font-size:1.5rem;font-weight:900">Quran Recitation Checker</h1>
      <p style="opacity:0.8">Error: Could not find root element. Please reload the page.</p>
      <button onclick="location.reload()" style="background:white;color:#065f46;border:none;
        border-radius:999px;padding:0.6rem 2rem;font-weight:700;font-size:1rem;cursor:pointer">
        🔄 Reload
      </button>
    </div>`;
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
