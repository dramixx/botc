import type { Page } from '@playwright/test';
import { expect, makeGame, openWithGame, test, TABLE8 } from './helpers';

const overflowsX = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

test.describe('layout', () => {
  test('home has no horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Grimoire' })).toBeVisible();
    expect(await overflowsX(page)).toBe(false);
  });

  test('every setup step fits the screen width', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Nouvelle partie' }).click();
    const next = page.locator('.setup-bar .btn.next');
    for (const step of ['Joueurs', 'Personnages', 'Attribution', 'Règles', 'Distribution']) {
      await expect(page.locator('.step-pill.cur')).toContainText(step);
      expect(await overflowsX(page), step).toBe(false);
      if (step === 'Personnages') await page.getByRole('button', { name: 'Tirer au hasard' }).click();
      if (step === 'Distribution') break;
      await next.click();
    }
  });

  for (const step of ['Personnages', 'Distribution']) {
    test(`the setup "next" button stays on screen at the ${step} step`, async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Nouvelle partie' }).click();
      const next = page.locator('.setup-bar .btn.next');
      await next.click();
      if (step === 'Distribution') { await page.getByRole('button', { name: 'Tirer au hasard' }).click(); await next.click(); await next.click(); await next.click(); }
      await expect(page.locator('.step-pill.cur')).toContainText(step);
      const box = (await next.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    });
  }

  test('play screens fit the screen width (night, day, dawn, end)', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    expect(await overflowsX(page)).toBe(false);
    await page.getByRole('button', { name: 'Nommer', exact: true }).click();
    expect(await overflowsX(page)).toBe(false);
    await page.locator('aside.panel').getByRole('button', { name: 'Annuler' }).click();
    await page.getByRole('button', { name: 'Terminer le jour' }).click();
    await page.getByRole('button', { name: 'Nuit 2 →' }).click();
    expect(await overflowsX(page)).toBe(false);
  });

  test('the whole circle of 15 players stays inside the viewport', async ({ page }) => {
    const roles = ['imp', 'poisoner', 'spy', 'washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker', 'monk', 'ravenkeeper', 'virgin', 'slayer', 'soldier'] as const;
    await openWithGame(page, makeGame([...roles], { phase: 'day' }));
    const vp = page.viewportSize()!;
    const boxes = await page.locator('.ptoken').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }));
    expect(boxes).toHaveLength(15);
    for (const b of boxes) {
      expect(b.l).toBeGreaterThanOrEqual(-1);
      expect(b.r).toBeLessThanOrEqual(vp.width + 1);
      expect(b.t).toBeGreaterThanOrEqual(-1);
    }
  });

  test('the primary action is reachable without scrolling the page', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8));
    const vp = page.viewportSize()!;
    const box = (await page.locator('aside.panel .grid-nav .btn.amber').boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
  });
});
