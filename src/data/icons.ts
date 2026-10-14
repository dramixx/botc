// Icon themes for the characters, switchable from the game menu (choice kept in localStorage).
import { useEffect, useState } from 'preact/hooks';
import { CLASSIC_ICONS } from './icons-classic';
import { ILLUSTRATED_ICONS } from './icons-illustrated';
import type { L10n, RoleId } from './roles';

export type IconTheme = 'classic' | 'illustrated';

export const ICON_THEMES: Record<IconTheme, { name: L10n; icons: Record<RoleId, string> }> = {
  classic: { name: { fr: 'Classique', en: 'Classic' }, icons: CLASSIC_ICONS },
  illustrated: { name: { fr: 'Illustré', en: 'Illustrated' }, icons: ILLUSTRATED_ICONS },
};

const KEY = 'botc.icons';

function initial(): IconTheme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && saved in ICON_THEMES) return saved as IconTheme;
  } catch { /* ignore */ }
  return 'classic';
}

let theme: IconTheme = initial();
const listeners = new Set<() => void>();

export const getIconTheme = () => theme;
export function setIconTheme(t: IconTheme) {
  theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  for (const f of listeners) f();
}

export function useIconTheme(): IconTheme {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return theme;
}

export const roleIconMarkup = (role: RoleId) => ICON_THEMES[theme].icons[role];
