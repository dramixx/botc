// App state: current game with undo/redo, persisted locally.
import { useEffect, useState } from 'preact/hooks';
import { STORES, idbAll, idbDelete, idbGet, idbPut } from './db';
import { T } from '../i18n';
import type { Game } from './types';

const CURRENT_KEY = 'botc.current';
const MAX_UNDO = 100;
export const MAX_HISTORY = 60;

export interface HistoryItem {
  id: string;
  title: string;
  demo: boolean;
  createdAt: number;
  updatedAt: number;
  phase: Game['phase'];
  winner: Game['winner'];
  players: number;
  game: Game;
}

interface State {
  game: Game | null;
  past: Game[];
  future: Game[];
}

let state: State = { game: null, past: [], future: [] };
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export const getState = () => state;
/** Calls `fn` on every change of the current game; returns the unsubscribe function. */
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useStore(): State {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return state;
}

// --- persistence -----------------------------------------------------------

let saveTimer: number | undefined;

function saveNow(): Promise<unknown> {
  const { game, past, future } = state;
  window.clearTimeout(saveTimer);
  saveTimer = undefined;
  if (!game) return Promise.resolve();
  return Promise.all([idbPut(STORES.kv, { gameId: game.id, past, future }, 'undo'), idbPut(STORES.games, toHistory(game))]);
}

function persist() {
  // Synchronous copy: never lose the game on refresh.
  try {
    if (state.game) localStorage.setItem(CURRENT_KEY, JSON.stringify(state.game));
    else localStorage.removeItem(CURRENT_KEY);
  } catch { /* storage full or unavailable: IndexedDB copy below still runs */ }
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveNow, 600);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
}

function toHistory(game: Game): HistoryItem {
  return {
    id: game.id, title: game.title, demo: game.demo, createdAt: game.createdAt, updatedAt: game.updatedAt,
    phase: game.phase, winner: game.winner, players: game.players.length, game,
  };
}

export async function loadInitial() {
  let game: Game | null = null;
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (raw) game = JSON.parse(raw);
  } catch { /* ignore */ }
  if (!game) {
    // Fallback: most recent unfinished game from IndexedDB.
    const all = (await idbAll<HistoryItem>(STORES.games)) ?? [];
    game = all.filter((h) => h.phase !== 'ended').sort((a, b) => b.updatedAt - a.updatedAt)[0]?.game ?? null;
  }
  let past: Game[] = [];
  let future: Game[] = [];
  if (game) {
    const undo = await idbGet<{ gameId: string; past: Game[]; future: Game[] }>(STORES.kv, 'undo');
    if (undo && undo.gameId === game.id) { past = undo.past; future = undo.future; }
  }
  state = { game, past, future };
  emit();
  try { await navigator.storage?.persist?.(); } catch { /* ignore */ }
}

// --- actions ---------------------------------------------------------------

/** Applies a change to the current game, recording an undo point. */
export function update(fn: (g: Game) => void) {
  if (!state.game) return;
  const draft: Game = structuredClone(state.game);
  fn(draft);
  draft.updatedAt = Date.now();
  const past = [...state.past, state.game].slice(-MAX_UNDO);
  state = { game: draft, past, future: [] };
  persist();
  emit();
}

export function undo() {
  const { game, past, future } = state;
  if (!game || !past.length) return;
  state = { game: past[past.length - 1], past: past.slice(0, -1), future: [game, ...future].slice(0, MAX_UNDO) };
  persist();
  emit();
}

export function redo() {
  const { game, past, future } = state;
  if (!game || !future.length) return;
  state = { game: future[0], past: [...past, game].slice(-MAX_UNDO), future: future.slice(1) };
  persist();
  emit();
}

/** Opens a game (new, demo, from history or imported). The previous one stays in history. */
export function setGame(game: Game | null) {
  if (state.game) saveNow();
  state = { game, past: [], future: [] };
  persist();
  if (game) saveNow();
  emit();
}

export async function listHistory(): Promise<HistoryItem[]> {
  await saveNow(); // the history must show the game as it is right now, not 600 ms ago
  const all = (await idbAll<HistoryItem>(STORES.games)) ?? [];
  all.sort((a, b) => b.updatedAt - a.updatedAt);
  // Keep storage bounded.
  for (const old of all.slice(MAX_HISTORY)) void idbDelete(STORES.games, old.id);
  return all.slice(0, MAX_HISTORY);
}

export async function deleteHistory(id: string) {
  if (state.game?.id === id) {
    // Clear it first: closing a game normally saves it, which would bring the deleted one back.
    state = { game: null, past: [], future: [] };
    persist();
    emit();
  }
  await idbDelete(STORES.games, id);
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e?.quota ? { usage: e.usage ?? 0, quota: e.quota } : null;
  } catch {
    return null;
  }
}

// --- import / export -------------------------------------------------------

export function exportGame(game: Game) {
  const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const date = new Date(game.createdAt).toISOString().slice(0, 10);
  a.download = `grimoire-${date}-${(game.title || 'partie').replace(/[^\w-]+/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Parses an exported game; throws an Error whose message explains what is wrong (localised). */
export function parseImport(text: string): Game {
  let g: Game;
  try { g = JSON.parse(text) as Game; } catch { throw new Error(T('Le fichier n\'est pas du JSON valide', 'The file is not valid JSON')); }
  if (!g || typeof g !== 'object') throw new Error(T('Contenu inattendu', 'Unexpected content'));
  if (g.version !== 1) throw new Error(T('Champ « version » absent ou inconnu', 'Missing or unknown "version" field'));
  if (!Array.isArray(g.players)) throw new Error(T('Champ « joueurs » manquant', 'Missing "players" field'));
  if (!g.id) throw new Error(T('Champ « id » manquant', 'Missing "id" field'));
  return g;
}
