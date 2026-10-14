import { test as base, expect, type Page } from '@playwright/test';
import type { RoleId } from '../src/data/roles';
import { autoAssign, newGame, prepareSecrets, randomRoles, setRole, startDay, startNight } from '../src/game/engine';
import { seeded } from '../src/game/rng';
import type { Game } from '../src/game/types';

export { expect };

/** Every test starts in French with a clean browser profile. */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    // Auto-hide during nominations and votes is off, except in the tests tagged @autohide.
    await page.addInitScript((autoHide) => {
      if (!sessionStorage.getItem('e2e-init')) {
        localStorage.setItem('botc.lang', 'fr');
        if (!autoHide) localStorage.setItem('botc.autoHide', '0');
        sessionStorage.setItem('e2e-init', '1');
      }
    }, testInfo.tags.includes('@autohide'));
    // Special-situation alerts pop up full screen: acknowledge them as the Storyteller would, except in the tests tagged @alerts.
    if (!testInfo.tags.includes('@alerts')) {
      await page.addLocatorHandler(page.locator('.alert-screen', { has: page.getByRole('button', { name: 'J’ai compris' }) }),
        (l) => l.getByRole('button', { name: 'J’ai compris' }).click());
    }
    await use(page);
  },
});

/** The full-screen alert asking before an action (execute the Saint…): confirm it with the given button. */
export async function confirmAlert(page: Page, button: string | RegExp) {
  await page.getByRole('alertdialog').getByRole('button', { name: button }).click();
}

export interface FixtureOpts {
  /** 'night' (default): night 1 about to start. 'day': day 1 open. 'setup': still in the wizard. */
  phase?: 'night' | 'day' | 'setup';
  title?: string;
  names?: string[];
  /** Night number to start at (default 1). */
  night?: number;
}

/** Builds a deterministic game: one player per role, seat order = role order. */
export function makeGame(roles: RoleId[], opts: FixtureOpts = {}): Game {
  const g = newGame({ count: roles.length });
  g.title = opts.title ?? 'Table test';
  g.players.forEach((p, i) => {
    p.name = opts.names?.[i] ?? `Joueur${i + 1}`;
    setRole(g, p, roles[i]);
    p.seen = true;
  });
  g.selectedRoles = [...roles];
  prepareSecrets(g);
  const phase = opts.phase ?? 'night';
  if (phase === 'night' || phase === 'day') for (let n = 0; n < (opts.night ?? 1); n++) startNight(g);
  if (phase === 'day') startDay(g);
  return g;
}

/** Puts a game in localStorage before the app boots, so the app resumes straight into it. */
export async function seedGame(page: Page, game: Game) {
  await page.addInitScript((json) => {
    if (!sessionStorage.getItem('e2e-seeded')) {
      localStorage.setItem('botc.current', json);
      sessionStorage.setItem('e2e-seeded', '1');
    }
  }, JSON.stringify(game));
}

export async function openWithGame(page: Page, game: Game) {
  await seedGame(page, game);
  await page.goto('/');
  await expect(page.locator('.gamebar')).toBeVisible();
}

/** Reads the game currently persisted by the app. */
export async function savedGame(page: Page): Promise<Game> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('botc.current') ?? 'null'));
}

/** Roles of a standard 8-player table (Trouble Brewing) used by most fixtures. */
export const TABLE8: RoleId[] = ['imp', 'poisoner', 'washerwoman', 'chef', 'empath', 'monk', 'slayer', 'soldier'];

// --- UI actions ----------------------------------------------------------------

export const panel = (page: Page) => page.locator('aside.panel');
const amber = (page: Page) => panel(page).locator('.grid-nav .btn.amber');

/** Opens the burger menu (the bar shows a different button on phones). */
export async function openMenu(page: Page) {
  await page.locator('button[aria-label="Menu"]:visible').first().click();
  await expect(page.locator('.modal.drawer')).toBeVisible();
}

/** Clicks an entry of the menu drawer (opens it first). */
export async function menuItem(page: Page, name: string | RegExp) {
  await openMenu(page);
  await page.locator('.modal.drawer').getByRole('button', { name }).click();
}

/** The Journal / Roles buttons live in the bar on tablets and in the menu on phones. */
export async function openLog(page: Page) {
  const bar = page.locator('.gamebar-actions').getByRole('button', { name: 'Journal' });
  if (await bar.isVisible()) await bar.click();
  else await menuItem(page, 'Journal');
  await expect(page.locator('.panel')).toContainText(/Journal/i);
}

/** Walks the night with the default (true) information until dawn, then starts the day. */
export async function runNight(page: Page) {
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole('button', { name: /^Commencer le jour/ }).isVisible()) break;
    // Viewing a finished step (e.g. the Imp done before earlier steps): jump to the first pending one.
    if (!(await amber(page).isVisible())) await panel(page).locator('.step-chip:not(.done)').first().dispatchEvent('click');
    await amber(page).click();
  }
  await page.getByRole('button', { name: /^Commencer le jour/ }).click();
  await expect(page.locator('.phase-pill')).toContainText('Jour');
}

/** Picks a player in the n-th PlayerPicker of the panel. */
export async function pick(page: Page, group: number, name: string) {
  await panel(page).locator('.picker').nth(group).locator('.pick', { has: page.getByText(name, { exact: true }) }).click();
}

/** Nominates and records the vote. Returns once back on the day panel. */
export async function nominateAndVote(page: Page, nominator: string, nominee: string, voters: string[]) {
  await panel(page).getByRole('button', { name: 'Nommer', exact: true }).click();
  await pick(page, 0, nominator);
  await pick(page, 1, nominee);
  await panel(page).getByRole('button', { name: 'Ouvrir le vote' }).click();
  for (const v of voters) await panel(page).locator('.voter', { has: page.getByText(v, { exact: true }) }).click();
  await amber(page).click();
}

export const endDayButton = (page: Page) => panel(page).getByRole('button', { name: 'Terminer le jour' });

export const token = (page: Page, name: string) => page.locator('.ptoken', { has: page.locator('.pname', { hasText: new RegExp(`^${name}$`) }) });
export const chip = (page: Page, name: string | RegExp) => panel(page).locator('.step-chip', { hasText: name });
export const nextStep = (page: Page) => amber(page).click();
export const phasePill = (page: Page) => page.locator('.phase-pill');

/** Picks a player in the n-th picker of the open dialog. */
export async function modalPick(page: Page, group: number, name: string) {
  await page.locator('.modal .picker').nth(group).locator('.pick', { has: page.getByText(name, { exact: true }) }).click();
}

export const startNextNight = (page: Page) => panel(page).getByRole('button', { name: /^Nuit \d+ →$/ }).click();
export const winModal = (page: Page) => page.locator('.modal', { hasText: 'CONDITION DE VICTOIRE' });

/** Jumps to a night step. The chip strip is collapsed on phones (Prev/Next only), so the click is dispatched. */
export const goStep = (page: Page, name: string | RegExp) => chip(page, name).dispatchEvent('click');

/** A full random table (distribution respected), dealt with a seeded RNG so a failing seed can be replayed. */
export function randomGame(seed: string, count: number): Game {
  const rng = seeded(seed);
  const g = newGame({ count });
  g.title = `Auto ${seed}`;
  g.players.forEach((p, i) => { p.name = `Joueur${i + 1}`; });
  g.selectedRoles = randomRoles(count, rng);
  autoAssign(g, rng);
  for (const p of g.players) p.seen = true;
  startNight(g);
  return g;
}
