"use client";

import * as React from "react";

/**
 * Service worker registration (NOA-108). Client-only and production-only —
 * in development the SW would cache stale dev assets and fight HMR, so it is
 * never registered there (reference: legacy/components/ServiceWorkerRegistration.tsx).
 *
 * Also implements the update flow for `public/sw.js`: when a new worker
 * reaches the "waiting" state a refresh prompt is shown; accepting posts
 * SKIP_WAITING and reloads once the new worker takes control.
 */
export function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = React.useState<ServiceWorker | null>(null);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (cancelled) return;

        // A worker may already be waiting (e.g. update found on a prior visit).
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // "installed" + an existing controller means an update is waiting
            // (on first install there is no controller — no prompt needed).
            if (!cancelled && installing.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(installing);
            }
          });
        });
      })
      .catch((error) => {
        console.warn("Service worker registration failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = React.useCallback(() => {
    if (!waitingWorker) return;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => window.location.reload(),
      { once: true },
    );
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker]);

  if (!waitingWorker) return null;

  return (
    // bottom-20 keeps the prompt clear of the mobile bottom navigation.
    <div className="fixed bottom-20 right-4 z-50 rounded-lg bg-primary text-primary-foreground shadow-lg md:bottom-4">
      <button
        type="button"
        onClick={handleRefresh}
        className="ui-md flex items-center gap-2 px-4 py-3 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        New version available — Refresh
      </button>
    </div>
  );
}
