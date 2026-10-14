// Storyteller access: creating or opening games needs the password set on the server (GRIMOIRE_PASSWORD, checked by
// server/live.mjs). The player sheet (#fiche) and the live view (#live/CODE) never ask for it.
// Once unlocked, the password is kept on the device, so the iPad keeps working offline.
import { useEffect, useState } from 'preact/hooks';

const KEY = 'botc.access';

/** Address of the check, next to the app (works in a sub-folder too). */
const unlockUrl = () => new URL('api/live/unlock', document.baseURI).href;

function read(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function write(v: string | null) {
  try { if (v === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch { /* ignore */ }
}

/** Header the relay expects when the app opens a room (header values are ASCII only). */
export const accessHeaders = (): Record<string, string> => {
  const p = read();
  return p ? { 'X-Grimoire-Password': encodeURIComponent(p) } : {};
};

export type Access = 'checking' | 'locked' | 'open';
let access: Access = read() !== null ? 'open' : 'checking';
const listeners = new Set<() => void>();
const set = (a: Access) => { if (a !== access) { access = a; for (const l of listeners) l(); } };

/**
 * Asks the relay. Only a clear "wrong password" (403) locks: no relay (static hosting, dev) or no network means no
 * password can be checked, and the storyteller must not be locked out of their own game.
 */
async function check(password: string, timeoutMs = 8000): Promise<boolean | null> {
  try {
    const res = await fetch(unlockUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 403) return false;
    return res.ok ? true : null;
  } catch { return null; }
}

let started = false;
/** Called once at start-up. A device already unlocked opens at once; the password is re-checked in the background. */
export function initAccess() {
  if (started) return;
  started = true;
  const saved = read();
  void check(saved ?? '').then((ok) => {
    if (ok === false) { write(null); set('locked'); } else set('open');
  });
}

/** Tries a password; true if accepted. */
export async function unlock(password: string): Promise<boolean> {
  const ok = await check(password);
  if (ok === false) return false;
  write(password);
  set('open');
  return true;
}

export function useAccess(): Access {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return access;
}
