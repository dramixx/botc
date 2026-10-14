import { addTraveller } from '../src/game/engine';
import {
  endDayButton, expect, makeGame, modalPick, nominateAndVote, openWithGame, panel, phasePill, pick, savedGame, startNextNight, test, TABLE8, token,
} from './helpers';
import type { Game } from '../src/game/types';

// Seats: 1 Diable · 2 Empoisonneur · 3 Lavandière · 4 Cuisinier · 5 Empathe · 6 Moine · 7 Pourfendeur · 8 Soldat
const find = (g: Game, name: string) => g.players.find((p) => p.name === name)!;
const day = () => makeGame(TABLE8, { phase: 'day' });

test.describe('nominations & votes', () => {
  test.beforeEach(async ({ page }) => { await openWithGame(page, day()); });

  test('an untouched day shows an empty block and the vote threshold', async ({ page }) => {
    await expect(phasePill(page)).toContainText('Jour 1');
    await expect(panel(page)).toContainText('Aucune nomination pour l’instant');
    await expect(panel(page).locator('.stat-box').first()).toContainText('Personne');
    await expect(page.locator('.gamebar-stat').nth(1)).toContainText('4');
  });

  test('"Ouvrir le vote" needs a nominator and a nominee', async ({ page }) => {
    await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
    const open = panel(page).getByRole('button', { name: 'Ouvrir le vote' });
    await expect(open).toBeDisabled();
    await pick(page, 0, 'Joueur1');
    await expect(open).toBeDisabled();
    await pick(page, 1, 'Joueur3');
    await expect(open).toBeEnabled();
    await panel(page).getByRole('button', { name: 'Annuler' }).click();
    await expect(panel(page)).toContainText('Aucune nomination pour l’instant');
  });

  test('a vote reaching the threshold puts the nominee on the block', async ({ page }) => {
    await nominateAndVote(page, 'Joueur1', 'Joueur3', ['Joueur4', 'Joueur5', 'Joueur6', 'Joueur7']);
    await expect(panel(page).locator('.stat-box').first()).toContainText('Joueur3 (4)');
    const g = await savedGame(page);
    expect(g.day!.blockId).toBe(find(g, 'Joueur3').id);
    expect(g.day!.nominations[0].total).toBe(4);
  });

  test('the live counter and the confirm label follow the toggles', async ({ page }) => {
    await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
    await pick(page, 0, 'Joueur1');
    await pick(page, 1, 'Joueur3');
    await panel(page).getByRole('button', { name: 'Ouvrir le vote' }).click();
    const total = panel(page).locator('.vote-total b');
    await expect(total).toHaveText('0');
    for (const v of ['Joueur4', 'Joueur5', 'Joueur6']) await panel(page).locator('.voter', { has: page.getByText(v, { exact: true }) }).click();
    await expect(total).toHaveText('3');
    await expect(panel(page).getByRole('button', { name: 'Valider le vote' })).toBeVisible();
    await panel(page).locator('.voter', { has: page.getByText('Joueur7', { exact: true }) }).click();
    await expect(total).toHaveText('4');
    await expect(panel(page).getByRole('button', { name: /Valider · Joueur3 au bûcher/ })).toBeVisible();
    await panel(page).locator('.voter', { has: page.getByText('Joueur7', { exact: true }) }).click();
    await expect(total).toHaveText('3');
  });

  test('a vote below the threshold leaves the block empty', async ({ page }) => {
    await nominateAndVote(page, 'Joueur1', 'Joueur3', ['Joueur4', 'Joueur5']);
    await expect(panel(page).locator('.stat-box').first()).toContainText('Personne');
    expect((await savedGame(page)).day!.blockId).toBeNull();
  });

  test('the best vote wins the block; a tie clears it', async ({ page }) => {
    await nominateAndVote(page, 'Joueur1', 'Joueur3', ['Joueur4', 'Joueur5', 'Joueur6', 'Joueur7']);
    await nominateAndVote(page, 'Joueur2', 'Joueur4', ['Joueur1', 'Joueur2', 'Joueur3', 'Joueur5', 'Joueur6']);
    await expect(panel(page).locator('.stat-box').first()).toContainText('Joueur4 (5)');
    await nominateAndVote(page, 'Joueur5', 'Joueur6', ['Joueur1', 'Joueur2', 'Joueur3', 'Joueur4', 'Joueur7']);
    await expect(panel(page).locator('.stat-box').first()).toContainText('Personne');
    await endDayButton(page).click();
    await expect(panel(page)).toContainText('Égalité à 5');
  });

  test('a player cannot nominate twice nor be nominated twice', async ({ page }) => {
    await nominateAndVote(page, 'Joueur1', 'Joueur3', []);
    await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
    await expect(panel(page).locator('.picker').nth(0).locator('.pick', { has: page.getByText('Joueur1', { exact: true }) })).toBeDisabled();
    await expect(panel(page).locator('.picker').nth(1).locator('.pick', { has: page.getByText('Joueur3', { exact: true }) })).toBeDisabled();
  });

  test('reopening a nomination lets the Storyteller fix the vote', async ({ page }) => {
    await nominateAndVote(page, 'Joueur1', 'Joueur3', ['Joueur4']);
    await panel(page).locator('.nom-row').click();
    await panel(page).locator('.voter', { has: page.getByText('Joueur5', { exact: true }) }).click();
    await panel(page).getByRole('button', { name: /Valider/ }).click();
    expect((await savedGame(page)).day!.nominations[0].total).toBe(2);
  });

  test('tapping players on the circle picks the nominator then the nominee', async ({ page }) => {
    await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
    await token(page, 'Joueur2').click();
    await token(page, 'Joueur5').click();
    await expect(panel(page).getByRole('button', { name: 'Ouvrir le vote' })).toBeEnabled();
    await panel(page).getByRole('button', { name: 'Ouvrir le vote' }).click();
    await expect(panel(page).locator('.panel-title')).toHaveText('Joueur5');
  });
});

test.describe('end of day', () => {
  test.beforeEach(async ({ page }) => { await openWithGame(page, day()); });

  test('executing the player on the block kills them and opens the next night', async ({ page }) => {
    await nominateAndVote(page, 'Joueur1', 'Joueur3', ['Joueur4', 'Joueur5', 'Joueur6', 'Joueur7']);
    await endDayButton(page).click();
    await panel(page).getByRole('button', { name: 'Exécuter Joueur3' }).click();
    await expect(panel(page)).toContainText('Joueur3 a été exécuté(e).');
    expect(find(await savedGame(page), 'Joueur3').alive).toBe(false);
    await startNextNight(page);
    await expect(phasePill(page)).toContainText('Nuit 2');
  });

  test('"Personne" skips the execution', async ({ page }) => {
    await nominateAndVote(page, 'Joueur1', 'Joueur3', ['Joueur4', 'Joueur5', 'Joueur6', 'Joueur7']);
    await endDayButton(page).click();
    await panel(page).getByRole('button', { name: /^Personne → Nuit 2/ }).click();
    await expect(phasePill(page)).toContainText('Nuit 2');
    expect((await savedGame(page)).players.every((p) => p.alive)).toBe(true);
  });

  test('without a block, the day just ends', async ({ page }) => {
    await endDayButton(page).click();
    await expect(panel(page)).toContainText('Aucune nomination aujourd’hui');
    await panel(page).getByRole('button', { name: 'Nuit 2 →' }).click();
    await expect(phasePill(page)).toContainText('Nuit 2');
  });

  test('night markers and the day counter move forward', async ({ page }) => {
    await endDayButton(page).click();
    await panel(page).getByRole('button', { name: 'Nuit 2 →' }).click();
    const g = await savedGame(page);
    expect(g.nightNumber).toBe(2);
    expect(g.phase).toBe('night');
  });
});

test.describe('ghost votes', () => {
  test('a dead player may vote once, then the vote is spent', async ({ page }) => {
    await openWithGame(page, day());
    await panel(page).getByRole('button', { name: 'Mort / capacité' }).click();
    await modalPick(page, 0, 'Joueur8');
    await page.locator('.modal').getByRole('button', { name: 'Faire mourir' }).click();
    await expect(token(page, 'Joueur8')).toHaveClass(/dead/);
    await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
    await pick(page, 0, 'Joueur1');
    await pick(page, 1, 'Joueur3');
    await panel(page).getByRole('button', { name: 'Ouvrir le vote' }).click();
    const dead = panel(page).locator('.voter', { has: page.getByText('Joueur8', { exact: true }) });
    await expect(dead).toContainText('Vote fantôme');
    await dead.click();
    await panel(page).getByRole('button', { name: /Valider/ }).click();
    expect(find(await savedGame(page), 'Joueur8').ghostVote).toBe(false);
    await nominateAndVote(page, 'Joueur2', 'Joueur4', []);
    await panel(page).locator('.nom-row').nth(1).click();
    await expect(panel(page).locator('.voter', { has: page.getByText('Joueur8', { exact: true }) })).toContainText('plus de vote');
  });

  test('the dead cannot nominate', async ({ page }) => {
    await openWithGame(page, day());
    await panel(page).getByRole('button', { name: 'Mort / capacité' }).click();
    await modalPick(page, 0, 'Joueur8');
    await page.locator('.modal').getByRole('button', { name: 'Faire mourir' }).click();
    await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
    await expect(panel(page).locator('.picker').nth(0).locator('.pick', { has: page.getByText('Joueur8', { exact: true }) })).toHaveCount(0);
  });
});

test.describe('Traveller exile', () => {
  test('an exile vote at half the table removes the Traveller; abilities do not change the count', async ({ page }) => {
    const g = day();
    addTraveller(g, 'Zoé', 'thief', 'evil');
    await openWithGame(page, g);
    await panel(page).getByRole('button', { name: /Exil/ }).click();
    await pick(page, 0, 'Joueur1');
    await pick(page, 1, 'Zoé ✈');
    await panel(page).getByRole('button', { name: 'Ouvrir le vote' }).click();
    for (const v of ['Joueur2', 'Joueur3', 'Joueur4', 'Joueur5', 'Joueur6']) await panel(page).locator('.voter', { has: page.getByText(v, { exact: true }) }).click();
    await panel(page).getByRole('button', { name: /exilé/ }).click();
    expect(find(await savedGame(page), 'Zoé').alive).toBe(false);
  });
});

test.describe('day abilities', () => {
  test('the Virgin executes a Townsfolk who nominates her and the day ends', async ({ page }) => {
    await openWithGame(page, makeGame(['imp', 'poisoner', 'virgin', 'chef', 'empath', 'monk', 'slayer'], { phase: 'day' }));
    await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
    await pick(page, 0, 'Joueur4');
    await pick(page, 1, 'Joueur3');
    await panel(page).getByRole('button', { name: 'Ouvrir le vote' }).click();
    const modal = page.locator('.modal');
    await expect(modal).toContainText('VIERGE · PREMIÈRE NOMINATION');
    await modal.getByRole('button', { name: 'Exécuter Joueur4' }).click();
    const g = await savedGame(page);
    expect(find(g, 'Joueur4').alive).toBe(false);
    expect(g.day!.ended).toBe(true);
  });

  test('a minion nominating the Virgin does not trigger her; her ability is spent', async ({ page }) => {
    await openWithGame(page, makeGame(['imp', 'poisoner', 'virgin', 'chef', 'empath', 'monk', 'slayer'], { phase: 'day' }));
    await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
    await pick(page, 0, 'Joueur2');
    await pick(page, 1, 'Joueur3');
    await panel(page).getByRole('button', { name: 'Ouvrir le vote' }).click();
    await expect(page.locator('.toast')).toContainText('Capacité de la Vierge utilisée');
    await expect(panel(page).locator('.vote-head')).toBeVisible();
    expect(find(await savedGame(page), 'Joueur4').alive).toBe(true);
  });

  test('"Ignorer" turns the Virgin trigger into a normal nomination', async ({ page }) => {
    await openWithGame(page, makeGame(['imp', 'poisoner', 'virgin', 'chef', 'empath', 'monk', 'slayer'], { phase: 'day' }));
    await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
    await pick(page, 0, 'Joueur4');
    await pick(page, 1, 'Joueur3');
    await panel(page).getByRole('button', { name: 'Ouvrir le vote' }).click();
    await page.locator('.modal').getByRole('button', { name: /Ignorer/ }).click();
    await expect(panel(page).locator('.vote-head')).toBeVisible();
    expect(find(await savedGame(page), 'Joueur4').alive).toBe(true);
  });

  test('the Slayer shot misses a non-Demon and the ability is then spent', async ({ page }) => {
    await openWithGame(page, day());
    await panel(page).getByRole('button', { name: /Pourfendeur/ }).click();
    await modalPick(page, 0, 'Joueur7');
    await modalPick(page, 1, 'Joueur3');
    await page.locator('.modal').getByRole('button', { name: 'Tirer' }).click();
    await expect(page.locator('.modal .banner')).toContainText('rien ne se passe');
    await page.locator('.modal').getByRole('button', { name: 'Fermer' }).click();
    await panel(page).getByRole('button', { name: /Pourfendeur/ }).click();
    await modalPick(page, 0, 'Joueur7');
    await expect(page.locator('.modal')).toContainText('Capacité déjà utilisée');
  });

  test('a fake Slayer shooting the Demon does nothing', async ({ page }) => {
    await openWithGame(page, day());
    await panel(page).getByRole('button', { name: /Pourfendeur/ }).click();
    await modalPick(page, 0, 'Joueur3');
    await expect(page.locator('.modal')).toContainText('Ce n’est pas le vrai Pourfendeur');
    await modalPick(page, 1, 'Joueur1');
    await page.locator('.modal').getByRole('button', { name: 'Tirer' }).click();
    expect(find(await savedGame(page), 'Joueur1').alive).toBe(true);
  });
});
