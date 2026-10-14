import type { RoleId } from '../data/roles';
import { nameOf, nightHistory, type HistoryEntry } from '../game/engine';
import type { Game } from '../game/types';
import { T, loc, roleName } from '../i18n';
import type { TrailMark } from './overlay';
import { roleSide } from './ui';

/** Earlier steps as mini reminder tokens on the circle: on each player pointed at (or on the character itself for a number). */
export function historyTrail(entries: HistoryEntry[]): Record<string, TrailMark[]> {
  const trail: Record<string, TrailMark[]> = {};
  for (const e of entries) {
    const d = e.data;
    const add = (id: string | undefined, text?: string) => {
      if (!id) return;
      const flag = d.lie ? 'lie' : d.impaired ? 'impaired' : undefined;
      if (!trail[id]) trail[id] = [];
      let mark = trail[id].find((m) => m.role === e.role);
      if (!mark) { mark = { role: e.role, nights: [] }; trail[id].push(mark); }
      mark.nights.push({ night: e.night, ...(text !== undefined && { text }), ...(flag && { flag }) });
    };
    switch (e.role) {
      case 'washerwoman': case 'librarian': case 'investigator':
        if (d.role) for (const t of d.targets) add(t, roleName(d.role));
        else add(e.playerId, '0');
        break;
      case 'chef': case 'empath': add(e.playerId, String(d.value ?? '?')); break;
      case 'fortuneteller': for (const t of d.targets) add(t, d.value ? T('oui', 'yes') : T('non', 'no')); break;
      case 'undertaker': case 'ravenkeeper': if (d.role) add(d.targets[0], roleName(d.role)); break;
      case 'imp': if (d.value !== true) add(d.targets[0]); break;
      case 'spy': case 'scarletwoman': break;
      default: for (const t of d.targets) add(t);
    }
  }
  return trail;
}

/** One line per earlier step: what the character chose or was told. */
export function summary(g: Game, e: HistoryEntry) {
  const d = e.data;
  const names = d.targets.map((t) => nameOf(g, t));
  const shown = (r: RoleId | null | undefined) => (r ? <b class={`tone-${roleSide(r)} hist-role`}>{roleName(r)}</b> : <b>0</b>);
  switch (e.role) {
    case 'washerwoman': case 'librarian': case 'investigator':
      return d.role ? <>{names.join(', ')} → {shown(d.role)}</> : <>→ <b>0</b></>;
    case 'chef': case 'empath':
      return <>→ <b>{String(d.value ?? '?')}</b></>;
    case 'fortuneteller':
      return names.length ? <>{names.join(' + ')} → <b class={d.value ? 'tone-bon hist-role' : 'tone-mal hist-role'}>{d.value ? T('OUI', 'YES') : T('NON', 'NO')}</b></> : null;
    case 'undertaker': case 'ravenkeeper':
      return d.role ? <>{names[0] ?? ''} → {shown(d.role)}</> : null;
    case 'imp':
      if (d.value === true) return <>{T('devient le Diable', 'becomes the Imp')}</>;
      return names.length ? <>→ <b>{names[0]}</b>{d.result ? <span class="muted"> · {loc(d.result)}</span> : null}</> : null;
    case 'spy': return <>{T('a vu le Grimoire', 'saw the Grimoire')}</>;
    case 'scarletwoman': return <>{T('devient le Diable', 'becomes the Imp')}</>;
    default:
      return names.length ? <>→ <b>{names.join(', ')}</b></> : null;
  }
}

/**
 * What was already pointed at or told in earlier steps, with small flags (drunk/poisoned, false info).
 * With `role`: that character's earlier nights (night steps). With `playerId`: everything that player did (player sheet).
 */
export function NightHistory(props: { game: Game; role?: RoleId; playerId?: string; pastOnly?: boolean; title?: string }) {
  const g = props.game;
  const entries = nightHistory(g, { role: props.role, playerId: props.playerId, pastOnly: props.pastOnly });
  if (!entries.length) return null;
  const players = new Set(entries.map((e) => e.playerId));
  return (
    <details class="history" open>
      <summary>
        <span class="eyebrow">{props.title ?? T('DÉJÀ DONNÉ', 'ALREADY GIVEN')}</span>
        <span class="hist-count mono">{entries.length}</span>
      </summary>
      <div class="hist-list">
        {entries.map((e) => {
          const what = summary(g, e);
          return (
            <div key={`${e.night}:${e.key}`} class="hist-row">
              <span class="hist-n mono">{T('N', 'N')}{e.night}</span>
              <span class="hist-what">
                {props.playerId && <span class="hist-who">{roleName(e.role)} · </span>}
                {!props.playerId && players.size > 1 && <span class="hist-who">{nameOf(g, e.playerId)} · </span>}
                {what ?? <span class="muted">{T('passé', 'skipped')}</span>}
              </span>
              <span class="hist-flags">
                {e.data.impaired && <span class="hist-flag warn" title={T('Ivre ou empoisonné', 'Drunk or poisoned')}>{T('ivre/emp.', 'drunk/pois.')}</span>}
                {e.data.lie && <span class="hist-flag lie" title={T('Info fausse donnée', 'False info given')}>{T('fausse', 'false')}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </details>
  );
}
