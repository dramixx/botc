// Play styles for drawing characters: each one weights the draw and adds balance rules on top of the official distribution.
import { distributionFor, type L10n, type RoleId } from '../data/roles';
import type { Rng } from './rng';

export type DrawStyle = 'simple' | 'mindfuck' | 'chaos';
export const DRAW_STYLES: DrawStyle[] = ['simple', 'mindfuck', 'chaos'];

export const STYLE_INFO: Record<DrawStyle, { name: L10n; hint: L10n }> = {
  simple: {
    name: { fr: 'Simple', en: 'Simple' },
    hint: { fr: 'Infos fiables, capacités faciles : idéal pour découvrir. Pas d’Ivrogne ; Empoisonneur et Espion seulement aux grandes tables.', en: 'Reliable info, easy abilities: great to learn. No Drunk; Poisoner and Spy only at big tables.' },
  },
  mindfuck: {
    name: { fr: 'Mind-fucked', en: 'Mind-fucked' },
    hint: { fr: 'Empoisonnement, Ivrogne, Espion, Reclus… on doute de tout, mais il reste assez d’infos pour résoudre.', en: 'Poison, Drunk, Spy, Recluse… doubt everything, yet enough info remains to solve it.' },
  },
  chaos: {
    name: { fr: 'Chaos', en: 'Chaos' },
    hint: { fr: 'Pourfendeur, Vierge, Moine, Soldat, Maire… des actions publiques et des morts spectaculaires.', en: 'Slayer, Virgin, Monk, Soldier, Mayor… public plays and spectacular deaths.' },
  },
};

/** Good characters that get information. */
const INFO: RoleId[] = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker', 'ravenkeeper'];
/** Characters that make the good team's information unreliable. */
const MISINFO: RoleId[] = ['poisoner', 'spy', 'drunk', 'recluse'];
/** Good characters that protect or strike the Demon. */
const DEFENCE: RoleId[] = ['monk', 'soldier', 'slayer', 'mayor', 'virgin'];
/** Characters whose abilities play out in public or around deaths. */
const ACTION: RoleId[] = ['slayer', 'virgin', 'monk', 'soldier', 'mayor', 'ravenkeeper'];

/** Draw weights (1 when absent). */
const WEIGHTS: Record<DrawStyle, Partial<Record<RoleId, number>>> = {
  simple: {
    washerwoman: 3, librarian: 3, investigator: 3, chef: 3, empath: 3, undertaker: 2,
    monk: 2, soldier: 2, slayer: 2, virgin: 2,
    butler: 2, saint: 2, drunk: 0.05, recluse: 0.3,
    scarletwoman: 3, baron: 2, poisoner: 1, spy: 0.5,
  },
  mindfuck: {
    fortuneteller: 3, mayor: 2, ravenkeeper: 2, undertaker: 2, empath: 2, chef: 1.5, librarian: 1.5, investigator: 1.5,
    drunk: 4, recluse: 3, saint: 0.5,
    poisoner: 4, spy: 3,
  },
  chaos: {
    slayer: 4, virgin: 4, ravenkeeper: 3, monk: 3, soldier: 3, mayor: 3,
    washerwoman: 0.6, librarian: 0.6, investigator: 0.6, chef: 0.6,
    saint: 3, butler: 1.5,
    scarletwoman: 3, baron: 3, spy: 0.5,
  },
};

export const styleWeight = (style: DrawStyle, r: RoleId) => WEIGHTS[style][r] ?? 1;

/** Weighted shuffle (Efraimidis–Spirakis): heavier characters tend to come first. */
export function weightedShuffle(ids: readonly RoleId[], style: DrawStyle, rng: Rng): RoleId[] {
  return ids
    .map((r) => ({ r, k: rng() ** (1 / styleWeight(style, r)) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.r);
}

/** Number of balance rules the set breaks for this style (0 = balanced). */
export function styleViolations(roles: RoleId[], count: number, style: DrawStyle): number {
  const n = (set: RoleId[]) => roles.filter((r) => set.includes(r)).length;
  const [t, , m] = distributionFor(count, roles.includes('baron'));
  const [, baseOutsiders] = distributionFor(count, false);
  const misinfo = n(MISINFO);
  // Minimums are capped so that they always fit in the Townsfolk available.
  const minDefence = t >= 3 ? 1 : 0;
  const minInfo = Math.min(t - minDefence, { simple: Math.max(2, Math.ceil(t / 2)), mindfuck: Math.max(2, Math.ceil(t * 0.4)), chaos: Math.max(1, Math.floor(t / 3)) }[style]);
  let bad = 0;
  if (n(INFO) < minInfo) bad++;
  if (n(DEFENCE) < minDefence) bad++;
  if (style === 'simple') {
    // Big tables have more Minions than the Scarlet Woman and the Baron: then the Poisoner, or the Spy at 15, has to come in.
    if (roles.includes('drunk') || (roles.includes('spy') && m < 3)) bad++;
    if (misinfo > m - 1) bad++;
  } else if (style === 'mindfuck') {
    // Two sources when the table has room for them without forcing the Baron in.
    if (misinfo < (m + baseOutsiders >= 2 ? 2 : 1) || misinfo > 3) bad++;
  } else {
    if (misinfo > 2) bad++;
    if (n(ACTION) < Math.min(t - minInfo, Math.ceil(t / 2))) bad++;
  }
  return bad;
}

/** Draws until the result is balanced for the style; falls back to the best attempt. `draw` gets the attempt number. */
export function drawBalanced(draw: (attempt: number) => RoleId[], count: number, style: DrawStyle, tries = 400): RoleId[] {
  let best: RoleId[] = [];
  let bestBad = Number.POSITIVE_INFINITY;
  for (let i = 0; i < tries; i++) {
    const roles = draw(i);
    const bad = styleViolations(roles, count, style);
    if (bad === 0) return roles;
    if (bad < bestBad) { best = roles; bestBad = bad; }
  }
  return best;
}

