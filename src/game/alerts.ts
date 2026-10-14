// Special situations the Storyteller must not miss: a poisoned or drunk player woken up, the Imp aiming at the Mayor,
// the Saint on the block… The panels show them full screen (to acknowledge) and keep them pinned on the step.
import { ROLES } from '../data/roles';
import { aliveAll, aliveCount, byId, hasMarker, isImpaired, markerWorks, nameOf, nightSteps, starpassHeir, teamOf, type NightStep } from './engine';
import type { L10n } from '../data/roles';
import type { Game, Player, StepAction } from './types';

export type AlertTone = 'mal' | 'amb' | 'bon';
export interface Alert { key: string; tone: AlertTone; title: L10n; text: L10n }

const L = (fr: string, en: string): L10n => ({ fr, en });
const rn = (p: Player | undefined, lang: 'fr' | 'en') => (p ? ROLES[p.role].name[lang] : '?');

/** The most serious tone of a list (for the colour of the full-screen alert). */
export const worstTone = (alerts: Alert[]): AlertTone =>
  alerts.some((a) => a.tone === 'mal') ? 'mal' : alerts.some((a) => a.tone === 'amb') ? 'amb' : 'bon';

/** Why the woken player's ability does not work tonight (Drunk, poisoned). */
function impairedAlert(g: Game, p: Player, step: NightStep): Alert | null {
  if (p.role === 'drunk') {
    const believed = p.believedRole ? ROLES[p.believedRole].name : null;
    return {
      key: 'drunk', tone: 'mal',
      title: L(`${p.name} est l’Ivrogne`, `${p.name} is the Drunk`),
      text: L(`Il croit être ${believed?.fr ?? '?'}. Sa capacité ne fonctionne pas : son action n’a aucun effet et vous pouvez lui donner une info fausse (ou vraie).`,
        `They think they are the ${believed?.en ?? '?'}. Their ability does not work: their action has no effect and you may give false (or true) info.`),
    };
  }
  if (!isImpaired(p)) return null;
  const by = p.markers.find((m) => m.key === 'poisoned')?.by;
  const who = by ? L(` par ${nameOf(g, by)}`, ` by ${nameOf(g, by)}`) : L('', '');
  const what = hasMarker(p, 'poisoned') ? L('empoisonné(e)', 'poisoned') : L('ivre', 'drunk');
  const imp = step.role === 'imp';
  return {
    key: 'poisoned', tone: 'mal',
    title: L(`${p.name} est ${what.fr}${who.fr}`, `${p.name} is ${what.en}${who.en}`),
    text: imp
      ? L('Le Démon ne tue personne cette nuit (faites-le quand même choisir).', 'The Demon kills nobody tonight (still let them choose).')
      : L('Sa capacité ne fonctionne pas cette nuit : son action n’a aucun effet et vous pouvez lui donner une info fausse (ou vraie).',
        'Their ability does not work tonight: their action has no effect and you may give false (or true) info.'),
  };
}

/** Alerts for a night step, given what the Storyteller has entered so far. */
export function stepAlerts(g: Game, step: NightStep, data: StepAction): Alert[] {
  const out: Alert[] = [];
  if (step.kind === 'dawn') {
    const pending = nightSteps(g).filter((s) => s.kind !== 'dawn' && !g.night?.done.includes(s.key));
    if (pending.length) {
      const names = pending.map((s) => (s.kind === 'minioninfo' ? L('Sbires', 'Minions') : s.kind === 'demoninfo' ? L('Démon', 'Demon') : s.role ? ROLES[s.role].name : L('?', '?')));
      out.push({ key: 'pending', tone: 'mal', title: L('Des étapes de la nuit n’ont pas été faites', 'Some night steps were not done'),
        text: L(`${names.map((n) => n.fr).join(', ')}. Revenez sur la nuit si un joueur doit encore être réveillé.`, `${names.map((n) => n.en).join(', ')}. Go back to the night if a player still needs waking.`) });
    }
    return out;
  }
  const p = byId(g, step.playerId);
  if (step.kind !== 'role' || !p) return out;

  const imp = impairedAlert(g, p, step);
  if (imp) out.push(imp);

  switch (step.role) {
    case 'ravenkeeper':
      out.push({ key: 'raven', tone: 'amb', title: L(`${p.name} a été tué(e) cette nuit`, `${p.name} was killed tonight`),
        text: L('Réveillez le Gardien des corbeaux : il désigne un joueur et apprend son personnage.', 'Wake the Ravenkeeper: they pick a player and learn their character.') });
      break;
    case 'scarletwoman':
      out.push({ key: 'sw', tone: 'mal', title: L(`${p.name} (Succube) est devenue le Démon`, `${p.name} (Scarlet Woman) became the Demon`),
        text: L('Réveillez-la et montrez-lui qu’elle est désormais le Diable.', 'Wake her and show her she is now the Imp.') });
      break;
    case 'spy':
      out.push({ key: 'spy', tone: 'amb', title: L('L’Espion regarde le Grimoire', 'The Spy looks at the Grimoire'),
        text: L('Démasquez le Grimoire et tendez l’iPad à l’Espion. Il a le droit de tout voir.', 'Unhide the Grimoire and hand the iPad to the Spy. They may see everything.') });
      break;
    case 'fortuneteller': {
      const rh = data.targets.map((t) => byId(g, t)).find((q) => q && hasMarker(q, 'redherring'));
      if (rh) out.push({ key: `rh:${rh.id}`, tone: 'amb', title: L(`${rh.name} est le faux positif`, `${rh.name} is the red herring`),
        text: L('Il est perçu comme le Démon : la Voyante reçoit « OUI » (si elle n’est ni ivre ni empoisonnée).', 'They register as the Demon: the Fortune Teller gets “YES” (unless drunk or poisoned).') });
      break;
    }
    case 'imp': {
      if (data.value === true) {
        out.push({ key: 'promoted', tone: 'mal', title: L(`${p.name} est le nouveau Diable`, `${p.name} is the new Imp`),
          text: L('Réveillez-le et montrez-lui qu’il est désormais le Diable. Il ne tue pas cette nuit.', 'Wake them and show them they are now the Imp. They do not kill tonight.') });
        break;
      }
      const t = byId(g, data.targets[0]);
      // A drunk or poisoned Imp kills nobody: the target does not matter (already said above).
      if (!t || isImpaired(p)) break;
      if (t.id === p.id) {
        const heir = starpassHeir(g, p.id);
        out.push({ key: 'starpass', tone: 'mal', title: L('Le Diable se tue lui-même', 'The Imp kills themself'),
          text: L(`${p.name} meurt et ${heir ? `${heir.name} (${rn(heir, 'fr')})` : 'un Sbire'} devient le Diable : réveillez-le pour le lui montrer.`,
            `${p.name} dies and ${heir ? `${heir.name} (${rn(heir, 'en')})` : 'a Minion'} becomes the Imp: wake them to show them.`) });
      }
      if (!t.alive) out.push({ key: `dead:${t.id}`, tone: 'amb', title: L(`${t.name} est déjà mort(e)`, `${t.name} is already dead`), text: L('Personne ne meurt cette nuit.', 'Nobody dies tonight.') });
      if (t.alive && t.role === 'mayor' && !isImpaired(t) && t.id !== p.id) {
        out.push({ key: `mayor:${t.id}`, tone: 'amb', title: L(`Le Diable vise le Maire (${t.name})`, `The Imp targets the Mayor (${t.name})`),
          text: L('Vous pouvez faire mourir quelqu’un d’autre à sa place (choix plus bas), ou laisser le Maire mourir.', 'You may have someone else die instead (choice below), or let the Mayor die.') });
      }
      if (t.alive && t.role === 'soldier') {
        out.push(isImpaired(t)
          ? { key: `soldier:${t.id}`, tone: 'mal', title: L(`Le Soldat (${t.name}) est empoisonné`, `The Soldier (${t.name}) is poisoned`), text: L('Sa protection ne marche pas : il meurt.', 'Their protection fails: they die.') }
          : { key: `soldier:${t.id}`, tone: 'bon', title: L(`${t.name} est le Soldat`, `${t.name} is the Soldier`), text: L('Le Démon ne peut pas le tuer : personne ne meurt.', 'The Demon cannot kill them: nobody dies.') });
      }
      if (t.alive && hasMarker(t, 'protected')) {
        out.push(markerWorks(g, t, 'protected')
          ? { key: `monk:${t.id}`, tone: 'bon', title: L(`${t.name} est protégé(e) par le Moine`, `${t.name} is protected by the Monk`), text: L('Personne ne meurt cette nuit.', 'Nobody dies tonight.') }
          : { key: `monk:${t.id}`, tone: 'mal', title: L(`Le Moine qui protège ${t.name} est ivre ou empoisonné`, `The Monk protecting ${t.name} is drunk or poisoned`), text: L('Sa protection est sans effet.', 'Their protection has no effect.') });
      }
      break;
    }
  }
  // Undertaker / Ravenkeeper: the Drunk's card is "Drunk", not what they thought they were.
  const shown = step.role === 'undertaker' ? byId(g, g.executedToday) : step.role === 'ravenkeeper' ? byId(g, data.targets[0]) : undefined;
  if (shown?.role === 'drunk') {
    out.push({ key: `drunkshown:${shown.id}`, tone: 'amb', title: L(`${shown.name} est l’Ivrogne`, `${shown.name} is the Drunk`),
      text: L('Montrez la carte Ivrogne, pas le personnage qu’il croyait avoir (sauf si vous donnez une info fausse).', 'Show the Drunk card, not the character they thought they had (unless giving false info).') });
  }
  return out;
}

/** What happens if `targetId` is executed now. */
export function executionAlerts(g: Game, targetId: string | null | undefined): Alert[] {
  const t = byId(g, targetId);
  if (!t?.alive) return [];
  const out: Alert[] = [];
  if (t.role === 'saint') {
    out.push(isImpaired(t)
      ? { key: 'saint', tone: 'amb', title: L(`${t.name} est le Saint, mais ivre ou empoisonné`, `${t.name} is the Saint, but drunk or poisoned`), text: L('Son exécution ne fait pas perdre le Bien.', 'Their execution does not make Good lose.') }
      : { key: 'saint', tone: 'mal', title: L(`${t.name} est le Saint`, `${t.name} is the Saint`), text: L('S’il est exécuté, le Mal gagne immédiatement.', 'If executed, Evil wins immediately.') });
  }
  if (teamOf(t) === 'demon') {
    const sw = g.players.find((p) => p.role === 'scarletwoman' && p.alive && !isImpaired(p));
    out.push(sw && aliveCount(g) >= 5
      ? { key: 'demon', tone: 'mal', title: L(`${t.name} est le Démon… mais la Succube est en vie`, `${t.name} is the Demon… but the Scarlet Woman lives`),
        text: L(`${sw.name} (Succube) devient le Démon : la partie continue. Réveillez-la cette nuit.`, `${sw.name} (Scarlet Woman) becomes the Demon: the game goes on. Wake her tonight.`) }
      : { key: 'demon', tone: 'bon', title: L(`${t.name} est le Démon`, `${t.name} is the Demon`), text: L('S’il meurt, le Bien gagne.', 'If they die, Good wins.') });
  }
  return out;
}

/** Ending the day without an execution. */
export function noExecutionAlerts(g: Game): Alert[] {
  const out: Alert[] = [];
  const mayor = g.players.find((p) => p.role === 'mayor' && p.alive && !isImpaired(p));
  if (mayor && aliveAll(g) === 3) {
    out.push({ key: 'mayor', tone: 'bon', title: L('3 vivants, pas d’exécution, le Maire est en vie', '3 alive, no execution, the Mayor lives'), text: L('Le Bien gagne.', 'Good wins.') });
  }
  return out;
}

/** Ending the day with nominations nobody voted on. */
export function unvotedAlerts(g: Game): Alert[] {
  const left = (g.day?.nominations ?? []).filter((n) => n.total === null);
  if (!left.length) return [];
  return [{ key: 'unvoted', tone: 'amb', title: L(`${left.length} nomination(s) sans vote`, `${left.length} nomination(s) not voted on`),
    text: L(`${left.map((n) => nameOf(g, n.nominee)).join(', ')} : le vote n’a pas été compté.`, `${left.map((n) => nameOf(g, n.nominee)).join(', ')}: the vote was not counted.`) }];
}

