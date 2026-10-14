import { readFileSync } from 'node:fs';
import { expect, makeGame, openWithGame, savedGame, test, TABLE8 } from './helpers';

test.describe('home', () => {
  test('empty state offers the three entry points', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Grimoire' })).toBeVisible();
    await expect(page.getByText('Aucune partie pour l’instant')).toBeVisible();
    for (const name of ['Nouvelle partie', 'Partie de démo', 'Importer un .json']) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }
  });

  test('language switch translates the UI and is remembered', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.reload();
    await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
    await page.getByRole('button', { name: 'FR', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Nouvelle partie' })).toBeVisible();
  });

  test('demo game opens straight into night 1 with 7 to 12 players', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Partie de démo' }).click();
    await expect(page.locator('.phase-pill')).toContainText('Nuit 1');
    const g = await savedGame(page);
    expect(g.demo).toBe(true);
    expect(g.players.length).toBeGreaterThanOrEqual(7);
    expect(g.players.length).toBeLessThanOrEqual(12);
    expect(g.players.every((p) => p.seen)).toBe(true);
  });

  test('new game starts the setup wizard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Nouvelle partie' }).click();
    await expect(page.locator('.setup-bar-title')).toHaveText('Nouvelle partie');
    await expect(page.locator('.step-pill.cur')).toContainText('Joueurs');
  });

  test('importing garbage shows a readable error and changes nothing', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type=file]').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{ nope') });
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('IMPORT IMPOSSIBLE');
    await expect(dialog).toContainText('broken.json');
    await expect(dialog).toContainText('pas du JSON valide');
    await dialog.getByRole('button', { name: 'Fermer' }).click();
    await expect(dialog).toBeHidden();
    expect(await savedGame(page)).toBeNull();
  });

  test('importing JSON of the wrong shape names the missing field', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, id: 'a' })) });
    await expect(page.getByRole('dialog')).toContainText('« joueurs » manquant');
  });

  test('a game exported from the app can be imported back', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { title: 'Aller-retour' }));
    const [download] = await Promise.all([page.waitForEvent('download'), (async () => {
      await page.locator('button[aria-label="Menu"]:visible').first().click();
      await page.getByRole('button', { name: 'Exporter en JSON' }).click();
    })()]);
    expect(download.suggestedFilename()).toMatch(/^grimoire-\d{4}-\d{2}-\d{2}-Aller-retour\.json$/);
    const path = await download.path();
    const exported = JSON.parse(readFileSync(path, 'utf8'));
    expect(exported.players).toHaveLength(8);

    // The drawer stays open after an export: go back home from it, then import the file
    // (renamed so we can tell the imported copy apart).
    await page.getByRole('button', { name: 'Retour à l’accueil' }).click();
    const renamed = Buffer.from(JSON.stringify({ ...exported, title: 'Importée' }));
    await page.locator('input[type=file]').setInputFiles({ name: 'copie.json', mimeType: 'application/json', buffer: renamed });
    await expect(page.locator('.gamebar-title')).toHaveText('Importée');
    const g = await savedGame(page);
    expect(g.id).toBe(exported.id);
    expect(g.players.map((p) => p.role)).toEqual(exported.players.map((p: { role: string }) => p.role));
  });
});

test.describe('home with an unfinished game', () => {
  test('shows the resume card and resumes the game', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { title: 'Soirée' }));
    await page.locator('button[aria-label="Menu"]:visible').first().click();
    await page.getByRole('button', { name: 'Retour à l’accueil' }).click();
    const card = page.locator('.card.current');
    await expect(card).toContainText('PARTIE EN COURS');
    await expect(card).toContainText('Soirée');
    await expect(card).toContainText('8 joueurs');
    await card.getByRole('button', { name: 'Reprendre la partie' }).click();
    await expect(page.locator('.gamebar')).toBeVisible();
  });

  test('history lists the game and deletion needs a confirmation', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { title: 'À supprimer' }));
    await page.locator('button[aria-label="Menu"]:visible').first().click();
    await page.getByRole('button', { name: 'Retour à l’accueil' }).click();
    const row = page.locator('.history li', { hasText: 'À supprimer' });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Supprimer', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Supprimer « À supprimer » ?');
    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Supprimer', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click();
    await expect(page.locator('.history li', { hasText: 'À supprimer' })).toHaveCount(0);
    await expect(page.getByText('Aucune partie pour l’instant')).toBeVisible();
  });
});

test('shows the app version discreetly', async ({ page }) => {
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
  await page.goto('./');
  await expect(page.locator('.app-version')).toContainText(`v${version}`);
});
