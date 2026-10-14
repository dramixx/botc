import type { RoleId } from '../data/roles';

// What the circle should emphasise on top of the raw game state (set by the active panel).
export type Tone = 'bon' | 'mal' | 'amb' | 'neu';

export interface Link {
  from: string;
  to: string;
  tone: Tone;
  label?: string;
  dashed?: boolean;
  op?: number;
}

/** Mini reminder token next to a player: a character's earlier actions on them, one entry per night (and what was shown). */
export interface TrailMark {
  role: RoleId;
  nights: { night: number; text?: string; flag?: 'impaired' | 'lie' }[];
}

export interface Overlay {
  /** Player id → badge text. Everyone else is dimmed. */
  hl?: Record<string, string>;
  links?: Link[];
  /** Player id → mini reminder tokens (earlier nights). */
  trail?: Record<string, TrailMark[]>;
  /** Replaces the centre text: [title, subtitle, pill]. */
  center?: [string, string, string?];
  /** Keep the players without a badge at full opacity (selection rather than focus). */
  noDim?: boolean;
  /** Players shown faded whatever the badges (already done, e.g. character seen at the hand-out). */
  faded?: string[];
  /** Dim the whole circle (journal, reference...). */
  dim?: boolean;
}

/** Handler a panel registers so that taps on the circle drive it. Returns true when handled. */
export type TapHandler = (id: string) => boolean;
