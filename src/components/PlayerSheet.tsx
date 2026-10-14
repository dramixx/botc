import { useState } from 'preact/hooks';
import { ROLES, rolesOfTeam, type Team } from '../data/roles';
import {
  addMarker, byId, isImpaired, isTraveller, killPlayer, L, log, movePlayer, nightHistory, notInPlay, removeMarkers, revivePlayer, setRole,
} from '../game/engine';
import { undo, update } from '../game/store';
import type { Game, MarkerKey } from '../game/types';
import { T, TEAM_NAMES, loc, roleName } from '../i18n';
import { standingLinks } from './Circle';
import { NightHistory, historyTrail } from './History';
import { type PanelCtx, useOverlay } from './hooks';
import { MARKERS, MARKER_KEYS } from './markers';
import { revealRole } from './ShowCard';
import { Modal, RoleIcon, RolePicker, Seg, roleSide, teamTone, toast } from './ui';

export function PlayerSheet(props: { game: Game; id: string; ctx: PanelCtx; onClose: () => void }) {
  const g = props.game;
  const p = byId(g, props.id);
  const [dlg, setDlg] = useState<null | 'role' | 'believed' | 'marker' | 'rename' | 'seat'>(null);
  useOverlay(props.ctx, {
    hl: { [props.id]: T('Fiche ouverte', 'Sheet open') },
    links: standingLinks(g).map((l) => ({ ...l, op: 0.35 })),
    trail: historyTrail(nightHistory(g, { playerId: props.id })),
  });
  if (!p) return null;
  const role = ROLES[p.role];
  const seat = g.players.indexOf(p) + 1;
  const edit = (fn: (q: NonNullable<ReturnType<typeof byId>>, d: Game) => void) =>
    update((d) => { const q = byId(d, p.id); if (q) fn(q, d); });

  const removeMarker = (key: MarkerKey) => {
    edit((q) => { q.markers = q.markers.filter((m) => m.key !== key); });
    toast(T(`Marqueur « ${loc(MARKERS[key].label)} » retiré de ${p.name}`, `Reminder “${loc(MARKERS[key].label)}” removed from ${p.name}`), undo);
  };
  const addMarkerKey = (key: MarkerKey) => edit((q, d) => {
    if (key === 'redherring') removeMarkers(d, (m) => m.key === 'redherring');
    addMarker(q, key);
  });

  return (
    <div class="panel-col sheet">
      <div class="between">
        <div class="stack-xs"><span class="mono muted small">{T('PLACE', 'SEAT')} {String(seat).padStart(2, '0')}</span><h2 class="panel-title xl">{p.name}</h2></div>
        <button type="button" class="icon-btn" aria-label={T('Fermer', 'Close')} onClick={props.onClose}>×</button>
      </div>

      <button type="button" class={`field-btn big tone-${teamTone(role.team)}`} onClick={() => setDlg('role')}>
        <span class="serif lg"><RoleIcon role={p.role} size={22} /> {roleName(p.role)}</span>
        <span class="muted">{loc(TEAM_NAMES[role.team])} · {T('changer', 'change')} ▾</span>
      </button>
      {p.role === 'drunk' && (
        <button type="button" class="row-line btn-row" onClick={() => setDlg('believed')}><span>{T('Croit être', 'Thinks they are')} <b>{roleName(p.believedRole)}</b></span><span class="muted">{T('changer', 'change')} ▾</span></button>
      )}
      {isImpaired(p) && p.role !== 'drunk' && <div class="banner warn small"><b class="mono">!</b><span>{T('Ivre / empoisonné : sa capacité ne fonctionne pas.', 'Drunk / poisoned: their ability does not work.')}</span></div>}

      {role.team === 'demon' && g.bluffs.length > 0 && (
        <div class="stack-xs">
          <div class="eyebrow">{T('BLUFFS DU DÉMON', 'DEMON BLUFFS')}</div>
          <div class="chips-row">{g.bluffs.map((b) => <span key={b} class={`bluff tone-${roleSide(b)}`}>{roleName(b)}</span>)}</div>
        </div>
      )}

      <div class="grid-2 tight">
        <Seg value={p.alignment} onChange={(a) => edit((q, d) => { q.alignment = a; log(d, a === 'good' ? L(`${q.name} devient Bon.`, `${q.name} becomes good.`) : L(`${q.name} devient Maléfique.`, `${q.name} becomes evil.`)); })}
          options={[{ v: 'good', label: T('Bon', 'Good'), tone: 'bon' }, { v: 'evil', label: T('Maléfique', 'Evil'), tone: 'mal' }]} />
        <Seg value={p.alive ? 'alive' : 'dead'} onChange={(v) => {
          if (v === 'dead' && p.alive) { edit((_q, d) => killPlayer(d, p.id, 'manual')); toast(T(`${p.name} est mort(e)`, `${p.name} died`), undo); }
          if (v === 'alive' && !p.alive) edit((_q, d) => revivePlayer(d, p.id));
        }} options={[{ v: 'alive', label: T('Vivant', 'Alive') }, { v: 'dead', label: T('Mort', 'Dead') }]} />
      </div>
      {p.alive
        ? <div class="row-line dim"><span>{T('Vote fantôme', 'Ghost vote')}</span><span>{T('disponible à la mort', 'available on death')}</span></div>
        : <button type="button" class="row-line btn-row" onClick={() => edit((q) => { q.ghostVote = !q.ghostVote; })}><span>{T('Vote fantôme', 'Ghost vote')}</span><span class={p.ghostVote ? 'amber-text' : 'muted'}>{p.ghostVote ? T('disponible', 'available') : T('utilisé', 'spent')}</span></button>}

      <div class="stack-xs">
        <div class="eyebrow">{T('MARQUEURS', 'REMINDERS')}</div>
        {p.markers.length === 0 && p.role !== 'drunk'
          ? <div class="dashed-hint center">{T('Aucun marqueur sur', 'No reminder on')} {p.name}</div>
          : <div class="chips-row">{p.markers.map((m, i) => (
            <button type="button" key={i} class={`pill big tone-${MARKERS[m.key].tone}`} onClick={() => removeMarker(m.key)}>{loc(MARKERS[m.key].label)}{m.by ? ` · ${g.players.find((q) => q.id === m.by)?.name ?? ''}` : ''} ×</button>
          ))}</div>}
        <button type="button" class="btn sm" onClick={() => setDlg('marker')}>+ {T('Ajouter un marqueur', 'Add a reminder')}</button>
      </div>

      <NightHistory game={g} playerId={p.id} title={T('SES NUITS', 'THEIR NIGHTS')} />

      <div class="stack-xs">
        <div class="eyebrow">{T('NOTES', 'NOTES')}</div>
        <textarea class="notes" rows={3} value={p.notes} placeholder={T('Ce que ce joueur prétend, ses infos…', 'What this player claims, their info…')}
          onChange={(e) => edit((q) => { q.notes = (e.target as HTMLTextAreaElement).value; })} />
      </div>

      <div class="grow" />
      <div class="grid-2 tight">
        <button type="button" class="btn sm" onClick={() => setDlg('rename')}>{T('Renommer', 'Rename')}</button>
        <button type="button" class="btn sm" onClick={() => setDlg('seat')}>{T('Changer de place', 'Change seat')}</button>
      </div>
      {isTraveller(p) && (
        <button type="button" class="btn sm danger-outline" onClick={() => {
          update((d) => { log(d, L(`${p.name} quitte la partie.`, `${p.name} leaves the game.`)); d.players = d.players.filter((x) => x.id !== p.id); });
          toast(T(`${p.name} a quitté la partie`, `${p.name} left the game`), undo);
          props.onClose();
        }}>{T('Retirer le Voyageur', 'Remove the Traveller')}</button>
      )}
      <button type="button" class="btn amber lg" onClick={() => revealRole(p)}>{T('Montrer à', 'Show')} {p.name}…</button>

      {dlg === 'role' && (
        <Modal title={`${p.name} — ${T('nouveau rôle', 'new character')}`} onClose={() => setDlg(null)} wide>
          {(['townsfolk', 'outsider', 'minion', 'demon', 'traveller'] as Team[]).map((t) => (
            <div key={t} class="stack-xs">
              <div class={`eyebrow tone-${t === 'minion' || t === 'demon' ? 'mal' : 'bon'}`}>{loc(TEAM_NAMES[t]).toUpperCase()}</div>
              <RolePicker roles={rolesOfTeam(t).map((r) => r.id)} value={p.role} onChange={(r) => {
                edit((q, d) => {
                  const old = q.role;
                  setRole(d, q, r);
                  log(d, L(`${q.name} : ${ROLES[old].name.fr} → ${ROLES[r].name.fr}.`, `${q.name}: ${ROLES[old].name.en} → ${ROLES[r].name.en}.`));
                });
                setDlg(null);
              }} />
            </div>
          ))}
        </Modal>
      )}
      {dlg === 'believed' && (
        <Modal title={T('L’Ivrogne croit être…', 'The Drunk thinks they are…')} onClose={() => setDlg(null)} wide>
          <RolePicker roles={[...notInPlay(g, ['townsfolk']), ...(p.believedRole ? [p.believedRole] : [])]} value={p.believedRole}
            onChange={(r) => { edit((q) => { q.believedRole = r; }); setDlg(null); }} />
        </Modal>
      )}
      {dlg === 'marker' && (
        <Modal variant="sheet" title={`${T('Marqueur sur', 'Reminder on')} ${p.name}`} onClose={() => setDlg(null)}>
          <div class="home-note">{T('Chaque marqueur retient qui l’a posé', 'Each reminder remembers who placed it')}</div>
          <div class="marker-grid">
            {MARKER_KEYS.map((k) => {
              const on = p.markers.some((m) => m.key === k);
              return (
                <button type="button" key={k} class={`marker-row ${on ? 'on' : ''}`} onClick={() => (on ? removeMarker(k) : addMarkerKey(k))}>
                  <span class={`pill tone-${MARKERS[k].tone}`}>{loc(MARKERS[k].label)}</span><span class="small muted">{on ? '✓' : loc(MARKERS[k].source)}</span>
                </button>
              );
            })}
          </div>
          <button type="button" class="btn" onClick={() => setDlg(null)}>{T('Fermer', 'Close')}</button>
        </Modal>
      )}
      {dlg === 'rename' && <RenameModal name={p.name} onClose={() => setDlg(null)} onSave={(n) => edit((q) => { q.name = n; })} />}
      {dlg === 'seat' && (
        <Modal title={T('Changer de place', 'Change seat')} onClose={() => setDlg(null)}>
          <p class="modal-text">{p.name} · {T('place', 'seat')} {seat} / {g.players.length}</p>
          <div class="grid-2">
            <button type="button" class="btn" onClick={() => update((d) => movePlayer(d, p.id, -1))}>⟲ {T('Reculer', 'Move back')}</button>
            <button type="button" class="btn" onClick={() => update((d) => movePlayer(d, p.id, 1))}>⟳ {T('Avancer', 'Move forward')}</button>
          </div>
          <button type="button" class="btn amber" onClick={() => setDlg(null)}>{T('Terminé', 'Done')}</button>
        </Modal>
      )}
    </div>
  );
}

export function RenameModal(props: { name: string; onClose: () => void; onSave: (n: string) => void; title?: string }) {
  const [v, setV] = useState(props.name);
  const save = () => { if (v.trim()) props.onSave(v.trim()); props.onClose(); };
  return (
    <Modal title={props.title ?? T('Renommer', 'Rename')} onClose={props.onClose}>
      <input class="text-input" value={v} autofocus onInput={(e) => setV((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
      <div class="grid-2">
        <button type="button" class="btn" onClick={props.onClose}>{T('Annuler', 'Cancel')}</button>
        <button type="button" class="btn amber" onClick={save}>{T('Enregistrer', 'Save')}</button>
      </div>
    </Modal>
  );
}
