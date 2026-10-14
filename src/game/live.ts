// Public view of a game, sent to the live relay for the TV and the players' phones.
// Only what the whole table already knows: names, seats, deaths, ghost votes, votes, phase, timer.
// Never characters, alignments, reminders, or a night's deaths before the day starts.
import { DISTRIBUTION, type RoleId } from '../data/roles';
import { byId, hasMarker, isTraveller, revealOf, voteWeight } from './engine';
import type { Segment, TimerState } from './timer';
import { remainingOf } from './timer';
import type { Game } from './types';

export interface LivePlayer {
  name: string;
  alive: boolean;
  /** Dead players only: the ghost vote is still available. */
  ghostVote: boolean;
  /** Travellers' characters are public (their alignment is not). */
  traveller?: RoleId;
}

export interface LiveNomination {
  /** Seats (indexes in `players`). */
  nominator: number;
  nominee: number;
  /** null while the vote is not recorded. */
  votes: number | null;
  exile: boolean;
  /** Seats of the players who raised their hand (live while the Storyteller counts them). */
  voters: number[];
  /** Votes counted so far, with their weight (equals `votes` once recorded). */
  tally: number;
}

/** The vote being counted on the Storyteller's screen, before it is confirmed. */
export interface DraftVote { index: number; voters: string[] }

export interface LiveSnapshot {
  v: 1;
  title: string;
  phase: 'waiting' | 'setup' | 'night' | 'day' | 'ended';
  night: number;
  day: number;
  players: LivePlayer[];
  /** Living players (Travellers excluded) / players (Travellers excluded). */
  alive: number;
  total: number;
  /** Votes needed to execute (half the living, Travellers included, rounded up). */
  needed: number;
  /** Dead players who still have their ghost vote. */
  ghostVotes: number;
  /** Public setup for this number of players: [Townsfolk, Outsiders, Minions, Demons] (before any Baron). */
  distribution: [number, number, number, number] | null;
  nominations: LiveNomination[];
  /** Seat of the player about to be executed, and with how many votes. */
  block: { seat: number; votes: number } | null;
  /** Seat of the player executed today. */
  executed: number | null;
  /** Day timer; `remaining` is in seconds at the moment the snapshot was made. */
  timer: { segment: Segment; total: number; remaining: number; running: boolean } | null;
  winner: 'good' | 'evil' | null;
}

export const emptySnapshot = (): LiveSnapshot => ({
  v: 1, title: '', phase: 'waiting', night: 0, day: 0, players: [], alive: 0, total: 0, needed: 0, ghostVotes: 0,
  distribution: null, nominations: [], block: null, executed: null, timer: null, winner: null,
});

export function publicSnapshot(g: Game | null, timer: TimerState | null = null, now = Date.now(), draft: DraftVote | null = null): LiveSnapshot {
  if (!g) return emptySnapshot();
  const snap = emptySnapshot();
  snap.title = g.title;
  snap.phase = g.phase === 'ended' ? 'ended' : g.phase;
  snap.night = g.nightNumber;
  snap.day = g.dayNumber;
  if (g.phase === 'setup') return snap;

  // During the night, deaths stay hidden until the day starts.
  const dusk = g.phase === 'night' ? g.night?.aliveAtDusk : undefined;
  const shownAlive = (p: Game['players'][number]) =>
    p.alive || (g.phase === 'night' && (hasMarker(p, 'diedtonight') || !!dusk?.includes(p.id)));
  const seat = new Map(g.players.map((p, i) => [p.id, i]));

  snap.players = g.players.map((p) => {
    const alive = shownAlive(p);
    return { name: p.name, alive, ghostVote: !alive && p.ghostVote, ...(isTraveller(p) ? { traveller: p.role } : {}) };
  });
  const regular = g.players.filter((p) => !isTraveller(p));
  snap.alive = regular.filter(shownAlive).length;
  snap.total = regular.length;
  snap.needed = Math.ceil(g.players.filter(shownAlive).length / 2);
  snap.ghostVotes = snap.players.filter((p) => !p.alive && p.ghostVote).length;
  snap.distribution = DISTRIBUTION[regular.length] ?? null;

  if (g.phase === 'day' && g.day) {
    snap.nominations = g.day.nominations.map((n, i) => {
      const ids = n.total === null && draft?.index === i ? draft.voters : n.voters;
      const voters = ids.filter((id) => seat.has(id));
      const tally = voters.reduce((sum, id) => sum + voteWeight(g, byId(g, id)!, n.exile), 0);
      return { nominator: seat.get(n.nominator) ?? -1, nominee: seat.get(n.nominee) ?? -1, votes: n.total, exile: n.exile, voters: voters.map((id) => seat.get(id)!), tally };
    });
    snap.block = g.day.blockId && seat.has(g.day.blockId) ? { seat: seat.get(g.day.blockId)!, votes: g.day.blockVotes } : null;
    snap.executed = g.executedToday && seat.has(g.executedToday) ? seat.get(g.executedToday)! : null;
    if (timer && timer.gameId === g.id && timer.day === g.dayNumber) {
      snap.timer = { segment: timer.segment, total: timer.total, remaining: Math.round(remainingOf(timer, now)), running: timer.endsAt !== null };
    }
  }
  if (g.phase === 'ended') snap.winner = g.winner;
  return snap;
}

// --- characters on the players' phones ------------------------------------------------------------

/** Public side of the hand-out, as the relay broadcasts it: names, and who has claimed / seen their seat. */
export interface SeatStatus { id: string; name: string; v: number; claimed: boolean; seen: boolean }
export interface PublicSeats { gameId: string; players: SeatStatus[] }

/** Sent to the relay only (never broadcast): each seat's character, as the player must see it. */
export interface HandoutSeats { gameId: string; players: { id: string; name: string; role: RoleId; alignment: 'good' | 'evil' }[] }

/** The characters to hand out on the phones: only during the hand-out step, when the Storyteller chose the phones. */
export function handoutSeats(g: Game | null): HandoutSeats | null {
  if (g?.phase !== 'setup' || g.setupStep !== 'distribute' || g.phoneDeal === false) return null;
  return {
    gameId: g.id,
    players: g.players.map((p, i) => ({ id: p.id, name: p.name.trim() || `#${i + 1}`, ...revealOf(p) })),
  };
}
