import { ROLES } from '../src/data/roles';
import { styleViolations } from '../src/game/drawStyles';
import { checkSetup } from '../src/game/engine';
import { expect, savedGame, test } from './helpers';

const next = (page: import('@playwright/test').Page) => page.locator('.setup-bar .btn.next');
const step = (page: import('@playwright/test').Page) => page.locator('.step-pill.cur');
/** From the review: the rules step (read aloud), then the hand-out, passing the iPad around. */
async function toHandout(page: import('@playwright/test').Page) {
  await next(page).click();
  await expect(step(page)).toContainText('Règles');
  await next(page).click();
  await expect(step(page)).toContainText('Distribution');
  await page.getByRole('button', { name: 'En passant l’iPad' }).click();
}
/** Characters drawn, seated, named: lands on the review. */
async function toReview(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Tirer au hasard' }).click();
  await next(page).click();
  await expect(step(page)).toContainText('Placement');
  await next(page).click();
  await page.getByRole('button', { name: 'Noms au hasard' }).click();
  await next(page).click();
  await expect(step(page)).toContainText('Vérification');
}
const fr = (id: keyof typeof ROLES) => ROLES[id].name.fr;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
});

test.describe('step 1 · players & characters', () => {
  test('the stepper stays between 5 and 15 and resizes the table', async ({ page }) => {
    const value = page.locator('.count-stepper-value');
    const minus = page.getByRole('button', { name: '−', exact: true });
    const plus = page.getByRole('button', { name: '+', exact: true });
    const start = Number(await value.textContent());
    for (let i = start; i > 5; i--) await minus.click();
    await expect(value).toHaveText('5');
    await expect(minus).toBeDisabled();
    expect((await savedGame(page)).players).toHaveLength(5);
    for (let i = 5; i < 15; i++) await plus.click();
    await expect(value).toHaveText('15');
    await expect(plus).toBeDisabled();
    expect((await savedGame(page)).players).toHaveLength(15);
  });

  test('a drawn selection follows the player count', async ({ page }) => {
    const minus = page.getByRole('button', { name: '−', exact: true });
    const plus = page.getByRole('button', { name: '+', exact: true });
    while ((await page.locator('.count-stepper-value').textContent()) !== '5') await minus.click();
    await page.getByRole('button', { name: 'Tirer au hasard' }).click();
    for (let n = 5; n <= 15; n++) {
      const g = await savedGame(page);
      expect(checkSetup(n, g.selectedRoles).ok, `${n} players`).toBe(true);
      const exp = checkSetup(n, g.selectedRoles).expected;
      await expect(page.locator('.count-pill')).toHaveText([exp.townsfolk, exp.outsider, exp.minion, exp.demon].map((x) => `${x} / ${x}`));
      if (n < 15) await plus.click();
    }
  });

  test('the game name is saved', async ({ page }) => {
    await page.locator('.text-input').first().fill('Vendredi');
    expect((await savedGame(page)).title).toBe('Vendredi');
  });
});

test.describe('step 2 · seating & 3 · names', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: 'Tirer au hasard' }).click();
    await next(page).click();
    await expect(step(page)).toContainText('Placement');
  });

  test('the characters are dealt on the circle before any name', async ({ page }) => {
    const g = await savedGame(page);
    await expect(page.locator('.ptoken')).toHaveCount(g.players.length);
    expect(g.players.every((p) => p.name === '')).toBe(true);
    expect([...g.players.map((p) => p.role)].sort()).toEqual([...g.selectedRoles].sort());
    await expect(page.locator('.ptoken .prole').first()).toHaveText(fr(g.players[0].role === 'drunk' ? g.players[0].believedRole! : g.players[0].role));
    expect(g.bluffs).toHaveLength(3);
    await expect(page.locator('.bluff:not(.empty)')).toHaveCount(3);
  });

  test('tapping two seats swaps their characters', async ({ page }) => {
    const before = await savedGame(page);
    await page.locator('.ptoken').nth(0).click();
    await expect(page.locator('.seat-card')).toContainText('PLACE 01');
    await page.locator('.ptoken').nth(2).click();
    const after = await savedGame(page);
    expect(after.players[0].role).toBe(before.players[2].role);
    expect(after.players[2].role).toBe(before.players[0].role);
    expect(after.players.map((p) => p.id)).toEqual(before.players.map((p) => p.id));
  });

  test('picking a character already dealt swaps the two seats', async ({ page }) => {
    const before = await savedGame(page);
    await page.locator('.ptoken').nth(0).click();
    await page.locator('.seat-card .role-select').click();
    await page.locator('.swap-tile', { hasText: fr(before.players[1].role) }).first().click();
    await expect(page.locator('.swap-summary')).toContainText('devient');
    await page.getByRole('button', { name: 'Échanger', exact: true }).click();
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

  test('going back to the characters keeps the seats of the characters kept', async ({ page }) => {
    const before = await savedGame(page);
    await page.locator('.step-pill').first().dispatchEvent('click');
    await expect(step(page)).toContainText('Personnages');
    await page.getByRole('button', { name: 'Nouveau tirage : Villageois' }).click();
    await next(page).click();
    const after = await savedGame(page);
    const town = (r: string) => ROLES[r as keyof typeof ROLES].team === 'townsfolk';
    before.players.forEach((p, i) => { if (!town(p.role) && p.role !== 'drunk') expect(after.players[i].role).toBe(p.role); });
    expect(checkSetup(after.playerCount, after.players.map((p) => p.role)).ok).toBe(true);
  });

  test('names are typed seat by seat; an empty name blocks the next step', async ({ page }) => {
    await next(page).click();
    await expect(step(page)).toContainText('Prénoms');
    await expect(next(page)).toBeDisabled();
    // Characters stay hidden on the circle while the table is seated.
    await expect(page.locator('.ptoken.tone-hid')).toHaveCount((await savedGame(page)).players.length);
    await page.locator('.ptoken').nth(1).click();
    const inputs = page.locator('.name-list .seat-input');
    await expect(inputs.nth(1)).toBeFocused();
    await inputs.nth(1).fill('Bob');
    await inputs.nth(1).press('Enter');
    await expect(inputs.nth(2)).toBeFocused();
    await expect(page.locator('.ptoken').nth(1).locator('.pname')).toHaveText('Bob');
    await page.getByRole('button', { name: 'Noms au hasard' }).click();
    for (const v of await inputs.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))) expect(v.trim()).not.toBe('');
    await expect(next(page)).toBeEnabled();
    await inputs.first().fill('');
    await expect(next(page)).toBeDisabled();
    await inputs.first().fill('Alice');
    await expect(next(page)).toBeEnabled();
    expect((await savedGame(page)).players[0].name).toBe('Alice');
  });
});

test.describe('step 1 · character selection', () => {
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
    await expect(step(page)).toContainText('Placement');
    const g = await savedGame(page);
    expect(g.players.map((p) => p.role).filter((r, i, a) => a.indexOf(r) === i)).toHaveLength(g.players.length);
  });

  test('earlier steps stay reachable, later ones are locked', async ({ page }) => {
    const pills = page.locator('.step-pill');
    await expect(pills.nth(1)).toBeDisabled();
    await expect(pills.nth(2)).toBeDisabled();
    await page.getByRole('button', { name: 'Tirer au hasard' }).click();
    await next(page).click();
    // Phones only show the current pill: going back is then done from the Next/Home controls.
    if (await pills.nth(0).isVisible()) {
      await pills.nth(0).click();
      await expect(step(page)).toContainText('Personnages');
    }
  });
});

test.describe('step 4 · review, 5 · rules & 6 · hand out', () => {
  test.beforeEach(async ({ page }) => {
    await toReview(page);
  });

  test('the review renames, changes a character outside the selection and moves a person', async ({ page }) => {
    const before = await savedGame(page);
    await page.locator('.ptoken').nth(0).click();
    await page.locator('.seat-card .text-input').fill('Zélie');
    expect((await savedGame(page)).players[0].name).toBe('Zélie');
    await page.locator('.seat-card .role-select').click();
    await page.getByRole('button', { name: 'Tous les rôles' }).click();
    const outside = (['soldier', 'mayor', 'monk', 'virgin', 'ravenkeeper'] as const).find((r) => !before.players.some((p) => p.role === r))!;
    await page.locator('.swap-tile', { hasText: fr(outside) }).click();
    await page.getByRole('button', { name: 'Changer', exact: true }).click();
    let g = await savedGame(page);
    expect(g.players[0].role).toBe(outside);
    expect(g.selectedRoles).toContain(outside);
    await page.getByRole('button', { name: /Place suivante/ }).click();
    g = await savedGame(page);
    expect([g.players[1].name, g.players[1].role]).toEqual(['Zélie', outside]);
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
    await expect(page.locator('.ptoken')).toHaveCount(g.players.length);
    await page.locator('.trav-row').getByRole('button', { name: 'Retirer' }).click();
    await expect(page.locator('.trav-row')).toHaveCount(0);
  });

  test('"Passer les règles" goes straight to the hand-out, on the hidden circle', async ({ page }) => {
    await next(page).click();
    await page.getByRole('button', { name: /Passer les règles/ }).click();
    await expect(step(page)).toContainText('Distribution');
    await page.getByRole('button', { name: 'En passant l’iPad' }).click();
    const g = await savedGame(page);
    await expect(page.locator('.ptoken.tone-hid')).toHaveCount(g.players.length);
    for (const p of g.players) await expect(page.locator('.circle')).not.toContainText(fr(p.role));
    // Tapping a seat hands the iPad to that player.
    await page.locator('.ptoken').nth(2).click();
    await expect(page.locator('.showcard.privacy')).toBeVisible();
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
      await expect(page.locator('.ptoken.faded')).toHaveCount(i + 1);
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
