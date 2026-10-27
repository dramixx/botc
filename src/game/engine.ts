// Pure game rules. Every mutating function takes a (draft) Game and edits it in place.
import {
  DEMO_NAMES, FIRST_NIGHT, OTHER_NIGHT, ROLES, distributionFor, isGoodTeam, rolesOfTeam,
  type Alignment, type L10n, type RoleId, type Team,
} from '../data/roles';
import { drawBalanced, weightedShuffle, type DrawStyle } from './drawStyles';
import { pick, random, seeded, shuffle, uid, type Rng } from './rng';
import type { Game, Marker, MarkerKey, Nomination, Player, PlayerState, SetupStep, StepAction, StepUndo } from './types';

// ---------------------------------------------------------------------------
// Helpers

export const L = (fr: string, en: string): L10n => ({ fr, en });
const rn = (id: RoleId): L10n => ROLES[id].name;

export const teamOf = (p: Player): Team => ROLES[p.role].team;
export const isTraveller = (p: Player) => teamOf(p) === 'traveller';
export const byId = (g: Game, id: string | null | undefined) => g.players.find((p) => p.id === id);
export const nameOf = (g: Game, id: string | null | undefined) => byId(g, id)?.name ?? '?';
export const hasMarker = (p: Player, key: MarkerKey) => p.markers.some((m) => m.key === key);

/** The character a player wakes as (the Drunk wakes as the Townsfolk they believe they are). */
export const wakeRole = (p: Player): RoleId => (p.role === 'drunk' && p.believedRole ? p.believedRole : p.role);
/** What a player is shown as their own character: the Drunk sees what they believe, Travellers their own alignment. */
export function revealOf(p: Player): { role: RoleId; alignment: Alignment } {
  const role = wakeRole(p);
  const team = ROLES[role].team;
  return { role, alignment: team === 'traveller' ? p.alignment : team === 'minion' || team === 'demon' ? 'evil' : 'good' };
}

/** Poisoned or drunk: their ability does not work (but they don't know it). */
export function isImpaired(p: Player): boolean {
  if (p.role === 'beggar') return false;
  return p.role === 'drunk' || hasMarker(p, 'drunk') || hasMarker(p, 'poisoned');
}

export const aliveCount = (g: Game) => g.players.filter((p) => p.alive && !isTraveller(p)).length;
export const aliveAll = (g: Game) => g.players.filter((p) => p.alive).length;
/** Half the alive players, Travellers included (they only don't count for the 2-player and Scarlet Woman rules). */
export const votesNeeded = (g: Game, _exile = false) => Math.ceil(aliveAll(g) / 2);
/** Threshold of a nomination: fixed when its vote is recorded, the current one before. */
export const nominationNeeded = (g: Game, n: Nomination) => n.needed ?? votesNeeded(g, n.exile);

export function log(g: Game, text: L10n, important = false) {
  const phase = g.phase === 'ended' ? 'end' : g.phase;
  const num = g.phase === 'night' ? g.nightNumber : g.dayNumber;
  g.log.push({ id: uid(), phase, num, text, important });
}

export function addMarker(p: Player, key: MarkerKey, by?: string, shows?: RoleId) {
  const known = p.markers.find((m) => m.key === key && m.by === by);
  if (known) { if (shows) known.shows = shows; } else p.markers.push(shows ? { key, by, shows } : { key, by });
}
export function removeMarkers(g: Game, pred: (m: Marker, p: Player) => boolean) {
  for (const p of g.players) p.markers = p.markers.filter((m) => !pred(m, p));
}

/** A marker placed by an ability only counts if its source was sober & healthy when it acts. */
export function markerWorks(g: Game, p: Player, key: MarkerKey): boolean {
  return p.markers.some((m) => {
    if (m.key !== key) return false;
    const src = byId(g, m.by);
    return !src || !isImpaired(src);
  });
}

// ---------------------------------------------------------------------------
// Setup

export function newGame(opts: { demo?: boolean; count?: number } = {}): Game {
  const count = opts.count ?? 8;
  const now = Date.now();
  const g: Game = {
    id: uid(), version: 1, createdAt: now, updatedAt: now,
    title: '', demo: !!opts.demo, phase: 'setup', setupStep: 'roles',
    playerCount: count, selectedRoles: [], players: [], bluffs: [],
    nightNumber: 0, dayNumber: 0, night: null, day: null,
    executedToday: null, swPromoted: null, pendingWin: null, winner: null, winReason: null, log: [],
  };
  setPlayerCount(g, count, opts.demo ? shuffle(DEMO_NAMES) : undefined);
  return g;
}

export function makePlayer(name: string, role: RoleId = 'washerwoman'): Player {
  return {
    id: uid(), name, role, alignment: isGoodTeam(ROLES[role].team) ? 'good' : 'evil',
    alive: true, ghostVote: true, markers: [], notes: '', seen: false,
  };
}

/** The wizard step to show; games saved before the circle setup used 'players' (now 'roles') and 'assign' (now 'review'). */
export function setupStepOf(g: Game): SetupStep {
  const s = g.setupStep as string;
  return s === 'players' ? 'roles' : s === 'assign' ? 'review' : g.setupStep;
}

/** Resizes the (non-traveller) player list. */
export function setPlayerCount(g: Game, count: number, names?: string[]) {
  count = Math.max(5, Math.min(15, count));
  g.playerCount = count;
  const travellers = g.players.filter(isTraveller);
  const regular = g.players.filter((p) => !isTraveller(p)).slice(0, count);
  while (regular.length < count) {
    const i = regular.length;
    // Names come once the table is seated (wizard step 3): seats start unnamed.
    regular.push(makePlayer(names?.[i] ?? ''));
  }
  g.players = [...regular, ...travellers];
}

/** Shuffles a pool: uniformly, or weighted by the play style. */
const order = (ids: readonly RoleId[], rng: Rng, style?: DrawStyle) => (style ? weightedShuffle(ids, style, rng) : shuffle(ids, rng));
const teamIds = (team: Team) => rolesOfTeam(team).map((r) => r.id);

/** Random valid character set for `count` players; with a style, also balanced for it. */
export function randomRoles(count: number, rng: Rng = random, style?: DrawStyle): RoleId[] {
  const draw = () => {
    const [, , m] = distributionFor(count, false);
    const chosenMinions = order(teamIds('minion'), rng, style).slice(0, m);
    const [t, o] = distributionFor(count, chosenMinions.includes('baron'));
    const outsiders = order(teamIds('outsider'), rng, style).slice(0, o);
    const townsfolk = order(teamIds('townsfolk'), rng, style).slice(0, t);
    return [...townsfolk, ...outsiders, ...chosenMinions, 'imp'] as RoleId[];
  };
  return style ? drawBalanced(draw, count, style) : draw();
}

function fillRoles(selected: RoleId[], count: number, rng: Rng, style?: DrawStyle): RoleId[] {
  const out = selected.filter((r) => ROLES[r].team !== 'traveller');
  const balance = (team: Team, n: number) => {
    const mine = out.filter((r) => ROLES[r].team === team);
    if (mine.length > n) {
      for (const r of shuffle(mine, rng).slice(n)) out.splice(out.indexOf(r), 1);
    } else {
      const free = order(teamIds(team).filter((r) => !out.includes(r)), rng, style);
      out.push(...free.slice(0, n - mine.length));
    }
  };
  balance('minion', distributionFor(count, false)[2]);
  balance('demon', 1);
  const [t, o] = distributionFor(count, out.includes('baron'));
  balance('outsider', o);
  balance('townsfolk', t);
  return out;
}

/** Adjusts a selection to the official distribution: drops extras, draws missing characters at random. */
export function completeRoles(selected: RoleId[], count: number, rng: Rng = random, style?: DrawStyle): RoleId[] {
  const draw = () => fillRoles(selected, count, rng, style);
  return style ? drawBalanced(draw, count, style) : draw();
}

/** Redraws one team's characters at random, preferring ones not drawn before; other teams are left as is (except for the Baron). */
export function rerollTeam(selected: RoleId[], count: number, team: Team, rng: Rng = random, style?: DrawStyle): RoleId[] {
  // Fresh characters first; if that can't be balanced for the style, later attempts draw from the whole team.
  const draw = (attempt = 0) => {
    const prev = selected.filter((r) => ROLES[r].team === team);
    const out = selected.filter((r) => ROLES[r].team !== team && ROLES[r].team !== 'traveller');
    const [t, o, m] = distributionFor(count, out.includes('baron'));
    const n = { townsfolk: t, outsider: o, minion: m, demon: 1, traveller: 0 }[team];
    const pool = teamIds(team);
    const fresh = order(pool.filter((r) => !prev.includes(r)), rng, style);
    const drawn = attempt < 200 ? [...fresh, ...order(prev, rng, style)] : order(pool, rng, style);
    const next = [...out, ...drawn.slice(0, n)];
    // A Baron drawn or dropped changes the Outsider count: rebalance the good teams too.
    return team === 'minion' && prev.includes('baron') !== next.includes('baron') ? fillRoles(next, count, rng, style) : next;
  };
  return style ? drawBalanced(draw, count, style) : draw();
}

/** Gives the (non-traveller) players random names. */
export function randomNames(g: Game, rng: Rng = random) {
  const names = shuffle(DEMO_NAMES, rng);
  g.players.filter((p) => !isTraveller(p)).forEach((p, i) => { p.name = names[i] ?? p.name; });
}

export interface SetupCheck {
  expected: Record<'townsfolk' | 'outsider' | 'minion' | 'demon', number>;
  actual: Record<'townsfolk' | 'outsider' | 'minion' | 'demon', number>;
  ok: boolean;
}

export function checkSetup(count: number, roles: RoleId[]): SetupCheck {
  const [t, o, m, d] = distributionFor(count, roles.includes('baron'));
  const expected = { townsfolk: t, outsider: o, minion: m, demon: d };
  const actual = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const r of roles) {
    const team = ROLES[r].team;
    if (team !== 'traveller') actual[team]++;
  }
  const ok = (Object.keys(expected) as (keyof typeof expected)[]).every((k) => expected[k] === actual[k]);
  return { expected, actual, ok };
}

const inPlay = (g: Game) => new Set(g.players.map((p) => p.role));

/** Good characters not in play (candidates for Demon bluffs / Drunk). */
export function notInPlay(g: Game, teams: Team[] = ['townsfolk', 'outsider']): RoleId[] {
  const used = inPlay(g);
  const drunkFake = g.players.find((p) => p.role === 'drunk')?.believedRole;
  return teams.flatMap((t) => rolesOfTeam(t)).map((r) => r.id).filter((id) => !used.has(id) && id !== drunkFake);
}

/** Assigns a player's character and fixes alignment / Drunk belief. */
export function setRole(g: Game, p: Player, role: RoleId, rng: Rng = random) {
  // A Poisoner who becomes something else (e.g. the Imp) loses their ability: the poison ends.
  if (p.role === 'poisoner' && role !== 'poisoner') removeMarkers(g, (m) => m.key === 'poisoned' && m.by === p.id);
  p.role = role;
  const team = ROLES[role].team;
  if (team !== 'traveller') p.alignment = isGoodTeam(team) ? 'good' : 'evil';
  if (role === 'drunk') {
    if (!p.believedRole || inPlay(g).has(p.believedRole)) {
      p.believedRole = pick(notInPlay(g, ['townsfolk']), rng);
    }
  } else {
    delete p.believedRole;
  }
}

/** Shuffles the selected characters onto the (non-traveller) players and prepares Drunk, red herring, bluffs. */
export function autoAssign(g: Game, rng: Rng = random) {
  const regular = g.players.filter((p) => !isTraveller(p));
  const roles = shuffle(g.selectedRoles, rng);
  regular.forEach((p, i) => { setRole(g, p, roles[i] ?? 'washerwoman', rng); });
  prepareSecrets(g, rng);
}

/**
 * Deals the selected characters while keeping the ones already placed: only the seats whose character left the
 * selection get one of the new characters. The very first deal (every seat still on the default) is a plain shuffle.
 */
export function dealRoles(g: Game, rng: Rng = random) {
  const regular = g.players.filter((p) => !isTraveller(p));
  if (regular.every((p) => p.role === regular[0].role)) { autoAssign(g, rng); return; }
  const left = [...g.selectedRoles];
  const free: Player[] = [];
  for (const p of regular) {
    const i = left.indexOf(p.role);
    if (i >= 0) left.splice(i, 1);
    else free.push(p);
  }
  const fresh = shuffle(left, rng);
  for (const p of free) setRole(g, p, fresh.shift() ?? 'washerwoman', rng);
  prepareSecrets(g, rng);
}

/** Swaps two seats' characters (role, alignment, Drunk belief, reminders); names and seats stay put. */
export function swapCharacters(g: Game, aId: string, bId: string) {
  const a = byId(g, aId), b = byId(g, bId);
  if (!a || !b || a === b) return;
  [a.role, b.role] = [b.role, a.role];
  [a.alignment, b.alignment] = [b.alignment, a.alignment];
  [a.markers, b.markers] = [b.markers, a.markers];
  const belief = a.believedRole;
  if (b.believedRole) a.believedRole = b.believedRole; else delete a.believedRole;
  if (belief) b.believedRole = belief; else delete b.believedRole;
}

/**
 * Rotates the characters around the table by `delta` seats: their relative order stays the one prepared,
 * names and seats stay put (Travellers keep their own character).
 */
export function rotateCharacters(g: Game, delta: number) {
  const regular = g.players.filter((p) => !isTraveller(p));
  const n = regular.length;
  const shift = ((delta % n) + n) % n;
  if (!shift) return;
  const snap = regular.map((p) => ({ role: p.role, alignment: p.alignment, markers: p.markers, believedRole: p.believedRole }));
  regular.forEach((p, i) => {
    const src = snap[(i - shift + n) % n];
    p.role = src.role; p.alignment = src.alignment; p.markers = src.markers;
    if (src.believedRole) p.believedRole = src.believedRole; else delete p.believedRole;
  });
}

/** Red herring + bluffs + Drunk belief, keeping existing valid choices. */
export function prepareSecrets(g: Game, rng: Rng = random) {
  for (const p of g.players) if (p.role === 'drunk') setRole(g, p, 'drunk', rng);
  removeMarkers(g, (m, p) => m.key === 'redherring' && p.alignment !== 'good');
  const hasFT = g.players.some((p) => wakeRole(p) === 'fortuneteller');
  if (!hasFT) removeMarkers(g, (m) => m.key === 'redherring');
  else if (!g.players.some((p) => hasMarker(p, 'redherring'))) {
    const rh = pick(g.players.filter((p) => p.alignment === 'good' && !isTraveller(p)), rng);
    if (rh) addMarker(rh, 'redherring');
  }
  const free = notInPlay(g);
  g.bluffs = g.bluffs.filter((b) => free.includes(b)).slice(0, 3);
  // Prefer Townsfolk bluffs, then Outsiders.
  const pool = [
    ...shuffle(free.filter((r) => ROLES[r].team === 'townsfolk' && !g.bluffs.includes(r)), rng),
    ...shuffle(free.filter((r) => ROLES[r].team === 'outsider' && !g.bluffs.includes(r)), rng),
  ];
  while (g.bluffs.length < 3 && pool.length) g.bluffs.push(pool.shift()!);
}

/** Demo mode: everything automatic, straight to the grimoire. */
export function demoGame(count = 8, rng: Rng = random): Game {
  const g = newGame({ demo: true, count });
  g.title = 'Démo';
  g.selectedRoles = randomRoles(count, rng);
  autoAssign(g, rng);
  for (const p of g.players) p.seen = true;
  log(g, L('Partie de démonstration créée.', 'Demo game created.'));
  startNight(g);
  return g;
}

export function addTraveller(g: Game, name: string, role: RoleId, alignment: Alignment) {
  const p = makePlayer(name, role);
  p.alignment = alignment;
  g.players.push(p);
  if (g.phase !== 'setup') {
    log(g, L(`${name} arrive en Voyageur (${rn(role).fr}, ${alignment === 'good' ? 'Bon' : 'Maléfique'}).`,
      `${name} joins as a Traveller (${rn(role).en}, ${alignment}).`));
  }
  return p;
}

/** Moves a player to an absolute seat index. */
export function reorderPlayer(g: Game, id: string, to: number) {
  const i = g.players.findIndex((p) => p.id === id);
  if (i < 0) return;
  const [p] = g.players.splice(i, 1);
  g.players.splice(Math.max(0, Math.min(g.players.length, to)), 0, p);
}

export function movePlayer(g: Game, id: string, delta: number) {
  const i = g.players.findIndex((p) => p.id === id);
  const j = (i + delta + g.players.length) % g.players.length;
  const [p] = g.players.splice(i, 1);
  g.players.splice(j, 0, p);
}

// ---------------------------------------------------------------------------
// Information helpers ("true" answers; the storyteller may change them)

/** Alignment as registered for an information ability. */
export function registersEvil(p: Player, misreg: string[] = []): boolean {
  const flip = misreg.includes(p.id);
  return flip ? p.alignment === 'good' : p.alignment === 'evil';
}

export function registersDemon(p: Player, misreg: string[] = []): boolean {
  if (teamOf(p) === 'demon') return !misreg.includes(p.id);
  return p.role === 'recluse' && misreg.includes(p.id);
}

/** Neighbouring pairs of players registering as evil, around the circle. */
export function chefPairs(g: Game, misreg: string[] = []): [Player, Player][] {
  const ps = g.players;
  if (ps.length < 2) return [];
  const pairs: [Player, Player][] = [];
  for (let i = 0; i < (ps.length === 2 ? 1 : ps.length); i++) {
    const a = ps[i], b = ps[(i + 1) % ps.length];
    if (registersEvil(a, misreg) && registersEvil(b, misreg)) pairs.push([a, b]);
  }
  return pairs;
}

export function chefNumber(g: Game, misreg: string[] = []): number {
  return chefPairs(g, misreg).length;
}

/** Closest alive neighbours, clockwise and anticlockwise. */
export function aliveNeighbours(g: Game, id: string): Player[] {
  const ps = g.players;
  const i = ps.findIndex((p) => p.id === id);
  const res: Player[] = [];
  for (const dir of [-1, 1]) {
    for (let k = 1; k < ps.length; k++) {
      const p = ps[(i + dir * k + ps.length * k) % ps.length];
      if (p.id === id) break;
      if (p.alive) { if (!res.includes(p)) res.push(p); break; }
    }
  }
  return res;
}

export function empathNumber(g: Game, id: string, misreg: string[] = []): number {
  return aliveNeighbours(g, id).filter((p) => registersEvil(p, misreg)).length;
}

export function fortuneAnswer(g: Game, targets: string[], misreg: string[] = []): boolean {
  return targets.some((t) => {
    const p = byId(g, t);
    return !!p && (registersDemon(p, misreg) || hasMarker(p, 'redherring'));
  });
}

/** Players that may register differently (Spy, Recluse) — offered as toggles. */
export const misregCandidates = (g: Game) => g.players.filter((p) => p.role === 'spy' || p.role === 'recluse');

/**
 * Every true answer a number ability (Chef, Empath) may give, with the misregistrations producing it.
 * `prefer` is kept when it already yields that answer; otherwise the smallest set wins.
 */
export function numberOptions(g: Game, count: (misreg: string[]) => number, prefer: string[] = []): Map<number, string[]> {
  const ids = misregCandidates(g).map((p) => p.id);
  const subsets: string[][] = [];
  for (let mask = 0; mask < 1 << ids.length; mask++) subsets.push(ids.filter((_, i) => mask & (1 << i)));
  const sets = [prefer.filter((id) => ids.includes(id)), ...subsets.sort((a, b) => a.length - b.length)];
  const res = new Map<number, string[]>();
  for (const m of sets) {
    const v = count(m);
    if (!res.has(v)) res.set(v, m);
  }
  return res;
}

/** Washerwoman / Librarian / Investigator suggestion: [real, decoy] + character shown. */
export function pingSuggestion(
  g: Game, selfId: string, team: 'townsfolk' | 'outsider' | 'minion', rng: Rng, misreg: string[] = [],
): StepAction {
  const others = g.players.filter((p) => p.id !== selfId && !isTraveller(p));
  const real = others.filter((p) => {
    if (misreg.includes(p.id)) {
      if (p.role === 'spy') return team !== 'minion';
      if (p.role === 'recluse') return team === 'minion';
    }
    return teamOf(p) === team;
  });
  const target = pick(real, rng);
  if (!target) return { targets: [], role: null };
  let role: RoleId = target.role;
  if (ROLES[role].team !== team) {
    // Misregistering player: show a character of the right team.
    role = pick(rolesOfTeam(team).map((r) => r.id).filter((r) => !inPlay(g).has(r)), rng) ?? rolesOfTeam(team)[0].id;
  }
  const decoy = pick(others.filter((p) => p.id !== target.id), rng);
  const targets = shuffle([target.id, ...(decoy ? [decoy.id] : [])], rng);
  return { targets, role };
}

/** A plausible false ping for a drunk/poisoned info role. */
export function falsePing(g: Game, selfId: string, team: 'townsfolk' | 'outsider' | 'minion', rng: Rng): StepAction {
  const others = g.players.filter((p) => p.id !== selfId && !isTraveller(p));
  const role = pick(rolesOfTeam(team).map((r) => r.id), rng)!;
  const targets = shuffle(others, rng).slice(0, 2).map((p) => p.id);
  return { targets, role };
}

// ---------------------------------------------------------------------------
// Night

export interface NightStep {
  key: string;
  kind: 'dusk' | 'dawn' | 'minioninfo' | 'demoninfo' | 'role';
  role?: RoleId;
  playerId?: string;
}

export function nightSteps(g: Game): NightStep[] {
  if (!g.night) return [];
  const order = g.night.number === 1 ? FIRST_NIGHT : OTHER_NIGHT;
  const regularCount = g.players.filter((p) => !isTraveller(p)).length;
  const steps: NightStep[] = [];
  for (const key of order) {
    if (key === 'dusk' || key === 'dawn') { steps.push({ key, kind: key }); continue; }
    if (key === 'minioninfo' || key === 'demoninfo') {
      if (regularCount >= 7) steps.push({ key, kind: key });
      continue;
    }
    const role = key as RoleId;
    for (const p of g.players) {
      if (key === 'scarletwoman') {
        if (g.swPromoted === p.id && p.alive) steps.push({ key: `${key}:${p.id}`, kind: 'role', role, playerId: p.id });
        continue;
      }
      if (wakeRole(p) !== role) continue;
      const stepKey = `${key}:${p.id}`;
      const already = g.night.done.includes(stepKey) || !!g.night.data[stepKey];
      if (role === 'ravenkeeper') {
        if (hasMarker(p, 'diedtonight') || already) steps.push({ key: stepKey, kind: 'role', role, playerId: p.id });
        continue;
      }
      if (role === 'undertaker' && !g.executedToday) continue;
      if (!p.alive && !already) continue;
      steps.push({ key: stepKey, kind: 'role', role, playerId: p.id });
    }
  }
  return steps;
}

export const currentStep = (g: Game) => nightSteps(g).find((s) => !g.night!.done.includes(s.key));

export function startNight(g: Game) {
  g.phase = 'night';
  g.nightNumber += 1;
  if (g.night) {
    const past = structuredClone(g.night);
    for (const d of Object.values(past.data)) delete d.undo;
    g.pastNights = [...(g.pastNights ?? []).filter((n) => n.number !== past.number), past];
  }
  g.night = { number: g.nightNumber, done: [], data: {}, aliveAtDusk: g.players.filter((p) => p.alive).map((p) => p.id) };
  g.day = null;
  // Night-scoped effects end at dusk.
  removeMarkers(g, (m) => ['poisoned', 'protected', 'master', 'diedtonight', 'threevotes', 'negvote', 'executed'].includes(m.key));
  log(g, L(`🌙 Nuit ${g.nightNumber}`, `🌙 Night ${g.nightNumber}`), true);
}

export function setStepData(g: Game, key: string, data: Partial<StepAction>) {
  if (!g.night) return;
  const prev = g.night.data[key] ?? { targets: [] };
  g.night.data[key] = { ...prev, ...data };
}

/**
 * Confirms a step: applies its effect, logs it and marks it done.
 * `data` holds what the storyteller entered.
 */
const playerState = (p: Player): PlayerState => structuredClone({
  alive: p.alive, ghostVote: p.ghostVote, role: p.role, alignment: p.alignment, believedRole: p.believedRole, markers: p.markers,
});

export function completeStep(g: Game, step: NightStep, data: StepAction, extra: { newImpId?: string; mayorRedirect?: string } = {}) {
  if (!g.night) return;
  // A step confirmed again replaces its previous effects instead of adding to them.
  undoStepEffects(g, step.key);
  const before = new Map(g.players.map((q) => [q.id, playerState(q)]));
  const pendingBefore = g.pendingWin ? structuredClone(g.pendingWin) : null;
  const dataBefore = new Set(Object.keys(g.night.data));
  // A Minion who became the Imp tonight (star-pass) only learns it: no kill until the next night.
  const promotedImp = step.role === 'imp' && g.night.data[step.key]?.value === true;
  data = promotedImp ? { targets: [], value: true } : { ...data };
  delete data.undo;
  const p = byId(g, step.playerId);
  if (p && isImpaired(p)) data.impaired = true;
  else delete data.impaired;
  g.night.data[step.key] = data;
  const who = p ? p.name : '';
  const names = data.targets.map((t) => nameOf(g, t)).join(', ');
  const impaired = p && isImpaired(p) ? L(' (ivre/empoisonné)', ' (drunk/poisoned)') : L('', '');

  switch (step.role) {
    case 'poisoner': {
      removeMarkers(g, (m) => m.key === 'poisoned' && m.by === p?.id);
      const t = byId(g, data.targets[0]);
      if (t) addMarker(t, 'poisoned', p?.id);
      log(g, L(`Empoisonneur (${who}) empoisonne ${names || 'personne'}.`, `Poisoner (${who}) poisons ${names || 'nobody'}.`));
      break;
    }
    case 'monk': {
      const t = byId(g, data.targets[0]);
      if (t) addMarker(t, 'protected', p?.id);
      log(g, L(`Moine (${who})${impaired.fr} protège ${names || 'personne'}.`, `Monk (${who})${impaired.en} protects ${names || 'nobody'}.`));
      break;
    }
    case 'butler': {
      removeMarkers(g, (m) => m.key === 'master' && m.by === p?.id);
      const t = byId(g, data.targets[0]);
      if (t) addMarker(t, 'master', p?.id);
      log(g, L(`Majordome (${who}) choisit pour Maître ${names || 'personne'}.`, `Butler (${who}) chooses ${names || 'nobody'} as Master.`));
      break;
    }
    case 'bureaucrat': case 'thief': {
      const key: MarkerKey = step.role === 'bureaucrat' ? 'threevotes' : 'negvote';
      const t = byId(g, data.targets[0]);
      if (t) addMarker(t, key, p?.id);
      log(g, L(`${rn(step.role).fr} (${who}) choisit ${names || 'personne'}.`, `${rn(step.role).en} (${who}) chooses ${names || 'nobody'}.`));
      break;
    }
    case 'imp': {
      if (promotedImp) {
        log(g, L(`${who} apprend qu'il est devenu le Diable.`, `${who} learns they are now the Imp.`));
        break;
      }
      data.result = impKill(g, step.playerId!, data.targets[0], extra);
      g.night.data[step.key] = data;
      break;
    }
    case 'washerwoman': case 'librarian': case 'investigator': case 'ravenkeeper': case 'undertaker': {
      if (p && (step.role === 'washerwoman' || step.role === 'librarian' || step.role === 'investigator')) placePingReminders(g, p, step.role, data);
      const roleName = data.role ? rn(data.role) : L('0', '0');
      log(g, L(`${rn(step.role).fr} (${who})${impaired.fr} : ${roleName.fr}${names ? ` — ${names}` : ''}.`,
        `${rn(step.role).en} (${who})${impaired.en}: ${roleName.en}${names ? ` — ${names}` : ''}.`));
      break;
    }
    case 'chef': case 'empath':
      if (step.role === 'chef' && p) {
        // Reminder tokens on the evil pairs actually counted (Spy / Recluse as registered for this step).
        removeMarkers(g, (m) => m.key === 'chefpair' && m.by === p.id);
        for (const q of chefPairs(g, data.misreg).flat()) addMarker(q, 'chefpair', p.id);
      }
      if (step.role === 'empath' && p) data.neighbours = aliveNeighbours(g, p.id).map((q) => q.id);
      log(g, L(`${rn(step.role).fr} (${who})${impaired.fr} : ${data.value ?? '?'}.`, `${rn(step.role).en} (${who})${impaired.en}: ${data.value ?? '?'}.`));
      break;
    case 'fortuneteller': {
      const v = data.value ? L('OUI', 'YES') : L('NON', 'NO');
      log(g, L(`Voyante (${who})${impaired.fr} : ${names} → ${v.fr}.`, `Fortune Teller (${who})${impaired.en}: ${names} → ${v.en}.`));
      break;
    }
    case 'spy':
      log(g, L(`Espion (${who}) consulte le Grimoire.`, `Spy (${who}) sees the Grimoire.`));
      break;
    case 'scarletwoman':
      log(g, L(`${who} apprend qu'elle est devenue le Diable.`, `${who} learns they are now the Imp.`));
      break;
  }
  if (step.kind === 'minioninfo') log(g, L('Les Sbires apprennent qui est le Démon.', 'Minions learn who the Demon is.'));
  if (step.kind === 'demoninfo') {
    log(g, L(`Le Démon apprend ses Sbires et ses bluffs : ${g.bluffs.map((b) => rn(b).fr).join(', ')}.`,
      `The Demon learns their Minions and bluffs: ${g.bluffs.map((b) => rn(b).en).join(', ')}.`));
  }
  // Remember what the step changed (kills, star-pass, markers) so that reopening it can undo it.
  const undo: StepUndo = { players: {}, pendingWin: pendingBefore, dropData: Object.keys(g.night.data).filter((k) => !dataBefore.has(k) && k !== step.key) };
  for (const q of g.players) {
    const prev = before.get(q.id);
    if (prev && JSON.stringify(prev) !== JSON.stringify(playerState(q))) undo.players[q.id] = prev;
  }
  g.night.data[step.key] = { ...g.night.data[step.key], undo };
  if (!g.night.done.includes(step.key)) g.night.done.push(step.key);
}

const PING_REMINDERS = {
  washerwoman: { team: 'townsfolk', right: 'wwtownsfolk', wrong: 'wwwrong' },
  librarian: { team: 'outsider', right: 'liboutsider', wrong: 'libwrong' },
  investigator: { team: 'minion', right: 'invminion', wrong: 'invwrong' },
} as const;

/**
 * Reminder tokens of the physical Grimoire: the shown character goes on the player who has it
 * (or registers as it: Spy, Recluse), "Wrong" on the other one. With false info, the first pick holds the character.
 */
function placePingReminders(g: Game, p: Player, role: keyof typeof PING_REMINDERS, data: StepAction) {
  const r = PING_REMINDERS[role];
  removeMarkers(g, (m) => (m.key === r.right || m.key === r.wrong) && m.by === p.id);
  const targets = data.targets.map((t) => byId(g, t)).filter((q): q is Player => !!q);
  if (!data.role || !targets.length) return;
  const misreg = data.misreg ?? [];
  const fits = (q: Player) => q.role === data.role || (misreg.includes(q.id)
    && ((q.role === 'spy' && r.team !== 'minion') || (q.role === 'recluse' && r.team === 'minion')));
  const right = targets.find(fits) ?? targets[0];
  addMarker(right, r.right, p.id, data.role);
  for (const q of targets) if (q !== right) addMarker(q, r.wrong, p.id);
}

/** Takes back everything a step did to the table (deaths, star-pass, poison, protection...). */
function undoStepEffects(g: Game, key: string) {
  const undo = g.night?.data[key]?.undo;
  if (!g.night || !undo) return;
  for (const [id, prev] of Object.entries(undo.players)) {
    const q = byId(g, id);
    if (!q) continue;
    Object.assign(q, structuredClone(prev));
    if (prev.believedRole === undefined) delete q.believedRole;
  }
  for (const k of undo.dropData) delete g.night.data[k];
  if (g.phase === 'night') { g.pendingWin = undo.pendingWin ? structuredClone(undo.pendingWin) : null; checkWin(g); }
  delete g.night.data[key].undo;
  delete g.night.data[key].result;
}

export function uncompleteStep(g: Game, key: string) {
  if (!g.night) return;
  const had = !!g.night.data[key]?.undo && Object.keys(g.night.data[key].undo!.players).length > 0;
  undoStepEffects(g, key);
  g.night.done = g.night.done.filter((k) => k !== key);
  if (had) log(g, L('Étape rouverte : ses effets sont annulés.', 'Step reopened: its effects are taken back.'));
}

/** Resolves the Imp's choice. Returns a description of what happened. */
export function impKill(g: Game, impId: string, targetId: string | undefined, extra: { newImpId?: string; mayorRedirect?: string } = {}): L10n {
  const imp = byId(g, impId);
  const target = byId(g, targetId);
  if (!imp || !target) {
    log(g, L('Le Diable ne tue personne.', 'The Imp kills nobody.'));
    return L('Personne ne meurt.', 'Nobody dies.');
  }
  const pre = L(`Diable (${imp.name}) attaque ${target.name}`, `Imp (${imp.name}) attacks ${target.name}`);
  const res = (fr: string, en: string) => {
    const r = L(fr, en);
    log(g, L(`${pre.fr} : ${fr}`, `${pre.en}: ${en}`), true);
    return r;
  };
  if (isImpaired(imp)) return res('le Diable est empoisonné, personne ne meurt.', 'the Imp is poisoned, nobody dies.');
  const promotedBefore = g.swPromoted;
  if (!target.alive) return res('déjà mort, rien ne se passe.', 'already dead, nothing happens.');
  // The Monk's protection also stops an Imp who targets themself (no star-pass).
  if (markerWorks(g, target, 'protected')) {
    return res('protégé par le Moine, personne ne meurt.', 'protected by the Monk, nobody dies.');
  }

  if (target.id === imp.id) {
    // Star-pass: pick the heir first so the game does not end in between.
    const heir = starpassHeir(g, imp.id, extra.newImpId);
    if (heir) {
      setRole(g, heir, 'imp');
      heir.alignment = 'evil';
      if (g.night) g.night.data[`imp:${heir.id}`] = { targets: [], value: true };
    }
    killPlayer(g, imp.id, 'demon', { skipDemonCheck: true });
    addMarker(imp, 'diedtonight');
    if (heir) {
      return res(`il se tue ! ${heir.name} devient le Diable (réveillez-le pour lui montrer).`,
        `they kill themself! ${heir.name} becomes the Imp (wake them to show them).`);
    }
    return res('il se tue et aucun Sbire ne peut le remplacer.', 'they kill themself and no Minion can take over.');
  }
  if (target.role === 'soldier' && !isImpaired(target)) return res('c\'est le Soldat, personne ne meurt.', 'it is the Soldier, nobody dies.');
  let victim = target;
  if (target.role === 'mayor' && !isImpaired(target) && extra.mayorRedirect) {
    const other = byId(g, extra.mayorRedirect);
    // The kill moves to another player, who is still safe if dead, the Soldier or Monk-protected.
    if (other && other.id !== target.id) {
      if (!other.alive || markerWorks(g, other, 'protected') || (other.role === 'soldier' && !isImpaired(other))) {
        return res(`le Maire est épargné, ${other.name} est désigné(e) à sa place mais ne meurt pas.`,
          `the Mayor is spared, ${other.name} is chosen instead but does not die.`);
      }
      victim = other;
    }
  }
  killPlayer(g, victim.id, 'demon');
  addMarker(victim, 'diedtonight');
  // The Mayor's kill bounced onto the Imp and the Scarlet Woman took over: the Demon has already
  // acted tonight, so she only learns it (like a star-pass) instead of killing again.
  if (g.night && g.swPromoted && g.swPromoted !== promotedBefore) {
    g.night.data[`imp:${g.swPromoted}`] = { targets: [], value: true };
    g.swPromoted = promotedBefore;
  }
  if (victim !== target) {
    return res(`le Maire est épargné, ${victim.name} meurt à sa place.`, `the Mayor is spared, ${victim.name} dies instead.`);
  }
  return res(`${victim.name} meurt.`, `${victim.name} dies.`);
}

/** Who becomes the Imp on a star-pass: the Scarlet Woman if she can, otherwise the chosen (or first) living Minion. */
export interface HistoryEntry { night: number; key: string; role: RoleId; playerId: string; data: StepAction }

/** Completed steps of earlier nights (and of tonight, unless `pastOnly`), oldest first. */
export function nightHistory(g: Game, filter: { role?: RoleId; playerId?: string; pastOnly?: boolean }): HistoryEntry[] {
  const nights = [...(g.pastNights ?? []), ...(g.night && !filter.pastOnly ? [g.night] : [])];
  const out: HistoryEntry[] = [];
  for (const n of nights) {
    for (const key of n.done) {
      const [role, playerId] = key.split(':') as [RoleId, string | undefined];
      const data = n.data[key];
      if (!playerId || !data || !ROLES[role]) continue;
      if (filter.role && role !== filter.role) continue;
      if (filter.playerId && playerId !== filter.playerId) continue;
      out.push({ night: n.number, key, role, playerId, data });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Contradictions with information already given

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Ways the information about to be given contradicts what players were already told
 * (players compare notes: a false info that clashes with an earlier one gives the lie away).
 */
export function infoConflicts(g: Game, step: { key: string; role?: RoleId; playerId?: string }, data: StepAction): L10n[] {
  const p = byId(g, step.playerId);
  if (!p || !step.role) return [];
  const tonight = g.night?.number;
  const hist = nightHistory(g, {}).filter((e) => !(e.night === tonight && e.key === step.key));
  const out: L10n[] = [];
  const n = (night: number) => L(`N${night}`, `N${night}`);
  const names = (ids: string[], fr = ' et ', en = ' and ') => L(ids.map((i) => nameOf(g, i)).join(fr), ids.map((i) => nameOf(g, i)).join(en));
  const registersOdd = (ids: string[]) => ids.some((i) => { const q = byId(g, i); return q?.role === 'spy' || q?.role === 'recluse'; });
  const oddNote = L(' (possible si l’Espion ou le Reclus se perçoit autrement)', ' (possible if the Spy or Recluse registers differently)');

  /** Characters already shown for a player (Undertaker, Ravenkeeper). */
  const known = (id: string) => hist.filter((e) => (e.role === 'undertaker' || e.role === 'ravenkeeper') && e.data.role && e.data.targets[0] === id);
  const pings = hist.filter((e) => (e.role === 'washerwoman' || e.role === 'librarian' || e.role === 'investigator') && e.data.role && e.data.targets.length === 2);
  const librarianZero = hist.find((e) => e.role === 'librarian' && !e.data.role);

  if (step.role === 'empath' && data.value != null) {
    const now = aliveNeighbours(g, p.id).map((q) => q.id);
    for (const e of hist.filter((h) => h.role === 'empath' && h.playerId === p.id && h.data.neighbours)) {
      if (sameSet(e.data.neighbours!, now) && Number(e.data.value) !== Number(data.value)) {
        const nb = names(now);
        out.push(L(`${n(e.night).fr} : ${p.name} avait reçu ${e.data.value} avec les mêmes voisins vivants (${nb.fr}).${registersOdd(now) ? oddNote.fr : ''}`,
          `${n(e.night).en}: ${p.name} got ${e.data.value} with the same living neighbours (${nb.en}).${registersOdd(now) ? oddNote.en : ''}`));
      }
    }
  }

  if (step.role === 'fortuneteller' && data.targets.length === 2) {
    const past = hist.filter((h) => h.role === 'fortuneteller' && h.playerId === p.id && h.data.targets.length === 2);
    const demonMoved = hist.some((h) => h.role === 'scarletwoman' || (h.role === 'imp' && h.data.value === true));
    const moved = demonMoved ? L(' (sauf si c’est le nouveau Démon)', ' (unless they are the new Demon)') : L('', '');
    const cleared = new Map<string, number>();
    for (const e of past) if (!e.data.value) for (const t of e.data.targets) if (!cleared.has(t)) cleared.set(t, e.night);
    for (const e of past) {
      if (sameSet(e.data.targets, data.targets) && !!e.data.value !== !!data.value) {
        const pair = names(data.targets);
        out.push(L(`${n(e.night).fr} : la même paire (${pair.fr}) avait reçu ${e.data.value ? 'OUI' : 'NON'}.${moved.fr}`,
          `${n(e.night).en}: the same pair (${pair.en}) got ${e.data.value ? 'YES' : 'NO'}.${moved.en}`));
      }
    }
    if (data.value && data.targets.every((t) => cleared.has(t)) && !past.some((e) => sameSet(e.data.targets, data.targets))) {
      const list = data.targets.map((t) => `${nameOf(g, t)} (N${cleared.get(t)})`).join(', ');
      out.push(L(`Les deux joueurs ont déjà reçu NON : ${list}. Un OUI est impossible.${moved.fr}`,
        `Both players already got NO: ${list}. A YES is impossible.${moved.en}`));
    }
    if (!data.value) {
      // A YES pair whose other player was cleared by a NO points to a single player.
      for (const e of past.filter((h) => h.data.value)) {
        const left = e.data.targets.filter((t) => !cleared.has(t));
        if (left.length === 1 && data.targets.includes(left[0])) {
          const other = e.data.targets.find((t) => t !== left[0])!;
          out.push(L(`${nameOf(g, left[0])} est forcément le « oui » de ${n(e.night).fr} (${nameOf(g, other)} a reçu NON en N${cleared.get(other)}). Un NON le contredit.${moved.fr}`,
            `${nameOf(g, left[0])} must be the “yes” of ${n(e.night).en} (${nameOf(g, other)} got NO on N${cleared.get(other)}). A NO contradicts it.${moved.en}`));
        }
      }
    }
  }

  if ((step.role === 'undertaker' || step.role === 'ravenkeeper') && data.role && data.targets[0]) {
    const t = data.targets[0];
    const R = data.role;
    for (const e of known(t)) {
      const R0 = e.data.role!;
      const promoted = R === 'imp' && ROLES[R0].team === 'minion';
      if (R0 !== R && !promoted) {
        out.push(L(`${n(e.night).fr} : ${rn(e.role).fr} avait appris que ${nameOf(g, t)} était ${rn(R0).fr}.`,
          `${n(e.night).en}: the ${rn(e.role).en} learnt that ${nameOf(g, t)} was the ${rn(R0).en}.`));
      }
    }
    for (const e of pings.filter((h) => h.data.targets.includes(t) && h.data.role !== R)) {
      const X = e.data.role!;
      const other = e.data.targets.find((x) => x !== t)!;
      const otherShown = known(other).find((k) => k.data.role !== X);
      if (otherShown) {
        out.push(L(`${n(e.night).fr} : ${rn(e.role).fr} a appris que ${nameOf(g, t)} ou ${nameOf(g, other)} est ${rn(X).fr}, mais ${nameOf(g, other)} a été montré ${rn(otherShown.data.role!).fr} (N${otherShown.night}).`,
          `${n(e.night).en}: the ${rn(e.role).en} learnt that ${nameOf(g, t)} or ${nameOf(g, other)} is the ${rn(X).en}, but ${nameOf(g, other)} was shown as the ${rn(otherShown.data.role!).en} (N${otherShown.night}).`));
      }
    }
    if (librarianZero && ROLES[R].team === 'outsider') {
      out.push(L(`${n(librarianZero.night).fr} : le Bibliothécaire a appris qu’il n’y a aucun Étranger en jeu.`,
        `${n(librarianZero.night).en}: the Librarian learnt there are no Outsiders in play.`));
    }
  }

  if ((step.role === 'washerwoman' || step.role === 'librarian' || step.role === 'investigator')) {
    if (data.role && data.targets.length === 2) {
      const shown = data.targets.map((t) => known(t).find((k) => k.data.role !== data.role));
      if (shown.every(Boolean)) {
        out.push(L(`${names(data.targets).fr} ont déjà été montrés autrement : ${shown.map((k) => `${nameOf(g, k!.data.targets[0])} = ${rn(k!.data.role!).fr}`).join(', ')}.`,
          `${names(data.targets).en} were already shown otherwise: ${shown.map((k) => `${nameOf(g, k!.data.targets[0])} = ${rn(k!.data.role!).en}`).join(', ')}.`));
      }
    }
    const baronPing = hist.find((e) => e.role === 'investigator' && e.data.role === 'baron');
    if (step.role === 'librarian' && !data.role && baronPing) {
      out.push(L(`${n(baronPing.night).fr} : l’Enquêteur a vu un Baron, qui ajoute des Étrangers. « 0 Étranger » le contredit.`,
        `${n(baronPing.night).en}: the Investigator saw a Baron, who adds Outsiders. “0 Outsiders” contradicts it.`));
    }
    if (step.role === 'investigator' && data.role === 'baron' && librarianZero) {
      out.push(L(`${n(librarianZero.night).fr} : le Bibliothécaire a appris « 0 Étranger », or le Baron en ajoute.`,
        `${n(librarianZero.night).en}: the Librarian learnt “0 Outsiders”, but the Baron adds some.`));
    }
  }
  return out;
}

export function starpassHeir(g: Game, impId: string, chosenId?: string): Player | undefined {
  const minions = g.players.filter((p) => p.alive && p.id !== impId && teamOf(p) === 'minion');
  const sw = minions.find((p) => p.role === 'scarletwoman' && !isImpaired(p));
  if (sw && aliveCount(g) >= 5) return sw;
  return minions.find((p) => p.id === chosenId) ?? minions[0];
}

export function startDay(g: Game) {
  g.phase = 'day';
  g.dayNumber = g.nightNumber;
  g.day = { number: g.dayNumber, nominations: [], blockId: null, blockVotes: 0, ended: false };
  g.executedToday = null;
  g.swPromoted = null;
  const dead = g.players.filter((p) => hasMarker(p, 'diedtonight'));
  log(g, L(`☀️ Jour ${g.dayNumber}`, `☀️ Day ${g.dayNumber}`), true);
  log(g, dead.length
    ? L(`Morts cette nuit : ${dead.map((p) => p.name).join(', ')}.`, `Died tonight: ${dead.map((p) => p.name).join(', ')}.`)
    : L('Personne n\'est mort cette nuit.', 'Nobody died tonight.'), true);
  checkWin(g);
}

// ---------------------------------------------------------------------------
// Deaths & victory

export type DeathCause = 'demon' | 'execution' | 'slayer' | 'exile' | 'ability' | 'manual';

export function killPlayer(g: Game, id: string, cause: DeathCause, opts: { skipDemonCheck?: boolean } = {}) {
  const p = byId(g, id);
  if (!p?.alive) return;
  const aliveBefore = aliveCount(g);
  p.alive = false;
  p.ghostVote = true;
  if (cause === 'execution' || cause === 'exile') addMarker(p, 'executed');

  // Poison ends when the Poisoner dies.
  if (p.role === 'poisoner') removeMarkers(g, (m) => m.key === 'poisoned' && m.by === p.id);

  if (cause === 'execution') {
    g.executedToday = p.id;
    if (p.role === 'saint' && !isImpaired(p)) {
      g.pendingWin = { winner: 'evil', reason: L(`Le Saint (${p.name}) a été exécuté.`, `The Saint (${p.name}) was executed.`) };
    }
  }

  if (teamOf(p) === 'demon' && !opts.skipDemonCheck) {
    const sw = g.players.find((q) => q.role === 'scarletwoman' && q.alive && !isImpaired(q));
    if (sw && aliveBefore >= 5) {
      setRole(g, sw, 'imp');
      g.swPromoted = sw.id;
      log(g, L(`La Succube (${sw.name}) devient le Diable !`, `The Scarlet Woman (${sw.name}) becomes the Imp!`), true);
    }
  }
  if (cause !== 'demon') {
    const how: Record<DeathCause, L10n> = {
      demon: L('', ''), execution: L('est exécuté(e)', 'is executed'), slayer: L('est abattu(e) par le Pourfendeur', 'is slain by the Slayer'),
      exile: L('est exilé(e)', 'is exiled'), ability: L('meurt', 'dies'), manual: L('meurt', 'dies'),
    };
    log(g, L(`💀 ${p.name} ${how[cause].fr}.`, `💀 ${p.name} ${how[cause].en}.`), true);
  }
  checkWin(g);
}

export function revivePlayer(g: Game, id: string) {
  const p = byId(g, id);
  if (!p) return;
  p.alive = true;
  p.ghostVote = true;
  p.markers = p.markers.filter((m) => m.key !== 'diedtonight' && m.key !== 'executed');
  log(g, L(`${p.name} est de nouveau vivant(e).`, `${p.name} is alive again.`));
}

export function checkWin(g: Game) {
  if (g.phase === 'ended' || g.phase === 'setup' || g.pendingWin) return;
  const regular = g.players.filter((p) => !isTraveller(p));
  const demons = regular.filter((p) => p.alive && teamOf(p) === 'demon');
  if (demons.length === 0) {
    g.pendingWin = { winner: 'good', reason: L('Le Démon est mort.', 'The Demon is dead.') };
  } else if (aliveCount(g) <= 2) {
    g.pendingWin = { winner: 'evil', reason: L('Il ne reste que 2 joueurs vivants.', 'Only 2 players are left alive.') };
  }
}

export function confirmWin(g: Game) {
  if (!g.pendingWin) return;
  g.winner = g.pendingWin.winner;
  g.winReason = g.pendingWin.reason;
  g.pendingWin = null;
  g.phase = 'ended';
  log(g, L(`🏆 Victoire des ${g.winner === 'good' ? 'Bons' : 'Maléfiques'} — ${g.winReason.fr}`,
    `🏆 ${g.winner === 'good' ? 'Good' : 'Evil'} wins — ${g.winReason.en}`), true);
}

export function dismissWin(g: Game) {
  g.pendingWin = null;
}

export function declareWin(g: Game, winner: Alignment) {
  g.pendingWin = { winner, reason: L('Décision du Conteur.', 'Storyteller decision.') };
  confirmWin(g);
}

// ---------------------------------------------------------------------------
// Day

export function nominate(g: Game, nominatorId: string, nomineeId: string): Nomination | undefined {
  if (!g.day) return;
  const nominator = byId(g, nominatorId)!;
  const nominee = byId(g, nomineeId)!;
  const exile = isTraveller(nominee);
  const nom: Nomination = { nominator: nominatorId, nominee: nomineeId, voters: [], total: null, exile };
  log(g, L(`${nominator.name} ${exile ? 'appelle à l\'exil de' : 'nomine'} ${nominee.name}.`,
    `${nominator.name} ${exile ? 'calls for the exile of' : 'nominates'} ${nominee.name}.`));
  // A dead Virgin has lost her ability: nominating her neither triggers nor spends it.
  if (!exile && nominee.role === 'virgin' && nominee.alive && !hasMarker(nominee, 'used')) {
    if (!isImpaired(nominee)) {
      nom.virginTrigger = teamOf(nominator) === 'townsfolk';
    }
    addMarker(nominee, 'used');
  }
  g.day.nominations.push(nom);
  return nom;
}

/** A vote marker only counts while the Traveller who placed it is alive, sober & healthy. */
function voteMarkerWorks(g: Game, p: Player, key: MarkerKey): boolean {
  return p.markers.some((m) => {
    if (m.key !== key) return false;
    const src = byId(g, m.by);
    return !src || (src.alive && !isImpaired(src));
  });
}

/** Abilities (Bureaucrat, Thief) cannot affect an exile. Both on the same player: −3. */
export function voteWeight(g: Game, p: Player, exile = false): number {
  if (exile) return 1;
  return (voteMarkerWorks(g, p, 'threevotes') ? 3 : 1) * (voteMarkerWorks(g, p, 'negvote') ? -1 : 1);
}

export function recordVote(g: Game, index: number, voterIds: string[]) {
  const nom = g.day?.nominations[index];
  if (!g.day || !nom) return;
  // A re-vote gives back the ghost vote of a dead player who no longer votes (unless spent on another nomination today).
  for (const id of nom.voters) {
    const p = byId(g, id);
    if (p && !p.alive && !nom.exile && !voterIds.includes(id)
      && !g.day.nominations.some((o) => o !== nom && !o.exile && o.voters.includes(id))) p.ghostVote = true;
  }
  nom.voters = voterIds;
  let total = 0;
  for (const id of voterIds) {
    const p = byId(g, id);
    if (!p) continue;
    total += voteWeight(g, p, nom.exile);
    if (!p.alive && !nom.exile) p.ghostVote = false;
  }
  nom.total = total;
  nom.needed ??= votesNeeded(g, nom.exile);
  const needed = nom.needed;
  const nominee = byId(g, nom.nominee)!;
  log(g, L(`Vote sur ${nominee.name} : ${total} voix (${needed} requises) — ${voterIds.map((v) => nameOf(g, v)).join(', ') || 'aucun'}.`,
    `Vote on ${nominee.name}: ${total} votes (${needed} needed) — ${voterIds.map((v) => nameOf(g, v)).join(', ') || 'none'}.`));
  if (nom.exile) {
    if (total >= needed) killPlayer(g, nominee.id, 'exile');
    return;
  }
  recomputeBlock(g);
}

export function recomputeBlock(g: Game) {
  if (!g.day) return;
  let blockId: string | null = null;
  let best = 0;
  for (const n of g.day.nominations) {
    if (n.exile || n.total === null || n.total < nominationNeeded(g, n)) continue;
    if (n.total > best) { best = n.total; blockId = n.nominee; }
    else if (n.total === best) blockId = null;
  }
  g.day.blockId = blockId;
  g.day.blockVotes = best;
}

/** Executes someone right now (Virgin, storyteller decision...). Ends the day. */
export function executeNow(g: Game, id: string) {
  killPlayer(g, id, 'execution');
  if (g.day) { g.day.blockId = null; g.day.ended = true; }
}

export function slayerShot(g: Game, shooterId: string, targetId: string, recluseAsDemon = false): L10n {
  const shooter = byId(g, shooterId)!;
  const target = byId(g, targetId)!;
  let hit = false;
  // A dead Slayer has lost their ability.
  if (wakeRole(shooter) === 'slayer' && shooter.alive && !hasMarker(shooter, 'used')) {
    addMarker(shooter, 'used');
    const isDemon = teamOf(target) === 'demon' || (target.role === 'recluse' && recluseAsDemon);
    hit = !isImpaired(shooter) && isDemon && target.alive;
  }
  const text = hit ? L(`${target.name} meurt !`, `${target.name} dies!`) : L('rien ne se passe.', 'nothing happens.');
  log(g, L(`🏹 ${shooter.name} tire sur ${target.name} : ${text.fr}`, `🏹 ${shooter.name} shoots ${target.name}: ${text.en}`), true);
  if (hit) killPlayer(g, target.id, 'slayer');
  return text;
}

/** Ends the day: executes whoever is on the block (or the Scapegoat instead). */
export function endDay(g: Game, opts: { scapegoatId?: string } = {}) {
  if (!g.day) return;
  if (!g.day.ended) {
    const blockId = g.day.blockId;
    if (blockId) {
      const target = opts.scapegoatId ?? blockId;
      if (opts.scapegoatId) {
        log(g, L(`Le Bouc émissaire (${nameOf(g, target)}) est exécuté à la place de ${nameOf(g, blockId)}.`,
          `The Scapegoat (${nameOf(g, target)}) is executed instead of ${nameOf(g, blockId)}.`));
      }
      const t = byId(g, target);
      if (t && !t.alive) {
        log(g, L(`💀 ${t.name} (déjà mort) est exécuté(e) : rien ne se passe.`, `💀 ${t.name} (already dead) is executed: nothing happens.`), true);
      }
      killPlayer(g, target, 'execution');
    } else {
      log(g, L('Personne n\'est exécuté aujourd\'hui.', 'Nobody is executed today.'), true);
      const mayor = g.players.find((p) => p.role === 'mayor' && p.alive && !isImpaired(p));
      // Travellers count as players for the Mayor's victory.
      if (mayor && aliveAll(g) === 3 && !g.pendingWin) {
        g.pendingWin = { winner: 'good', reason: L('3 joueurs vivants, pas d\'exécution, le Maire est en vie.', '3 players alive, no execution, the Mayor lives.') };
      }
    }
    g.day.ended = true;
  }
}

// ---------------------------------------------------------------------------
// Misc

export function stats(g: Game) {
  const regular = g.players.filter((p) => !isTraveller(p));
  return {
    alive: aliveCount(g),
    total: regular.length,
    ghostVotes: g.players.filter((p) => !p.alive && p.ghostVote).length,
    needed: votesNeeded(g),
  };
}

export function seedFor(g: Game, key: string): Rng {
  return seeded(`${g.id}:${g.nightNumber}:${key}`);
}
