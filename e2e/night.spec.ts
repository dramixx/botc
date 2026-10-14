import type { Game } from '../src/game/types';
import { completeStep, nightSteps, startDay, startNight } from '../src/game/engine';
import { chip, expect, goStep, makeGame, nextStep, openWithGame, panel, phasePill, pick, runNight, savedGame, test, TABLE8, token } from './helpers';

// Seats: 1 Diable · 2 Empoisonneur · 3 Lavandière · 4 Cuisinier · 5 Empathe · 6 Moine · 7 Pourfendeur · 8 Soldat
const find = (g: Game, name: string) => g.players.find((p) => p.name === name)!;

test.describe('night 1', () => {
  test.beforeEach(async ({ page }) => { await openWithGame(page, makeGame(TABLE8)); });

  test('lists the steps in the official order', async ({ page }) => {
    const titles = await panel(page).locator('.step-chip').allInnerTexts();
    expect(titles.map((t) => t.replace('✓ ', ''))).toEqual(['Crépuscule', 'Sbires', 'Démon', 'Empoisonneur', 'Lavandière', 'Cuisinier', 'Empathe', 'Aube']);
    await expect(chip(page, 'Crépuscule')).toHaveClass(/cur/);
  });

  test('"Étape faite" ticks the step and moves to the next one', async ({ page }) => {
    await nextStep(page);
    await expect(chip(page, 'Crépuscule')).toHaveClass(/done/);
    await expect(chip(page, 'Sbires')).toHaveClass(/cur/);
    expect((await savedGame(page)).night!.done).toContain('dusk');
  });

  test('the Minions step shows who is the Demon, the Demon step shows the bluffs', async ({ page }) => {
    await goStep(page, 'Sbires');
    await expect(panel(page)).toContainText('Joueur1');
    await expect(panel(page)).toContainText('Joueur2 · Empoisonneur');
    await goStep(page, 'Démon');
    const g = await savedGame(page);
    await expect(panel(page)).toContainText('BLUFFS');
    await expect(panel(page).locator('.name-chip, .chips-row')).not.toHaveCount(0);
    expect(g.bluffs).toHaveLength(3);
  });

  test('showing a card requires the hold gesture, then hands back to the Storyteller', async ({ page }) => {
    await goStep(page, 'Lavandière');
    await panel(page).getByRole('button', { name: /^Montrer à Joueur3/ }).click();
    await expect(page.locator('.showcard.privacy')).toContainText('Joueur3');
    await page.locator('.hold').focus();
    await page.keyboard.press('Enter');
    const card = page.locator('.showcard.info');
    await expect(card).toContainText('L’un de ces joueurs est');
    await expect(card.locator('.big-role')).toHaveCount(1);
    await expect(card.locator('.showcard-chip')).toHaveCount(2);
    await card.getByRole('button', { name: 'Rendre au Conteur' }).click();
    await expect(page.locator('.showcard')).toHaveCount(0);
  });

  test('a sober Chef must be told the truth: the other numbers are locked', async ({ page }) => {
    await goStep(page, 'Cuisinier');
    await expect(panel(page)).toContainText('Info juste : 1');
    await expect(panel(page)).toContainText('VÉRITÉ OBLIGATOIRE');
    await expect(panel(page).locator('.num-tile', { hasText: /^3$/ })).toBeDisabled();
    await expect(panel(page).getByRole('button', { name: /Générer une fausse info/ })).toHaveCount(0);
    await nextStep(page);
    expect((await savedGame(page)).night!.data[`chef:${find(await savedGame(page), 'Joueur4').id}`].value).toBe(1);
  });

  test('the Empath step names the living neighbours', async ({ page }) => {
    await goStep(page, 'Empathe');
    await expect(panel(page)).toContainText('voisins vivants : Joueur4, Joueur6');
  });

  test('the Poisoner poisons a player: the marker shows, and their info is flagged', async ({ page }) => {
    await goStep(page, 'Empoisonneur');
    await pick(page, 0, 'Joueur5');
    await nextStep(page);
    const g = await savedGame(page);
    expect(find(g, 'Joueur5').markers.some((m) => m.key === 'poisoned' && m.by === find(g, 'Joueur2').id)).toBe(true);
    await goStep(page, 'Empathe');
    await expect(panel(page)).toContainText('est empoisonné(e)');
    await expect(panel(page)).toContainText('(par Joueur2)');
  });

  test('"Passer" completes a step without effect', async ({ page }) => {
    await goStep(page, 'Empoisonneur');
    await panel(page).getByRole('button', { name: 'Passer' }).click();
    await expect(chip(page, 'Empoisonneur')).toHaveClass(/done/);
    const g = await savedGame(page);
    expect(g.players.some((p) => p.markers.some((m) => m.key === 'poisoned'))).toBe(false);
  });

  test('a finished step can be reopened', async ({ page }) => {
    await nextStep(page);
    await goStep(page, 'Crépuscule');
    await panel(page).getByRole('button', { name: 'Rouvrir l’étape' }).click();
    await expect(chip(page, 'Crépuscule')).not.toHaveClass(/done/);
  });

  test('dawn warns about steps not done and "Revenir sur la nuit" goes back', async ({ page }) => {
    await goStep(page, 'Aube');
    await expect(panel(page)).toContainText('Des étapes de la nuit n’ont pas été faites');
    await panel(page).getByRole('button', { name: 'Revenir sur la nuit' }).click();
    await expect(panel(page).locator('.step-chip.cur')).not.toContainText('Aube');
  });

  test('a full night leads to day 1 and nobody died', async ({ page }) => {
    await runNight(page);
    await expect(phasePill(page)).toContainText('Jour 1');
    const g = await savedGame(page);
    expect(g.phase).toBe('day');
    expect(g.players.every((p) => p.alive)).toBe(true);
    await expect(page.locator('.gamebar-stat').first()).toContainText('8/8');
  });
});

test.describe('night 2 · the Demon strikes', () => {
  test.beforeEach(async ({ page }) => { await openWithGame(page, makeGame(TABLE8, { night: 2 })); });

  test('has no information steps, only the night-time abilities', async ({ page }) => {
    const titles = (await panel(page).locator('.step-chip').allInnerTexts()).map((t) => t.replace('✓ ', ''));
    expect(titles).toEqual(['Crépuscule', 'Empoisonneur', 'Moine', 'Diable', 'Empathe', 'Aube']);
  });

  test('the Imp kills the chosen player at dawn', async ({ page }) => {
    await goStep(page, 'Diable');
    await pick(page, 0, 'Joueur3');
    await expect(panel(page)).toContainText('Joueur3 meurt cette nuit');
    await panel(page).getByRole('button', { name: 'Confirmer la mort' }).click();
    await goStep(page, 'Aube');
    await expect(panel(page)).toContainText('Joueur3');
    await expect(panel(page)).toContainText('Cette nuit est morte');
    await panel(page).getByRole('button', { name: /^Commencer le jour/ }).click();
    expect(find(await savedGame(page), 'Joueur3').alive).toBe(false);
    await expect(token(page, 'Joueur3')).toHaveClass(/dead/);
    await expect(page.locator('.gamebar-stat').first()).toContainText('7/8');
  });

  test('a Monk-protected player survives', async ({ page }) => {
    await goStep(page, 'Moine');
    await pick(page, 0, 'Joueur3');
    await nextStep(page);
    await goStep(page, 'Diable');
    await pick(page, 0, 'Joueur3');
    await expect(panel(page)).toContainText('protégé par le Moine');
    await expect(panel(page)).toContainText('Personne ne meurt');
  });

  test('the Soldier cannot be killed by the Demon', async ({ page }) => {
    await goStep(page, 'Diable');
    await pick(page, 0, 'Joueur8');
    await expect(panel(page)).toContainText('Le Soldat est protégé');
    await nextStep(page);
    await runNight(page);
    expect(find(await savedGame(page), 'Joueur8').alive).toBe(true);
  });

  test('a poisoned Imp kills nobody', async ({ page }) => {
    await goStep(page, 'Empoisonneur');
    await pick(page, 0, 'Joueur1');
    await nextStep(page);
    await goStep(page, 'Diable');
    await expect(panel(page)).toContainText('Joueur1 est empoisonné(e) par Joueur2');
    await pick(page, 0, 'Joueur3');
    await expect(panel(page)).toContainText('Le Diable est ivre ou empoisonné : pas de mort.');
    await nextStep(page);
    await runNight(page);
    expect((await savedGame(page)).players.every((p) => p.alive)).toBe(true);
  });

  test('the Imp can target themself: a Minion becomes the Imp (star-pass)', async ({ page }) => {
    await goStep(page, 'Diable');
    await pick(page, 0, 'Joueur1');
    await expect(panel(page)).toContainText('un Sbire devient le Diable');
    await nextStep(page);
    const g = await savedGame(page);
    expect(find(g, 'Joueur1').alive).toBe(false);
    expect(find(g, 'Joueur2').role).toBe('imp');
    expect(g.pendingWin).toBeNull();
  });

  test('step progress survives a reload', async ({ page }) => {
    await nextStep(page);
    await nextStep(page);
    await page.reload();
    await expect(chip(page, 'Crépuscule')).toHaveClass(/done/);
    await expect(chip(page, 'Empoisonneur')).toHaveClass(/done/);
    await expect(chip(page, 'Moine')).toHaveClass(/cur/);
  });
});

test.describe('special night steps', () => {
  test('the Ravenkeeper wakes only the night they die', async ({ page }) => {
    const g = makeGame(['imp', 'poisoner', 'ravenkeeper', 'chef', 'empath', 'monk', 'slayer'], { night: 2 });
    await openWithGame(page, g);
    await expect(chip(page, 'Gardien')).toHaveCount(0);
    await goStep(page, 'Diable');
    await pick(page, 0, 'Joueur3');
    await panel(page).getByRole('button', { name: 'Confirmer la mort' }).click();
    await expect(panel(page).locator('.step-chip', { hasText: /Corneille/ })).toHaveCount(1);
  });

  test('the Undertaker wakes only after an execution', async ({ page }) => {
    const base = makeGame(['imp', 'poisoner', 'undertaker', 'chef', 'empath', 'monk', 'slayer'], { night: 2 });
    await openWithGame(page, base);
    await expect(panel(page).locator('.step-chip', { hasText: /Croque-mort/ })).toHaveCount(0);
  });

  test('the Scarlet Woman is woken after the Demon is executed', async ({ page }) => {
    const g = makeGame(['imp', 'scarletwoman', 'chef', 'empath', 'monk', 'slayer', 'soldier'], { phase: 'day', night: 1 });
    await openWithGame(page, g);
    await page.getByRole('button', { name: 'Mort / capacité' }).click();
    await pick(page, 0, 'Joueur1');
    await page.locator('.modal').getByRole('button', { name: 'Faire mourir' }).click();
    expect(find(await savedGame(page), 'Joueur2').role).toBe('imp');
  });
});

test.describe('history of each character', () => {
  /** Night 1 played with the engine (Joueur5 the Empath poisoned, told 2), then day 1 and night 2 open. */
  function playedGame() {
    const g = makeGame(TABLE8);
    const step = (role: string) => nightSteps(g).find((s) => s.role === role)!;
    completeStep(g, step('poisoner'), { targets: [find(g, 'Joueur5').id] });
    completeStep(g, step('washerwoman'), { targets: [find(g, 'Joueur6').id, find(g, 'Joueur7').id], role: 'monk' });
    completeStep(g, step('empath'), { targets: [], value: 2, lie: true });
    startDay(g);
    startNight(g);
    return g;
  }

  test('a night step puts mini reminder tokens on the circle for earlier nights', async ({ page }) => {
    await openWithGame(page, playedGame());
    await goStep(page, 'Empathe');
    const mini = token(page, 'Joueur5').locator('.mini');
    await expect(mini).toHaveCount(1);
    await expect(mini).toContainText('1');
    await expect(mini).toContainText('2');
    await expect(mini.locator('.mini-seg.lie')).toHaveCount(1);
    await expect(panel(page).locator('.trail-hint')).toBeVisible();
    await goStep(page, 'Empoisonneur');
    await expect(token(page, 'Joueur5').locator('.mini')).toHaveCount(1);
    await expect(page.locator('.circle .mini')).toHaveCount(1);
  });

  test('the player sheet lists everything the player was told', async ({ page }) => {
    await openWithGame(page, playedGame());
    await token(page, 'Joueur3').click();
    const hist = panel(page).locator('.history');
    await expect(hist).toContainText('SES NUITS');
    await expect(hist).toContainText('Lavandière · Joueur6, Joueur7 → Moine');
    await expect(token(page, 'Joueur6').locator('.mini')).toContainText('Moine');
    await expect(token(page, 'Joueur7').locator('.mini')).toContainText('Moine');
  });
});

test('a Recluse next to an evil player may count as a Chef pair', async ({ page }) => {
  // Seats: 1 Diable · 2 Reclus · 3 Cuisinier · 4 Empathe · 5 Moine · 6 Empoisonneur
  await openWithGame(page, makeGame(['imp', 'recluse', 'chef', 'empath', 'monk', 'poisoner']));
  await goStep(page, 'Cuisinier');
  await expect(panel(page).locator('.num-tile', { hasText: /^1$/ })).toBeEnabled();
  await expect(panel(page).locator('.num-tile', { hasText: /^0$/ })).toBeDisabled();
  await panel(page).locator('.num-tile', { hasText: /^2$/ }).click();
  await nextStep(page);
  const g = await savedGame(page);
  const saved = g.night!.data[`chef:${find(g, 'Joueur3').id}`];
  expect(saved.value).toBe(2);
  expect(saved.misreg).toEqual([find(g, 'Joueur2').id]);
  expect(saved.lie).toBeUndefined();
});

test('the Washerwoman leaves her reminder tokens on the circle', async ({ page }) => {
  await openWithGame(page, makeGame(TABLE8));
  await goStep(page, 'Lavandière');
  await nextStep(page);
  const g = await savedGame(page);
  const [a, b] = g.night!.data[`washerwoman:${find(g, 'Joueur3').id}`].targets.map((id) => g.players.find((p) => p.id === id)!);
  const right = a.role === g.night!.data[`washerwoman:${find(g, 'Joueur3').id}`].role ? a : b;
  const wrong = right === a ? b : a;
  await expect(token(page, right.name).locator('.pmarks .pill', { hasText: 'Villageois' })).toBeVisible();
  await expect(token(page, wrong.name).locator('.pmarks .pill', { hasText: 'Faux' })).toBeVisible();
});
