import type { L10n, RoleId } from '../data/roles';
import { loc, roleName } from '../i18n';
import type { Marker, MarkerKey } from '../game/types';
import type { Tone } from './overlay';

/** `role`: the character whose reminder token it is (its icon is drawn on the token, as in the physical Grimoire). */
export const MARKERS: Record<MarkerKey, { label: L10n; tone: Tone; source: L10n; role?: RoleId }> = {
  poisoned: { label: { fr: 'Empoisonné', en: 'Poisoned' }, tone: 'mal', source: { fr: 'Empoisonneur', en: 'Poisoner' } },
  protected: { label: { fr: 'Protégé', en: 'Safe' }, tone: 'bon', source: { fr: 'Moine', en: 'Monk' } },
  master: { label: { fr: 'Maître', en: 'Master' }, tone: 'neu', source: { fr: 'Majordome', en: 'Butler' } },
  redherring: { label: { fr: 'Faux positif', en: 'Red herring' }, tone: 'neu', source: { fr: 'Voyante', en: 'Fortune Teller' } },
  diedtonight: { label: { fr: 'Mort cette nuit', en: 'Died tonight' }, tone: 'mal', source: { fr: 'Imp', en: 'Imp' } },
  executed: { label: { fr: 'Exécuté aujourd’hui', en: 'Executed today' }, tone: 'neu', source: { fr: 'Conteur', en: 'Storyteller' } },
  used: { label: { fr: 'Capacité utilisée', en: 'Ability used' }, tone: 'neu', source: { fr: 'Vierge / Pourfendeur', en: 'Virgin / Slayer' } },
  threevotes: { label: { fr: 'Vote ×3', en: 'Vote ×3' }, tone: 'amb', source: { fr: 'Bureaucrate', en: 'Bureaucrat' } },
  negvote: { label: { fr: 'Vote −1', en: 'Vote −1' }, tone: 'amb', source: { fr: 'Voleur', en: 'Thief' } },
  drunk: { label: { fr: 'Ivre', en: 'Drunk' }, tone: 'neu', source: { fr: 'Conteur', en: 'Storyteller' } },
  wwtownsfolk: { label: { fr: 'Villageois', en: 'Townsfolk' }, tone: 'bon', source: { fr: 'Lavandière', en: 'Washerwoman' }, role: 'washerwoman' },
  wwwrong: { label: { fr: 'Faux', en: 'Wrong' }, tone: 'neu', source: { fr: 'Lavandière', en: 'Washerwoman' }, role: 'washerwoman' },
  liboutsider: { label: { fr: 'Étranger', en: 'Outsider' }, tone: 'bon', source: { fr: 'Bibliothécaire', en: 'Librarian' }, role: 'librarian' },
  libwrong: { label: { fr: 'Faux', en: 'Wrong' }, tone: 'neu', source: { fr: 'Bibliothécaire', en: 'Librarian' }, role: 'librarian' },
  invminion: { label: { fr: 'Sbire', en: 'Minion' }, tone: 'mal', source: { fr: 'Enquêteur', en: 'Investigator' }, role: 'investigator' },
  chefpair: { label: { fr: 'Paire', en: 'Pair' }, tone: 'mal', source: { fr: 'Cuisinier', en: 'Chef' }, role: 'chef' },
  invwrong: { label: { fr: 'Faux', en: 'Wrong' }, tone: 'neu', source: { fr: 'Enquêteur', en: 'Investigator' }, role: 'investigator' },
};

/** Label of a marker on the table: the exact character for a ping reminder ("Saint"), else the generic label. */
export function markerLabel(m: Marker): string {
  return m.shows ? roleName(m.shows) : loc(MARKERS[m.key].label);
}

export const MARKER_KEYS = Object.keys(MARKERS) as MarkerKey[];
