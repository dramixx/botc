import { useEffect, useState } from 'preact/hooks';
import { ROLES, type L10n, type RoleId, type Team } from './data/roles';

export type Lang = 'fr' | 'en';
const KEY = 'botc.lang';

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch { /* ignore */ }
  return navigator.language?.startsWith('en') ? 'en' : 'fr';
}

let lang: Lang = initial();
const listeners = new Set<() => void>();

export const getLang = () => lang;
export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  document.documentElement.lang = l;
  for (const f of listeners) f();
}

export function useLang(): Lang {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return lang;
}

/** Inline translation: T('Bonjour', 'Hello'). */
export const T = (fr: string, en: string) => (lang === 'fr' ? fr : en);
/** Localised value. */
export const loc = (v: L10n | null | undefined) => (v ? v[lang] : '');
export const roleName = (id: RoleId | null | undefined) => (id ? ROLES[id].name[lang] : '—');

export const TEAM_NAMES: Record<Team, L10n> = {
  townsfolk: { fr: 'Villageois', en: 'Townsfolk' },
  outsider: { fr: 'Étrangers', en: 'Outsiders' },
  minion: { fr: 'Sbires', en: 'Minions' },
  demon: { fr: 'Démon', en: 'Demon' },
  traveller: { fr: 'Voyageurs', en: 'Travellers' },
};
