/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { testDialogueLoading } from "./test-firebase-dialogue";
import { AuthProvider } from "./features/auth/AuthContext";
import { ProfileProvider } from "./features/profile/ProfileContext";
import "./styles/quiz-ui.css";

const CLIENT_DEBUG =
  (globalThis as any)?.process?.env?.CLIENT_DEBUG === "1" ||
  (globalThis as any)?.Bun?.env?.CLIENT_DEBUG === "1";

if (CLIENT_DEBUG && typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("[client-debug] window.error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: (event.error as any)?.stack,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[client-debug] unhandledrejection", event.reason);
  });
}

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <AuthProvider>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </AuthProvider>
  </StrictMode>
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
  if (CLIENT_DEBUG) {
    console.log("[client-debug] React mounted (HMR)");
  }
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
  if (CLIENT_DEBUG) {
    console.log("[client-debug] React mounted");
  }
}

// Make test function available in console for debugging
(window as any).testDialogueLoading = testDialogueLoading;
