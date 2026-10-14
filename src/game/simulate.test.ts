import { describe, expect, it } from 'vitest';
import { simulateGame } from './simulate';
import type { Strategy } from './simulate';

const GAMES = Number(process.env.SIM_GAMES ?? 100);

describe.each(['random', 'logic'] as Strategy[])('simulation (%s)', (strat) => {
  it(`plays ${GAMES} full games from 5 to 15 players without breaking a rule`, () => {
    const failures: string[] = [];
    const wins = { good: 0, evil: 0 };
    let days = 0;
    for (let i = 0; i < GAMES; i++) {
      const count = 5 + (i % 11);
      const r = simulateGame(`${strat}-${i}`, count, strat);
      if (r.violations.length) failures.push(`seed ${r.seed} (${count}p): ${r.violations[0]}`);
      else if (r.game.winner) { wins[r.game.winner]++; days += r.days; }
    }
    console.log(`${strat}: good ${wins.good} / evil ${wins.evil}, avg ${(days / GAMES).toFixed(1)} days`);
    expect(failures).toEqual([]);
  }, 60_000);
});
