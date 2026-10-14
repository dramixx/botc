// Live broadcast, storyteller side: pushes the public snapshot to the relay (server/live.mjs) on every change.
// The room (code + secret token) is kept in localStorage: a refresh, a new game or a lost connection keep the same link.
import { useEffect, useState } from 'preact/hooks';
import { accessHeaders } from './access';
import { type DraftVote, handoutSeats, publicSnapshot } from './live';
import { getState, subscribe } from './store';
import { getTimer, onTimerChange } from './timer';

const KEY = 'botc.live';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface Room { code: string; token: string }
export type LiveStatus = 'off' | 'sending' | 'ok' | 'error';

/** Relay address, next to the app (works in a sub-folder too). */
export const apiBase = () => new URL('api/live', document.baseURI).href;
/** Address the TV and the phones open. */
export const liveUrl = (code: string) => `${location.origin}${location.pathname}#live/${code}`;
export const LIVE_HASH = '#live';
export const liveCodeFromHash = (h: string) => {
  const m = h.match(/^#live\/([A-Za-z0-9]{4,8})$/);
  return m ? m[1].toUpperCase() : null;
};

function readRoom(): Room | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Room | null;
    return r?.code && r.token ? r : null;
  } catch { return null; }
}
function writeRoom(r: Room | null) {
  try { if (r) localStorage.setItem(KEY, JSON.stringify(r)); else localStorage.removeItem(KEY); } catch { /* ignore */ }
}

let room: Room | null = readRoom();
let status: LiveStatus = room ? 'sending' : 'off';
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
const setStatus = (s: LiveStatus) => { if (s !== status) { status = s; emit(); } };

export const getRoom = () => room;

export function useLive() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return { room, status };
}

// --- publishing ------------------------------------------------------------------------------

let timer: number | undefined;
let inFlight = false;
let again = false;
let lastSent = '';
let lastSeats = '';
let retryDelay = 2000;

/**
 * Sends right away (the changes made in the same tap go out together): no debounce, so the TV follows the iPad
 * as closely as the network allows. A change made while a request is on its way is sent as soon as it is back.
 */
function schedule(ms = 0) {
  if (!room) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void push(), ms);
}

async function push() {
  if (!room) return;
  if (inFlight) { again = true; return; }
  const game = getState().game;
  const body = JSON.stringify(publicSnapshot(game, getTimer(), Date.now(), draftVote));
  // The characters go to the relay (never to the screens) only while they are handed out on the phones.
  const seats = JSON.stringify(handoutSeats(game));
  if (body === lastSent && seats === lastSeats && status === 'ok') return;
  inFlight = true;
  const target = room;
  const put = async (path: string, data: string) => {
    const res = await fetch(`${apiBase()}/${target.code}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${target.token}`, ...accessHeaders() },
      body: data,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(String(res.status));
  };
  try {
    if (body !== lastSent || status !== 'ok') await put('', body);
    if (room === target) lastSent = body;
    if (seats !== lastSeats) await put('/seats', seats);
    if (room === target) { lastSeats = seats; retryDelay = 2000; setStatus('ok'); }
  } catch {
    // Offline or relay unreachable: the game goes on, the latest state is sent when it comes back.
    if (room === target) {
      setStatus('error');
      schedule(retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30_000);
    }
  } finally {
    inFlight = false;
    if (again) { again = false; schedule(); }
  }
}

let draftVote: DraftVote | null = null;
/** The hands counted so far on the vote screen: the TV shows them before the vote is confirmed. */
export function setLiveVote(v: DraftVote | null) {
  draftVote = v;
  schedule();
}

let started = false;
/** Called once at start-up: resumes the broadcast after a refresh. */
export function initLive() {
  if (started || typeof window === 'undefined') return;
  started = true;
  subscribe(() => schedule());
  onTimerChange(() => schedule());
  window.addEventListener('online', () => { retryDelay = 2000; schedule(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && status === 'error') schedule(); });
  schedule();
}

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Opens a room. The relay normally picks the code; offline, one is made here and claimed on the first push. */
export async function startLive(): Promise<Room> {
  if (room) return room;
  let r: Room;
  try {
    const res = await fetch(apiBase(), { method: 'POST', headers: accessHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    r = (await res.json()) as Room;
  } catch {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
    r = { code: randomCode(), token };
  }
  room = r;
  writeRoom(r);
  lastSent = '';
  lastSeats = '';
  setStatus('sending');
  schedule();
  return r;
}

export function stopLive() {
  const r = room;
  room = null;
  writeRoom(null);
  window.clearTimeout(timer);
  lastSent = '';
  lastSeats = '';
  setStatus('off');
  if (r) void fetch(`${apiBase()}/${r.code}`, { method: 'DELETE', headers: { Authorization: `Bearer ${r.token}` } }).catch(() => {});
}

/** The Storyteller frees a seat claimed by the wrong player. */
export async function releaseSeat(id: string) {
  if (!room) return;
  await fetch(`${apiBase()}/${room.code}/release`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${room.token}` }, body: JSON.stringify({ id }), cache: 'no-store',
  }).catch(() => {});
}

// --- player side (phone): "this is me", then the character ----------------------------------------

export interface MySeat { gameId: string; id: string; key: string }
export interface SeatCard { key: string; name: string; role: string; alignment: 'good' | 'evil'; v: number }

const seatKey = (code: string) => `botc.seat.${code}`;
export function readMySeat(code: string): MySeat | null {
  try { return JSON.parse(localStorage.getItem(seatKey(code)) ?? 'null') as MySeat | null; } catch { return null; }
}
export function writeMySeat(code: string, s: MySeat | null) {
  try { if (s) localStorage.setItem(seatKey(code), JSON.stringify(s)); else localStorage.removeItem(seatKey(code)); } catch { /* ignore */ }
}

async function seatPost(code: string, action: 'claim' | 'seen' | 'release', body: object): Promise<Response> {
  return fetch(`${apiBase()}/${code}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
}
/** Claims a seat (or fetches its character again with the key). Throws 'taken', 'closed' or 'network'. */
export async function claimSeat(code: string, id: string, key?: string): Promise<SeatCard> {
  let res: Response;
  try { res = await seatPost(code, 'claim', { id, key }); } catch { throw new Error('network'); }
  if (res.ok) return (await res.json()) as SeatCard;
  const err = ((await res.json().catch(() => ({}))) as { error?: string }).error;
  throw new Error(err === 'taken' || err === 'closed' ? err : 'network');
}
export const markSeatSeen = (code: string, id: string, key: string) => seatPost(code, 'seen', { id, key }).then(() => {}, () => {});
export const releaseMySeat = (code: string, id: string, key: string) => seatPost(code, 'release', { id, key }).then(() => {}, () => {});
