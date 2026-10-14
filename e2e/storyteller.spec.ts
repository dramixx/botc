import type { Browser, Page } from '@playwright/test';
import { ROLES } from '../src/data/roles';
import type { Game } from '../src/game/types';
import { expect, goStep, makeGame, nextStep, openWithGame, panel, pick, savedGame, seedGame, test, TABLE8, token } from './helpers';

/** A game still in the setup wizard, at the given step. */
async function openSetup(page: Page, g: Game) {
  await seedGame(page, g);
  await page.goto('/');
  await expect(page.locator('.setup-bar')).toBeVisible();
}

const alert = (page: Page) => page.getByRole('alertdialog');

test.describe('special situations pop up full screen', { tag: '@alerts' }, () => {
  test('the Imp targeting the Mayor: full-screen alert, then pinned on the step', async ({ page }) => {
    await openWithGame(page, makeGame(['imp', 'poisoner', 'washerwoman', 'chef', 'empath', 'monk', 'slayer', 'mayor'], { night: 2 }));
    await goStep(page, 'Diable');
    await pick(page, 0, 'Joueur8');
    await expect(alert(page)).toContainText('Le Diable vise le Maire (Joueur8)');
    await alert(page).getByRole('button', { name: 'J’ai compris' }).click();
    await expect(alert(page)).toHaveCount(0);
    await expect(panel(page).locator('.alert-pin')).toContainText('Le Diable vise le Maire');
    // Acknowledged once: picking the Mayor again does not pop up again.
    await pick(page, 0, 'Joueur4');
    await pick(page, 0, 'Joueur8');
    await expect(alert(page)).toHaveCount(0);
  });

  test('waking a poisoned player says so before anything else', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8));
    await goStep(page, 'Empoisonneur');
    await pick(page, 0, 'Joueur4');
    await nextStep(page);
    await goStep(page, ROLES.chef.name.fr);
    await expect(alert(page)).toContainText('Joueur4 est empoisonné(e) par Joueur2');
    await alert(page).getByRole('button', { name: 'J’ai compris' }).click();
    await expect(panel(page).locator('.alert-pin')).toContainText('empoisonné(e)');
  });

  test('executing the Saint asks first; "Annuler" executes nobody', async ({ page }) => {
    const g = makeGame(['imp', 'poisoner', 'saint', 'chef', 'empath', 'monk', 'slayer'], { phase: 'day' });
    g.day!.blockId = g.players[2].id;
    g.day!.blockVotes = 4;
    await openWithGame(page, g);
    await panel(page).getByRole('button', { name: 'Terminer le jour' }).click();
    await panel(page).getByRole('button', { name: 'Exécuter Joueur3' }).click();
    await expect(alert(page)).toContainText('S’il est exécuté, le Mal gagne');
    await alert(page).getByRole('button', { name: 'Annuler' }).click();
    expect((await savedGame(page)).players[2].alive).toBe(true);
  });
});

test.describe('hidden mode during the day', () => {
  test('the public panel keeps nominations and the timer, without day abilities', async ({ page }) => {
    await openWithGame(page, makeGame(TABLE8, { phase: 'day' }));
    await page.getByRole('button', { name: 'Masquer', exact: true }).click();
    await expect(token(page, 'Joueur1').locator('.prole')).toHaveText('· · ·');
    await expect(panel(page).locator('.public-bar')).toBeVisible();
    await expect(panel(page).locator('.timer-segs')).toBeVisible();
    await expect(panel(page).getByRole('button', { name: 'Nommer', exact: true })).toBeVisible();
    await expect(panel(page)).not.toContainText('CAPACITÉS DE JOUR');
    // Unhiding takes a long press (or Enter), not a stray tap.
    await panel(page).locator('.public-bar .hold-btn').click();
    await expect(token(page, 'Joueur1').locator('.prole')).toHaveText('· · ·');
    await panel(page).locator('.public-bar .hold-btn').focus();
    await page.keyboard.press('Enter');
    await expect(token(page, 'Joueur1').locator('.prole')).toHaveText('Diable');
  });

  test('nominating and voting hide the Grimoire by themselves; the vote is counted in public', { tag: '@autohide' }, async ({ page }) => {
    await openWithGame(page, makeGame(['imp', 'poisoner', 'butler', 'chef', 'empath', 'monk', 'slayer'], { phase: 'day' }));
    await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
    await expect(token(page, 'Joueur1').locator('.prole')).toHaveText('· · ·');
    // Tapping the circle still picks the nominator and the nominee.
    await token(page, 'Joueur4').click();
    await token(page, 'Joueur5').click();
    await panel(page).getByRole('button', { name: 'Ouvrir le vote' }).click();
    await expect(panel(page).locator('.vote-head')).toBeVisible();
    await expect(panel(page).locator('.voters')).not.toContainText('Majordome');
    await token(page, 'Joueur3').click();
    await token(page, 'Joueur6').click();
    await expect(panel(page).locator('.vote-total b')).toHaveText('2');
    await panel(page).locator('.grid-nav .btn.amber').click();
    expect((await savedGame(page)).day!.nominations[0].total).toBe(2);
  });
});

// --- characters on the players' phones -------------------------------------------------------

async function openPhone(browser: Browser, baseURL: string, code: string) {
  const ctx = await browser.newContext({ baseURL, locale: 'fr-FR', viewport: { width: 390, height: 844 }, hasTouch: true });
  const phone = await ctx.newPage();
  await phone.addInitScript(() => localStorage.setItem('botc.lang', 'fr'));
  await phone.goto(`/#live/${code}`);
  return phone;
}

test.describe('hand-out on the phones', () => {
  test('each player picks their name and sees their character; the iPad follows; it disappears at night 1', async ({ page, browser, baseURL }) => {
    const g = makeGame(TABLE8, { phase: 'setup' });
    g.setupStep = 'distribute';
    for (const p of g.players) p.seen = p.name !== 'Joueur3';
    await openSetup(page, g);
    await expect(page.locator('.dist-side .qr-box svg')).toBeVisible();
    await expect(page.locator('.dist-side .live-status')).toContainText('En ligne');
    const code = (await page.locator('.dist-side .live-code').textContent())!.trim();

    const phone = await openPhone(browser, baseURL!, code);
    await expect(phone.locator('.deal-row')).toHaveCount(8);
    // Nothing secret before picking a name.
    for (const r of TABLE8) expect(await phone.locator('body').innerText()).not.toContain(ROLES[r].name.fr);
    await phone.locator('.deal-row', { hasText: 'Joueur3' }).click();
    await phone.getByRole('button', { name: 'Oui, c’est moi' }).click();
    await expect(phone.locator('.showcard.privacy')).toBeVisible();
    await expect(token(page, 'Joueur3')).toContainText('Identifié');
    await phone.locator('.hold').focus();
    await phone.keyboard.press('Enter');
    await expect(phone.locator('.reveal-disc')).toContainText(ROLES.washerwoman.name.fr);
    await expect(token(page, 'Joueur3')).toHaveClass(/faded/);
    await expect.poll(async () => (await savedGame(page)).players[2].seen).toBe(true);

    // Another phone cannot take the same name.
    const other = await openPhone(browser, baseURL!, code);
    await expect(other.locator('.deal-row', { hasText: 'Joueur3' })).toBeDisabled();

    // A reload keeps the seat; the character can be seen again until the game starts.
    await phone.getByRole('button', { name: 'Cacher mon personnage' }).click();
    await phone.reload();
    await expect(phone.locator('.showcard.privacy')).toBeVisible();

    await page.locator('.setup-bar .btn.next').click();
    await expect(page.locator('.phase-pill')).toContainText('Nuit 1');
    await expect(phone.locator('.showcard')).toHaveCount(0);
    await expect(phone.locator('.circle-title')).toHaveText('Nuit 1');
    expect(await phone.evaluate((c) => localStorage.getItem(`botc.seat.${c}`), code)).toBeNull();
  });

  test('the Storyteller frees a seat taken by mistake', async ({ page, browser, baseURL }) => {
    const g = makeGame(TABLE8, { phase: 'setup' });
    g.setupStep = 'distribute';
    for (const p of g.players) p.seen = false;
    await openSetup(page, g);
    await expect(page.locator('.dist-side .live-status')).toContainText('En ligne');
    const code = (await page.locator('.dist-side .live-code').textContent())!.trim();
    const phone = await openPhone(browser, baseURL!, code);
    await phone.locator('.deal-row', { hasText: 'Joueur5' }).click();
    await phone.getByRole('button', { name: 'Oui, c’est moi' }).click();
    await expect(phone.locator('.showcard.privacy')).toBeVisible();
    const row = page.locator('.dist-row', { hasText: 'Joueur5' });
    await row.getByRole('button', { name: 'Libérer' }).click();
    await expect(phone.locator('.deal-main')).toContainText('Le Conteur a libéré ta place', { timeout: 10_000 });
    await expect(phone.locator('.deal-row', { hasText: 'Joueur5' })).toBeEnabled();
  });
});

test('setup: the rules are presented between the assignment and the hand-out', async ({ page }) => {
  const g = makeGame(TABLE8, { phase: 'setup' });
  g.setupStep = 'review';
  await openSetup(page, g);
  await page.locator('.setup-bar .btn.next').click();
  await expect(page.locator('.step-pill.cur')).toContainText('Règles');
  await page.getByRole('button', { name: 'Lancer la présentation' }).click();
  const brief = page.getByRole('dialog', { name: 'Présentation des règles' });
  await expect(brief).toBeVisible();
  for (let i = 0; i < 12 && !(await brief.getByRole('button', { name: /Distribuer les personnages/ }).isVisible()); i++) {
    await brief.getByRole('button', { name: 'Suivant →' }).click();
  }
  await brief.getByRole('button', { name: /Distribuer les personnages/ }).click();
  await expect(page.locator('.step-pill.cur')).toContainText('Distribution');
});
