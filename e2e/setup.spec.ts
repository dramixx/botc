import { ROLES } from '../src/data/roles';
import { styleViolations } from '../src/game/drawStyles';
import { checkSetup } from '../src/game/engine';
import { expect, savedGame, test } from './helpers';

const next = (page: import('@playwright/test').Page) => page.locator('.setup-bar .btn.next');
/** From the assignment: the rules step (read aloud), then the hand-out, passing the iPad around. */
async function toHandout(page: import('@playwright/test').Page) {
  await next(page).click();
  await expect(page.locator('.step-pill.cur')).toContainText('Règles');
  await next(page).click();
  await expect(page.locator('.step-pill.cur')).toContainText('Distribution');
  await page.getByRole('button', { name: 'En passant l’iPad' }).click();
}
const fr = (id: keyof typeof ROLES) => ROLES[id].name.fr;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
});

test.describe('step 1 · players', () => {
  test('the stepper stays between 5 and 15 and resizes the table', async ({ page }) => {
    const value = page.locator('.big-stepper-value');
    const minus = page.getByRole('button', { name: '−', exact: true });
    const plus = page.getByRole('button', { name: '+', exact: true });
    const start = Number(await value.textContent());
    await expect(page.locator('.seat-row')).toHaveCount(start);
    for (let i = start; i > 5; i--) await minus.click();
    await expect(value).toHaveText('5');
    await expect(minus).toBeDisabled();
    await expect(page.locator('.seat-row')).toHaveCount(5);
    for (let i = 5; i < 15; i++) await plus.click();
    await expect(value).toHaveText('15');
    await expect(plus).toBeDisabled();
    await expect(page.locator('.seat-row')).toHaveCount(15);
  });

  test('the distribution matches the player count', async ({ page }) => {
    const plus = page.getByRole('button', { name: '+', exact: true });
    const minus = page.getByRole('button', { name: '−', exact: true });
    while ((await page.locator('.big-stepper-value').textContent()) !== '5') await minus.click();
    for (let n = 5; n <= 15; n++) {
      const exp = checkSetup(n, []).expected;
      await expect(page.locator('.distrib-num')).toHaveText([exp.townsfolk, exp.outsider, exp.minion, exp.demon].map(String));
      if (n < 15) await plus.click();
    }
  });

  test('"Noms au hasard" fills every seat; an empty name blocks the next step', async ({ page }) => {
    await page.getByRole('button', { name: 'Noms au hasard' }).click();
    const inputs = page.locator('.seat-input');
    for (const v of await inputs.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))) expect(v.trim()).not.toBe('');
    await expect(next(page)).toBeEnabled();
    await inputs.first().fill('');
    await expect(next(page)).toBeDisabled();
    await inputs.first().fill('Alice');
    await expect(next(page)).toBeEnabled();
  });

  test('Enter jumps to the next name and the table keeps its order', async ({ page }) => {
    const inputs = page.locator('.seat-input');
    await inputs.nth(0).fill('Alice');
    await inputs.nth(0).press('Enter');
    await expect(inputs.nth(1)).toBeFocused();
    await inputs.nth(1).fill('Bob');
    const g = await savedGame(page);
    expect(g.players.slice(0, 2).map((p) => p.name)).toEqual(['Alice', 'Bob']);
  });

  test('the game name is saved', async ({ page }) => {
    await page.locator('.text-input').first().fill('Vendredi');
    expect((await savedGame(page)).title).toBe('Vendredi');
  });

  test('a seat can be dragged to another position', async ({ page }) => {
    await page.getByRole('button', { name: 'Noms au hasard' }).click();
    const before = await page.locator('.seat-input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    const handle = page.locator('.handle').first();
    const target = page.locator('.seat-row').nth(2);
    const hb = (await handle.boundingBox())!;
    const tb = (await target.boundingBox())!;
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
    await page.mouse.up();
    const after = await page.locator('.seat-input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect(after).toEqual([before[1], before[2], before[0], ...before.slice(3)]);
  });
});

test.describe('step 2 · characters', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: 'Noms au hasard' }).click();
    await next(page).click();
    await expect(page.locator('.step-pill.cur')).toContainText('Personnages');
  });

  test('"Tirer au hasard" gives a valid distribution', async ({ page }) => {
    await page.getByRole('button', { name: 'Tirer au hasard' }).click();
    // With the Baron drawn the banner reads "Baron en jeu" instead: either way it is not a warning.
    await expect(page.locator('.banner:not(.warn)')).toBeVisible();
    await expect(page.locator('.banner.warn')).toHaveCount(0);
    await expect(next(page)).toContainText('Suivant');
    const g = await savedGame(page);
    expect(checkSetup(g.playerCount, g.selectedRoles).ok).toBe(true);
  });

  test('the play style is saved and steers the draw', async ({ page }) => {
    const styles = page.locator('.style-pick .seg button');
    await expect(styles).toHaveText(['Simple', 'Mind-fucked', 'Chaos']);
    await expect(styles.first()).toHaveClass(/on/);
    await styles.nth(1).click();
    await expect(page.locator('.style-pick')).toContainText('on doute de tout');
    expect((await savedGame(page)).drawStyle).toBe('mindfuck');
    await page.getByRole('button', { name: 'Tirer au hasard' }).click();
    const g = await savedGame(page);
    expect(checkSetup(g.playerCount, g.selectedRoles).ok).toBe(true);
    expect(styleViolations(g.selectedRoles, g.playerCount, 'mindfuck')).toBe(0);
  });

  test('the ↻ next to a team redraws only that team', async ({ page }) => {
    await page.getByRole('button', { name: 'Tirer au hasard' }).click();
    const before = await savedGame(page);
    const team = (roles: string[], t: string) => roles.filter((r) => ROLES[r as keyof typeof ROLES].team === t);
    await page.getByRole('button', { name: 'Nouveau tirage : Villageois' }).click();
    await expect.poll(async () => team((await savedGame(page)).selectedRoles, 'townsfolk')).not.toEqual(team(before.selectedRoles, 'townsfolk'));
    const after = await savedGame(page);
    expect(after.selectedRoles.filter((r: string) => ROLES[r as keyof typeof ROLES].team !== 'townsfolk')).toEqual(before.selectedRoles.filter((r: string) => ROLES[r as keyof typeof ROLES].team !== 'townsfolk'));
    expect(checkSetup(after.playerCount, after.selectedRoles).ok).toBe(true);
    // A single Demon to choose from: no button.
    await expect(page.getByRole('button', { name: /Nouveau tirage : Démon/ })).toHaveCount(0);
  });

  test('"Tout retirer" breaks it, "Compléter au hasard" repairs it', async ({ page }) => {
    await page.getByRole('button', { name: 'Tirer au hasard' }).click();
    await page.getByRole('button', { name: 'Tout retirer' }).click();
    await expect(page.locator('.banner.warn')).toContainText('Répartition attendue');
    await expect(next(page)).toContainText('Continuer quand même');
    await page.getByRole('button', { name: 'Compléter au hasard' }).click();
    await expect(page.locator('.banner:not(.warn)')).toBeVisible();
  });

  test('toggling a character updates the team counters; the Baron adds two Outsiders', async ({ page }) => {
    await page.getByRole('button', { name: 'Tout retirer' }).click();
    const chip = (id: keyof typeof ROLES) => page.locator('.role-chip', { hasText: fr(id) });
    await chip('imp').click();
    await expect(page.locator('.role-group', { hasText: 'Démon' }).locator('.count-pill')).toContainText('1 /');
    await chip('baron').click();
    const g = await savedGame(page);
    expect(g.selectedRoles).toEqual(expect.arrayContaining(['imp', 'baron']));
    await expect(page.locator('.role-group', { hasText: 'Étrangers' }).locator('.count-pill')).toContainText(/\/ (2|3|4)$/);
    await chip('baron').click();
    expect((await savedGame(page)).selectedRoles).toEqual(['imp']);
  });

  test('"Continuer quand même" still deals one character per player', async ({ page }) => {
    await page.getByRole('button', { name: 'Tout retirer' }).click();
    await page.locator('.role-chip', { hasText: fr('imp') }).click();
    await next(page).click();
    await expect(page.locator('.step-pill.cur')).toContainText('Attribution');
    const g = await savedGame(page);
    expect(g.players.map((p) => p.role).filter((r, i, a) => a.indexOf(r) === i)).toHaveLength(g.players.length);
  });

  test('earlier steps stay reachable, later ones are locked', async ({ page }) => {
    const pills = page.locator('.step-pill');
    await expect(pills.nth(2)).toBeDisabled();
    await expect(pills.nth(3)).toBeDisabled();
    // Phones only show the current pill: going back is then done from the Next/Home controls.
    if (await pills.nth(0).isVisible()) {
      await pills.nth(0).click();
      await expect(page.locator('.step-pill.cur')).toContainText('Joueurs');
    }
  });
});

test.describe('step 3 · assignment & 4 · hand out', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: 'Noms au hasard' }).click();
    await next(page).click();
    await page.getByRole('button', { name: 'Tirer au hasard' }).click();
    await next(page).click();
    await expect(page.locator('.step-pill.cur')).toContainText('Attribution');
  });

  test('every player has a character, plus three bluffs outside the game', async ({ page }) => {
    const g = await savedGame(page);
    await expect(page.locator('.assign-row')).toHaveCount(g.players.length);
    expect(g.bluffs).toHaveLength(3);
    const inPlay = new Set(g.players.map((p) => p.role));
    for (const b of g.bluffs) expect(inPlay.has(b)).toBe(false);
    await expect(page.locator('.bluff:not(.empty)')).toHaveCount(3);
  });

  test('picking a character already dealt swaps the two players', async ({ page }) => {
    const before = await savedGame(page);
    await page.locator('.role-select').nth(0).click();
    const other = before.players[1].role;
    await page.locator('.swap-tile', { hasText: fr(other) }).first().click();
    await expect(page.locator('.swap-summary')).toContainText('devient');
    await page.getByRole('button', { name: 'Échanger' }).click();
    const after = await savedGame(page);
    expect(after.players[0].role).toBe(before.players[1].role);
    expect(after.players[1].role).toBe(before.players[0].role);
  });

  test('redrawing the bluffs keeps them out of play', async ({ page }) => {
    await page.getByRole('button', { name: 'Retirer', exact: true }).click();
    const g = await savedGame(page);
    expect(g.bluffs).toHaveLength(3);
    const inPlay = new Set(g.players.map((p) => p.role));
    for (const b of g.bluffs) expect(inPlay.has(b)).toBe(false);
  });

  test('a Traveller can be added and removed', async ({ page }) => {
    await page.getByRole('button', { name: '+ Ajouter un voyageur' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Nom').fill('Zoé');
    await dialog.getByRole('button', { name: /Ajouter$/ }).click();
    const g = await savedGame(page);
    const zoe = g.players.find((p) => p.name === 'Zoé')!;
    expect(ROLES[zoe.role].team).toBe('traveller');
    await expect(page.locator('.trav-row')).toContainText('Zoé');
    await page.locator('.trav-row').getByRole('button', { name: 'Retirer' }).click();
    await expect(page.locator('.trav-row')).toHaveCount(0);
  });

  test('hand-out: everyone must see their character before night 1', async ({ page }) => {
    await toHandout(page);
    const total = (await savedGame(page)).players.length;
    await expect(next(page)).toHaveClass(/blocked/);
    for (let i = 0; i < total; i++) {
      await page.getByRole('button', { name: /^Passer l’iPad à/ }).click();
      // Privacy screen first, then the character after a long press.
      await expect(page.locator('.showcard.privacy')).toBeVisible();
      await page.locator('.hold').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.showcard.reveal')).toBeVisible();
      await expect(page.locator('.reveal-ability')).not.toBeEmpty();
      // The example comes before the tip.
      await expect(page.locator('.reveal-help b')).toHaveText(['Exemple', 'Conseil']);
      await page.getByRole('button', { name: /J’ai vu/ }).click();
      await expect(page.locator('.dist-head h2')).toContainText(`${i + 1} sur ${total}`);
    }
    await expect(next(page)).toContainText('Commencer la nuit 1');
    await next(page).click();
    await expect(page.locator('.phase-pill')).toContainText('Nuit 1');
    const g = await savedGame(page);
    expect(g.phase).toBe('night');
    expect(g.log.filter((l) => l.phase === 'setup').length).toBeGreaterThan(g.players.length);
  });

  test('the privacy screen hides the character until the hold completes', async ({ page }) => {
    await toHandout(page);
    await page.getByRole('button', { name: /^Passer l’iPad à/ }).click();
    await expect(page.locator('.reveal-disc')).toHaveCount(0);
    // A tap that is too short does not reveal.
    const hold = page.locator('.hold');
    const b = (await hold.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect(page.locator('.reveal-disc')).toHaveCount(0);
    // A real long press does.
    await page.mouse.down();
    await expect(page.locator('.showcard.reveal')).toBeVisible({ timeout: 3000 });
    await page.mouse.up();
  });

  test('"Conteur · retour" leaves the privacy screen without marking the player as seen', async ({ page }) => {
    await toHandout(page);
    await page.getByRole('button', { name: /^Passer l’iPad à/ }).click();
    await page.getByRole('button', { name: 'Conteur · retour' }).click();
    await expect(page.locator('.showcard')).toHaveCount(0);
    expect((await savedGame(page)).players.some((p) => p.seen)).toBe(false);
  });
});
