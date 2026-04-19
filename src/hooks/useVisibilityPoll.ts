import { useEffect, useRef } from "react";

/** Polling périodique qui se met en pause automatiquement quand l'onglet passe en
 *  arrière-plan (document.hidden). Re-déclenche immédiatement au retour de focus si
 *  on a raté au moins un tick.
 *
 *  Pas un remplacement de realtime — vise un rafraîchissement "best effort" pour
 *  que le gestionnaire n'ait pas à recharger manuellement après quelques minutes. */
export function useVisibilityPoll(callback: () => void | Promise<void>, intervalMs = 60_000) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    let timer: number | null = null;
    let lastRunAt = Date.now();

    const run = () => {
      lastRunAt = Date.now();
      void cbRef.current();
    };

    const start = () => {
      if (timer != null) return;
      timer = window.setInterval(run, intervalMs);
    };
    const stop = () => {
      if (timer == null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        // Si on a dépassé un intervalle pendant que l'onglet était caché, on refetch
        // tout de suite pour rattraper. Sinon on attend le prochain tick normal.
        if (Date.now() - lastRunAt >= intervalMs) run();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
}
