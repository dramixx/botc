import { describe, expect, it } from 'vitest';
import type { RoleId } from '../data/roles';
import { ROLES } from '../data/roles';
import { addTraveller, killPlayer, newGame, nominate, recordVote, setRole, startDay, startNight } from './engine';
import { publicSnapshot } from './live';
import type { TimerState } from './timer';
import type { Game } from './types';

function gameWith(roles: RoleId[]): Game {
  const g = newGame({ count: roles.length });
  g.players.forEach((p, i) => { p.name = `P${i}`; setRole(g, p, roles[i]); });
  g.phase = 'night';
  return g;
}
const ROLES8: RoleId[] = ['imp', 'poisoner', 'drunk', 'chef', 'empath', 'monk', 'soldier', 'mayor'];

describe('public snapshot', () => {
  it('never contains characters, alignments or reminders', () => {
    const g = gameWith(ROLES8);
    startNight(g);
    startDay(g);
    g.players[3].markers.push({ key: 'poisoned', by: g.players[1].id });
    g.players[2].believedRole = 'fortuneteller';
    const json = JSON.stringify(publicSnapshot(g));
    for (const id of Object.keys(ROLES)) expect(json).not.toContain(`"${id}"`);
    for (const word of ['good', 'evil', 'poisoned', 'alignment', 'role', 'markers', g.players[0].id]) expect(json).not.toContain(word);
  });

  it('hides the night’s deaths until the day starts', () => {
    const g = gameWith(ROLES8);
    startNight(g);
    startDay(g);
    startNight(g);
    killPlayer(g, g.players[4].id, 'demon');
    killPlayer(g, g.players[5].id, 'manual');
    let s = publicSnapshot(g);
    expect(s.phase).toBe('night');
    expect(s.players.every((p) => p.alive)).toBe(true);
    expect(s.alive).toBe(8);
    expect(s.needed).toBe(4);
    startDay(g);
    s = publicSnapshot(g);
    expect(s.players.map((p) => p.alive)).toEqual([true, true, true, true, false, false, true, true]);
    expect(s.alive).toBe(6);
    expect(s.needed).toBe(3);
    expect(s.ghostVotes).toBe(2);
  });

  it('shows the public setup, the votes and the block', () => {
    const g = gameWith(ROLES8);
    startNight(g);
    startDay(g);
    expect(publicSnapshot(g).distribution).toEqual([5, 1, 1, 1]);
    killPlayer(g, g.players[7].id, 'manual');
    nominate(g, g.players[0].id, g.players[3].id);
    recordVote(g, 0, [g.players[0].id, g.players[1].id, g.players[2].id, g.players[4].id, g.players[7].id]);
    const s = publicSnapshot(g);
    expect(s.nominations).toEqual([{ nominator: 0, nominee: 3, votes: 5, exile: false, voters: [0, 1, 2, 4, 7], tally: 5 }]);
    expect(s.block).toEqual({ seat: 3, votes: 5 });
    expect(s.players[7]).toEqual({ name: 'P7', alive: false, ghostVote: false });
    expect(s.ghostVotes).toBe(0);
  });

  it('shows the hands being counted before the vote is confirmed', () => {
    const g = gameWith(ROLES8);
    startNight(g);
    startDay(g);
    nominate(g, g.players[1].id, g.players[5].id);
    const draft = { index: 0, voters: [g.players[2].id, g.players[6].id] };
    expect(publicSnapshot(g, null, Date.now(), draft).nominations[0]).toMatchObject({ voters: [2, 6], tally: 2, votes: null });
    expect(publicSnapshot(g).nominations[0]).toMatchObject({ voters: [], tally: 0, votes: null });
    // Once recorded, the recorded hands win over any leftover draft.
    recordVote(g, 0, [g.players[2].id]);
    expect(publicSnapshot(g, null, Date.now(), draft).nominations[0]).toMatchObject({ voters: [2], tally: 1, votes: 1 });
  });

  it('shows Travellers’ characters (public) and counts them for the votes only', () => {
    const g = gameWith(ROLES8);
    addTraveller(g, 'T', 'gunslinger', 'evil');
    startNight(g);
    startDay(g);
    const s = publicSnapshot(g);
    expect(s.players[8]).toEqual({ name: 'T', alive: true, ghostVote: false, traveller: 'gunslinger' });
    expect(JSON.stringify(s)).not.toContain('evil');
    expect(s.total).toBe(8);
    expect(s.needed).toBe(5);
    expect(s.distribution).toEqual([5, 1, 1, 1]);
  });

  it('sends the day timer with the seconds left', () => {
    const g = gameWith(ROLES8);
    startNight(g);
    startDay(g);
    const t: TimerState = { gameId: g.id, day: g.dayNumber, segment: 'public', total: 300, remaining: 300, endsAt: 1_000_000 + 120_000, rang: false };
    expect(publicSnapshot(g, t, 1_000_000).timer).toEqual({ segment: 'public', total: 300, remaining: 120, running: true });
    expect(publicSnapshot(g, { ...t, day: 9 }, 1_000_000).timer).toBeNull();
  });

  it('shows nothing of a game being set up', () => {
    const g = newGame({ count: 7 });
    const s = publicSnapshot(g);
    expect(s.phase).toBe('setup');
    expect(s.players).toEqual([]);
    expect(publicSnapshot(null).phase).toBe('waiting');
  });
});
