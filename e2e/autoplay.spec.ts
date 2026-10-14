import type { Locator, Page } from '@playwright/test';
import { checkInvariants } from '../src/game/simulate';
import { seeded } from '../src/game/rng';
import { expect, openWithGame, panel, randomGame, savedGame, test, winModal } from './helpers';

/**
 * Plays complete games through the real UI with random choices (a bot sitting in front of the iPad),
 * and checks after every click that the saved game still obeys the rules and that the page never throws.
 */
async function playThroughUi(page: Page, seed: string, errors: string[]) {
  const rng = seeded(seed);
  const rand = async (loc: Locator) => {
    const n = await loc.count();
    return n ? loc.nth(Math.floor(rng() * n)) : null;
  };
  const violations: string[] = [];
  let guard = 0;

  while (guard++ < 400) {
    if (await page.locator('.end-screen').isVisible()) return;
    if (await winModal(page).isVisible()) {
      await winModal(page).getByRole('button', { name: 'Confirmer la victoire' }).click();
      continue;
    }
    const game = await savedGame(page);
    checkInvariants(game, violations, `ui step ${guard}`);
    expect(violations, `invariants broken (seed ${seed})`).toEqual([]);
    expect(errors, `page errors (seed ${seed})`).toEqual([]);

    if (game.phase === 'night') {
      const start = page.getByRole('button', { name: /^Commencer le jour/ });
      if (await start.isVisible()) { await start.click(); continue; }
      const amber = panel(page).locator('.grid-nav .btn.amber');
      if (!(await amber.isVisible())) {
        await panel(page).locator('.step-chip:not(.done)').first().dispatchEvent('click');
        continue;
      }
      const title = (await panel(page).locator('.step-title h2').first().textContent()) ?? '';
      if (/Diable|Empoisonneur|Moine|Majordome|Bureaucrate|Voleur/.test(title)) {
        const target = await rand(panel(page).locator('.picker .pick:not(:disabled)'));
        if (target && rng() < 0.85) await target.click();
      }
      await amber.click();
      continue;
    }

    if (game.phase === 'day') {
      // A full-screen alert asking before an action (Saint, Demon, Mayor…): the Storyteller goes ahead.
      const ask = page.getByRole('alertdialog');
      if (await ask.isVisible()) { await ask.locator('.btn').last().click(); continue; }
      if (game.day!.ended) { await panel(page).getByRole('button', { name: /^Nuit \d+ →$/ }).click(); continue; }
      const idle = panel(page).getByRole('button', { name: 'Nommer', exact: true });
      if (await idle.isVisible()) {
        const noms = game.day!.nominations.length;
        if (noms < 3 && rng() < 0.7) {
          await idle.click();
          const nominator = await rand(panel(page).locator('.picker').nth(0).locator('.pick:not(:disabled):not(.dead)'));
          const nominee = await rand(panel(page).locator('.picker').nth(1).locator('.pick:not(:disabled)'));
          if (!nominator || !nominee) { await panel(page).getByRole('button', { name: 'Annuler' }).click(); continue; }
          await nominator.click();
          await nominee.click();
          await panel(page).getByRole('button', { name: 'Ouvrir le vote' }).click();
          const virgin = page.locator('.modal', { hasText: 'VIERGE' });
          if (await virgin.isVisible()) {
            await virgin.getByRole('button', { name: rng() < 0.5 ? /^Exécuter/ : /Ignorer/ }).click();
            if (await panel(page).locator('.vote-head').isVisible()) { /* continues below */ } else continue;
          }
          const voters = panel(page).locator('.voter:not(.off)');
          const count = await voters.count();
          for (let i = 0; i < count; i++) if (rng() < 0.5) await voters.nth(i).click();
          await panel(page).locator('.grid-nav .btn.amber').click();
          continue;
        }
        await panel(page).getByRole('button', { name: 'Terminer le jour' }).click();
        continue;
      }
      // End-of-day panel: execute the block, or go straight to the night.
      const execute = panel(page).getByRole('button', { name: /^Exécuter / }).first();
      if (await execute.isVisible()) { await execute.click(); continue; }
      const toNight = panel(page).getByRole('button', { name: /^Nuit \d+ →$/ });
      if (await toNight.isVisible()) { await toNight.click(); continue; }
      const back = panel(page).getByRole('button', { name: 'Retour' });
      if (await back.isVisible()) { await back.click(); continue; }
    }
  }
  throw new Error(`game ${seed} did not finish within ${guard} UI steps`);
}

for (const [seed, count] of [['a', 5], ['b', 7], ['c', 9], ['d', 12], ['e', 15]] as const) {
  test(`random UI game ${seed} with ${count} players runs to a verdict`, async ({ page }) => {
    test.setTimeout(150_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await openWithGame(page, randomGame(`ui-${seed}`, count));
    await playThroughUi(page, `ui-${seed}`, errors);
    await expect(page.locator('.end-screen')).toBeVisible();
    const g = await savedGame(page);
    expect(g.phase).toBe('ended');
    expect(['good', 'evil']).toContain(g.winner);
    await expect(page.locator('.recap-row')).toHaveCount(count);
    expect(errors).toEqual([]);
  });
}
