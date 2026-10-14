import { useState } from 'preact/hooks';
import { ROLES, type RoleId, type Team } from '../data/roles';
import { ROLE_ADVANCED } from '../data/handout';
import { wakeRole } from '../game/engine';
import type { Game, LogEntry } from '../game/types';
import { T, TEAM_NAMES, loc, roleName } from '../i18n';
import { type PanelCtx, useOverlay } from './hooks';
import { RoleIcon, roleSide } from './ui';

const isHeader = (e: LogEntry) => e.text.fr.startsWith('🌙') || e.text.fr.startsWith('☀');
const phaseName = (e: Pick<LogEntry, 'phase' | 'num'>) =>
  e.phase === 'setup' ? T('Préparation', 'Setup') : e.phase === 'night' ? `${T('Nuit', 'Night')} ${e.num}` : e.phase === 'day' ? `${T('Jour', 'Day')} ${e.num}` : T('Fin', 'End');

/** Log entries grouped by phase, key events in amber. */
export function LogList(props: { game: Game; onlyKey?: boolean }) {
  const groups: { name: string; items: LogEntry[] }[] = [];
  for (const e of props.game.log) {
    if (isHeader(e) || (props.onlyKey && !e.important)) continue;
    const name = phaseName(e);
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(e);
    else groups.push({ name, items: [e] });
  }
  return (
    <div class="log">
      {groups.map((gr, i) => (
        <div key={i} class="log-group">
          <div class="eyebrow">{gr.name.toUpperCase()}</div>
          {gr.items.map((e) => (
            <div key={e.id} class={`log-item ${e.important ? 'key' : ''}`}><i /><span>{loc(e.text)}</span></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function JournalPanel(props: { game: Game; ctx: PanelCtx; onClose: () => void }) {
  const [onlyKey, setOnlyKey] = useState(false);
  useOverlay(props.ctx, { dim: true });
  return (
    <div class="panel-col journal">
      <div class="between"><h2 class="panel-title">{T('Journal', 'Log')}</h2><button type="button" class="icon-btn" aria-label={T('Fermer', 'Close')} onClick={props.onClose}>×</button></div>
      <div class="row">
        <button type="button" class={`filter ${!onlyKey ? 'on' : ''}`} onClick={() => setOnlyKey(false)}>{T('Tout', 'All')}</button>
        <button type="button" class={`filter ${onlyKey ? 'on' : ''}`} onClick={() => setOnlyKey(true)}>{T('Événements clés', 'Key events')}</button>
      </div>
      <div class="journal-body"><LogList game={props.game} onlyKey={onlyKey} /></div>
    </div>
  );
}

type Filter = 'all' | 'inplay' | 'townsfolk' | 'outsider' | 'evil' | 'traveller';

/** Full-screen list of the characters with their abilities. */
export function Reference(props: { game: Game; onClose: () => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const inPlay = new Set<RoleId>(props.game.players.flatMap((p) => [p.role, wakeRole(p)]));
  const roles = Object.values(ROLES).filter((r) => {
    switch (filter) {
      case 'all': return true;
      case 'inplay': return inPlay.has(r.id);
      case 'evil': return r.team === 'minion' || r.team === 'demon';
      default: return r.team === filter;
    }
  });
  const filters: [Filter, string][] = [['all', T('Tous', 'All')], ['inplay', T('En jeu', 'In play')], ['townsfolk', loc(TEAM_NAMES.townsfolk)], ['outsider', loc(TEAM_NAMES.outsider)], ['evil', T('Maléfiques', 'Evil')], ['traveller', loc(TEAM_NAMES.traveller)]];
  const teamLabel = (t: Team) => loc(TEAM_NAMES[t]).toUpperCase();
  return (
    <div class="reference">
      <header class="ref-bar">
        <button type="button" class="btn sm" onClick={props.onClose}>← Grimoire</button>
        <span class="serif lg">Trouble Brewing</span>
        <div class="grow" />
        <div class="row wrap">{filters.map(([f, label]) => <button type="button" key={f} class={`filter ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{label}</button>)}</div>
      </header>
      <div class="ref-grid">
        {roles.map((r) => (
          <div key={r.id} class={`ref-card tone-${roleSide(r.id)}`}>
            <span class="ref-ico"><RoleIcon role={r.id} size={24} /></span>
            <div class="ref-text">
              <div class="between"><span class="serif lg ref-name">{roleName(r.id)}</span><span class="mono small muted">{teamLabel(r.team)}</span></div>
              <span class="ref-ability">{loc(r.ability)}</span>
              <details class="ho-tip">
                <summary>{T('Conseil avancé', 'Advanced tip')}</summary>
                <p>{loc(ROLE_ADVANCED[r.id])}</p>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
