import { useEffect, useRef, useState } from 'preact/hooks';
import { ROLES, rolesOfTeam, type Alignment, type RoleId, type Team } from '../data/roles';
import {
  L, addMarker, addTraveller, autoAssign, checkSetup, completeRoles, hasMarker, isTraveller, log, notInPlay,
  prepareSecrets, randomNames, randomRoles, removeMarkers, rerollTeam, reorderPlayer, setPlayerCount, setRole, startNight, wakeRole,
} from '../game/engine';
import { DRAW_STYLES, STYLE_INFO } from '../game/drawStyles';
import { random, shuffle } from '../game/rng';
import { releaseSeat, liveUrl, startLive, useLive } from '../game/liveClient';
import { update } from '../game/store';
import type { Game, Player, SetupStep } from '../game/types';
import { T, TEAM_NAMES, loc, roleName } from '../i18n';
import { openBriefing, openGuide } from './Guide';
import { QrCode } from './Handout';
import { useRoom } from './Live';
import { revealRole } from './ShowCard';
import { Modal, RoleChip, RoleIcon, RolePicker, Seg, roleSide } from './ui';

const STEPS: SetupStep[] = ['players', 'roles', 'assign', 'rules', 'distribute'];
const stepLabel = (s: SetupStep) => ({
  players: T('Joueurs', 'Players'), roles: T('Personnages', 'Characters'),
  assign: T('Attribution', 'Assignment'), rules: T('Règles', 'Rules'), distribute: T('Distribution', 'Hand out'),
}[s]);
const TEAMS = ['townsfolk', 'outsider', 'minion', 'demon'] as const;
const teamTone = (t: Team) => (t === 'minion' || t === 'demon' ? 'mal' : 'bon');

export function Setup(props: { game: Game; onHome: () => void }) {
  const g = props.game;
  const idx = STEPS.indexOf(g.setupStep);
  const go = (s: SetupStep) => update((d) => { d.setupStep = s; });
  const check = checkSetup(g.playerCount, g.selectedRoles);
  const regular = g.players.filter((p) => !isTraveller(p));
  const seen = g.players.filter((p) => p.seen).length;

  const blocked =
    g.setupStep === 'roles' ? !check.ok :
    g.setupStep === 'distribute' ? seen < g.players.length : false;
  const disabled =
    g.setupStep === 'players' ? !g.players.every((p) => p.name.trim()) :
    g.setupStep === 'assign' ? regular.some((p) => regular.filter((q) => q.role === p.role).length !== 1) : false;

  const next = () => {
    if (g.setupStep === 'roles') {
      update((d) => {
        // Even when the distribution is off, there must be exactly one character per player.
        const count = d.players.filter((p) => !isTraveller(p)).length;
        let roles = [...d.selectedRoles];
        if (roles.length > count) roles = shuffle(roles, random).slice(0, count);
        const spare = shuffle((['townsfolk', 'outsider', 'minion', 'demon'] as const).flatMap((t) => rolesOfTeam(t).map((r) => r.id)).filter((r) => !roles.includes(r)), random);
        while (roles.length < count) roles.push(spare.shift()!);
        d.selectedRoles = roles;
        // Arriving on assignment: deal the selected characters if they don't match yet.
        const current = d.players.filter((p) => !isTraveller(p)).map((p) => p.role).sort().join();
        if (current !== [...roles].sort().join()) autoAssign(d);
        d.setupStep = 'assign';
      });
    } else if (g.setupStep === 'distribute') {
      update((d) => {
        log(d, L(`Partie lancée avec ${d.players.length} joueurs.`, `Game started with ${d.players.length} players.`));
        for (const p of d.players) {
          const extra = p.role === 'drunk' ? ` (croit être ${ROLES[p.believedRole!].name.fr})` : '';
          log(d, L(`${p.name} : ${ROLES[p.role].name.fr}${extra}`, `${p.name}: ${ROLES[p.role].name.en}${p.role === 'drunk' ? ` (thinks they are ${ROLES[p.believedRole!].name.en})` : ''}`));
        }
        startNight(d);
      });
    } else go(STEPS[idx + 1]);
  };
  const nextLabel =
    g.setupStep === 'distribute' ? `${T('Commencer la nuit 1', 'Start night 1')}` :
    g.setupStep === 'roles' && !check.ok ? T('Continuer quand même', 'Continue anyway') : `${T('Suivant', 'Next')} →`;

  return (
    <div class="setup">
      <header class="setup-bar">
        <button type="button" class="btn sm" onClick={props.onHome}>← {T('Accueil', 'Home')}</button>
        <div class="setup-bar-title">{T('Nouvelle partie', 'New game')}</div>
        <nav class="steps">
          {STEPS.map((s, i) => (
            <button type="button" key={s} class={`step-pill ${i === idx ? 'cur' : ''} ${i < idx ? 'done' : ''}`} disabled={i > idx} onClick={() => go(s)}>
              <span class="step-num">{i < idx ? '✓' : i + 1}</span><span class="step-label">{stepLabel(s)}</span>
            </button>
          ))}
        </nav>
        <button type="button" class={`btn next ${blocked ? 'blocked' : 'amber'}`} disabled={disabled} onClick={next}>{nextLabel}</button>
      </header>
      <div class="setup-body">
        {g.setupStep === 'players' && <PlayersStep g={g} />}
        {g.setupStep === 'roles' && <RolesStep g={g} />}
        {g.setupStep === 'assign' && <AssignStep g={g} />}
        {g.setupStep === 'rules' && <RulesStep />}
        {g.setupStep === 'distribute' && <DistributeStep g={g} />}
      </div>
    </div>
  );
}

// --- 1. Players -------------------------------------------------------------

function DistribCells(props: { count: number; hasBaron: boolean }) {
  const c = checkSetup(props.count, props.hasBaron ? ['baron'] : []);
  return (
    <div class="distrib">
      {TEAMS.map((t) => (
        <div key={t} class="distrib-cell">
          <span class={`distrib-num tone-${teamTone(t)}`}>{c.expected[t]}</span>
          <span class="distrib-label">{loc(TEAM_NAMES[t === 'demon' ? 'demon' : t])}</span>
        </div>
      ))}
    </div>
  );
}

function PlayersStep({ g }: { g: Game }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; over: number } | null>(null);

  const indexAt = (x: number, y: number) => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>('[data-seat]') ?? [];
    for (const r of rows) {
      const b = r.getBoundingClientRect();
      if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) return Number(r.dataset.seat);
    }
    return null;
  };
  const focusNext = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const inputs = [...(listRef.current?.querySelectorAll<HTMLInputElement>('input') ?? [])];
    const i = inputs.indexOf(e.currentTarget as HTMLInputElement);
    (inputs[i + 1] ?? (e.currentTarget as HTMLInputElement)).focus();
    if (!inputs[i + 1]) (e.currentTarget as HTMLInputElement).blur();
  };

  return (
    <div class="players-step">
      <div class="players-left">
        <label class="field">
          <span class="eyebrow">{T('NOM DE LA PARTIE', 'GAME NAME')}</span>
          <input class="text-input" value={g.title} placeholder={T('Soirée du vendredi', 'Friday night')}
            onInput={(e) => update((d) => { d.title = (e.target as HTMLInputElement).value; })} />
        </label>
        <div class="stack-sm">
          <div class="eyebrow">{T('NOMBRE DE JOUEURS', 'NUMBER OF PLAYERS')}</div>
          <div class="big-stepper">
            <button type="button" class="btn sq" disabled={g.playerCount <= 5} onClick={() => update((d) => setPlayerCount(d, d.playerCount - 1))} aria-label="−">−</button>
            <span class="big-stepper-value">{g.playerCount}</span>
            <button type="button" class="btn sq" disabled={g.playerCount >= 15} onClick={() => update((d) => setPlayerCount(d, d.playerCount + 1))} aria-label="+">+</button>
          </div>
          <div class="home-note">{T('De 5 à 15 joueurs · Voyageurs ajoutés à l’étape 3', 'From 5 to 15 players · Travellers are added in step 3')}</div>
        </div>
        <div class="stack-sm">
          <div class="eyebrow">{T('RÉPARTITION POUR', 'DISTRIBUTION FOR')} {g.playerCount}</div>
          <DistribCells count={g.playerCount} hasBaron={g.selectedRoles.includes('baron')} />
          <div class="home-note">{T('Ajustée automatiquement à l’étape suivante si le Baron est choisi.', 'Adjusted automatically in the next step if the Baron is chosen.')}</div>
        </div>
      </div>
      <div class="players-right">
        <div class="between">
          <div class="stack-xs"><h2>{T('Ordre de la table', 'Table order')}</h2><span class="home-note">{T('Sens horaire · faites glisser ≡ pour réordonner', 'Clockwise · drag ≡ to reorder')}</span></div>
          <button type="button" class="btn sm" onClick={() => update((d) => randomNames(d))}>{T('Noms au hasard', 'Random names')}</button>
        </div>
        <div class="seat-grid" ref={listRef}>
          {g.players.map((p, i) => (
            <div key={p.id} data-seat={i} class={`seat-row ${drag?.id === p.id ? 'dragging' : ''} ${drag && drag.over === i && drag.id !== p.id ? 'over' : ''}`}>
              <span class="mono muted">{String(i + 1).padStart(2, '0')}</span>
              <input class="seat-input" value={p.name} enterkeyhint="next" onKeyDown={focusNext}
                onInput={(e) => update((d) => { d.players[i].name = (e.target as HTMLInputElement).value; })} />
              {isTraveller(p) && <span class="tag">✈ {roleName(p.role)}</span>}
              {isTraveller(p) && <button type="button" class="icon-btn" aria-label={T('Retirer', 'Remove')} onClick={() => update((d) => { d.players = d.players.filter((q) => q.id !== p.id); })}>×</button>}
              <span class="handle" role="button" aria-label={T('Réordonner', 'Reorder')} style={{ touchAction: 'none' }}
                onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDrag({ id: p.id, over: i }); }}
                onPointerMove={(e) => { if (!drag) return; const at = indexAt(e.clientX, e.clientY); if (at !== null && at !== drag.over) setDrag({ ...drag, over: at }); }}
                onPointerUp={() => { if (drag && drag.over !== i) update((d) => reorderPlayer(d, drag.id, drag.over)); setDrag(null); }}
                onPointerCancel={() => setDrag(null)}>≡</span>
            </div>
          ))}
        </div>
        <div class="dashed-hint">{T('Toucher un nom pour le modifier · Entrée passe au suivant', 'Tap a name to edit it · Enter jumps to the next one')}</div>
        <div class="setup-help">
          <span class="home-note">{T('Première partie ? Le guide explique tout le déroulé, et la présentation vous fait lire les règles à la table.', 'First game? The guide walks through the whole evening, and the presentation has you read the rules to the table.')}</span>
          <div class="grid-2 tight">
            <button type="button" class="btn sm" onClick={() => openGuide('start')}>{T('Guide du Conteur', 'Storyteller’s guide')}</button>
            <button type="button" class="btn sm" onClick={() => openBriefing()}>{T('Présenter les règles', 'Present the rules')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TravellerForm(props: {
  name: string; setName: (s: string) => void; role: RoleId; setRole: (r: RoleId) => void;
  align: Alignment; setAlign: (a: Alignment) => void; onAdd: () => void;
}) {
  return (
    <div class="stack">
      <RolePicker roles={rolesOfTeam('traveller').map((r) => r.id)} value={props.role} onChange={props.setRole} />
      <p class="modal-text">{loc(ROLES[props.role].ability)}</p>
      <div class="row">
        <input class="text-input" value={props.name} placeholder={T('Nom', 'Name')} onInput={(e) => props.setName((e.target as HTMLInputElement).value)} />
        <Seg value={props.align} onChange={props.setAlign} options={[{ v: 'good', label: T('Bon', 'Good'), tone: 'bon' }, { v: 'evil', label: T('Maléfique', 'Evil'), tone: 'mal' }]} />
      </div>
      <button type="button" class="btn amber" disabled={!props.name.trim()} onClick={props.onAdd}>＋ {T('Ajouter', 'Add')}</button>
    </div>
  );
}

export function AddTravellerModal(props: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<RoleId>('bureaucrat');
  const [align, setAlign] = useState<Alignment>('good');
  return (
    <Modal title={T('Ajouter un Voyageur', 'Add a Traveller')} onClose={props.onClose} wide>
      <TravellerForm name={name} setName={setName} role={role} setRole={setRole} align={align} setAlign={setAlign}
        onAdd={() => { update((d) => { addTraveller(d, name.trim(), role, align); }); props.onClose(); }} />
    </Modal>
  );
}

// --- 2. Characters ------------------------------------------------------------

const teamCount = (n: number, team: Team) => {
  const [one, many] = {
    townsfolk: [T('Villageois', 'Townsfolk'), T('Villageois', 'Townsfolk')], outsider: [T('Étranger', 'Outsider'), T('Étrangers', 'Outsiders')],
    minion: [T('Sbire', 'Minion'), T('Sbires', 'Minions')], demon: [T('Démon', 'Demon'), T('Démons', 'Demons')], traveller: ['', ''],
  }[team];
  return `${n} ${n > 1 ? many : one}`;
};

function RolesStep({ g }: { g: Game }) {
  const check = checkSetup(g.playerCount, g.selectedRoles);
  const baron = g.selectedRoles.includes('baron');
  const base = checkSetup(g.playerCount, []).expected;
  const toggle = (r: RoleId) => update((d) => {
    d.selectedRoles = d.selectedRoles.includes(r) ? d.selectedRoles.filter((x) => x !== r) : [...d.selectedRoles, r];
  });
  const style = g.drawStyle ?? 'simple';
  const exp = check.expected;
  const diffs = TEAMS.flatMap((t) => {
    const d = check.actual[t] - exp[t];
    if (!d) return [];
    return [d > 0 ? `${teamCount(d, t)} ${T('en trop', 'too many')}` : `${teamCount(-d, t)} ${T(-d > 1 ? 'manquants' : 'manquant', 'missing')}`];
  });
  return (
    <div class="roles-step">
      <div class="style-pick">
        <span class="style-pick-label">{T('Style de jeu', 'Play style')}</span>
        <Seg options={DRAW_STYLES.map((v) => ({ v, label: loc(STYLE_INFO[v].name) }))} value={style} onChange={(v) => update((d) => { d.drawStyle = v; })} />
        <span class="home-note">{loc(STYLE_INFO[style].hint)} {T('Les tirages ci-dessous suivent ce style et restent équilibrés.', 'The draws below follow this style and stay balanced.')}</span>
      </div>
      <div class="roles-top">
        {check.ok ? (
          <div class="banner"><i class="bdot amber" /><span>{baron
            ? <><b>{T('Baron en jeu', 'Baron in play')}</b> — {exp.townsfolk} {T('Villageois', 'Townsfolk')} ({T('au lieu de', 'instead of')} {base.townsfolk}) {T('et', 'and')} {exp.outsider} {T('Étrangers', 'Outsiders')} ({T('au lieu de', 'instead of')} {base.outsider}).</>
            : <><b>{T('Répartition respectée', 'Distribution matches')}</b> — {exp.townsfolk} · {exp.outsider} · {exp.minion} · {exp.demon}.</>}</span></div>
        ) : (
          <div class="banner warn"><b class="mono">!</b><span><b>{T('Répartition attendue', 'Expected distribution')} : {exp.townsfolk} · {exp.outsider} · {exp.minion} · {exp.demon}.</b> {diffs.join(', ')}.</span></div>
        )}
        {!check.ok
          ? <button type="button" class="btn amber sm" onClick={() => update((d) => { d.selectedRoles = completeRoles(d.selectedRoles, d.playerCount, random, style); })}>{T('Compléter au hasard', 'Fill randomly')}</button>
          : <button type="button" class="btn sm" onClick={() => update((d) => { d.selectedRoles = randomRoles(d.playerCount, random, style); })}><b>{T('Tirer au hasard', 'Draw randomly')}</b></button>}
        {!check.ok && <button type="button" class="btn sm" onClick={() => update((d) => { d.selectedRoles = randomRoles(d.playerCount, random, style); })}>{T('Tirer au hasard', 'Draw randomly')}</button>}
        <button type="button" class="btn sm" onClick={() => update((d) => { d.selectedRoles = []; })}>{T('Tout retirer', 'Clear all')}</button>
      </div>
      {g.selectedRoles.includes('drunk') && <div class="home-note">{T('L’Ivrogne compte comme un Étranger ; il croira être un Villageois absent de la partie.', 'The Drunk counts as an Outsider; they will believe they are a Townsfolk not in play.')}</div>}
      <div class="role-groups">
        {TEAMS.map((t) => {
          const ok = check.actual[t] === exp[t];
          return (
            <div key={t} class="role-group">
              <div class="role-group-head">
                <span class={`role-group-title tone-${teamTone(t)}`}>{loc(TEAM_NAMES[t])}</span>
                <span class={`count-pill ${ok ? '' : 'warn'}`}>{check.actual[t]} / {exp[t]}</span>
                {rolesOfTeam(t).length > exp[t] && (
                  <button type="button" class="icon-btn" aria-label={`${T('Nouveau tirage', 'Redraw')} : ${loc(TEAM_NAMES[t])}`} title={T('Nouveau tirage', 'Redraw')}
                    onClick={() => update((d) => { d.selectedRoles = rerollTeam(d.selectedRoles, d.playerCount, t, random, style); })}>↻</button>
                )}
              </div>
              <div class="chip-wrap">
                {rolesOfTeam(t).map((r) => <RoleChip key={r.id} role={r.id} selected={g.selectedRoles.includes(r.id)} dim={!g.selectedRoles.includes(r.id)} onClick={() => toggle(r.id)} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- 3. Assignment ------------------------------------------------------------

function AssignStep({ g }: { g: Game }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editingBluff, setEditingBluff] = useState<number | null>(null);
  const [drunkPick, setDrunkPick] = useState(false);
  const [rhPick, setRhPick] = useState(false);
  const [addTrav, setAddTrav] = useState(false);
  const regular = g.players.filter((p) => !isTraveller(p));
  const travellers = g.players.filter(isTraveller);
  const drunk = g.players.find((p) => p.role === 'drunk');
  const hasFT = g.players.some((p) => wakeRole(p) === 'fortuneteller');
  const rh = g.players.find((p) => hasMarker(p, 'redherring'));
  const editP = g.players.find((p) => p.id === editing);

  return (
    <div class="assign-step">
      <div class="assign-main">
        <div class="between"><h2>{T('Qui joue quoi', 'Who plays what')}</h2><button type="button" class="btn sm" onClick={() => update((d) => autoAssign(d))}><b>{T('Attribuer au hasard', 'Assign randomly')}</b></button></div>
        <div class="assign-rows">
          {regular.map((p, i) => {
            const dup = regular.filter((q) => q.role === p.role).length > 1;
            const note = p.role === 'drunk' ? `${T('croit être', 'thinks they are')} ${roleName(p.believedRole)}` :
              hasMarker(p, 'redherring') ? T('faux positif', 'red herring') : dup ? T('rôle en double', 'duplicate character') : '';
            return (
              <div key={p.id} class="assign-row">
                <span class="mono muted seat-n">{String(i + 1).padStart(2, '0')}</span>
                <span class="assign-name">{p.name}</span>
                <span class={`assign-note ${dup ? 'tone-mal' : ''}`}>{note}</span>
                <button type="button" class={`role-select tone-${roleSide(p.role)}`} onClick={() => setEditing(p.id)}>
                  <RoleIcon role={p.role} size={18} /><span>{roleName(p.role)}</span><i>▾</i>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <aside class="assign-side">
        {drunk && (
          <div class="side-block">
            <div class="eyebrow">{T('IVROGNE', 'DRUNK')} · {drunk.name.toUpperCase()} {T('CROIT ÊTRE', 'THINKS THEY ARE')}</div>
            <button type="button" class={`field-btn ${drunk.believedRole ? `tone-${roleSide(drunk.believedRole)}` : ''}`} onClick={() => setDrunkPick(true)}>
              <span class="serif">{roleName(drunk.believedRole)}</span><span class="muted">{T('Villageois hors jeu', 'Townsfolk not in play')} ▾</span>
            </button>
          </div>
        )}
        {hasFT && (
          <div class="side-block">
            <div class="eyebrow">{T('VOYANTE · FAUX POSITIF', 'FORTUNE TELLER · RED HERRING')}</div>
            <button type="button" class="field-btn plain" onClick={() => setRhPick(true)}>
              <span><b class="serif">{rh ? roleName(rh.role) : '—'}</b>{rh && <span class="muted"> · {rh.name}</span>}</span><span class="muted">{T('Personnage Bon', 'Good character')} ▾</span>
            </button>
          </div>
        )}
        <div class="side-block">
          <div class="eyebrow">{T('BLUFFS DU DÉMON', 'DEMON BLUFFS')} · 3 {T('HORS JEU', 'NOT IN PLAY')}</div>
          <div class="bluffs">
            {[0, 1, 2].map((i) => g.bluffs[i]
              ? <button type="button" key={i} class={`bluff tone-${roleSide(g.bluffs[i])}`} onClick={() => setEditingBluff(i)}>{roleName(g.bluffs[i])}</button>
              : <button type="button" key={i} class="bluff empty" onClick={() => setEditingBluff(i)}>?</button>)}
          </div>
          <div class="between"><span class="home-note">{T('Proposés au hasard · toucher pour changer', 'Suggested at random · tap to change')}</span>
            <button type="button" class="btn xs" onClick={() => update((d) => { d.bluffs = []; prepareSecrets(d); })}>{T('Retirer', 'Redraw')}</button></div>
        </div>
        <div class="side-block">
          <div class="eyebrow">{T('VOYAGEURS', 'TRAVELLERS')}</div>
          {travellers.map((p) => (
            <div key={p.id} class="trav-row">
              <b>{p.name}</b><span class={`serif tone-${p.alignment === 'good' ? 'bon' : 'mal'}`}>{roleName(p.role)}</span>
              <span class={`tone-${p.alignment === 'good' ? 'bon' : 'mal'} small`}>{p.alignment === 'good' ? T('Bon', 'Good') : T('Maléfique', 'Evil')} · {T('place', 'seat')} {g.players.indexOf(p) + 1}</span>
              <button type="button" class="icon-btn" aria-label={T('Retirer', 'Remove')} onClick={() => update((d) => { d.players = d.players.filter((q) => q.id !== p.id); })}>×</button>
            </div>
          ))}
          <button type="button" class="btn" onClick={() => setAddTrav(true)}>+ {T('Ajouter un voyageur', 'Add a traveller')}</button>
        </div>
      </aside>

      {editP && <SwapModal g={g} p={editP} onClose={() => setEditing(null)} />}
      {editingBluff !== null && (
        <Modal title={T('Choisir un bluff', 'Choose a bluff')} onClose={() => setEditingBluff(null)} wide>
          <RolePicker roles={notInPlay(g).filter((r) => !g.bluffs.includes(r) || r === g.bluffs[editingBluff])} value={g.bluffs[editingBluff]}
            onChange={(r) => { update((d) => { d.bluffs[editingBluff] = r; }); setEditingBluff(null); }} />
        </Modal>
      )}
      {drunkPick && drunk && (
        <Modal title={`${drunk.name} ${T('croit être…', 'thinks they are…')}`} onClose={() => setDrunkPick(false)} wide>
          <RolePicker roles={[...notInPlay(g, ['townsfolk']), ...(drunk.believedRole ? [drunk.believedRole] : [])]} value={drunk.believedRole}
            onChange={(r) => { update((d) => { d.players.find((x) => x.id === drunk.id)!.believedRole = r; d.bluffs = d.bluffs.filter((b) => b !== r); prepareSecrets(d); }); setDrunkPick(false); }} />
        </Modal>
      )}
      {rhPick && (
        <Modal title={T('Faux positif de la Voyante', 'Fortune Teller red herring')} onClose={() => setRhPick(false)}>
          <p class="modal-text">{T('Un personnage Bon que la Voyante verra comme un Démon.', 'A good character the Fortune Teller sees as a Demon.')}</p>
          <div class="role-picker">
            {regular.filter((p) => p.alignment === 'good').map((p) => (
              <RoleChip key={p.id} role={p.role} sub={p.name} selected={rh?.id === p.id} onClick={() => {
                update((d) => { removeMarkers(d, (m) => m.key === 'redherring'); addMarker(d.players.find((x) => x.id === p.id)!, 'redherring'); });
                setRhPick(false);
              }} />
            ))}
          </div>
        </Modal>
      )}
      {addTrav && <AddTravellerModal onClose={() => setAddTrav(false)} />}
    </div>
  );
}

/** Choose a character for a player; taking one that is already dealt swaps the two players. */
function SwapModal(props: { g: Game; p: Player; onClose: () => void }) {
  const { g, p } = props;
  const [sel, setSel] = useState<RoleId>(p.role);
  const [all, setAll] = useState(false);
  const regular = g.players.filter((q) => !isTraveller(q));
  const pool = all
    ? TEAMS.flatMap((t) => rolesOfTeam(t).map((r) => r.id))
    : TEAMS.flatMap((t) => rolesOfTeam(t).map((r) => r.id)).filter((r) => g.selectedRoles.includes(r) || r === p.role);
  const holder = (r: RoleId) => regular.find((q) => q.id !== p.id && q.role === r);
  const other = holder(sel);

  const apply = () => {
    update((d) => {
      const me = d.players.find((x) => x.id === p.id)!;
      const o = d.players.find((x) => x.id !== p.id && x.role === sel && !isTraveller(x));
      const old = me.role;
      setRole(d, me, sel);
      if (o) setRole(d, o, old);
      d.selectedRoles = d.players.filter((x) => !isTraveller(x)).map((x) => x.role);
      prepareSecrets(d);
    });
    props.onClose();
  };

  return (
    <Modal wide onClose={props.onClose} title={`${T('Rôle de', 'Character for')} ${p.name}`}>
      <div class="between"><span class="home-note">{T('actuellement', 'currently')} {roleName(p.role)}</span>
        <button type="button" class="btn xs" onClick={() => setAll(!all)}>{all ? T('Rôles choisis', 'Chosen characters') : T('Tous les rôles', 'All characters')}</button></div>
      <div class="swap-grid">
        {pool.map((r) => {
          const h = holder(r);
          return (
            <button type="button" key={r} class={`swap-tile tone-${roleSide(r)} ${sel === r ? 'on' : ''}`} onClick={() => setSel(r)}>
              <span class="serif">{roleName(r)}</span>
              <span class="small">{r === p.role ? T('actuel', 'current') : h ? h.name : T('libre', 'free')}{sel === r && r !== p.role ? ` · ${T('sélectionné', 'selected')}` : ''}</span>
            </button>
          );
        })}
      </div>
      {!all && <div class="home-note">{T('Seuls les rôles sélectionnés à l’étape 2 sont proposés · « Tous les rôles » pour élargir', 'Only the characters picked in step 2 are offered · “All characters” to widen')}</div>}
      {sel !== p.role && (
        <div class="swap-summary"><span class="mono amber-text">⇄</span><span>
          {p.name} {T('devient', 'becomes')} <b class={`tone-${roleSide(sel)}`}>{roleName(sel)}</b>
          {other && <>, {other.name} {T('devient', 'becomes')} <b class={`tone-${roleSide(p.role)}`}>{roleName(p.role)}</b></>}.
        </span></div>
      )}
      <div class="grid-2">
        <button type="button" class="btn" onClick={props.onClose}>{T('Annuler', 'Cancel')}</button>
        <button type="button" class="btn amber" disabled={sel === p.role} onClick={apply}>{other ? T('Échanger', 'Swap') : T('Changer', 'Change')}</button>
      </div>
    </Modal>
  );
}

// --- 4. Hand out ----------------------------------------------------------------

// --- 4. Rules, read aloud -------------------------------------------------------

function RulesStep() {
  return (
    <div class="rules-step">
      <div class="rules-card">
        <div class="eyebrow tone-amb">{T('À VOIX HAUTE', 'READ ALOUD')}</div>
        <h2 class="panel-title xl">{T('Présentez l’histoire et les règles', 'Present the story and the rules')}</h2>
        <p class="modal-text">{T('Les personnages sont attribués, mais personne ne les a encore vus. Racontez l’histoire de Ravenswood Bluff et expliquez les règles : la présentation affiche les diapositives et le texte à lire. Ensuite, chacun découvre son personnage.',
          'Characters are assigned, but nobody has seen them yet. Tell the story of Ravenswood Bluff and explain the rules: the presentation shows the slides and the script. Then everyone discovers their character.')}</p>
        <button type="button" class="btn amber lg" onClick={() => openBriefing()}>{T('Lancer la présentation', 'Start the presentation')}</button>
        <div class="home-note">{T('Table habituée ? Passez directement à la distribution avec « Suivant ».', 'Seasoned table? Go straight to the hand-out with “Next”.')}</div>
      </div>
    </div>
  );
}

// --- 5. Hand out ----------------------------------------------------------------

function DistributeStep({ g }: { g: Game }) {
  const phones = g.phoneDeal !== false;
  const { room, status } = useLive();
  const seen = g.players.filter((p) => p.seen).length;
  const nextP = g.players.find((p) => !p.seen);
  const show = (p: Player) => revealRole(p, () => update((d) => { d.players.find((x) => x.id === p.id)!.seen = true; }));
  // The QR code needs a live room: opened as soon as the phones are chosen.
  useEffect(() => { if (phones && !room) void startLive(); }, [phones, !room]);

  return (
    <div class="dist-step">
      <div class="dist-main">
        <Seg value={phones ? 'phones' : 'ipad'} onChange={(v) => update((d) => { d.phoneDeal = v === 'phones'; })}
          options={[{ v: 'phones', label: T('Sur les téléphones (QR code)', 'On the phones (QR code)') }, { v: 'ipad', label: T('En passant l’iPad', 'Passing the iPad') }]} />
        <div class="dist-head">
          <h2>{seen} {T('sur', 'of')} {g.players.length} {T('ont vu leur rôle', 'have seen their character')}</h2>
          <div class="progress"><div style={{ width: `${(seen / g.players.length) * 100}%` }} /></div>
        </div>
        {phones && room ? <PhoneSeats g={g} code={room.code} onShow={show} /> : <IpadSeats g={g} onShow={show} />}
        <div class="home-note">{phones
          ? T('Sans téléphone ? Touchez son nom pour lui passer l’iPad. « Libérer » si quelqu’un s’est trompé de prénom.', 'No phone? Tap their name to hand them the iPad. “Free” if someone picked the wrong name.')
          : T('Toucher un joueur pour lui passer l’iPad hors ordre, ou pour lui remontrer son rôle.', 'Tap a player to hand them the iPad out of order, or to show their character again.')}</div>
      </div>
      <aside class="dist-side">
        {phones ? (
          room ? (
            <>
              <p class="side-text">{T('Chacun scanne le QR code, touche son prénom et maintient le bouton pour voir son personnage. Il s’affiche aussi sur la TV si la diffusion est ouverte.', 'Everyone scans the QR code, taps their name and holds the button to see their character. It also shows on the TV if the broadcast is on.')}</p>
              <div class="qr-box"><QrCode text={liveUrl(room.code)} size={200} label={T('QR code pour découvrir son personnage', 'QR code to discover your character')} /></div>
              <div class="live-code">{room.code}</div>
              <div class={`live-status ${status}`}><i class={`live-dot ${status === 'ok' ? 'on' : ''}`} />{status === 'ok' ? T('En ligne : les téléphones voient les prénoms', 'Online: phones see the names') : status === 'error' ? T('Relais injoignable : passez l’iPad', 'Relay unreachable: pass the iPad') : T('Connexion…', 'Connecting…')}</div>
            </>
          ) : <div class="small muted">{T('Ouverture…', 'Opening…')}</div>
        ) : (
          <>
            <p class="side-text">{T('Tendez l’iPad au joueur. Un écran neutre s’affiche, il appuie longuement pour voir son personnage, puis le rend.', 'Hand the iPad to the player. A neutral screen appears; they press and hold to see their character, then hand it back.')}</p>
            {nextP ? (
              <>
                <div class="next-card"><div class="eyebrow">{T('SUIVANT', 'NEXT')}</div><div class="next-name">{nextP.name}</div><div class="home-note">{T('Place', 'Seat')} {String(g.players.indexOf(nextP) + 1).padStart(2, '0')}</div></div>
                <button type="button" class="btn amber lg" onClick={() => show(nextP)}>{T('Passer l’iPad à', 'Hand the iPad to')} {nextP.name}</button>
              </>
            ) : (
              <div class="next-card"><div class="next-name small">{T('Tout le monde a vu son rôle.', 'Everyone has seen their character.')}</div></div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function IpadSeats(props: { g: Game; onShow: (p: Player) => void }) {
  const { g } = props;
  const nextP = g.players.find((p) => !p.seen);
  return (
    <div class="dist-grid">
      {g.players.map((p, i) => {
        const isNext = p.id === nextP?.id;
        return (
          <button type="button" key={p.id} class={`dist-row ${isNext ? 'next' : ''}`} onClick={() => props.onShow(p)}>
            <i class={`seen-dot ${p.seen ? 'on' : ''}`} />
            <span class="mono muted">{String(i + 1).padStart(2, '0')}</span>
            <span class="dist-name">{p.name}</span>
            <span class={`dist-state ${p.seen ? 'muted' : isNext ? 'amber-text' : ''}`}>{p.seen ? T('A vu son rôle', 'Has seen it') : isNext ? T('Suivant', 'Next') : T('À voir', 'To see')}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Who has picked their name on a phone, and who has seen their character, live. */
function PhoneSeats(props: { g: Game; code: string; onShow: (p: Player) => void }) {
  const { g } = props;
  const { data } = useRoom(props.code);
  const seats = data?.seats?.gameId === g.id ? data.seats : null;
  const state = (id: string) => seats?.players.find((s) => s.id === id);
  // A character seen on a phone counts as seen in the Grimoire.
  useEffect(() => {
    const ids = (seats?.players ?? []).filter((s) => s.seen && !g.players.find((p) => p.id === s.id)?.seen).map((s) => s.id);
    if (ids.length) update((d) => { for (const p of d.players) if (ids.includes(p.id)) p.seen = true; });
  }, [seats]);
  return (
    <div class="dist-grid">
      {g.players.map((p, i) => {
        const s = state(p.id);
        const label = p.seen ? T('A vu son rôle', 'Has seen it') : s?.claimed ? T('Identifié·e · regarde…', 'Identified · looking…') : T('En attente', 'Waiting');
        return (
          <div key={p.id} class={`dist-row phone ${s?.claimed && !p.seen ? 'next' : ''}`}>
            <button type="button" class="dist-row-main" onClick={() => props.onShow(p)} aria-label={`${T('Passer l’iPad à', 'Hand the iPad to')} ${p.name}`}>
              <i class={`seen-dot ${p.seen ? 'on' : ''}`} />
              <span class="mono muted">{String(i + 1).padStart(2, '0')}</span>
              <span class="dist-name">{p.name}</span>
              <span class={`dist-state ${p.seen ? 'muted' : s?.claimed ? 'amber-text' : ''}`}>{s?.claimed ? '📱 ' : ''}{label}</span>
            </button>
            {s?.claimed && <button type="button" class="btn xs" onClick={() => void releaseSeat(p.id)}>{T('Libérer', 'Free')}</button>}
          </div>
        );
      })}
    </div>
  );
}
