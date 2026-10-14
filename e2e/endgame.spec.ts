import {
  confirmAlert, endDayButton, expect, makeGame, modalPick, nominateAndVote, openWithGame, panel, phasePill, pick, savedGame, startNextNight, test, TABLE8, winModal,
} from './helpers';
import type { Game } from '../src/game/types';

const find = (g: Game, name: string) => g.players.find((p) => p.name === name)!;
const day = (roles = TABLE8) => makeGame(roles, { phase: 'day' });

async function executeByVote(page: import('@playwright/test').Page, nominator: string, nominee: string, voters: string[]) {
  await nominateAndVote(page, nominator, nominee, voters);
  await endDayButton(page).click();
  await panel(page).getByRole('button', { name: `Exécuter ${nominee}` }).click();
  // Executing the Demon or the Saint has a special effect: the Storyteller confirms it full screen.
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await confirmAlert(page, `Exécuter ${nominee}`);
}

test.describe('victory', () => {
  test('executing the Demon asks to confirm a Good victory', async ({ page }) => {
    await openWithGame(page, day());
    await executeByVote(page, 'Joueur3', 'Joueur1', ['Joueur2', 'Joueur3', 'Joueur4', 'Joueur5']);
    const modal = winModal(page);
    await expect(modal).toContainText('Victoire du Bien ?');
    await expect(modal).toContainText('Le Démon est mort');
    await modal.getByRole('button', { name: 'Confirmer la victoire' }).click();
    await expect(page.locator('.end-screen')).toBeVisible();
    await expect(page.locator('.end-title')).toHaveText('Le Bien l’emporte');
    const g = await savedGame(page);
    expect(g.phase).toBe('ended');
    expect(g.winner).toBe('good');
  });

  test('rejecting the win lets the game continue', async ({ page }) => {
    await openWithGame(page, day());
    await executeByVote(page, 'Joueur3', 'Joueur1', ['Joueur2', 'Joueur3', 'Joueur4', 'Joueur5']);
    await winModal(page).getByRole('button', { name: 'Rejeter' }).click();
    await expect(winModal(page)).toHaveCount(0);
    expect((await savedGame(page)).phase).toBe('day');
    await expect(panel(page)).toContainText('Joueur1 a été exécuté(e).');
  });

  test('a slain Demon ends the game for Good (Slayer)', async ({ page }) => {
    await openWithGame(page, day());
    await panel(page).getByRole('button', { name: /Pourfendeur/ }).click();
    await modalPick(page, 0, 'Joueur7');
    await modalPick(page, 1, 'Joueur1');
    await page.locator('.modal').getByRole('button', { name: 'Tirer' }).click();
    await expect(winModal(page)).toContainText('Victoire du Bien ?');
    expect(find(await savedGame(page), 'Joueur1').alive).toBe(false);
  });

  test('Evil wins when only two players are left alive', async ({ page }) => {
    await openWithGame(page, day(['imp', 'poisoner', 'chef', 'empath', 'monk']));
    await panel(page).getByRole('button', { name: 'Mort / capacité' }).click();
    await modalPick(page, 0, 'Joueur3');
    await page.locator('.modal').getByRole('button', { name: 'Faire mourir' }).click();
    await panel(page).getByRole('button', { name: 'Mort / capacité' }).click();
    await modalPick(page, 0, 'Joueur4');
    await page.locator('.modal').getByRole('button', { name: 'Faire mourir' }).click();
    await expect(winModal(page)).toBeHidden();
    await panel(page).getByRole('button', { name: 'Mort / capacité' }).click();
    await modalPick(page, 0, 'Joueur5');
    await page.locator('.modal').getByRole('button', { name: 'Faire mourir' }).click();
    await expect(winModal(page)).toContainText('Victoire du Mal ?');
    await expect(winModal(page)).toContainText('Il ne reste que 2 joueurs vivants');
  });

  test('executing the Saint gives Evil the win', async ({ page }) => {
    await openWithGame(page, day(['imp', 'poisoner', 'saint', 'chef', 'empath', 'monk', 'slayer']));
    await executeByVote(page, 'Joueur1', 'Joueur3', ['Joueur1', 'Joueur2', 'Joueur4', 'Joueur5']);
    await expect(winModal(page)).toContainText('Victoire du Mal ?');
    await expect(winModal(page)).toContainText('Saint');
  });

  test('the Mayor wins with 3 alive and no execution', async ({ page }) => {
    await openWithGame(page, day(['imp', 'poisoner', 'mayor', 'chef', 'empath']));
    for (const n of ['Joueur4', 'Joueur5']) {
      await panel(page).getByRole('button', { name: 'Mort / capacité' }).click();
      await modalPick(page, 0, n);
      await page.locator('.modal').getByRole('button', { name: 'Faire mourir' }).click();
    }
    await expect(winModal(page)).toBeHidden();
    await endDayButton(page).click();
    await panel(page).getByRole('button', { name: 'Nuit 2 →' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('le Maire est en vie');
    await confirmAlert(page, 'Nuit 2 →');
    await expect(winModal(page)).toContainText('Victoire du Bien ?');
    await expect(winModal(page)).toContainText('le Maire est en vie');
  });

  test('the Scarlet Woman takes over when the Demon is executed with 5+ alive', async ({ page }) => {
    await openWithGame(page, day(['imp', 'scarletwoman', 'chef', 'empath', 'monk', 'slayer', 'soldier']));
    await executeByVote(page, 'Joueur3', 'Joueur1', ['Joueur1', 'Joueur2', 'Joueur3', 'Joueur4']);
    await expect(winModal(page)).toBeHidden();
    const g = await savedGame(page);
    expect(find(g, 'Joueur1').alive).toBe(false);
    expect(find(g, 'Joueur2').role).toBe('imp');
    expect(g.phase).toBe('day');
    await startNextNight(page);
    await expect(panel(page).locator('.step-chip', { hasText: 'Succube' })).toHaveCount(1);
  });

  test('Evil wins as soon as the Imp kills down to two players', async ({ page }) => {
    const g = makeGame(['imp', 'poisoner', 'chef', 'empath', 'monk'], { night: 2 });
    for (const p of g.players.slice(3)) { p.alive = false; p.ghostVote = true; }
    await openWithGame(page, g);
    await panel(page).locator('.step-chip', { hasText: 'Diable' }).dispatchEvent('click');
    await pick(page, 0, 'Joueur3');
    await panel(page).getByRole('button', { name: 'Confirmer la mort' }).click();
    // The win condition is detected the moment the second-to-last player dies, even mid-night.
    await expect(winModal(page)).toContainText('Victoire du Mal ?');
    await winModal(page).getByRole('button', { name: 'Confirmer la victoire' }).click();
    await expect(page.locator('.end-title')).toHaveText('Le Mal l’emporte');
  });
});

test.describe('end screen', () => {
  test.beforeEach(async ({ page }) => {
    await openWithGame(page, day());
    await page.locator('button[aria-label="Menu"]:visible').first().click();
    await page.getByRole('button', { name: 'Terminer la partie…' }).click();
    await page.getByRole('button', { name: 'Victoire du Mal' }).click();
  });

  test('shows the winner, the reason and who was what', async ({ page }) => {
    await expect(page.locator('.end-title')).toHaveText('Le Mal l’emporte');
    await expect(page.locator('.end-reason')).toHaveText('Décision du Conteur.');
    const rows = page.locator('.recap-row');
    await expect(rows).toHaveCount(8);
    await expect(rows.first()).toContainText('Joueur1');
    await expect(rows.first()).toContainText('Diable');
  });

  test('the full log toggle switches the right panel', async ({ page }) => {
    await page.getByRole('button', { name: /Journal complet/ }).click();
    await expect(page.locator('.end-log')).toBeVisible();
    await expect(page.locator('.end-log')).toContainText('Victoire des Maléfiques');
    await page.getByRole('button', { name: /Qui était quoi/ }).click();
    await expect(page.locator('.recap')).toBeVisible();
  });

  test('the game story lists the nights and days', async ({ page }) => {
    await page.getByRole('button', { name: /Récit de la partie/ }).click();
    await expect(page.locator('.story')).toBeVisible();
  });

  test('"Revenir en arrière" reopens the game', async ({ page }) => {
    await page.getByRole('button', { name: /Revenir en arrière/ }).click();
    await expect(phasePill(page)).toContainText('Jour 1');
    expect((await savedGame(page)).winner).toBeNull();
  });

  test('a finished game is not resumed after a reload; it sits in the history', async ({ page }) => {
    await page.getByRole('button', { name: 'Accueil' }).click();
    await page.reload();
    await expect(page.locator('.card.current')).toHaveCount(0);
    await expect(page.locator('.history li').first()).toContainText('Mal');
  });
});
