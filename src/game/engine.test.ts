import { describe, expect, it } from 'vitest';
import { ROLES, type RoleId } from '../data/roles';
import {
  autoAssign, chefNumber, checkSetup, numberOptions, completeRoles, completeStep, reorderPlayer, currentStep, demoGame, empathNumber, endDay,
  fortuneAnswer, newGame, rerollTeam, nightHistory, nightSteps, nominate, randomRoles, recordVote, setRole, slayerShot,
  startDay, startNight, uncompleteStep, aliveCount, byId, executeNow, starpassHeir, addMarker, impKill, hasMarker, addTraveller, votesNeeded, voteWeight, infoConflicts,
} from './engine';
import { seeded } from './rng';
import type { Game } from './types';

function gameWith(roles: RoleId[]): Game {
  const g = newGame({ count: roles.length });
  g.players.forEach((p, i) => { p.name = `P${i}`; setRole(g, p, roles[i]); });
  return g;
}
const P = (g: Game, i: number) => g.players[i];

describe('setup helpers', () => {
  it('completeRoles fixes any selection to the distribution', () => {
    for (let n = 5; n <= 15; n++) {
      for (const start of [[], ['baron', 'imp'], ['empath', 'chef', 'monk', 'soldier', 'mayor', 'saint', 'drunk', 'recluse']] as RoleId[][]) {
        const roles = completeRoles(start, n, seeded(`c-${n}`));
        expect(checkSetup(n, roles).ok).toBe(true);
        expect(new Set(roles).size).toBe(roles.length);
      }
    }
  });

  it('rerollTeam redraws one team and keeps the distribution', () => {
    for (let n = 5; n <= 15; n++) {
      for (const team of ['townsfolk', 'outsider', 'minion'] as const) {
        const start = randomRoles(n, seeded(`t-${n}`));
        const roles = rerollTeam(start, n, team, seeded(`t-${n}-${team}`));
        expect(checkSetup(n, roles).ok).toBe(true);
        expect(new Set(roles).size).toBe(roles.length);
        if (team !== 'minion') expect(roles.filter((r) => ROLES[r].team !== team)).toEqual(start.filter((r) => ROLES[r].team !== team));
      }
    }
  });

  it('reorderPlayer moves a seat', () => {
    const g = gameWith(randomRoles(6, seeded('r')));
    const ids = g.players.map((p) => p.id);
    reorderPlayer(g, ids[0], 3);
    expect(g.players.map((p) => p.id)).toEqual([ids[1], ids[2], ids[3], ids[0], ids[4], ids[5]]);
  });
});

describe('setup', () => {
  it('random roles always match the distribution', () => {
    for (let n = 5; n <= 15; n++) {
      for (let s = 0; s < 30; s++) {
        const roles = randomRoles(n, seeded(`${n}-${s}`));
        expect(roles).toHaveLength(n);
        expect(checkSetup(n, roles).ok).toBe(true);
        expect(new Set(roles).size).toBe(n);
      }
    }
  });

  it('baron adds two outsiders', () => {
    const c = checkSetup(7, ['baron']);
    expect(c.expected).toEqual({ townsfolk: 3, outsider: 2, minion: 1, demon: 1 });
  });

  it('auto assign gives the drunk a fake townsfolk, a red herring and 3 bluffs', () => {
    const g = newGame({ count: 8 });
    g.selectedRoles = ['drunk', 'fortuneteller', 'chef', 'empath', 'monk', 'soldier', 'poisoner', 'imp'];
    autoAssign(g, seeded('x'));
    const drunk = g.players.find((p) => p.role === 'drunk')!;
    expect(drunk.believedRole).toBeDefined();
    expect(g.selectedRoles).not.toContain(drunk.believedRole);
    expect(g.players.filter((p) => p.markers.some((m) => m.key === 'redherring'))).toHaveLength(1);
    expect(g.bluffs).toHaveLength(3);
    for (const b of g.bluffs) expect(g.selectedRoles).not.toContain(b);
    expect(g.bluffs).not.toContain(drunk.believedRole);
  });
});

describe('information', () => {
  it('chef counts adjacent evil pairs around the circle', () => {
    const g = gameWith(['imp', 'chef', 'empath', 'monk', 'poisoner']);
    expect(chefNumber(g)).toBe(1); // poisoner (4) and imp (0) are neighbours
    const g2 = gameWith(['imp', 'poisoner', 'empath', 'monk', 'chef']);
    expect(chefNumber(g2)).toBe(1);
    expect(chefNumber(g2, [P(g2, 1).id])).toBe(0);
  });

  it('a Spy next to an evil player may not count as a Chef pair', () => {
    const g = gameWith(['imp', 'spy', 'chef', 'empath', 'monk', 'soldier']);
    const opts = numberOptions(g, (m) => chefNumber(g, m));
    expect(opts.get(1)).toEqual([]);
    expect(opts.get(0)).toEqual([P(g, 1).id]);
  });

  it('marks the Chef pairs on the circle', () => {
    const g = gameWith(['imp', 'recluse', 'chef', 'empath', 'monk', 'poisoner']);
    startNight(g);
    const step = nightSteps(g).find((s) => s.role === 'chef')!;
    completeStep(g, step, { targets: [], value: 1 });
    const marked = () => g.players.filter((q) => hasMarker(q, 'chefpair')).map((q) => q.name);
    expect(marked()).toEqual(['P0', 'P5']);
    completeStep(g, step, { targets: [], value: 2, misreg: [P(g, 1).id] });
    expect(marked()).toEqual(['P0', 'P1', 'P5']);
  });

  it('places the Washerwoman / Librarian / Investigator reminder tokens', () => {
    const g = gameWith(['imp', 'poisoner', 'washerwoman', 'investigator', 'empath', 'monk', 'recluse']);
    startNight(g);
    const step = (role: RoleId) => nightSteps(g).find((s) => s.role === role)!;
    completeStep(g, step('washerwoman'), { targets: [P(g, 5).id, P(g, 4).id], role: 'empath' });
    expect(P(g, 4).markers).toEqual([{ key: 'wwtownsfolk', by: P(g, 2).id }]);
    expect(P(g, 5).markers).toEqual([{ key: 'wwwrong', by: P(g, 2).id }]);
    // The Recluse registering as a Minion holds the character token.
    completeStep(g, step('investigator'), { targets: [P(g, 4).id, P(g, 6).id], role: 'poisoner', misreg: [P(g, 6).id] });
    expect(hasMarker(P(g, 6), 'invminion')).toBe(true);
    expect(hasMarker(P(g, 4), 'invwrong')).toBe(true);
    // Reopening and changing the step moves the tokens.
    uncompleteStep(g, step('washerwoman').key);
    expect(hasMarker(P(g, 4), 'wwtownsfolk')).toBe(false);
    completeStep(g, step('washerwoman'), { targets: [P(g, 3).id, P(g, 0).id], role: 'monk' });
    expect(hasMarker(P(g, 3), 'wwtownsfolk')).toBe(true);
    expect(hasMarker(P(g, 0), 'wwwrong')).toBe(true);
    expect(g.players.filter((q) => q.markers.some((m) => m.key.startsWith('ww')))).toHaveLength(2);
  });

  it('a Recluse next to an evil player may make a Chef pair', () => {
    const g = gameWith(['imp', 'recluse', 'chef', 'empath', 'monk', 'poisoner']);
    const recluse = P(g, 1).id;
    const opts = numberOptions(g, (m) => chefNumber(g, m));
    expect([...opts.keys()].sort()).toEqual([1, 2]);
    expect(opts.get(1)).toEqual([]);
    expect(opts.get(2)).toEqual([recluse]);
    expect(numberOptions(g, (m) => chefNumber(g, m), [recluse]).get(2)).toEqual([recluse]);
  });

  it('empath skips dead neighbours', () => {
    const g = gameWith(['empath', 'chef', 'imp', 'monk', 'poisoner']);
    expect(empathNumber(g, P(g, 0).id)).toBe(1); // chef + poisoner
    P(g, 1).alive = false;
    expect(empathNumber(g, P(g, 0).id)).toBe(2); // imp + poisoner
  });

  it('fortune teller sees the demon and the red herring', () => {
    const g = gameWith(['fortuneteller', 'chef', 'imp', 'monk', 'poisoner']);
    expect(fortuneAnswer(g, [P(g, 1).id, P(g, 3).id])).toBe(false);
    expect(fortuneAnswer(g, [P(g, 1).id, P(g, 2).id])).toBe(true);
    P(g, 3).markers.push({ key: 'redherring' });
    expect(fortuneAnswer(g, [P(g, 1).id, P(g, 3).id])).toBe(true);
  });
});

describe('night', () => {
  it('first night order skips absent roles and minion info under 7 players', () => {
    const g = gameWith(['poisoner', 'chef', 'imp', 'monk', 'empath']);
    startNight(g);
    expect(nightSteps(g).map((s) => s.key.split(':')[0])).toEqual(['dusk', 'poisoner', 'chef', 'empath', 'dawn']);
  });

  it('drunk wakes as their believed role', () => {
    const g = gameWith(['drunk', 'chef', 'imp', 'monk', 'empath', 'poisoner', 'soldier']);
    P(g, 0).believedRole = 'washerwoman';
    startNight(g);
    expect(nightSteps(g).some((s) => s.role === 'washerwoman' && s.playerId === P(g, 0).id)).toBe(true);
  });

  it('keeps earlier nights for each character’s history', () => {
    const g = gameWith(['poisoner', 'empath', 'imp', 'monk', 'chef']);
    startNight(g);
    const step = (role: RoleId) => nightSteps(g).find((s) => s.role === role)!;
    completeStep(g, step('poisoner'), { targets: [P(g, 1).id] });
    completeStep(g, step('empath'), { targets: [], value: 2, lie: true });
    startDay(g); startNight(g);
    completeStep(g, step('monk'), { targets: [P(g, 4).id] });
    expect(g.pastNights?.map((n) => n.number)).toEqual([1]);
    expect(Object.values(g.pastNights![0].data).some((d) => d.undo)).toBe(false);
    const empath = nightHistory(g, { role: 'empath' });
    expect(empath).toHaveLength(1);
    expect(empath[0]).toMatchObject({ night: 1, playerId: P(g, 1).id, data: { value: 2, lie: true, impaired: true } });
    expect(nightHistory(g, { role: 'monk', pastOnly: true })).toHaveLength(0);
    expect(nightHistory(g, { playerId: P(g, 3).id }).map((e) => e.night)).toEqual([2]);
  });

  function toImp(g: Game) {
    startNight(g); startDay(g); startNight(g);
    return nightSteps(g).find((s) => s.role === 'imp')!;
  }

  it('imp kill, monk protection and soldier', () => {
    const g = gameWith(['imp', 'monk', 'soldier', 'chef', 'poisoner', 'empath']);
    const imp = toImp(g);
    completeStep(g, imp, { targets: [P(g, 3).id] });
    expect(P(g, 3).alive).toBe(false);

    const g2 = gameWith(['imp', 'monk', 'soldier', 'chef', 'poisoner', 'empath']);
    const imp2 = toImp(g2);
    const monk = nightSteps(g2).find((s) => s.role === 'monk')!;
    completeStep(g2, monk, { targets: [P(g2, 3).id] });
    completeStep(g2, imp2, { targets: [P(g2, 3).id] });
    expect(P(g2, 3).alive).toBe(true);

    const g3 = gameWith(['imp', 'monk', 'soldier', 'chef', 'poisoner', 'empath']);
    completeStep(g3, toImp(g3), { targets: [P(g3, 2).id] });
    expect(P(g3, 2).alive).toBe(true);
  });

  it('poisoned monk does not protect', () => {
    const g = gameWith(['imp', 'monk', 'soldier', 'chef', 'poisoner', 'empath']);
    const imp = toImp(g);
    const poi = nightSteps(g).find((s) => s.role === 'poisoner')!;
    completeStep(g, poi, { targets: [P(g, 1).id] });
    completeStep(g, nightSteps(g).find((s) => s.role === 'monk')!, { targets: [P(g, 3).id] });
    completeStep(g, imp, { targets: [P(g, 3).id] });
    expect(P(g, 3).alive).toBe(false);
  });

  it('star-pass goes to the scarlet woman and wakes the new imp', () => {
    const g = gameWith(['imp', 'scarletwoman', 'baron', 'chef', 'monk', 'empath', 'soldier', 'mayor', 'saint', 'drunk']);
    const imp = toImp(g);
    completeStep(g, imp, { targets: [P(g, 0).id] });
    expect(P(g, 0).alive).toBe(false);
    expect(P(g, 1).role).toBe('imp');
    expect(g.pendingWin).toBeNull();
    expect(nightSteps(g).some((s) => s.role === 'imp' && s.playerId === P(g, 1).id)).toBe(true);
  });

  it('the new imp of a star-pass does not kill the same night', () => {
    const g = gameWith(['imp', 'baron', 'chef', 'monk', 'empath', 'soldier']);
    const imp = toImp(g);
    completeStep(g, imp, { targets: [P(g, 0).id] });
    expect(P(g, 1).role).toBe('imp');
    const heirStep = nightSteps(g).find((s) => s.role === 'imp' && s.playerId === P(g, 1).id)!;
    completeStep(g, heirStep, { targets: [P(g, 2).id] });
    expect(P(g, 2).alive).toBe(true);
    expect(g.night!.data[heirStep.key].value).toBe(true);
  });

  it('star-pass heir defaults to a minion', () => {
    const g = gameWith(['imp', 'baron', 'chef', 'monk', 'empath']);
    expect(starpassHeir(g, P(g, 0).id)?.id).toBe(P(g, 1).id);
  });

  it('reopening the imp step takes the first kill back, so only one player dies', () => {
    const g = gameWith(['imp', 'monk', 'soldier', 'chef', 'poisoner', 'empath']);
    const imp = toImp(g);
    completeStep(g, imp, { targets: [P(g, 3).id] });
    expect(P(g, 3).alive).toBe(false);
    uncompleteStep(g, imp.key);
    expect(P(g, 3).alive).toBe(true);
    expect(hasMarker(P(g, 3), 'diedtonight')).toBe(false);
    completeStep(g, imp, { targets: [P(g, 5).id] });
    expect(g.players.filter((p) => !p.alive).map((p) => p.name)).toEqual(['P5']);
    expect(g.players.filter((p) => hasMarker(p, 'diedtonight')).map((p) => p.name)).toEqual(['P5']);
  });

  it('reopening a star-pass restores the Imp and drops the new Imp step', () => {
    const g = gameWith(['imp', 'scarletwoman', 'baron', 'chef', 'monk', 'empath', 'soldier', 'mayor', 'saint', 'drunk']);
    const imp = toImp(g);
    completeStep(g, imp, { targets: [P(g, 0).id] });
    uncompleteStep(g, imp.key);
    expect(P(g, 0).alive).toBe(true);
    expect(P(g, 1).role).toBe('scarletwoman');
    expect(nightSteps(g).some((s) => s.role === 'imp' && s.playerId === P(g, 1).id)).toBe(false);
  });

  it('reopening the monk step removes the old protection', () => {
    const g = gameWith(['imp', 'monk', 'soldier', 'chef', 'poisoner', 'empath']);
    toImp(g);
    const monk = nightSteps(g).find((s) => s.role === 'monk')!;
    completeStep(g, monk, { targets: [P(g, 3).id] });
    uncompleteStep(g, monk.key);
    completeStep(g, monk, { targets: [P(g, 4).id] });
    expect(g.players.filter((p) => hasMarker(p, 'protected')).map((p) => p.name)).toEqual(['P4']);
  });

  it('ravenkeeper wakes only when killed tonight', () => {
    const g = gameWith(['imp', 'ravenkeeper', 'chef', 'monk', 'poisoner', 'empath']);
    const imp = toImp(g);
    expect(nightSteps(g).some((s) => s.role === 'ravenkeeper')).toBe(false);
    completeStep(g, imp, { targets: [P(g, 1).id] });
    expect(nightSteps(g).some((s) => s.role === 'ravenkeeper')).toBe(true);
    for (const s of nightSteps(g)) if (s.role !== 'ravenkeeper') g.night!.done.push(s.key);
    expect(currentStep(g)?.role).toBe('ravenkeeper');
  });
});

describe('day', () => {
  it('executes the player with the most votes reaching the threshold', () => {
    const g = gameWith(['imp', 'chef', 'monk', 'empath', 'poisoner', 'soldier', 'mayor']);
    startNight(g); startDay(g);
    nominate(g, P(g, 1).id, P(g, 4).id);
    recordVote(g, 0, [P(g, 1).id, P(g, 2).id, P(g, 3).id, P(g, 5).id]);
    expect(g.day!.blockId).toBe(P(g, 4).id);
    nominate(g, P(g, 2).id, P(g, 3).id);
    recordVote(g, 1, [P(g, 1).id, P(g, 2).id, P(g, 0).id, P(g, 5).id]);
    expect(g.day!.blockId).toBeNull(); // tie
    nominate(g, P(g, 3).id, P(g, 1).id);
    recordVote(g, 2, g.players.map((p) => p.id));
    endDay(g);
    expect(P(g, 1).alive).toBe(false);
    expect(g.executedToday).toBe(P(g, 1).id);
  });

  it('executing the imp with a scarlet woman and 5+ alive keeps the game going', () => {
    const g = gameWith(['imp', 'scarletwoman', 'chef', 'monk', 'empath', 'soldier']);
    startNight(g); startDay(g);
    executeNow(g, P(g, 0).id);
    expect(P(g, 1).role).toBe('imp');
    expect(g.pendingWin).toBeNull();
    startNight(g);
    expect(nightSteps(g).some((s) => s.role === 'scarletwoman')).toBe(true);
  });

  it('executing the imp otherwise wins for good', () => {
    const g = gameWith(['imp', 'poisoner', 'chef', 'monk', 'empath']);
    startNight(g); startDay(g);
    executeNow(g, P(g, 0).id);
    expect(g.pendingWin?.winner).toBe('good');
  });

  it('saint execution wins for evil', () => {
    const g = gameWith(['imp', 'poisoner', 'saint', 'monk', 'empath', 'chef']);
    startNight(g); startDay(g);
    executeNow(g, P(g, 2).id);
    expect(g.pendingWin?.winner).toBe('evil');
  });

  it('virgin triggers on a townsfolk nominator', () => {
    const g = gameWith(['imp', 'virgin', 'chef', 'monk', 'poisoner']);
    startNight(g); startDay(g);
    const nom = nominate(g, P(g, 2).id, P(g, 1).id)!;
    expect(nom.virginTrigger).toBe(true);
    const nom2 = nominate(g, P(g, 4).id, P(g, 1).id)!;
    expect(nom2.virginTrigger).toBeUndefined();
  });

  it('a dead virgin has no ability', () => {
    const g = gameWith(['imp', 'virgin', 'chef', 'monk', 'poisoner']);
    startNight(g); startDay(g);
    P(g, 1).alive = false;
    const nom = nominate(g, P(g, 2).id, P(g, 1).id)!;
    expect(nom.virginTrigger).toBeUndefined();
    expect(hasMarker(P(g, 1), 'used')).toBe(false);
  });

  it('bureaucrat and thief votes need a living, sober traveller and stack to −3', () => {
    const g = gameWith(['imp', 'chef', 'monk', 'empath', 'poisoner']);
    const bur = addTraveller(g, 'B', 'bureaucrat', 'good');
    const thief = addTraveller(g, 'T', 'thief', 'evil');
    startNight(g); startDay(g);
    addMarker(P(g, 1), 'threevotes', bur.id);
    expect(voteWeight(g, P(g, 1))).toBe(3);
    expect(voteWeight(g, P(g, 1), true)).toBe(1);
    addMarker(P(g, 1), 'negvote', thief.id);
    expect(voteWeight(g, P(g, 1))).toBe(-3);
    bur.alive = false;
    expect(voteWeight(g, P(g, 1))).toBe(-1);
    addMarker(thief, 'poisoned');
    expect(voteWeight(g, P(g, 1))).toBe(1);
  });

  it('slayer kills the demon once', () => {
    const g = gameWith(['imp', 'slayer', 'chef', 'monk', 'poisoner', 'empath']);
    startNight(g); startDay(g);
    slayerShot(g, P(g, 1).id, P(g, 2).id);
    slayerShot(g, P(g, 1).id, P(g, 0).id);
    expect(P(g, 0).alive).toBe(true);
    const g2 = gameWith(['imp', 'slayer', 'chef', 'monk', 'poisoner', 'empath']);
    startNight(g2); startDay(g2);
    slayerShot(g2, P(g2, 1).id, P(g2, 0).id);
    expect(P(g2, 0).alive).toBe(false);
    expect(g2.pendingWin?.winner).toBe('good');
  });

  it('mayor wins with 3 alive and no execution', () => {
    const g = gameWith(['imp', 'mayor', 'chef', 'monk', 'poisoner']);
    startNight(g); startDay(g);
    P(g, 3).alive = false; P(g, 4).alive = false;
    expect(aliveCount(g)).toBe(3);
    endDay(g);
    expect(g.pendingWin?.winner).toBe('good');
  });

  it('dead voters spend their ghost vote', () => {
    const g = gameWith(['imp', 'chef', 'monk', 'empath', 'poisoner']);
    startNight(g); startDay(g);
    P(g, 3).alive = false;
    nominate(g, P(g, 1).id, P(g, 4).id);
    recordVote(g, 0, [P(g, 3).id]);
    expect(byId(g, P(g, 3).id)!.ghostVote).toBe(false);
  });

  it('demo game starts on night 1', () => {
    const g = demoGame(10);
    expect(g.phase).toBe('night');
    expect(checkSetup(10, g.players.map((p) => p.role)).ok).toBe(true);
  });
});

describe('rules edge cases', () => {
  it('a Monk-protected Imp who targets themself does not die (no star-pass)', () => {
    const g = gameWith(['monk', 'imp', 'poisoner', 'chef', 'empath']);
    startNight(g); startNight(g);
    addMarker(P(g, 1), 'protected', P(g, 0).id);
    impKill(g, P(g, 1).id, P(g, 1).id);
    expect(P(g, 1).alive).toBe(true);
    expect(P(g, 2).role).toBe('poisoner');
  });

  it('a poisoned Monk does not protect', () => {
    const g = gameWith(['monk', 'imp', 'poisoner', 'chef', 'empath']);
    startNight(g); startNight(g);
    addMarker(P(g, 0), 'poisoned', P(g, 2).id);
    addMarker(P(g, 3), 'protected', P(g, 0).id);
    impKill(g, P(g, 1).id, P(g, 3).id);
    expect(P(g, 3).alive).toBe(false);
  });

  it('a Poisoner who becomes the Imp stops poisoning', () => {
    const g = gameWith(['monk', 'imp', 'poisoner', 'chef', 'empath']);
    startNight(g); startNight(g);
    addMarker(P(g, 3), 'poisoned', P(g, 2).id);
    impKill(g, P(g, 1).id, P(g, 1).id);
    expect(P(g, 2).role).toBe('imp');
    expect(hasMarker(P(g, 3), 'poisoned')).toBe(false);
  });

  it('the Drunk who thinks they are the Slayer spends the ability', () => {
    const g = gameWith(['drunk', 'imp', 'poisoner', 'chef', 'empath']);
    P(g, 0).believedRole = 'slayer';
    startNight(g); startDay(g);
    slayerShot(g, P(g, 0).id, P(g, 1).id);
    expect(P(g, 1).alive).toBe(true);
    expect(hasMarker(P(g, 0), 'used')).toBe(true);
  });

  it('the Mayor bounce does not kill the Soldier or a dead player', () => {
    const g = gameWith(['mayor', 'imp', 'poisoner', 'soldier', 'empath']);
    startNight(g); startNight(g);
    impKill(g, P(g, 1).id, P(g, 0).id, { mayorRedirect: P(g, 3).id });
    expect(P(g, 0).alive).toBe(true);
    expect(P(g, 3).alive).toBe(true);
    impKill(g, P(g, 1).id, P(g, 0).id, { mayorRedirect: P(g, 4).id });
    expect(P(g, 4).alive).toBe(false);
  });

  it('a Mayor bounce onto the Imp promotes the Scarlet Woman without a second kill', () => {
    const g = gameWith(['imp', 'scarletwoman', 'mayor', 'chef', 'monk', 'empath', 'soldier', 'saint']);
    startNight(g); startDay(g); startNight(g);
    const imp = nightSteps(g).find((s) => s.role === 'imp')!;
    completeStep(g, imp, { targets: [P(g, 2).id] }, { mayorRedirect: P(g, 0).id });
    expect(P(g, 0).alive).toBe(false);
    expect(P(g, 1).role).toBe('imp');
    expect(nightSteps(g).some((s) => s.role === 'scarletwoman')).toBe(false);
    const heir = nightSteps(g).find((s) => s.role === 'imp' && s.playerId === P(g, 1).id)!;
    completeStep(g, heir, { targets: [P(g, 3).id] });
    expect(P(g, 3).alive).toBe(true);
    uncompleteStep(g, imp.key);
    expect(P(g, 0).alive).toBe(true);
    expect(P(g, 1).role).toBe('scarletwoman');
  });

  it('a dead Slayer cannot shoot', () => {
    const g = gameWith(['imp', 'poisoner', 'slayer', 'monk', 'empath']);
    startNight(g); startDay(g);
    P(g, 2).alive = false;
    slayerShot(g, P(g, 2).id, P(g, 0).id);
    expect(P(g, 0).alive).toBe(true);
    expect(hasMarker(P(g, 2), 'used')).toBe(false);
  });

  it('a re-vote gives back the ghost vote of a dead player who no longer votes', () => {
    const g = gameWith(['imp', 'poisoner', 'chef', 'monk', 'empath', 'soldier', 'saint']);
    startNight(g); startDay(g);
    P(g, 2).alive = false;
    nominate(g, P(g, 3).id, P(g, 4).id);
    recordVote(g, 0, [P(g, 2).id]);
    expect(P(g, 2).ghostVote).toBe(false);
    recordVote(g, 0, []);
    expect(P(g, 2).ghostVote).toBe(true);
  });

  it('a death later in the day does not change the threshold of a vote already recorded', () => {
    const g = gameWith(['imp', 'poisoner', 'chef', 'monk', 'empath', 'soldier', 'saint', 'mayor']);
    const t = addTraveller(g, 'T', 'gunslinger', 'evil');
    startNight(g); startDay(g);
    nominate(g, P(g, 3).id, P(g, 4).id);
    recordVote(g, 0, [P(g, 0).id, P(g, 1).id, P(g, 2).id, P(g, 3).id]); // 4 votes, 9 alive → 5 needed
    expect(g.day!.blockId).toBeNull();
    const n = nominate(g, P(g, 5).id, t.id)!;
    recordVote(g, g.day!.nominations.indexOf(n), [P(g, 0).id, P(g, 1).id, P(g, 2).id, P(g, 3).id, P(g, 5).id]);
    expect(t.alive).toBe(false); // exiled: 8 alive, 4 needed from now on
    nominate(g, P(g, 6).id, P(g, 7).id);
    recordVote(g, 2, [P(g, 0).id, P(g, 1).id, P(g, 2).id]);
    expect(g.day!.blockId).toBeNull(); // the first vote stays below its threshold of 5
    nominate(g, P(g, 0).id, P(g, 2).id);
    recordVote(g, 3, [P(g, 0).id, P(g, 1).id, P(g, 3).id, P(g, 4).id]);
    expect(g.day!.blockId).toBe(P(g, 2).id);
  });

  it('alive Travellers count for the vote threshold and the Mayor, abilities do not affect exiles', () => {
    const g = gameWith(['mayor', 'imp', 'poisoner', 'chef', 'empath']);
    const t = addTraveller(g, 'T', 'thief', 'evil');
    expect(votesNeeded(g)).toBe(3);
    startNight(g); startDay(g);
    addMarker(P(g, 3), 'negvote', t.id);
    const n = nominate(g, P(g, 3).id, t.id)!;
    recordVote(g, g.day!.nominations.indexOf(n), [P(g, 3).id, P(g, 4).id, P(g, 0).id]);
    expect(t.alive).toBe(false);
    g.players[3].alive = false; g.players[4].alive = false;
    endDay(g);
    expect(g.pendingWin?.winner).toBe('good');
  });
});

describe('contradictions with information already given', () => {
  const roles: RoleId[] = ['fortuneteller', 'empath', 'chef', 'imp', 'monk', 'poisoner', 'undertaker', 'librarian'];
  const st = (g: Game, role: RoleId, i: number) => ({ key: `${role}:${P(g, i).id}`, kind: 'role' as const, role, playerId: P(g, i).id });

  it('empath: a different number with the same living neighbours', () => {
    const g = gameWith(roles);
    startNight(g);
    completeStep(g, st(g, 'empath', 1), { targets: [], value: 0 });
    startDay(g); startNight(g);
    expect(infoConflicts(g, st(g, 'empath', 1), { targets: [], value: 0 })).toHaveLength(0);
    expect(infoConflicts(g, st(g, 'empath', 1), { targets: [], value: 1 })).toHaveLength(1);
    P(g, 2).alive = false;
    expect(infoConflicts(g, st(g, 'empath', 1), { targets: [], value: 1 })).toHaveLength(0);
  });

  it('fortune teller: YES on players cleared by NO, flipped pair, forced yes', () => {
    const g = gameWith(roles);
    const [a, b, c, d] = [P(g, 2).id, P(g, 4).id, P(g, 5).id, P(g, 6).id];
    startNight(g);
    completeStep(g, st(g, 'fortuneteller', 0), { targets: [a, b], value: false });
    startDay(g); startNight(g);
    completeStep(g, st(g, 'fortuneteller', 0), { targets: [a, c], value: true });
    startDay(g); startNight(g);
    expect(infoConflicts(g, st(g, 'fortuneteller', 0), { targets: [b, a], value: true })).toHaveLength(1);
    expect(infoConflicts(g, st(g, 'fortuneteller', 0), { targets: [a, c], value: false })).toHaveLength(2);
    expect(infoConflicts(g, st(g, 'fortuneteller', 0), { targets: [c, d], value: false })).toHaveLength(1);
    expect(infoConflicts(g, st(g, 'fortuneteller', 0), { targets: [c, d], value: true })).toHaveLength(0);
  });

  it('undertaker / ravenkeeper: a character already shown, a ping, “0 Outsiders”', () => {
    const g = gameWith(roles);
    const [x, y] = [P(g, 2).id, P(g, 4).id];
    startNight(g);
    completeStep(g, st(g, 'librarian', 7), { targets: [], role: null });
    startDay(g); startNight(g);
    completeStep(g, st(g, 'undertaker', 6), { targets: [x], role: 'chef' });
    expect(infoConflicts(g, st(g, 'undertaker', 6), { targets: [x], role: 'monk' })).toHaveLength(0); // same step re-done
    startDay(g); startNight(g);
    expect(infoConflicts(g, st(g, 'undertaker', 6), { targets: [x], role: 'monk' })).toHaveLength(1);
    expect(infoConflicts(g, st(g, 'undertaker', 6), { targets: [y], role: 'saint' })).toHaveLength(1);
    expect(infoConflicts(g, st(g, 'undertaker', 6), { targets: [y], role: 'monk' })).toHaveLength(0);
  });
});
