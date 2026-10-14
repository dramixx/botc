// Full-screen cards handed to a player: privacy screen, role reveal, night information.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { NIGHT_STAR, ROLE_EXAMPLES, ROLE_TIPS, hasNightStar } from '../data/handout';
import { ROLES, type RoleId } from '../data/roles';
import { revealOf } from '../game/engine';
import type { Player } from '../game/types';
import { T, loc, roleName } from '../i18n';
import type { Tone } from './overlay';
import { RoleIcon, sideOf, teamTone } from './ui';

export interface CardContent {
  /** Name of the player the iPad is handed to: a privacy screen (hold to reveal) comes first. */
  handTo?: string;
  /** Role reveal layout: "<name>, you are" + the character + its ability. */
  reveal?: { role: RoleId; alignment: 'good' | 'evil' };
  title?: string;
  eyebrow?: string;
  eyebrowTone?: Tone;
  roles?: RoleId[];
  players?: string[];
  number?: number;
  yesno?: boolean;
  text?: string;
  /** Called once the player has revealed the card (not if the storyteller cancels). */
  onReveal?: () => void;
}

let current: CardContent | null = null;
const listeners = new Set<() => void>();

export function showCard(c: CardContent) {
  current = c;
  for (const l of listeners) l();
}
function close() {
  current = null;
  for (const l of listeners) l();
}

const HOLD_MS = 450;
const revealSize = (len: number) => (len <= 6 ? 84 : len <= 9 ? 60 : len <= 12 ? 40 : 32);

function teamLine(role: RoleId, alignment: 'good' | 'evil') {
  const team = ROLES[role].team;
  const name = { townsfolk: T('VILLAGEOIS', 'TOWNSFOLK'), outsider: T('ÉTRANGER', 'OUTSIDER'), minion: T('SBIRE', 'MINION'), demon: T('DÉMON', 'DEMON'), traveller: T('VOYAGEUR', 'TRAVELLER') }[team];
  return `${name} · ${alignment === 'good' ? T('ÉQUIPE DU BIEN', 'GOOD TEAM') : T('ÉQUIPE DU MAL', 'EVIL TEAM')}`;
}

/** Shows a player their own character (distribution, or later on request). */
export function revealRole(p: Player, onReveal?: () => void) {
  showCard({ handTo: p.name, reveal: revealOf(p), onReveal });
}

export function ShowCardHost() {
  const [, force] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [holding, setHolding] = useState(false);
  const timer = useRef<number>();
  useEffect(() => {
    const l = () => { setRevealed(false); setHolding(false); force((n) => n + 1); };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  if (!current) return null;
  const c = current;

  const reveal = () => { window.clearTimeout(timer.current); setHolding(false); setRevealed(true); c.onReveal?.(); };
  const start = () => { setHolding(true); window.clearTimeout(timer.current); timer.current = window.setTimeout(reveal, HOLD_MS); };
  const stop = () => { window.clearTimeout(timer.current); setHolding(false); };

  if (c.handTo && !revealed) {
    return (
      <div class="showcard privacy">
        <button type="button" class="showcard-back" onClick={close}>{T('Conteur · retour', 'Storyteller · back')}</button>
        <div class="showcard-hand">
          <div class="showcard-lead">{T('Passe l’iPad à', 'Hand the iPad to')}</div>
          <div class="showcard-name">{c.handTo}</div>
        </div>
        <button type="button" class={`hold ${holding ? 'holding' : ''}`} aria-label={T('Maintenir pour révéler', 'Hold to reveal')}
          onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') reveal(); }} onContextMenu={(e) => e.preventDefault()}>
          <span class="hold-inner">{c.handTo},<br />{T('maintiens', 'hold')}<br />{T('ici', 'here')}</span>
        </button>
        <div class="showcard-hint">{T('Vérifie que personne d’autre ne regarde l’écran.', 'Make sure nobody else is looking at the screen.')}</div>
      </div>
    );
  }

  if (c.reveal) {
    return (
      <RoleReveal name={c.handTo} role={c.reveal.role} alignment={c.reveal.alignment}>
        <button type="button" class="btn lg showcard-done" onClick={close}>{T('J’ai vu · rendre l’iPad au Conteur', 'Seen · hand the iPad back')}</button>
      </RoleReveal>
    );
  }

  const single = c.players?.length === 1 && !c.roles?.length && c.eyebrow;
  return (
    <div class="showcard info">
      {c.eyebrow && <div class={`showcard-eyebrow tone-${c.eyebrowTone ?? 'neu'}`}>{c.eyebrow}</div>}
      {c.title && <div class="showcard-lead">{c.title}</div>}
      {single && <div class="showcard-name huge">{c.players![0]}</div>}
      {!single && c.players && c.players.length > 0 && <div class="showcard-chips">{c.players.map((p) => <span key={p} class="showcard-chip">{p}</span>)}</div>}
      {c.roles && c.roles.length > 0 && (
        <div class="showcard-roles">
          {c.roles.map((r) => (
            <div key={r} class={`big-role tone-${teamTone(ROLES[r].team)}`}><RoleIcon role={r} size={34} /><span>{roleName(r)}</span></div>
          ))}
        </div>
      )}
      {c.number !== undefined && <div class="showcard-number">{c.number}</div>}
      {c.yesno !== undefined && <div class={`showcard-yesno ${c.yesno ? 'yes' : 'no'}`}>{c.yesno ? T('OUI', 'YES') : T('NON', 'NO')}</div>}
      {c.text && <div class="showcard-text">{c.text}</div>}
      <button type="button" class="btn dark showcard-done" onClick={close}>{T('Rendre au Conteur', 'Hand back to the Storyteller')}</button>
    </div>
  );
}

/** "<name>, you are" + the character, its ability, an example and a tip (on the iPad, or on the player's own phone). */
export function RoleReveal(props: { name?: string; role: RoleId; alignment: 'good' | 'evil'; children?: ComponentChildren }) {
  const r = ROLES[props.role];
  const side = sideOf(r.team, props.alignment);
  return (
    <div class={`showcard reveal tone-${side}`}>
      <div class="showcard-lead">{props.name}, {T('tu es', 'you are')}</div>
      <div class="reveal-disc" style={{ '--rs': `${revealSize(roleName(props.role).length)}px` }}><RoleIcon role={props.role} size={44} /><span>{roleName(props.role)}</span></div>
      <div class="reveal-info">
        <div class="reveal-team">{teamLine(props.role, props.alignment)}</div>
        <div class="reveal-ability">{loc(r.ability)}</div>
        {hasNightStar(r.ability) && <div class="reveal-star">{loc(NIGHT_STAR)}</div>}
      </div>
      <div class="reveal-help">
        <div><b>{T('Exemple', 'Example')}</b><span>{loc(ROLE_EXAMPLES[props.role])}</span></div>
        <div><b>{T('Conseil', 'Tip')}</b><span>{loc(ROLE_TIPS[props.role])}</span></div>
      </div>
      {props.children}
    </div>
  );
}
