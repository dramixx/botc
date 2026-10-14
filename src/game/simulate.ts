import type { RoleId } from '../data/roles';
import {
  aliveAll, aliveCount, autoAssign, byId, chefNumber, completeStep, confirmWin, currentStep, empathNumber, endDay, executeNow,
  fortuneAnswer, hasMarker, isTraveller, newGame, nominate, pingSuggestion, randomRoles, recordVote, slayerShot, startDay,
  startNight, teamOf, wakeRole,
} from './engine';
import type { NightStep } from './engine';
import { pick, seeded, shuffle } from './rng';
import type { Rng } from './rng';
import type { Game, Player, StepAction } from './types';

/**
 * Plays whole games through the engine with a bot standing in for the storyteller and the players.
 * - 'random': every choice is uniformly random.
 * - 'logic' : evil kills/votes against good, good votes against suspects they were told about,
 *             the Slayer shoots a suspect, the Imp avoids killing itself.
 */
export type Strategy = 'random' | 'logic';

export interface SimResult {
  game: Game;
  seed: string;
  days: number;
  violations: string[];
}

const MAX_DAYS = 40;
const ended = (g: Game) => g.phase === 'ended';

const alive = (g: Game) => g.players.filter((p) => p.alive);
const others = (g: Game, p: Player) => alive(g).filter((q) => q.id !== p.id);

function nightData(g: Game, step: NightStep, rng: Rng, strat: Strategy): StepAction {
  const me = byId(g, step.playerId);
  const none: StepAction = { targets: [] };
  if (!me || !step.role) return none;
  const target = (pool: Player[]) => { const t = pick(pool, rng); return t ? [t.id] : []; };
  switch (step.role) {
    case 'poisoner': case 'butler': case 'bureaucrat': case 'thief': case 'monk':
      return { targets: target(others(g, me)) };
    case 'imp': {
      if (strat === 'logic') {
        const good = others(g, me).filter((q) => q.alignment === 'good' && q.role !== 'soldier');
        return { targets: target(good.length ? good : others(g, me)) };
      }
      return { targets: target(alive(g)) };
    }
    case 'washerwoman': return pingSuggestion(g, me.id, 'townsfolk', rng);
    case 'librarian': return pingSuggestion(g, me.id, 'outsider', rng);
    case 'investigator': return pingSuggestion(g, me.id, 'minion', rng);
    case 'chef': return { targets: [], value: chefNumber(g) };
    case 'empath': return { targets: [], value: empathNumber(g, me.id) };
    case 'fortuneteller': {
      const t = shuffle(g.players, rng).slice(0, 2).map((p) => p.id);
      return { targets: t, value: fortuneAnswer(g, t) };
    }
    case 'ravenkeeper': {
      const t = pick(g.players, rng);
      return { targets: t ? [t.id] : [], role: t?.role };
    }
    case 'undertaker': {
      const ex = byId(g, g.executedToday);
      return { targets: ex ? [ex.id] : [], role: ex?.role };
    }
    default: return none;
  }
}

function runNight(g: Game, rng: Rng, strat: Strategy, v: string[]) {
  startNight(g);
  for (let guard = 0; guard < 100; guard++) {
    const step = currentStep(g);
    if (!step) return;
    completeStep(g, step, nightData(g, step, rng, strat));
    checkInvariants(g, v, `night ${g.nightNumber} step ${step.key}`);
  }
  v.push(`night ${g.nightNumber}: step loop did not terminate`);
}

function runDay(g: Game, rng: Rng, strat: Strategy, v: string[]) {
  startDay(g);
  checkInvariants(g, v, `day ${g.dayNumber} start`);
  if (g.pendingWin) return;

  // Slayer shot.
  const slayer = g.players.find((p) => p.alive && wakeRole(p) === 'slayer' && !hasMarker(p, 'used'));
  if (slayer && rng() < 0.3) {
    const pool = others(g, slayer);
    const t = strat === 'logic' ? pool.find((q) => teamOf(q) === 'demon') ?? pick(pool, rng) : pick(pool, rng);
    if (t) slayerShot(g, slayer.id, t.id);
  }

  const nominations = strat === 'logic' ? 2 + Math.floor(rng() * 3) : Math.floor(rng() * 4);
  for (let i = 0; i < nominations && !g.pendingWin && g.day && !g.day.ended; i++) {
    const nominator = pick(g.players.filter((p) => p.alive && !isTraveller(p)
      && !g.day!.nominations.some((n) => n.nominator === p.id)), rng);
    const nominee = pick(g.players.filter((p) => (strat === 'random' || p.alive) && !g.day!.nominations.some((n) => n.nominee === p.id)), rng);
    if (!nominator || !nominee) break;
    const nom = nominate(g, nominator.id, nominee.id)!;
    if (nom.virginTrigger) { executeNow(g, nominator.id); break; }
    const voters = g.players.filter((p) => (p.alive || (p.ghostVote && !nom.exile))
      && (strat === 'logic' ? voteLogic(p, nominee, rng) : rng() < 0.5)).map((p) => p.id);
    recordVote(g, g.day!.nominations.length - 1, voters);
    checkInvariants(g, v, `day ${g.dayNumber} vote`);
  }
  if (!g.pendingWin) endDay(g);
  checkInvariants(g, v, `day ${g.dayNumber} end`);
}

function voteLogic(voter: Player, nominee: Player, rng: Rng): boolean {
  if (voter.alignment === 'evil') return nominee.alignment === 'good' ? rng() < 0.8 : rng() < 0.05;
  return rng() < 0.55;
}

/** Rules that must hold at every moment of a game, whatever the storyteller does. */
export function checkInvariants(g: Game, v: string[], where: string) {
  const bad = (m: string) => v.push(`[${where}] ${m}`);
  const regular = g.players.filter((p) => !isTraveller(p));
  if (new Set(g.players.map((p) => p.id)).size !== g.players.length) bad('duplicate player ids');
  for (const p of g.players) {
    if (!isTraveller(p) && p.alignment !== (['townsfolk', 'outsider'].includes(teamOf(p)) ? 'good' : 'evil')) {
      bad(`${p.name} (${p.role}) has alignment ${p.alignment}`);
    }
    if (p.role === 'drunk' && !p.believedRole) bad(`${p.name} is Drunk without a believed role`);
    if (p.role !== 'drunk' && p.believedRole) bad(`${p.name} (${p.role}) still has a believed role`);
  }
  // A dead Imp keeps its card after a star-pass, so only living players must be unique.
  const roles = regular.filter((p) => p.alive).map((p) => p.role);
  const drunk = regular.find((p) => p.role === 'drunk');
  if (drunk?.believedRole && roles.includes(drunk.believedRole)) bad(`Drunk believes ${drunk.believedRole} which is also in play`);
  for (const r of new Set(roles)) if (roles.filter((x) => x === r).length > 1) bad(`role ${r} is in play twice`);
  const demons = regular.filter((p) => p.alive && teamOf(p) === 'demon');
  if (demons.length > 1) bad(`${demons.length} living demons`);
  if (demons.length === 0 && !g.pendingWin && g.phase !== 'ended') bad('no living demon and no pending victory');
  if (g.phase === 'ended' && !g.winner) bad('ended without a winner');
  if (g.phase !== 'ended' && g.winner) bad('winner set before the end');
  if (g.pendingWin?.winner === 'good' && demons.length > 0 && !g.players.some((p) => p.role === 'mayor' && p.alive)) {
    bad('good wins while a demon lives and there is no Mayor');
  }
  if (g.pendingWin?.winner === 'evil' && aliveCount(g) > 2 && !g.players.some((p) => p.role === 'saint' && !p.alive)) {
    bad(`evil wins with ${aliveCount(g)} alive and no dead Saint`);
  }
  if (aliveAll(g) > g.players.length) bad('more alive than players');
  try { structuredClone(g); JSON.stringify(g); } catch { bad('game state is not serialisable'); }
}

export function simulateGame(seed: string, count: number, strat: Strategy): SimResult {
  const rng = seeded(seed);
  const v: string[] = [];
  const g = newGame({ count });
  try {
    g.selectedRoles = randomRoles(count, rng) as RoleId[];
    autoAssign(g, rng);
    for (const p of g.players) p.seen = true;
    checkInvariants(g, v, 'setup');
    let days = 0;
    while (!ended(g) && days < MAX_DAYS && v.length === 0) {
      runNight(g, rng, strat, v);
      if (g.pendingWin) confirmWin(g);
      if (ended(g)) break;
      runDay(g, rng, strat, v);
      days++;
      if (g.pendingWin) confirmWin(g);
    }
    if (!ended(g) && v.length === 0) v.push(`game still running after ${MAX_DAYS} days`);
    checkInvariants(g, v, 'final');
    return { game: g, seed, days, violations: v };
  } catch (e) {
    v.push(`exception: ${(e as Error).stack ?? e}`);
    return { game: g, seed, days: g.dayNumber, violations: v };
  }
}
