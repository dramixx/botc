import { useEffect, useState } from 'preact/hooks';

/** Set once a newer service worker has taken over: the running page is then out of date. */
let stale = false;
const listeners = new Set<() => void>();

/** Registers the service worker and looks for a newer build each time the app is opened or comes back to the foreground. */
export function initUpdates() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  const hadController = navigator.serviceWorker.controller !== null;
  // The worker skips waiting and claims its clients: a controller change after the first load means a new build is ready.
  let first = !hadController;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (first) { first = false; return; }
    stale = true;
    for (const l of listeners) l();
  });
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').then((reg) => {
      const check = () => { void reg.update().catch(() => {}); };
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      check();
    });
  });
}

/** True when a newer build is installed but the page still runs the old one. */
export function useStale() {
  const [s, setS] = useState(stale);
  useEffect(() => {
    const l = () => setS(stale);
    listeners.add(l);
    l();
    return () => { listeners.delete(l); };
  }, []);
  return s;
}
