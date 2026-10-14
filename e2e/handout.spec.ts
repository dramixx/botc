import { expect, makeGame, seedGame, test, TABLE8 } from './helpers';

test.describe('player sheet', () => {
  test('lists every character with its ability, searchable and filterable', async ({ page }) => {
    await page.goto('/#fiche');
    await expect(page.locator('.ho-role')).toHaveCount(27);
    await expect(page.locator('.ho-role', { has: page.locator('.ho-role-name', { hasText: 'Empoisonneur' }) })).toContainText('Chaque nuit');
    await page.getByRole('searchbox').fill('empoison');
    await expect(page.locator('.ho-role').first()).toContainText('Empoisonneur');
    await page.getByRole('searchbox').fill('');
    await page.getByRole('button', { name: 'Démon', exact: true }).click();
    await expect(page.locator('.ho-role')).toHaveCount(1);
    await page.locator('.ho-role').getByText('Conseil de jeu').click();
    await expect(page.locator('.ho-role')).toContainText('bluffez-en un');
    await expect(page.locator('.ho-role')).toContainText('Exemple');
    await expect(page.locator('.ho-role')).not.toContainText('Conseil avancé');
    await expect(page.locator('.ho-role .ho-star')).toHaveText('* Sauf la première nuit.');
  });

  test('has the rules and the useful info, and deep links to a tab', async ({ page }) => {
    await page.goto('/#fiche/regles');
    await expect(page.getByRole('heading', { name: 'L’essentiel en 30 secondes' })).toBeVisible();
    await page.getByText('Nominations et votes', { exact: true }).click();
    await expect(page.getByText(/la moitié des vivants \(arrondie au supérieur\)/)).toBeVisible();
    await page.getByRole('button', { name: 'Infos utiles' }).click();
    await expect(page).toHaveURL(/#fiche\/infos$/);
    await expect(page.locator('.ho-table tbody tr')).toHaveCount(11);
    await page.getByText('Lexique').click();
    await expect(page.getByText('Vote fantôme', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Useful info' })).toBeVisible();
  });

  test('never shows anything about the game on the device', async ({ page }) => {
    await seedGame(page, makeGame(TABLE8, { names: ['Alice', 'Bastien', 'Chloé', 'David', 'Emma', 'Farid', 'Gabrielle', 'Hugo'] }));
    await page.goto('/#fiche');
    await expect(page.locator('.ho-role')).toHaveCount(27);
    await expect(page.getByText('Alice')).toHaveCount(0);
    await expect(page.locator('.gamebar')).toHaveCount(0);
  });

  test('the storyteller shares it with a QR code and can view it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Nouvelle partie' }).click();
    await page.getByRole('button', { name: /Accueil/ }).click();
    await page.getByRole('button', { name: 'QR code / lien' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.locator('svg.qr')).toBeVisible();
    await expect(modal.locator('.mono-box')).toHaveText('https://botc.dramixx.work/#fiche');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Voir la fiche' }).click();
    await expect(page.locator('.ho-role')).toHaveCount(27);
    await page.getByRole('button', { name: '← Grimoire' }).click();
    await expect(page.getByRole('heading', { name: 'Grimoire' })).toBeVisible();
  });

  test('the last presentation screen shows the QR code', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Guide du Conteur/ }).click();
    await page.getByRole('button', { name: 'Présenter le jeu à la table' }).click();
    for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Suivant →' }).click();
    await expect(page.locator('.brief-qr svg.qr')).toBeVisible();
  });

  test('fits a phone screen without horizontal scroll', async ({ page }) => {
    await page.goto('/#fiche');
    for (const tab of ['Personnages', 'Règles', 'Infos utiles']) {
      await page.locator('.ho-tabs').getByRole('button', { name: tab }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), tab).toBe(true);
    }
  });
});
