import { ROLES } from '../src/data/roles';
import type { Game } from '../src/game/types';
import { expect, goStep, makeGame, menuItem, nextStep, openLog, openMenu, openWithGame, panel, phasePill, pick, savedGame, test, TABLE8, token } from './helpers';

const find = (g: Game, name: string) => g.players.find((p) => p.name === name)!;
const undoBtn = (page: import('@playwright/test').Page) => page.locator('.gamebar-actions button[aria-label="Annuler"]');
const redoBtn = (page: import('@playwright/test').Page) => page.locator('.gamebar-actions button[aria-label="Rétablir"]');

test.describe('undo / redo', () => {
  test.beforeEach(async ({ page }) => { await openWithGame(page, makeGame(TABLE8)); });

  test('both buttons start disabled and follow the history', async ({ page }) => {
    await expect(undoBtn(page)).toBeDisabled();
    await expect(redoBtn(page)).toBeDisabled();
    await nextStep(page);
    await expect(undoBtn(page)).toBeEnabled();
    await undoBtn(page).click();
    expect((await savedGame(page)).night!.done).toEqual([]);
    await expect(redoBtn(page)).toBeEnabled();
    await redoBtn(page).click();
    expect((await savedGame(page)).night!.done).toEqual(['dusk']);
  });

  test('Ctrl+Z / Ctrl+Shift+Z work on desktop', async ({ page }) => {
    await nextStep(page);
    await nextStep(page);
    await page.keyboard.press('Control+z');
    expect((await savedGame(page)).night!.done).toEqual(['dusk']);
    await page.keyboard.press('Control+Shift+z');
    expect((await savedGame(page)).night!.done).toHaveLength(2);
  });

  test('history survives a reload', async ({ page }) => {
    await nextStep(page);
    await page.waitForTimeout(800); // the undo stack is written to IndexedDB after a short delay
    await page.reload();
    await expect(undoBtn(page)).toBeEnabled();
  });
});

test.describe('hidden mode', () => {
  test.beforeEach(async ({ page }) => { await openWithGame(page, makeGame(TABLE8)); });

  test('masks characters on the circle and the panel; names stay visible', async ({ page }) => {
    await expect(token(page, 'Joueur1').locator('.prole')).toHaveText('Diable');
    await page.getByRole('button', { name: 'Masquer', exact: true }).click();
    await expect(token(page, 'Joueur1').locator('.prole')).toHaveText('· · ·');
    await expect(token(page, 'Joueur1').locator('.pname')).toBeVisible();
    await expect(panel(page)).toContainText('Écran sûr');
    await expect(panel(page).locator('.step-chip')).toHaveCount(0);
  });

  test('tapping a token while hidden opens nothing; "Démasquer" restores the panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Masquer', exact: true }).click();
    await token(page, 'Joueur3').click({ force: true });
    await expect(panel(page)).toContainText('Écran sûr');
    await panel(page).getByRole('button', { name: 'Démasquer' }).click();
    await expect(panel(page).locator('.step-chip').first()).toBeAttached();
  });
});

test.describe('player sheet', () => {
  test.beforeEach(async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    await token(page, 'Joueur3').click();
  });

  test('opens from the circle with the character and seat', async ({ page }) => {
    await expect(panel(page).locator('.panel-title')).toHaveText('Joueur3');
    await expect(panel(page)).toContainText('PLACE 03');
    await expect(panel(page)).toContainText(ROLES.washerwoman.name.fr);
    await panel(page).getByRole('button', { name: 'Fermer' }).click();
    await expect(panel(page)).toContainText('Débats et nominations');
  });

  test('marking a player dead updates the grimoire and offers undo', async ({ page }) => {
    await panel(page).locator('.seg button', { hasText: 'Mort' }).click();
    await expect(token(page, 'Joueur3')).toHaveClass(/dead/);
    await expect(page.locator('.toast')).toContainText('Joueur3 est mort(e)');
    await page.locator('.toast').getByRole('button', { name: 'Annuler' }).click();
    await expect(token(page, 'Joueur3')).not.toHaveClass(/dead/);
    expect(find(await savedGame(page), 'Joueur3').alive).toBe(true);
  });

  test('reminders can be added and removed', async ({ page }) => {
    await panel(page).getByRole('button', { name: /Ajouter un marqueur/ }).click();
    await page.locator('.marker-row', { hasText: 'Ivre' }).click();
    await page.locator('.modal').getByRole('button', { name: 'Fermer' }).click();
    expect(find(await savedGame(page), 'Joueur3').markers.map((m) => m.key)).toContain('drunk');
    await expect(panel(page)).toContainText('Ivre / empoisonné');
    await panel(page).getByRole('button', { name: /Ajouter un marqueur/ }).click();
    await page.locator('.marker-row.on', { hasText: 'Ivre' }).click();
    expect(find(await savedGame(page), 'Joueur3').markers.map((m) => m.key)).not.toContain('drunk');
  });

  test('notes are saved on the player', async ({ page }) => {
    await panel(page).locator('textarea.notes').fill('Dit être Moine');
    await panel(page).locator('textarea.notes').blur(); // saved on "change"
    expect(find(await savedGame(page), 'Joueur3').notes).toBe('Dit être Moine');
  });

  test('renaming a player is reflected on the circle', async ({ page }) => {
    await panel(page).getByRole('button', { name: 'Renommer' }).click();
    await page.locator('.modal input').fill('Camille');
    await page.locator('.modal').getByRole('button', { name: 'Enregistrer' }).click();
    await expect(token(page, 'Camille')).toBeVisible();
  });

  test('the seat can be moved', async ({ page }) => {
    await panel(page).getByRole('button', { name: 'Changer de place' }).click();
    await page.locator('.modal').getByRole('button', { name: /Avancer/ }).click();
    expect((await savedGame(page)).players[3].name).toBe('Joueur3');
    await page.locator('.modal').getByRole('button', { name: 'Terminé' }).click();
  });

  test('changing the alignment is logged', async ({ page }) => {
    await panel(page).locator('.seg button', { hasText: 'Maléfique' }).click();
    const g = await savedGame(page);
    expect(find(g, 'Joueur3').alignment).toBe('evil');
    expect(g.log.some((l) => l.text.fr === 'Joueur3 devient Maléfique.')).toBe(true);
  });
});

test.describe('game menu', () => {
  test.beforeEach(async ({ page }) => { await openWithGame(page, makeGame(TABLE8, { phase: 'day' })); });

  test('renames the game', async ({ page }) => {
    await menuItem(page, /Table test/);
    await page.locator('.modal input').fill('Grande soirée');
    await page.locator('.modal').getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.locator('.gamebar-title')).toHaveText('Grande soirée');
  });

  test('adds a Traveller in the middle of the game', async ({ page }) => {
    await menuItem(page, 'Ajouter un Voyageur');
    const dlg = page.getByRole('dialog');
    await dlg.getByPlaceholder('Nom').fill('Zoé');
    await dlg.getByRole('button', { name: /Ajouter$/ }).click();
    const g = await savedGame(page);
    expect(g.players).toHaveLength(9);
    await expect(token(page, 'Zoé')).toBeVisible();
    // Travellers are not counted in the "alive" total.
    await expect(page.locator('.gamebar-stat').first()).toContainText('8/8');
  });

  test('switches language from the menu', async ({ page }) => {
    await openMenu(page);
    await page.locator('.modal.drawer .seg button', { hasText: 'EN' }).click();
    await expect(page.locator('.modal.drawer')).toContainText('Back to home');
    await page.keyboard.press('Escape');
    await expect(phasePill(page)).toContainText('Day 1');
  });

  test('switches the icon theme from the menu, and remembers it', async ({ page }) => {
    const firstIcon = () => page.locator('.ptoken .ri').first().innerHTML();
    const classic = await firstIcon();
    await openMenu(page);
    await page.locator('.modal.drawer .seg button', { hasText: 'Illustré' }).click();
    await page.keyboard.press('Escape');
    const illustrated = await firstIcon();
    expect(illustrated).not.toBe(classic);
    await page.reload();
    await expect.poll(firstIcon).toBe(illustrated);
  });

  test('Escape and the backdrop close the drawer', async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal.drawer')).toHaveCount(0);
  });

  test('"Terminer la partie" asks which team won, and can be cancelled', async ({ page }) => {
    await menuItem(page, 'Terminer la partie…');
    await expect(page.getByRole('dialog')).toContainText('Quelle équipe a gagné ?');
    await page.getByRole('dialog').getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await savedGame(page)).phase).toBe('day');
  });

  test('"Abandonner" marks the game abandoned, keeps it in the history and goes home', async ({ page }) => {
    await menuItem(page, 'Abandonner la partie');
    await expect(page.getByRole('dialog')).toContainText('Abandonner la partie ?');
    await page.getByRole('dialog').getByRole('button', { name: 'Abandonner', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Grimoire' })).toBeVisible();
    await expect(page.locator('.history li').first()).toContainText('abandonnée');
    await expect(page.locator('.card.current')).toHaveCount(0);
  });

  test('the role reference lists every character and filters them', async ({ page }) => {
    const bar = page.locator('.gamebar-actions').getByRole('button', { name: 'Rôles' });
    if (await bar.isVisible()) await bar.click();
    else await menuItem(page, 'Rôles');
    await expect(page.locator('.ref-card')).toHaveCount(Object.keys(ROLES).length);
    const card = page.locator('.ref-card').first();
    await card.getByText('Conseil avancé').click();
    await expect(card.locator('.ho-tip p')).toBeVisible();
    await page.locator('.ref-bar .filter', { hasText: 'En jeu' }).click();
    await expect(page.locator('.ref-card')).toHaveCount(8);
    await page.getByRole('button', { name: '← Grimoire' }).click();
    await expect(page.locator('.reference')).toHaveCount(0);
  });
});

test.describe('journal', () => {
  test('records the game as it goes and can be filtered to key events', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8));
    await goStep(page, 'Empoisonneur');
    await pick(page, 0, 'Joueur5');
    await nextStep(page);
    await openLog(page);
    const log = page.locator('.journal-body');
    await expect(log).toContainText('NUIT 1');
    await expect(log).toContainText('Empoisonneur (Joueur2) empoisonne Joueur5.');
    await page.getByRole('button', { name: 'Événements clés' }).click();
    await expect(log.locator('.log-item')).toHaveCount(0);
    await page.getByRole('button', { name: 'Tout', exact: true }).click();
    await expect(log.locator('.log-item').first()).toBeVisible();
    await page.locator('.journal').getByRole('button', { name: 'Fermer' }).click();
    await expect(panel(page).locator('.step-chip').first()).toBeAttached();
  });

  test('a new phase always returns to its own panel', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    await openLog(page);
    await page.locator('.journal').getByRole('button', { name: 'Fermer' }).click();
    await panel(page).getByRole('button', { name: 'Terminer le jour' }).click();
    await panel(page).getByRole('button', { name: 'Nuit 2 →' }).click();
    await expect(phasePill(page)).toContainText('Nuit 2');
    await expect(panel(page).locator('.step-chip').first()).toBeAttached();
  });
});

test.describe('persistence', () => {
  test('a game in progress is resumed after a full reload', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    await token(page, 'Joueur3').click();
    await panel(page).locator('.seg button', { hasText: 'Mort' }).click();
    await page.reload();
    await expect(phasePill(page)).toContainText('Jour 1');
    await expect(token(page, 'Joueur3')).toHaveClass(/dead/);
    await expect(page.locator('.gamebar-stat').first()).toContainText('7/8');
  });

  test('the resume works from IndexedDB if localStorage is wiped', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { title: 'Avant', phase: 'day' }));
    await menuItem(page, /Avant/);
    await page.locator('.modal input').fill('Sauvée');
    await page.locator('.modal').getByRole('button', { name: 'Enregistrer' }).click();
    await page.waitForTimeout(900); // IndexedDB is written shortly after each change
    await page.evaluate(() => localStorage.removeItem('botc.current'));
    await page.reload();
    await expect(page.locator('.gamebar-title')).toHaveText('Sauvée');
  });
});

test.describe('circle orientation', () => {
  test('the menu turns the grimoire one seat at a time, both ways', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8));
    const first = page.locator('.ptoken').first();
    const style = await first.getAttribute('style');
    await openMenu(page);
    await page.getByRole('button', { name: 'Tourner dans le sens horaire' }).click();
    expect((await savedGame(page)).rotation).toBe(1);
    await expect(first).not.toHaveAttribute('style', style!);
    await page.getByRole('button', { name: 'Tourner dans le sens inverse' }).click();
    await page.getByRole('button', { name: 'Tourner dans le sens inverse' }).click();
    expect((await savedGame(page)).rotation).toBe(7);
  });
});

test.describe('the Drunk on the grimoire', () => {
  test('shows the character they believe they are, with a Drunk badge and tag', async ({ page }) => {
    const g = makeGame(['imp', 'poisoner', 'washerwoman', 'chef', 'empath', 'monk', 'drunk', 'soldier']);
    g.players[6].believedRole = 'slayer';
    await openWithGame(page, g);
    const t = token(page, 'Joueur7');
    await expect(t.locator('.prole')).toHaveText(ROLES.slayer.name.fr);
    await expect(t).toHaveClass(/tone-bon/);
    await expect(t.locator('.pdrunk')).toBeVisible();
    await expect(t.locator('.pmarks')).toContainText(ROLES.drunk.name.fr);
  });
});
