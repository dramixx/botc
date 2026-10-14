import { useEffect } from 'preact/hooks';
import type { Overlay, TapHandler } from './overlay';

/** What the panels get from <Play>: a way to decorate the circle and to receive taps on it. */
export interface PanelCtx {
  setOverlay: (o: Overlay | undefined) => void;
  tapRef: { current: TapHandler | null };
  /** Hidden mode: during the day the panels stay, in a public version (nothing that gives a character away). */
  hidden: boolean;
  setHidden: (v: boolean) => void;
}

const AUTO_HIDE_KEY = 'botc.autoHide';
/** Hide the Grimoire by itself when a nomination or a vote opens (the Storyteller walks into the circle). On by default. */
export function getAutoHide(): boolean {
  try { return localStorage.getItem(AUTO_HIDE_KEY) !== '0'; } catch { return true; }
}
export function setAutoHide(on: boolean) {
  try { localStorage.setItem(AUTO_HIDE_KEY, on ? '1' : '0'); } catch { /* ignore */ }
}

/** Hides the Grimoire when the calling panel opens, if the Storyteller left "auto-hide" on. */
export function useAutoHide(ctx: PanelCtx) {
  useEffect(() => { if (getAutoHide()) ctx.setHidden(true); }, []);
}

/** Publishes `ov` to the circle while the calling panel is mounted. */
export function useOverlay(ctx: PanelCtx, ov: Overlay | undefined) {
  const key = JSON.stringify(ov ?? null);
  useEffect(() => { ctx.setOverlay(ov); }, [key]);
  useEffect(() => () => ctx.setOverlay(undefined), []);
}

/** Routes taps on the circle to `fn` while the calling panel is mounted. */
export function useTap(ctx: PanelCtx, fn: TapHandler) {
  ctx.tapRef.current = fn;
  useEffect(() => () => { ctx.tapRef.current = null; }, []);
}
