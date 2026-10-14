import { describe, expect, it } from 'vitest';
import type { RoleId } from '../data/roles';
import { executionAlerts, noExecutionAlerts, stepAlerts, unvotedAlerts } from './alerts';
import { addMarker, killPlayer, newGame, nightSteps, nominate, setRole, startDay, startNight } from './engine';
import { handoutSeats } from './live';
import type { Game } from './types';

function gameWith(roles: RoleId[]): Game {
  const g = newGame({ count: roles.length });
  g.players.forEach((p, i) => { p.name = `P${i}`; setRole(g, p, roles[i]); });
  return g;
}
const ROLES8: RoleId[] = ['imp', 'poisoner', 'drunk', 'chef', 'empath', 'monk', 'soldier', 'mayor'];
const keys = (a: { key: string }[]) => a.map((x) => x.key);
const step = (g: Game, role: RoleId) => nightSteps(g).find((s) => s.role === role)!;

describe('night alerts', () => {
  it('flags the Drunk and poisoned players when they wake', () => {
    const g = gameWith(ROLES8);
    g.players[2].believedRole = 'empath';
    startNight(g);
    addMarker(g.players[3], 'poisoned', g.players[1].id);
    const chef = stepAlerts(g, step(g, 'chef'), { targets: [] });
    expect(keys(chef)).toEqual(['poisoned']);
    expect(chef[0].title.fr).toContain('P1');
    const drunk = nightSteps(g).find((s) => s.playerId === g.players[2].id)!;
    expect(keys(stepAlerts(g, drunk, { targets: [] }))).toEqual(['drunk']);
    const empath = nightSteps(g).find((s) => s.playerId === g.players[4].id)!;
    expect(stepAlerts(g, empath, { targets: [] })).toEqual([]);
  });

  it('warns when the Imp targets the Mayor, the Soldier, a protected player or themself', () => {
    const g = gameWith(ROLES8);
    startNight(g);
    startDay(g);
    startNight(g);
    const imp = step(g, 'imp');
    const [demon, , , , , , soldier, mayor] = g.players;
    expect(keys(stepAlerts(g, imp, { targets: [mayor.id] }))).toEqual([`mayor:${mayor.id}`]);
    expect(stepAlerts(g, imp, { targets: [soldier.id] })[0].tone).toBe('bon');
    addMarker(g.players[3], 'protected', g.players[5].id);
    expect(keys(stepAlerts(g, imp, { targets: [g.players[3].id] }))).toEqual([`monk:${g.players[3].id}`]);
    expect(keys(stepAlerts(g, imp, { targets: [demon.id] }))).toEqual(['starpass']);
    expect(stepAlerts(g, imp, { targets: [g.players[4].id] })).toEqual([]);
  });

  it('a poisoned Imp kills nobody', () => {
    const g = gameWith(ROLES8);
    startNight(g);
    startDay(g);
    startNight(g);
    addMarker(g.players[0], 'poisoned', g.players[1].id);
    const a = stepAlerts(g, step(g, 'imp'), { targets: [g.players[7].id] });
    expect(keys(a)).toEqual(['poisoned']);
    expect(a[0].text.en).toContain('kills nobody');
  });

  it('lists the steps left undone at dawn', () => {
    const g = gameWith(ROLES8);
    startNight(g);
    const dawn = nightSteps(g).find((s) => s.kind === 'dawn')!;
    expect(keys(stepAlerts(g, dawn, { targets: [] }))).toEqual(['pending']);
  });
});

describe('day alerts', () => {
  it('executing the Saint, or the Demon with a Scarlet Woman around', () => {
    const g = gameWith(['imp', 'scarletwoman', 'saint', 'chef', 'empath', 'monk', 'soldier', 'mayor']);
    startNight(g);
    startDay(g);
    expect(executionAlerts(g, g.players[2].id)[0].tone).toBe('mal');
    expect(executionAlerts(g, g.players[0].id)[0].title.en).toContain('Scarlet Woman');
    expect(executionAlerts(g, g.players[3].id)).toEqual([]);
  });

  it('no execution with 3 alive and the Mayor; nominations not voted on', () => {
    const g = gameWith(['imp', 'poisoner', 'chef', 'empath', 'mayor']);
    startNight(g);
    killPlayer(g, g.players[2].id, 'manual');
    killPlayer(g, g.players[3].id, 'manual');
    startDay(g);
    expect(keys(noExecutionAlerts(g))).toEqual(['mayor']);
    expect(unvotedAlerts(g)).toEqual([]);
    nominate(g, g.players[0].id, g.players[1].id);
    expect(keys(unvotedAlerts(g))).toEqual(['unvoted']);
  });
});

describe('hand-out on the phones', () => {
  it('sends characters only during the hand-out step, as the player must see them', () => {
    const g = gameWith(ROLES8);
    g.players[2].believedRole = 'empath';
    expect(handoutSeats(g)).toBeNull();
    g.setupStep = 'distribute';
    const seats = handoutSeats(g)!;
    expect(seats.gameId).toBe(g.id);
    expect(seats.players[0]).toMatchObject({ name: 'P0', role: 'imp', alignment: 'evil' });
    expect(seats.players[2]).toMatchObject({ role: 'empath', alignment: 'good' });
    g.phoneDeal = false;
    expect(handoutSeats(g)).toBeNull();
    g.phoneDeal = true;
    startNight(g);
    expect(handoutSeats(g)).toBeNull();
  });
});
