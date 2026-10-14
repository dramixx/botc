import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { roleIconMarkup } from '../data/icons';
import { ROLES, type RoleId, type Team } from '../data/roles';
import { isTraveller } from '../game/engine';
import type { Game, Player } from '../game/types';
import { T, roleName } from '../i18n';
import type { Tone } from './overlay';

export const TONE_VAR: Record<Tone, string> = { bon: 'var(--good)', mal: 'var(--evil)', amb: 'var(--amber)', neu: 'var(--neutral)' };

/** Colour of a character's side. */
export const sideOf = (team: Team, alignment?: 'good' | 'evil'): 'bon' | 'mal' =>
  alignment ? (alignment === 'good' ? 'bon' : 'mal') : team === 'minion' || team === 'demon' ? 'mal' : 'bon';
export type TeamTone = 'bon' | 'mal' | 'out' | 'min' | 'dem' | 'trv';
/** Colour class of a character's team: blue Townsfolk, teal Outsiders, orange Minions, deep-red Demon, violet Travellers. */
export const teamTone = (team: Team): TeamTone =>
  team === 'outsider' ? 'out' : team === 'minion' ? 'min' : team === 'demon' ? 'dem' : team === 'traveller' ? 'trv' : 'bon';
export const roleSide = (role: RoleId) => teamTone(ROLES[role].team);

export function RoleIcon(props: { role: RoleId; size?: number }) {
  const s = props.size ?? 20;
  return (
    <svg
      class="ri" width={s} height={s} viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: roleIconMarkup(props.role) }}
    />
  );
}

export const Eyebrow = (props: { children: ComponentChildren; tone?: Tone }) => (
  <div class={`eyebrow ${props.tone ? `tone-${props.tone}` : ''}`}>{props.children}</div>
);

/** Centered dialog (default), bottom sheet or side drawer, over a dimmed backdrop. */
export function Modal(props: {
  title?: string; eyebrow?: string; eyebrowTone?: Tone; onClose: () => void; children: ComponentChildren;
  variant?: 'center' | 'sheet' | 'drawer'; wide?: boolean;
}) {
  const v = props.variant ?? 'center';
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') props.onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div class={`backdrop ${v}`} onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
      <div class={`modal ${v} ${props.wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        {v === 'sheet' && <div class="grab" />}
        {props.eyebrow && <Eyebrow tone={props.eyebrowTone}>{props.eyebrow}</Eyebrow>}
        {props.title && <h2 class="modal-title">{props.title}</h2>}
        {props.children}
      </div>
    </div>
  );
}

export function Switch(props: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={props.on} aria-label={props.label} disabled={props.disabled}
      class={`switch ${props.on ? 'on' : ''}`} onClick={() => props.onChange?.(!props.on)}><span /></button>
  );
}

export function Seg<V extends string>(props: { options: { v: V; label: string; tone?: Tone }[]; value: V; onChange: (v: V) => void; small?: boolean }) {
  return (
    <div class={`seg ${props.small ? 'small' : ''}`} role="group">
      {props.options.map((o) => (
        <button key={o.v} type="button" class={`${props.value === o.v ? 'on' : ''} ${o.tone ? `tone-${o.tone}` : ''}`} onClick={() => props.onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

// --- toasts (with undo) -------------------------------------------------------

interface ToastItem { id: number; text: string; undo?: () => void }
let toasts: ToastItem[] = [];
let toastSeq = 0;
const toastListeners = new Set<() => void>();
const emitToasts = () => { for (const l of toastListeners) l(); };

export function toast(text: string, undo?: () => void) {
  const id = ++toastSeq;
  toasts = [...toasts.slice(-1), { id, text, undo }];
  emitToasts();
  window.setTimeout(() => dismissToast(id), 6000);
}
function dismissToast(id: number) { toasts = toasts.filter((t) => t.id !== id); emitToasts(); }

export function ToastHost() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    toastListeners.add(l);
    return () => { toastListeners.delete(l); };
  }, []);
  if (!toasts.length) return null;
  return (
    <div class="toasts" role="status">
      {toasts.map((t) => (
        <div key={t.id} class="toast">
          <span>{t.text}</span>
          {t.undo && <button type="button" class="btn amber sm" onClick={() => { t.undo!(); dismissToast(t.id); }}>{T('Annuler', 'Undo')}</button>}
        </div>
      ))}
    </div>
  );
}

// --- pickers ------------------------------------------------------------------

/** Grid of players to pick `max` targets from. */
export function PlayerPicker(props: {
  game: Game; value: string[]; onChange: (ids: string[]) => void; max?: number; exclude?: string[];
  filter?: (p: Player) => boolean; disabled?: (p: Player) => string | false | undefined; cols?: 2 | 3;
  /** Small caption under a player's name (e.g. the red herring), shown in amber. */
  sub?: (p: Player) => string | false | undefined;
}) {
  const max = props.max ?? 1;
  const toggle = (id: string) => {
    if (props.value.includes(id)) props.onChange(props.value.filter((v) => v !== id));
    else if (max === 1) props.onChange([id]);
    else if (props.value.length < max) props.onChange([...props.value, id]);
    else props.onChange([...props.value.slice(1), id]);
  };
  return (
    <div class={`picker cols-${props.cols ?? 3}`}>
      {props.game.players
        .filter((p) => !props.exclude?.includes(p.id) && (!props.filter || props.filter(p)))
        .map((p) => {
          const off = props.disabled?.(p);
          return (
            <button type="button" key={p.id} disabled={!!off}
              class={`pick ${props.value.includes(p.id) ? 'on' : ''} ${p.alive ? '' : 'dead'}`} onClick={() => toggle(p.id)}>
              <span class="pick-name">{p.name}{isTraveller(p) ? ' ✈' : ''}</span>
              {off ? <span class="pick-sub">{off}</span> : props.sub?.(p) ? <span class="pick-sub flag">{props.sub(p)}</span> : !p.alive ? <span class="pick-sub">{T('mort', 'dead')}</span> : null}
            </button>
          );
        })}
    </div>
  );
}

export function RoleChip(props: { role: RoleId; selected?: boolean; sub?: string; onClick?: () => void; dim?: boolean }) {
  const side = roleSide(props.role);
  return (
    <button type="button" class={`role-chip tone-${side} ${props.selected ? 'on' : ''} ${props.dim ? 'dim' : ''}`} onClick={props.onClick} disabled={!props.onClick}>
      <RoleIcon role={props.role} size={20} />
      <span class="role-chip-text">
        <span class="role-chip-name">{roleName(props.role)}</span>
        {props.sub && <span class="role-chip-sub">{props.sub}</span>}
      </span>
    </button>
  );
}

/** Pick one character among a list. */
export function RolePicker(props: { roles: RoleId[]; value: RoleId | null | undefined; onChange: (r: RoleId) => void }) {
  return (
    <div class="role-picker">
      {props.roles.map((r) => <RoleChip key={r} role={r} selected={props.value === r} onClick={() => props.onChange(r)} />)}
    </div>
  );
}

export function playerLabel(p: Player) {
  return `${p.name}${isTraveller(p) ? ' ✈' : ''}`;
}
