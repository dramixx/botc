import type { Page } from '@playwright/test';
import { expect, makeGame, seedGame, test, TABLE8 } from './helpers';

/** Plays a relay started with GRIMOIRE_PASSWORD=lanterne (the test relay itself has no password). */
async function protect(page: Page) {
  await page.route('**/api/live/unlock', async (route) => {
    const { password } = route.request().postDataJSON() as { password: string };
    await route.fulfill({ status: password === 'lanterne' ? 204 : 403, body: '' });
  });
}

test.describe('storyteller password', () => {
  test('the home page asks for it, then stays unlocked', async ({ page }) => {
    await protect(page);
    await page.goto('/');
    await expect(page.getByText('Réservé au Conteur')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouvelle partie' })).toHaveCount(0);

    await page.getByLabel('Mot de passe').fill('bougie');
    await page.getByRole('button', { name: 'Entrer' }).click();
    await expect(page.getByText('Mot de passe incorrect.')).toBeVisible();

    await page.getByLabel('Mot de passe').fill('lanterne');
    await page.getByRole('button', { name: 'Entrer' }).click();
    await expect(page.getByRole('button', { name: 'Nouvelle partie' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Nouvelle partie' })).toBeVisible();
    await expect(page.getByText('Réservé au Conteur')).toHaveCount(0);
  });

  test('a game saved on the device is not shown before the password', async ({ page }) => {
    await protect(page);
    await seedGame(page, makeGame(TABLE8, { phase: 'day' }));
    await page.goto('/');
    await expect(page.getByText('Réservé au Conteur')).toBeVisible();
    await expect(page.locator('.gamebar')).toHaveCount(0);
    await page.getByLabel('Mot de passe').fill('lanterne');
    await page.keyboard.press('Enter');
    await expect(page.locator('.gamebar')).toBeVisible();
  });

  test('the player sheet and the live view never ask for it', async ({ page }) => {
    await protect(page);
    await page.goto('/#fiche');
    await expect(page.locator('.handout')).toBeVisible();
    await expect(page.getByText('Réservé au Conteur')).toHaveCount(0);
    await page.goto('/#live/ABCD');
    await expect(page.locator('.live-title')).toBeVisible();
    await expect(page.getByText('Réservé au Conteur')).toHaveCount(0);
  });

  test('the lock screen links to the player sheet', async ({ page }) => {
    await protect(page);
    await page.goto('/');
    await page.getByRole('button', { name: /fiche joueur/ }).click();
    await expect(page.locator('.handout')).toBeVisible();
  });

  test('players join a broadcast from the lock screen with the TV code', async ({ page }) => {
    await protect(page);
    await page.goto('/');
    const join = page.getByRole('button', { name: 'Rejoindre' });
    await expect(join).toBeDisabled();
    await page.getByLabel('Code de la diffusion').fill('abcd');
    await join.click();
    await expect(page).toHaveURL(/#live\/ABCD$/);
    await expect(page.locator('.live-title')).toBeVisible();
  });
});
