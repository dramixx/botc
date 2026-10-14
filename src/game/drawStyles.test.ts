import { describe, expect, it } from 'vitest';
import { ROLES, type RoleId } from '../data/roles';
import { DRAW_STYLES, styleViolations } from './drawStyles';
import { checkSetup, completeRoles, randomRoles, rerollTeam } from './engine';
import { seeded } from './rng';

const valid = (n: number, roles: RoleId[]) => {
  expect(checkSetup(n, roles).ok).toBe(true);
  expect(new Set(roles).size).toBe(roles.length);
};

describe('play styles', () => {
  for (const style of DRAW_STYLES) {
    it(`${style}: every draw is valid and balanced`, () => {
      for (let n = 5; n <= 15; n++) {
        for (let s = 0; s < 40; s++) {
          const roles = randomRoles(n, seeded(`${style}-${n}-${s}`), style);
          valid(n, roles);
          expect(styleViolations(roles, n, style), `${n}: ${roles.join()}`).toBe(0);
        }
      }
    });

    it(`${style}: completing and redrawing stay valid and balanced`, () => {
      for (let n = 5; n <= 15; n++) {
        const filled = completeRoles([], n, seeded(`c-${style}-${n}`), style);
        valid(n, filled);
        expect(styleViolations(filled, n, style)).toBe(0);
        for (const team of ['townsfolk', 'outsider', 'minion'] as const) {
          const roles = rerollTeam(filled, n, team, seeded(`r-${style}-${n}-${team}`), style);
          valid(n, roles);
          expect(styleViolations(roles, n, style), `${n} ${team}: ${roles.join()}`).toBe(0);
        }
      }
    });
  }

  it('simple never has the Drunk (nor the Spy below 13 players); mind-fucked always brings misinformation', () => {
    for (let n = 5; n <= 15; n++) {
      for (let s = 0; s < 40; s++) {
        const simple = randomRoles(n, seeded(`s-${n}-${s}`), 'simple');
        expect(simple).not.toContain('drunk');
        if (n < 13) expect(simple).not.toContain('spy');
        const mind = randomRoles(n, seeded(`m-${n}-${s}`), 'mindfuck');
        expect(mind.filter((r) => ['poisoner', 'spy', 'drunk', 'recluse'].includes(r)).length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('styles change what gets drawn', () => {
    const share = (style: 'simple' | 'chaos', role: RoleId) => {
      let hits = 0;
      for (let s = 0; s < 300; s++) if (randomRoles(9, seeded(`w-${style}-${s}`), style).includes(role)) hits++;
      return hits;
    };
    expect(share('chaos', 'slayer')).toBeGreaterThan(share('simple', 'slayer'));
    expect(share('simple', 'washerwoman')).toBeGreaterThan(share('chaos', 'washerwoman'));
  });

  it('keeps what the storyteller already picked when completing', () => {
    const roles = completeRoles(['drunk', 'imp'], 8, seeded('keep'), 'simple');
    expect(roles).toContain('drunk');
    expect(roles.filter((r) => ROLES[r].team === 'outsider')).toHaveLength(1);
  });
});
