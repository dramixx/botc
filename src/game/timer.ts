// Day timer: recommended durations by number of living players, and a countdown that survives a reload.
import { useEffect, useState } from 'preact/hooks';
import type { L10n } from '../data/roles';

/** A day is split into three moments: private chats, public debate, then nominations. */
export type Segment = 'private' | 'public' | 'nominations';
export const SEGMENTS: Segment[] = ['private', 'public', 'nominations'];
export type Pace = 'relaxed' | 'normal' | 'fast';

export const SEGMENT_NAMES: Record<Segment, L10n> = {
  private: { fr: 'Discussions privées', en: 'Private chats' },
  public: { fr: 'Débat public', en: 'Public debate' },
  nominations: { fr: 'Nominations', en: 'Nominations' },
};
/** What the storyteller says when the segment starts. */
export const SEGMENT_CALLS: Record<Segment, L10n> = {
  private: {
    fr: 'Le village s’éveille. Vous pouvez vous isoler à deux ou trois pour parler en secret.',
    en: 'The town wakes. You may split off in twos or threes to talk in secret.',
  },
  public: {
    fr: 'Tout le monde revient sur la place du village : place au débat public.',
    en: 'Everyone back to the town square: time for the public debate.',
  },
  nominations: {
    fr: 'Les nominations sont ouvertes. Chaque vivant peut nominer une fois aujourd’hui.',
    en: 'Nominations are open. Each living player may nominate once today.',
  },
};
export const PACE_FACTOR: Record<Pace, number> = { relaxed: 1.3, normal: 1, fast: 0.75 };
export const PACE_NAMES: Record<Pace, L10n> = {
  relaxed: { fr: 'Détendu', en: 'Relaxed' },
  normal: { fr: 'Normal', en: 'Normal' },
  fast: { fr: 'Rapide', en: 'Fast' },
};

/** The first days need more talk; later the town is smaller and knows more. */
const dayFactor = (seg: Segment, day: number) => {
  if (seg === 'nominations') return 1;
  const f = seg === 'private' ? [1, 0.8, 0.65, 0.5] : [1, 0.85, 0.75, 0.7];
  return f[Math.min(Math.max(day, 1), f.length) - 1];
};
const BASE: Record<Segment, [number, number, number]> = {
  // [minutes, minutes per living player, minimum minutes]
  private: [2, 0.5, 2],
  public: [1.5, 0.25, 2],
  nominations: [2, 0.4, 3],
};
const round30 = (s: number) => Math.max(30, Math.round(s / 30) * 30);

/** Recommended duration of a segment, in seconds (rounded to 30 s). A guide: the storyteller keeps the pace. */
export function recommended(seg: Segment, alive: number, day: number, pace: Pace = 'normal'): number {
  const [base, per, min] = BASE[seg];
  const minutes = Math.max(min, (base + per * Math.max(alive, 0)) * dayFactor(seg, day));
  return round30(minutes * 60 * PACE_FACTOR[pace]);
}
export const recommendedDay = (alive: number, day: number, pace: Pace = 'normal') =>
  Object.fromEntries(SEGMENTS.map((s) => [s, recommended(s, alive, day, pace)])) as Record<Segment, number>;

/** Speaking time for an accusation or a defence during a nomination. */
export const recommendedPlea = (alive: number) => (alive >= 10 ? 45 : 60);

export function fmtClock(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function fmtMinutes(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m} min ${String(s).padStart(2, '0')}` : `${m} min`;
}

// --- preferences ----------------------------------------------------------------

export interface TimerPrefs {
  pace: Pace;
  /** Custom durations (seconds) replacing the recommended ones. */
  custom: Partial<Record<Segment, number>>;
  sound: boolean;
  /** Start the next segment automatically when one ends. */
  chain: boolean;
  /** Speaking time for accusation / defence (seconds), 0 = recommended. */
  plea: number;
}
const PREFS_KEY = 'botc.timerPrefs';
const STATE_KEY = 'botc.timer';
export const DEFAULT_PREFS: TimerPrefs = { pace: 'normal', custom: {}, sound: true, chain: false, plea: 0 };

function read<V>(key: string): V | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as V) : null; } catch { return null; }
}
function write(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode: in memory only */ }
}

let prefs: TimerPrefs = { ...DEFAULT_PREFS, ...read<Partial<TimerPrefs>>(PREFS_KEY) };
export const getPrefs = () => prefs;
export function setPrefs(p: Partial<TimerPrefs>) {
  prefs = { ...prefs, ...p };
  write(PREFS_KEY, prefs);
  emit();
}

/** Duration actually used for a segment: the custom one, or the recommendation at the chosen pace. */
export const durationFor = (seg: Segment, alive: number, day: number, p: TimerPrefs = prefs) =>
  p.custom[seg] ?? recommended(seg, alive, day, p.pace);
export const pleaFor = (alive: number, p: TimerPrefs = prefs) => p.plea || recommendedPlea(alive);

// --- countdown ----------------------------------------------------------------------

export interface TimerState {
  /** Which day of which game this timer belongs to. */
  gameId: string;
  day: number;
  segment: Segment;
  /** Length of the current segment (seconds), shown as the full bar. */
  total: number;
  /** Seconds left when paused. */
  remaining: number;
  /** Timestamp at which it reaches zero, while running. */
  endsAt: number | null;
  /** The alarm already rang for this segment. */
  rang: boolean;
}

let timer: TimerState | null = read<TimerState>(STATE_KEY);
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function save(t: TimerState | null) {
  timer = t;
  if (t) write(STATE_KEY, t);
  else try { localStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
  emit();
}

/** The stored countdown, whatever day it belongs to. */
export const getTimer = () => timer;
/** Calls `fn` when the countdown or the preferences change; returns the unsubscribe function. */
export function onTimerChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export const remainingOf = (t: TimerState, now = Date.now()) => (t.endsAt === null ? t.remaining : Math.max(0, (t.endsAt - now) / 1000));
export const isRunning = (t: TimerState | null) => !!t && t.endsAt !== null;

/** Timer of the given day, created (paused, on private chats) if it belongs to another game or day. */
export function timerFor(gameId: string, day: number, alive: number): TimerState {
  if (timer && timer.gameId === gameId && timer.day === day) return timer;
  const total = durationFor('private', alive, day);
  return { gameId, day, segment: 'private', total, remaining: total, endsAt: null, rang: false };
}
/** The stored timer, if it belongs to that day. */
export const activeTimer = (gameId: string, day: number) => (timer && timer.gameId === gameId && timer.day === day ? timer : null);

export function start(t: TimerState) {
  const left = remainingOf(t);
  save({ ...t, endsAt: Date.now() + (left > 0 ? left : t.total) * 1000, remaining: left > 0 ? left : t.total, rang: left > 0 ? t.rang : false });
}
export function pause(t: TimerState) {
  save({ ...t, remaining: remainingOf(t), endsAt: null });
}
/** Adds (or removes) time; a finished timer given more time can ring again. */
export function addTime(t: TimerState, sec: number) {
  const left = Math.max(0, remainingOf(t) + sec);
  const total = Math.max(t.total, left);
  save(t.endsAt === null ? { ...t, total, remaining: left, rang: left > 0 ? false : t.rang } : { ...t, total, endsAt: Date.now() + left * 1000, rang: left > 0 ? false : t.rang });
}
export function setSegment(t: TimerState, segment: Segment, alive: number, run = false) {
  const total = durationFor(segment, alive, t.day);
  save({ ...t, segment, total, remaining: total, endsAt: run ? Date.now() + total * 1000 : null, rang: false });
}
export const nextSegment = (s: Segment): Segment | null => SEGMENTS[SEGMENTS.indexOf(s) + 1] ?? null;
export function markRang(t: TimerState) { save({ ...t, rang: true, remaining: 0, endsAt: null }); }
export function resetTimer() { save(null); }

/** Re-renders every `ms` while a timer runs, and on every change. */
export function useTimer(ms = 250) {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    const id = window.setInterval(() => { if (isRunning(timer)) l(); }, ms);
    return () => { listeners.delete(l); window.clearInterval(id); };
  }, []);
  return { timer, prefs };
}

// --- alarm --------------------------------------------------------------------------

let audio: AudioContext | null = null;
/** Three soft bell strokes, and a vibration where supported. */
export function ring() {
  try { navigator.vibrate?.([300, 150, 300]); } catch { /* ignore */ }
  if (!prefs.sound) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    const ctx = audio;
    void ctx.resume?.();
    [0, 0.45, 0.9].forEach((at, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 2 ? 523.25 : 659.25;
      const t0 = ctx.currentTime + at;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 1.25);
    });
  } catch { /* no audio */ }
}
/** iOS only lets a page play sound after a tap: unlock the audio context on the first "Start". */
export function unlockAudio() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    void audio.resume?.();
  } catch { /* ignore */ }
}
