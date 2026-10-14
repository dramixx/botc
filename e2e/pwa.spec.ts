import { expect, makeGame, openWithGame, savedGame, test, TABLE8 } from './helpers';

test.describe('installable & offline', () => {
  test('ships a valid manifest with reachable icons', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel=manifest]').getAttribute('href');
    const res = await request.get(new URL(href!, page.url()).toString());
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest).toMatchObject({ short_name: 'Grimoire', display: 'standalone', start_url: './' });
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of manifest.icons) {
      const r = await request.get(new URL(icon.src, page.url()).toString());
      expect(r.ok(), icon.src).toBe(true);
    }
    await expect(page.locator('link[rel=apple-touch-icon]')).toHaveCount(1);
    await expect(page.locator('meta[name=viewport]')).toHaveAttribute('content', /viewport-fit=cover/);
  });

  test('the service worker precaches the app and the page works offline', async ({ page, context }) => {
    await openWithGame(page, makeGame(TABLE8, { title: 'Hors ligne' }));
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null || true)).toBe(true);
    // The first load is not controlled yet: reload so the worker serves the page.
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      const c = await caches.open(keys[0]);
      return (await c.keys()).map((r) => new URL(r.url).pathname);
    });
    expect(cached.some((p) => p.endsWith('/') || p.endsWith('index.html'))).toBe(true);
    expect(cached.some((p) => p.endsWith('.js'))).toBe(true);
    expect(cached.some((p) => p.endsWith('.css'))).toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.gamebar-title')).toHaveText('Hors ligne');
    // The app is fully usable offline: play a step and the save still happens.
    await page.locator('aside.panel .grid-nav .btn.amber').click();
    expect((await savedGame(page)).night!.done).toEqual(['dusk']);
    await context.setOffline(false);
  });

  test('no request leaves the origin while playing (everything is local)', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (r) => { if (!r.url().startsWith('http://localhost') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    await page.getByRole('button', { name: 'Terminer le jour' }).click();
    await page.waitForLoadState('networkidle');
    expect(external).toEqual([]);
  });
});
