import type { Browser, Page } from '@playwright/test';
import { ROLES } from '../src/data/roles';
import { endDayButton, expect, makeGame, menuItem, nominateAndVote, openWithGame, panel, pick, startNextNight, test, TABLE8 } from './helpers';

/** Starts the broadcast from the storyteller's menu and returns the room code. */
async function startBroadcast(page: Page): Promise<string> {
  await menuItem(page, /Diffusion en direct/);
  await page.getByRole('button', { name: 'Démarrer la diffusion' }).click();
  await expect(page.locator('.live-status')).toContainText('En direct');
  const code = (await page.locator('.live-code').textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{4}$/);
  return code;
}

/** The TV: another browser, with nothing of the game in its storage. */
async function openViewer(browser: Browser, baseURL: string, code: string, viewport = { width: 1280, height: 720 }) {
  const ctx = await browser.newContext({ baseURL, locale: 'fr-FR', viewport });
  const tv = await ctx.newPage();
  await tv.goto(`/#live/${code}`);
  await expect(tv.locator('.live-title')).toContainText('En direct');
  return tv;
}

test.describe('live broadcast', () => {
  test('the TV follows the day: deaths, votes, block, and survives a reload', async ({ page, browser, baseURL }) => {
    const g = makeGame(TABLE8, { phase: 'day', title: 'Soirée test' });
    g.players[7].alive = false;
    await openWithGame(page, g);
    const code = await startBroadcast(page);
    await page.keyboard.press('Escape');

    const tv = await openViewer(browser, baseURL!, code);
    await expect(tv.locator('.live-title b')).toHaveText('Soirée test');
    await expect(tv.locator('.circle-title')).toHaveText('Jour 1');
    await expect(tv.locator('.ptoken')).toHaveCount(8);
    await expect(tv.locator('.ptoken.dead')).toHaveCount(1);
    await expect(tv.locator('.live-stat').nth(0)).toContainText('7/8');
    await expect(tv.locator('.live-stat').nth(1)).toContainText('4');
    await expect(tv.locator('.live-stat').nth(2)).toContainText('1');
    await expect(tv.locator('.live-dist')).toContainText('5 Villageois');

    // The TV turns its own circle, one seat at a time, and remembers it.
    const seat1 = tv.locator('.ptoken', { has: tv.locator('.pseat', { hasText: /^01$/ }) });
    const top = await seat1.evaluate((e) => (e as HTMLElement).style.top);
    await tv.getByRole('button', { name: 'Tourner dans le sens horaire' }).click();
    await expect(seat1).not.toHaveAttribute('style', new RegExp(`top: ${top}`));
    expect(await tv.evaluate(() => localStorage.getItem('botc.liveRotation'))).toBe('1');

    // Nothing secret on the TV.
    const text = await tv.locator('body').innerText();
    for (const r of TABLE8) expect(text).not.toContain(ROLES[r].name.fr);

    await page.locator('.modal').waitFor({ state: 'detached' });
    await nominateAndVote(page, 'Joueur1', 'Joueur3', ['Joueur4', 'Joueur5', 'Joueur6', 'Joueur8']);
    await expect(tv.locator('.live-nom')).toContainText('Joueur3');
    await expect(tv.locator('.live-nom-votes')).toHaveText('4 / 4');
    await expect(tv.locator('.live-block')).toContainText('Sur le bûcher : Joueur3 (4 voix)');
    await expect(tv.locator('.ptoken', { hasText: 'Joueur3' }).locator('.phl')).toHaveText('Bûcher');
    // Joueur8 (dead) spent the ghost vote.
    await expect(tv.locator('.live-stat').nth(2)).toContainText('0');

    await tv.reload();
    await expect(tv.locator('.live-block')).toContainText('Joueur3');

    await endDayButton(page).click();
    await panel(page).getByRole('button', { name: 'Exécuter Joueur3' }).click();
    await expect(tv.locator('.live-block')).toContainText('Exécuté·e : Joueur3');
    await expect(tv.locator('.ptoken.dead')).toHaveCount(2);
    await startNextNight(page);
    await expect(tv.locator('.circle-title')).toHaveText('Nuit 2');
    await expect(tv.locator('.live-nom')).toHaveCount(0);
    await tv.context().close();
  });

  test('the TV shows who nominates whom, and the hands as they are counted', async ({ page, browser, baseURL }) => {
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    const code = await startBroadcast(page);
    await page.keyboard.press('Escape');
    await page.locator('.modal').waitFor({ state: 'detached' });
    const tv = await openViewer(browser, baseURL!, code);
    const seat = (n: number) => tv.locator('.ptoken', { has: tv.locator('.pseat', { hasText: new RegExp(`^0${n}$`) }) });

    await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
    await pick(page, 0, 'Joueur2');
    await pick(page, 1, 'Joueur5');
    await panel(page).getByRole('button', { name: 'Ouvrir le vote' }).click();
    await expect(tv.locator('.live-arrow')).toHaveCount(1);
    await expect(tv.locator('.live-arrow-label')).toHaveText('nomine');
    await expect(seat(2).locator('.phl')).toHaveText('Nomine');
    await expect(seat(5).locator('.phl')).toHaveText('Nominé·e');
    await expect(seat(7)).toHaveClass(/faded/);

    // Hands show up on the TV while the Storyteller counts them, before the vote is confirmed.
    for (const v of ['Joueur2', 'Joueur7']) await panel(page).locator('.voter', { has: page.getByText(v, { exact: true }) }).click();
    await expect(seat(7).locator('.phl')).toHaveText('Vote');
    await expect(seat(2).locator('.phl')).toHaveText('Nomine · Vote');
    await expect(tv.locator('.circle-title')).toHaveText('2 votes');
    await expect(tv.locator('.circle-sub')).toHaveText('Seuil 4');
  });

  test('the storyteller keeps the same room after a refresh, and can stop it', async ({ page, browser, baseURL }) => {
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    const code = await startBroadcast(page);
    await page.reload();
    await menuItem(page, /Diffusion en direct/);
    await expect(page.locator('.live-code')).toHaveText(code);

    const tv = await openViewer(browser, baseURL!, code, { width: 390, height: 844 });
    await expect(tv.locator('.ptoken')).toHaveCount(8);
    await page.getByRole('button', { name: 'Arrêter la diffusion' }).click();
    await expect(tv.locator('.live-title')).toContainText('Diffusion terminée');
    await tv.context().close();
  });

  test('the TV shows the code to join, without any QR code', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/#live/QRQR');
    const wait = page.locator('.live-wait');
    await expect(wait.locator('.live-join-code')).toHaveText('QRQR');
    await expect(page.locator('svg.qr')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Afficher le QR code' })).toHaveCount(0);
  });

  test('an unknown code says so', async ({ page }) => {
    await page.goto('/#live/ZZZ9');
    await expect(page.locator('.live-title')).toContainText('Partie introuvable');
  });
});

test.describe('live view on a TV', () => {
  const names = ['Nora', 'Karim', 'Alice', 'Bastien', 'Oscar', 'Mathis', 'Emma', 'Léa', 'Rose', 'Gabrielle', 'Pauline', 'Hugo', 'Inès', 'Jules', 'Kenza'];
  for (const [vp, phase] of [[{ width: 960, height: 540 }, 'day'], [{ width: 1280, height: 720 }, 'day'], [{ width: 960, height: 540 }, 'night'], [{ width: 1280, height: 720 }, 'night']] as const) {
    test(`a busy ${phase} fits a ${vp.width}×${vp.height} screen without scrolling`, async ({ page }) => {
      const snap = {
        v: 1, title: '', phase, night: 1, day: 1, players: names.map((name, i) => ({ name, alive: i !== 3, ghostVote: true })),
        alive: 14, total: 15, needed: 7, ghostVotes: 1, distribution: [9, 2, 3, 1], block: { seat: 0, votes: 8 }, executed: null, winner: null,
        timer: { segment: 'discussion', total: 300, remaining: 200, running: true },
        nominations: [0, 1, 2, 3, 4].map((i) => ({ nominator: i + 4, nominee: i, votes: 7, exile: false, voters: [5, 6, 7, 8, 9, 10, 11], tally: 7 })),
      };
      await page.setViewportSize(vp);
      await page.addInitScript((s) => localStorage.setItem('botc.liveView.FITS', JSON.stringify({ snap: s, updatedAt: Date.now(), now: Date.now(), offset: 0 })), snap);
      await page.goto('/#live/FITS');
      await expect(page.locator('.ptoken')).toHaveCount(15);
      if (phase === 'day') await expect(page.locator('.live-block')).toContainText('Nora');
      else await expect(page.locator('.live-join .live-join-code')).toHaveText('FITS');
      const out = await page.evaluate(() => [...document.querySelectorAll('.ptoken .pcard, .live-side > *, .live-nom, .live-block, .live-join-qr')]
        .filter((e) => { const b = e.getBoundingClientRect(); return b.bottom > innerHeight + 1 || b.right > innerWidth + 1 || b.top < 0; })
        .map((e) => e.className));
      expect(out).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    });
  }
});
