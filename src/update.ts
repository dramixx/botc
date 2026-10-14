import { useEffect, useState } from 'preact/hooks';

/** 'downloading': a newer build is being fetched; 'ready': it is installed but the running page is still the old one. */
export type UpdateStatus = 'idle' | 'downloading' | 'ready';
let status: UpdateStatus = 'idle';
const set = (s: UpdateStatus) => { status = s; for (const l of listeners) l(); };
const listeners = new Set<() => void>();

/** Registers the service worker and looks for a newer build each time the app is opened or comes back to the foreground. */
export function initUpdates() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  const hadController = navigator.serviceWorker.controller !== null;
  // The worker skips waiting and claims its clients: a controller change after the first load means a new build is ready.
  let first = !hadController;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (first) { first = false; return; }
    set('ready');
  });
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w || status === 'ready') return;
        set('downloading');
        // A failed install leaves the old build running: drop the indicator.
        w.addEventListener('statechange', () => { if (w.state === 'redundant' && status === 'downloading') set('idle'); });
      });
      const check = () => { void reg.update().catch(() => {}); };
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      check();
    });
  });
}

export function useUpdate(): UpdateStatus {
  const [s, setS] = useState(status);
  useEffect(() => {
    const l = () => setS(status);
    listeners.add(l);
    l();
    return () => { listeners.delete(l); };
  }, []);
  return s;
}
