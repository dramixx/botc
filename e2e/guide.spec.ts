import { expect, makeGame, openWithGame, seedGame, test, TABLE8 } from './helpers';

test.describe('storyteller guide', () => {
  test('opens from home with every tab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Guide du Conteur/ }).click();
    const guide = page.getByRole('dialog', { name: 'Guide du Conteur' });
    await expect(guide.getByRole('heading', { name: 'Présenter le jeu aux joueurs' })).toBeVisible();
    await guide.getByRole('button', { name: 'Histoire', exact: true }).click();
    await expect(guide.getByText(/Ravenswood Bluff est un village paisible/)).toBeVisible();
    await guide.getByRole('button', { name: 'Règles', exact: true }).click();
    await guide.getByText('Nominations et votes', { exact: true }).click();
    await expect(guide.getByText(/la moitié des vivants \(arrondie au supérieur\)/)).toBeVisible();
    await guide.getByRole('button', { name: 'Le Conteur', exact: true }).click();
    await expect(guide.getByText('Pour une première partie')).toBeVisible();
    await guide.getByRole('button', { name: 'Minuteur', exact: true }).click();
    await expect(guide.locator('.timer-table tbody tr')).toHaveCount(11);
    await guide.getByRole('button', { name: /Retour/ }).click();
    await expect(guide).toBeHidden();
  });

  test('the walkthrough starts a new game', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Guide du Conteur/ }).click();
    await page.getByRole('button', { name: 'Nouvelle partie →' }).click();
    await expect(page.locator('.step-pill.cur')).toContainText('Joueurs');
  });

  test('the rules presentation follows the chosen player count', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Guide du Conteur/ }).click();
    await page.getByRole('button', { name: 'Présenter le jeu à la table' }).click();
    const brief = page.getByRole('dialog', { name: 'Présentation des règles' });
    await expect(brief.getByRole('heading', { name: 'Blood on the Clocktower' })).toBeVisible();
    await brief.getByRole('button', { name: '+' }).click();
    await brief.getByRole('button', { name: '+' }).click(); // 10 players
    for (let i = 0; i < 3; i++) await brief.getByRole('button', { name: 'Suivant →' }).click();
    await expect(brief.getByRole('heading', { name: 'Répartition pour 10 joueurs' })).toBeVisible();
    await expect(brief.locator('.distrib-num')).toHaveText(['7', '0', '2', '1']);
    await brief.getByRole('button', { name: 'Texte à lire' }).click();
    await expect(brief.locator('.brief-say')).toBeHidden();
    await page.keyboard.press('ArrowRight');
    await expect(brief.getByRole('heading', { name: /Un secret à garder/ })).toBeVisible();
    for (let i = 0; i < 6; i++) await brief.getByRole('button', { name: 'Suivant →' }).click();
    await brief.getByRole('button', { name: 'Terminer' }).click();
    await expect(brief).toBeHidden();
  });

  test('setup offers the presentation with the table’s numbers', async ({ page }) => {
    await seedGame(page, makeGame(TABLE8, { phase: 'setup' }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Présenter les règles' }).first().click();
    const brief = page.getByRole('dialog', { name: 'Présentation des règles' });
    await expect(brief.getByText('Ce soir : 8 joueurs et un Conteur.')).toBeVisible();
    await expect(brief.getByRole('button', { name: '+' })).toHaveCount(0);
  });

  test('dawn and dusk come with an atmosphere line', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8));
    await expect(page.locator('aside.panel .narration')).toContainText('ferme les yeux');
  });
});

test.describe('day timer', () => {
  test('shows the recommended durations and runs in the game bar', async ({ page }) => {
    await page.clock.install();
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    const timer = page.locator('.day-timer');
    await expect(timer.locator('.timer-seg.on')).toHaveText('Discussions privées');
    await expect(timer.getByRole('timer')).toHaveText('6:00');
    await expect(page.locator('.timer-pill')).toHaveCount(0);
    await timer.getByRole('button', { name: /Démarrer/ }).click();
    await page.clock.runFor(61_000);
    await expect(timer.getByRole('timer')).toHaveText('4:59');
    await expect(page.locator('.timer-pill')).toHaveText('4:59');
    await timer.getByRole('button', { name: /Pause/ }).click();
    await page.clock.runFor(10_000);
    await expect(timer.getByRole('timer')).toHaveText('4:59');
    await timer.getByRole('button', { name: 'Passer à Débat public' }).click();
    await expect(timer.locator('.timer-seg.on')).toHaveText('Débat public');
    await expect(timer.getByRole('timer')).toHaveText('3:30');
  });

  test('rings at the end and offers the next part of the day', async ({ page }) => {
    await page.clock.install();
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    const timer = page.locator('.day-timer');
    await timer.getByRole('button', { name: /Démarrer/ }).click();
    await page.clock.runFor(361_000);
    await expect(timer).toContainText('Temps écoulé');
    await expect(page.locator('.timer-pill')).toHaveText('Temps !');
    await timer.getByRole('button', { name: 'Débat public →' }).click();
    await expect(timer.locator('.timer-seg.on')).toHaveText('Débat public');
    await expect(page.locator('.timer-pill')).not.toHaveText('Temps !');
  });

  test('survives a reload', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    const timer = page.locator('.day-timer');
    await timer.getByRole('button', { name: 'Passer à Débat public' }).click();
    await page.reload();
    await expect(page.locator('.day-timer .timer-seg.on')).toHaveText('Débat public');
  });

  test('settings change the durations and the pace', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    await page.getByRole('button', { name: 'Réglages du minuteur' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByText('Conseillé pour 8 vivants, jour 1.')).toBeVisible();
    await modal.getByRole('button', { name: 'Discussions privées +30 s' }).click();
    await expect(modal.locator('.timer-row').first()).toContainText('6:30');
    await modal.getByRole('button', { name: 'Fermer' }).click();
    await expect(page.locator('.day-timer').getByRole('timer')).toHaveText('6:30');
    await page.getByRole('button', { name: 'Réglages du minuteur' }).click();
    await modal.getByRole('button', { name: 'Tout réinitialiser' }).click();
    await modal.getByRole('button', { name: 'Détendu' }).click();
    await modal.getByRole('button', { name: 'Fermer' }).click();
    await expect(page.locator('.day-timer').getByRole('timer')).toHaveText('8:00');
  });

  test('a vote has a speaking timer', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    await page.getByRole('button', { name: 'Nommer', exact: true }).click();
    const panel = page.locator('aside.panel');
    await panel.locator('.picker').first().getByRole('button').first().click();
    await panel.locator('.picker').nth(1).getByRole('button').nth(2).click();
    await panel.getByRole('button', { name: 'Ouvrir le vote' }).click();
    await expect(panel.locator('.plea')).toContainText('1:00');
    await panel.getByRole('button', { name: 'Accusation' }).click();
    await expect(panel.getByRole('button', { name: 'Arrêter' })).toBeVisible();
  });

  test('the game menu opens the guide and the timer settings', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    await page.getByRole('button', { name: 'Menu' }).first().click();
    await page.getByRole('button', { name: 'Minuteur du jour' }).click();
    await expect(page.getByRole('heading', { name: 'Durées de la journée' })).toBeVisible();
    await page.getByRole('button', { name: 'Fermer' }).click();
    await page.getByRole('button', { name: 'Menu' }).first().click();
    await page.getByRole('button', { name: 'Guide du Conteur' }).click();
    await expect(page.getByRole('dialog', { name: 'Guide du Conteur' })).toBeVisible();
  });
});
