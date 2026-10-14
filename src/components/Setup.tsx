import { useEffect, useRef, useState } from 'preact/hooks';
import { ROLES, rolesOfTeam, type Alignment, type RoleId, type Team } from '../data/roles';
import {
  L, addMarker, addTraveller, autoAssign, checkSetup, completeRoles, dealRoles, hasMarker, isTraveller, log, movePlayer, notInPlay,
  prepareSecrets, randomNames, randomRoles, removeMarkers, rerollTeam, setPlayerCount, setRole, setupStepOf, startNight, swapCharacters, wakeRole,
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
import { Circle } from './Circle';
import { Modal, RoleChip, RoleIcon, RolePicker, Seg, roleSide } from './ui';

const STEPS: SetupStep[] = ['roles', 'seating', 'names', 'review', 'rules', 'distribute'];
const stepLabel = (s: SetupStep) => ({
  roles: T('Personnages', 'Characters'), seating: T('Placement', 'Seating'), names: T('Prénoms', 'Names'),
  review: T('Vérification', 'Review'), rules: T('Règles', 'Rules'), distribute: T('Distribution', 'Hand out'),
}[s]);
const TEAMS = ['townsfolk', 'outsider', 'minion', 'demon'] as const;
const teamTone = (t: Team) => (t === 'minion' || t === 'demon' ? 'mal' : 'bon');
const seatNo = (g: Game, p: Player) => String(g.players.indexOf(p) + 1).padStart(2, '0');
/** A player's name, or their seat while the table is not seated yet. */
const seatLabel = (g: Game, p: Player) => p.name || `${T('Place', 'Seat')} ${seatNo(g, p)}`;

export function Setup(props: { game: Game; onHome: () => void }) {
  const g = props.game;
  const step = setupStepOf(g);
  const idx = STEPS.indexOf(step);
  const go = (s: SetupStep) => update((d) => { d.setupStep = s; });
  const check = checkSetup(g.playerCount, g.selectedRoles);
  const regular = g.players.filter((p) => !isTraveller(p));
  const seen = g.players.filter((p) => p.seen).length;

  const blocked =
    step === 'roles' ? !check.ok :
    step === 'distribute' ? seen < g.players.length : false;
  const disabled =
    step === 'names' ? !g.players.every((p) => p.name.trim()) :
    step === 'seating' || step === 'review' ? regular.some((p) => regular.filter((q) => q.role === p.role).length !== 1) : false;

  const next = () => {
    if (step === 'roles') {
      update((d) => {
        // Even when the distribution is off, there must be exactly one character per player.
        const count = d.players.filter((p) => !isTraveller(p)).length;
        let roles = [...d.selectedRoles];
        if (roles.length > count) roles = shuffle(roles, random).slice(0, count);
        const spare = shuffle((['townsfolk', 'outsider', 'minion', 'demon'] as const).flatMap((t) => rolesOfTeam(t).map((r) => r.id)).filter((r) => !roles.includes(r)), random);
        while (roles.length < count) roles.push(spare.shift()!);
        d.selectedRoles = roles;
        // Arriving on the seating: deal the characters, keeping the seats of those already placed.
        dealRoles(d);
        d.setupStep = 'seating';
      });
    } else if (step === 'distribute') {
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
    step === 'distribute' ? `${T('Commencer la nuit 1', 'Start night 1')}` :
    step === 'roles' && !check.ok ? T('Continuer quand même', 'Continue anyway') : `${T('Suivant', 'Next')} →`;

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
        {step === 'roles' && <RolesStep g={g} />}
        {step === 'seating' && <TableStep g={g} review={false} />}
        {step === 'names' && <NamesStep g={g} />}
        {step === 'review' && <TableStep g={g} review />}
        {step === 'rules' && <RulesStep onSkip={() => go('distribute')} />}
        {step === 'distribute' && <DistributeStep g={g} />}
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

// --- 1. Characters ------------------------------------------------------------

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
  const resize = (n: number) => update((d) => {
    setPlayerCount(d, n);
    // A selection already made follows the table size: kept characters stay, the counts are adjusted.
    if (d.selectedRoles.length) d.selectedRoles = completeRoles(d.selectedRoles, d.playerCount, random, style);
  });
  return (
    <div class="roles-step">
      <div class="roles-head">
        <label class="field">
          <span class="eyebrow">{T('NOM DE LA PARTIE', 'GAME NAME')}</span>
          <input class="text-input" value={g.title} placeholder={T('Soirée du vendredi', 'Friday night')}
            onInput={(e) => update((d) => { d.title = (e.target as HTMLInputElement).value; })} />
        </label>
        <div class="field">
          <span class="eyebrow">{T('JOUEURS', 'PLAYERS')}</span>
          <div class="count-stepper">
            <button type="button" class="btn sq" disabled={g.playerCount <= 5} onClick={() => resize(g.playerCount - 1)} aria-label="−">−</button>
            <span class="count-stepper-value">{g.playerCount}</span>
            <button type="button" class="btn sq" disabled={g.playerCount >= 15} onClick={() => resize(g.playerCount + 1)} aria-label="+">+</button>
          </div>
        </div>
        <div class="roles-help">
          <button type="button" class="btn sm" onClick={() => openGuide('start')}>{T('Guide du Conteur', 'Storyteller’s guide')}</button>
          <button type="button" class="btn sm" onClick={() => openBriefing()}>{T('Présenter les règles', 'Present the rules')}</button>
        </div>
      </div>
      <div class="home-note">{T('Préparez la partie à l’avance : personnages, places autour de la table et secrets d’abord, les prénoms une fois tout le monde installé. Voyageurs ajoutés à la vérification.',
        'Prepare the game ahead: characters, seats around the table and secrets first, the names once everyone is seated. Travellers are added at the review.')}</div>
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

// --- 2. Seating & 4. Review: the table as a circle ------------------------------

/** Drunk belief, Fortune Teller red herring and Demon bluffs: everything that hangs on characters, not on names. */
function SecretsPanel({ g }: { g: Game }) {
  const [editingBluff, setEditingBluff] = useState<number | null>(null);
  const [drunkPick, setDrunkPick] = useState(false);
  const [rhPick, setRhPick] = useState(false);
  const regular = g.players.filter((p) => !isTraveller(p));
  const drunk = g.players.find((p) => p.role === 'drunk');
  const hasFT = g.players.some((p) => wakeRole(p) === 'fortuneteller');
  const rh = g.players.find((p) => hasMarker(p, 'redherring'));
  return (
    <>
      {drunk && (
        <div class="side-block">
          <div class="eyebrow">{T('IVROGNE', 'DRUNK')} · {seatLabel(g, drunk).toUpperCase()} {T('CROIT ÊTRE', 'THINKS THEY ARE')}</div>
          <button type="button" class={`field-btn ${drunk.believedRole ? `tone-${roleSide(drunk.believedRole)}` : ''}`} onClick={() => setDrunkPick(true)}>
            <span class="serif">{roleName(drunk.believedRole)}</span><span class="muted">{T('Villageois hors jeu', 'Townsfolk not in play')} ▾</span>
          </button>
        </div>
      )}
      {hasFT && (
        <div class="side-block">
          <div class="eyebrow">{T('VOYANTE · FAUX POSITIF', 'FORTUNE TELLER · RED HERRING')}</div>
          <button type="button" class="field-btn plain" onClick={() => setRhPick(true)}>
            <span><b class="serif">{rh ? roleName(rh.role) : '—'}</b>{rh && <span class="muted"> · {seatLabel(g, rh)}</span>}</span><span class="muted">{T('Personnage Bon', 'Good character')} ▾</span>
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

      {editingBluff !== null && (
        <Modal title={T('Choisir un bluff', 'Choose a bluff')} onClose={() => setEditingBluff(null)} wide>
          <RolePicker roles={notInPlay(g).filter((r) => !g.bluffs.includes(r) || r === g.bluffs[editingBluff])} value={g.bluffs[editingBluff]}
            onChange={(r) => { update((d) => { d.bluffs[editingBluff] = r; }); setEditingBluff(null); }} />
        </Modal>
      )}
      {drunkPick && drunk && (
        <Modal title={`${seatLabel(g, drunk)} ${T('croit être…', 'thinks they are…')}`} onClose={() => setDrunkPick(false)} wide>
          <RolePicker roles={[...notInPlay(g, ['townsfolk']), ...(drunk.believedRole ? [drunk.believedRole] : [])]} value={drunk.believedRole}
            onChange={(r) => { update((d) => { d.players.find((x) => x.id === drunk.id)!.believedRole = r; d.bluffs = d.bluffs.filter((b) => b !== r); prepareSecrets(d); }); setDrunkPick(false); }} />
        </Modal>
      )}
      {rhPick && (
        <Modal title={T('Faux positif de la Voyante', 'Fortune Teller red herring')} onClose={() => setRhPick(false)}>
          <p class="modal-text">{T('Un personnage Bon que la Voyante verra comme un Démon.', 'A good character the Fortune Teller sees as a Demon.')}</p>
          <div class="role-picker">
            {regular.filter((p) => p.alignment === 'good').map((p) => (
              <RoleChip key={p.id} role={p.role} sub={seatLabel(g, p)} selected={rh?.id === p.id} onClick={() => {
                update((d) => { removeMarkers(d, (m) => m.key === 'redherring'); addMarker(d.players.find((x) => x.id === p.id)!, 'redherring'); });
                setRhPick(false);
              }} />
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

/**
 * The table as it will be played. Tap a seat, then another one: the two characters swap (names stay in their seats).
 * The review also edits names, moves people between seats, and takes Travellers.
 */
function TableStep({ g, review }: { g: Game; review: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [addTrav, setAddTrav] = useState(false);
  const regular = g.players.filter((p) => !isTraveller(p));
  const travellers = g.players.filter(isTraveller);
  const selP = g.players.find((p) => p.id === sel);
  const editP = g.players.find((p) => p.id === editing);
  const check = checkSetup(regular.length, regular.map((p) => p.role));
  useEffect(() => { if (sel && !selP) setSel(null); }, [g.players.length]);

  const onTap = (id: string) => {
    const p = g.players.find((x) => x.id === id)!;
    if (!selP || sel === id) { setSel(sel === id ? null : id); return; }
    // A Traveller has their own character: they are moved, not swapped.
    if (isTraveller(selP) || isTraveller(p)) { setSel(id); return; }
    update((d) => { swapCharacters(d, selP.id, id); prepareSecrets(d); });
    setSel(null);
  };
  const center: [string, string, string?] = [
    review ? T('Vérification', 'Review') : T('Placement', 'Seating'),
    `${g.players.length} ${T('places · sens horaire', 'seats · clockwise')}`,
    selP ? T('Touchez une autre place pour échanger', 'Tap another seat to swap') : T('Touchez deux places pour échanger', 'Tap two seats to swap'),
  ];

  return (
    <div class="table-step">
      <div class="table-circle">
        <Circle game={g} hidden={false} onTap={onTap} overlay={{ center, noDim: true, links: [], hl: selP ? { [selP.id]: isTraveller(selP) ? T('Sélectionné', 'Selected') : T('Échanger avec…', 'Swap with…') } : {} }} />
      </div>
      <aside class="table-side">
        {selP ? (
          <div class="side-block seat-card">
            <div class="between">
              <div class="eyebrow">{T('PLACE', 'SEAT')} {seatNo(g, selP)}</div>
              <button type="button" class="btn xs" onClick={() => setSel(null)}>{T('Fermer', 'Close')}</button>
            </div>
            {review && (
              <input class="text-input" value={selP.name} placeholder={T('Prénom', 'Name')} aria-label={T('Prénom', 'Name')}
                onInput={(e) => update((d) => { d.players.find((x) => x.id === selP.id)!.name = (e.target as HTMLInputElement).value; })} />
            )}
            {isTraveller(selP)
              ? <div class="trav-row"><span class={`serif tone-${selP.alignment === 'good' ? 'bon' : 'mal'}`}>✈ {roleName(selP.role)}</span>
                <button type="button" class="btn xs" onClick={() => update((d) => { d.players = d.players.filter((q) => q.id !== selP.id); })}>{T('Retirer', 'Remove')}</button></div>
              : <button type="button" class={`role-select tone-${roleSide(selP.role)}`} onClick={() => setEditing(selP.id)}>
                <RoleIcon role={selP.role} size={18} /><span>{roleName(selP.role)}</span><i>▾</i>
              </button>}
            {review && (
              <div class="grid-2 tight">
                <button type="button" class="btn sm" onClick={() => update((d) => movePlayer(d, selP.id, -1))}>↺ {T('Place précédente', 'Previous seat')}</button>
                <button type="button" class="btn sm" onClick={() => update((d) => movePlayer(d, selP.id, 1))}>{T('Place suivante', 'Next seat')} ↻</button>
              </div>
            )}
            <span class="home-note">{review
              ? T('Touchez une autre place pour échanger les personnages · les flèches déplacent la personne avec son personnage.', 'Tap another seat to swap the characters · the arrows move the person along with their character.')
              : T('Touchez une autre place pour échanger les personnages.', 'Tap another seat to swap the characters.')}</span>
          </div>
        ) : (
          <div class="side-block">
            <h2>{review ? T('Tout vérifier', 'Check everything') : T('Qui s’assoit où', 'Who sits where')}</h2>
            <span class="home-note">{review
              ? T('Dernier coup d’œil avant les règles : changez un personnage (même hors sélection) pour rééquilibrer, échangez deux places, corrigez un prénom.', 'Last look before the rules: change a character (even outside the selection) to rebalance, swap two seats, fix a name.')
              : T('Les personnages sont placés au hasard autour de la table. Touchez une place pour la modifier, puis une autre pour échanger.', 'Characters are placed at random around the table. Tap a seat to edit it, then another one to swap.')}</span>
            <button type="button" class="btn sm" onClick={() => update((d) => autoAssign(d))}><b>{T('Mélanger les places', 'Shuffle the seats')}</b></button>
          </div>
        )}
        {review && (check.ok
          ? <div class="banner"><i class="bdot amber" /><span><b>{T('Répartition respectée', 'Distribution matches')}</b> — {check.actual.townsfolk} · {check.actual.outsider} · {check.actual.minion} · {check.actual.demon}.</span></div>
          : <div class="banner warn"><b class="mono">!</b><span><b>{T('Répartition modifiée', 'Distribution changed')} :</b> {check.actual.townsfolk} · {check.actual.outsider} · {check.actual.minion} · {check.actual.demon} ({T('attendu', 'expected')} {check.expected.townsfolk} · {check.expected.outsider} · {check.expected.minion} · {check.expected.demon}).</span></div>)}
        <SecretsPanel g={g} />
        {review && (
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
        )}
      </aside>
      {editP && <SwapModal g={g} p={editP} onClose={() => setEditing(null)} />}
      {addTrav && <AddTravellerModal onClose={() => setAddTrav(false)} />}
    </div>
  );
}

// --- 3. Names, once everyone is seated -------------------------------------------

function NamesStep({ g }: { g: Game }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<string | null>(null);
  // The table is seated by now: characters stay hidden unless the Storyteller asks.
  const [show, setShow] = useState(false);
  const inputs = () => [...(listRef.current?.querySelectorAll<HTMLInputElement>('input') ?? [])];
  const focusNext = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const all = inputs();
    const el = e.currentTarget as HTMLInputElement;
    const next = all[all.indexOf(el) + 1];
    if (next) next.focus();
    else el.blur();
  };
  const named = g.players.filter((p) => p.name.trim()).length;
  const center: [string, string, string?] = [`${named}/${g.players.length}`, T('prénoms placés', 'names placed'), T('Touchez une place pour saisir le prénom', 'Tap a seat to type the name')];
  return (
    <div class="table-step">
      <div class="table-circle">
        <Circle game={g} hidden={!show} overlay={{ center, noDim: true, links: [], hl: focus ? { [focus]: '✎' } : {} }}
          onTap={(id) => inputs().find((i) => i.dataset.id === id)?.focus()} />
      </div>
      <aside class="table-side">
        <div class="between">
          <div class="stack-xs"><h2>{T('Prénoms', 'Names')}</h2><span class="home-note">{T('Une fois tout le monde installé · sens horaire', 'Once everyone is seated · clockwise')}</span></div>
          <button type="button" class="btn sm" onClick={() => update((d) => randomNames(d))}>{T('Noms au hasard', 'Random names')}</button>
        </div>
        <div class="name-list" ref={listRef}>
          {g.players.map((p, i) => (
            <label key={p.id} class={`seat-row ${focus === p.id ? 'over' : ''}`}>
              <span class="mono muted">{String(i + 1).padStart(2, '0')}</span>
              {show && <span class={`name-role tone-${roleSide(p.role)}`}><RoleIcon role={p.role} size={16} /><span>{roleName(p.role)}</span></span>}
              <input class="seat-input" data-id={p.id} value={p.name} placeholder={T('Prénom', 'Name')} enterkeyhint="next" onKeyDown={focusNext}
                onFocus={() => setFocus(p.id)} onBlur={() => setFocus((f) => (f === p.id ? null : f))}
                onInput={(e) => update((d) => { d.players[i].name = (e.target as HTMLInputElement).value; })} />
            </label>
          ))}
        </div>
        <button type="button" class="btn sm" onClick={() => setShow(!show)}>{show ? T('Masquer les personnages', 'Hide the characters') : T('Afficher les personnages', 'Show the characters')}</button>
        <div class="dashed-hint">{T('Entrée passe au suivant · tous les prénoms sont nécessaires pour continuer', 'Enter jumps to the next one · every name is needed to go on')}</div>
      </aside>
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
    <Modal wide onClose={props.onClose} title={`${T('Rôle de', 'Character for')} ${seatLabel(g, p)}`}>
      <div class="between"><span class="home-note">{T('actuellement', 'currently')} {roleName(p.role)}</span>
        <button type="button" class="btn xs" onClick={() => setAll(!all)}>{all ? T('Rôles choisis', 'Chosen characters') : T('Tous les rôles', 'All characters')}</button></div>
      <div class="swap-grid">
        {pool.map((r) => {
          const h = holder(r);
          return (
            <button type="button" key={r} class={`swap-tile tone-${roleSide(r)} ${sel === r ? 'on' : ''}`} onClick={() => setSel(r)}>
              <span class="serif">{roleName(r)}</span>
              <span class="small">{r === p.role ? T('actuel', 'current') : h ? seatLabel(g, h) : T('libre', 'free')}{sel === r && r !== p.role ? ` · ${T('sélectionné', 'selected')}` : ''}</span>
            </button>
          );
        })}
      </div>
      {!all && <div class="home-note">{T('Seuls les rôles sélectionnés à l’étape 1 sont proposés · « Tous les rôles » pour élargir ou rééquilibrer', 'Only the characters picked in step 1 are offered · “All characters” to widen or rebalance')}</div>}
      {sel !== p.role && (
        <div class="swap-summary"><span class="mono amber-text">⇄</span><span>
          {seatLabel(g, p)} {T('devient', 'becomes')} <b class={`tone-${roleSide(sel)}`}>{roleName(sel)}</b>
          {other && <>, {seatLabel(g, other)} {T('devient', 'becomes')} <b class={`tone-${roleSide(p.role)}`}>{roleName(p.role)}</b></>}.
        </span></div>
      )}
      <div class="grid-2">
        <button type="button" class="btn" onClick={props.onClose}>{T('Annuler', 'Cancel')}</button>
        <button type="button" class="btn amber" disabled={sel === p.role} onClick={apply}>{other ? T('Échanger', 'Swap') : T('Changer', 'Change')}</button>
      </div>
    </Modal>
  );
}

// --- 5. Rules, read aloud -------------------------------------------------------

function RulesStep(props: { onSkip: () => void }) {
  return (
    <div class="rules-step">
      <div class="rules-card">
        <div class="eyebrow tone-amb">{T('À VOIX HAUTE', 'READ ALOUD')}</div>
        <h2 class="panel-title xl">{T('Présentez l’histoire et les règles', 'Present the story and the rules')}</h2>
        <p class="modal-text">{T('Les personnages sont attribués, mais personne ne les a encore vus. Racontez l’histoire de Ravenswood Bluff et expliquez les règles : la présentation affiche les diapositives et le texte à lire. Ensuite, chacun découvre son personnage.',
          'Characters are assigned, but nobody has seen them yet. Tell the story of Ravenswood Bluff and explain the rules: the presentation shows the slides and the script. Then everyone discovers their character.')}</p>
        <button type="button" class="btn amber lg" onClick={() => openBriefing()}>{T('Lancer la présentation', 'Start the presentation')}</button>
        <button type="button" class="btn" onClick={props.onSkip}>{T('Passer les règles', 'Skip the rules')} →</button>
        <div class="home-note">{T('Table habituée ? « Passer les règles » mène directement à la distribution.', 'Seasoned table? “Skip the rules” goes straight to the hand-out.')}</div>
      </div>
    </div>
  );
}

// --- 6. Hand out ----------------------------------------------------------------

type SeatState = { claimed?: boolean; seen?: boolean };

function DistributeStep({ g }: { g: Game }) {
  const phones = g.phoneDeal !== false;
  const { room } = useLive();
  // The QR code needs a live room: opened as soon as the phones are chosen.
  useEffect(() => { if (phones && !room) void startLive(); }, [phones, !room]);
  return phones && room ? <PhoneDistribute g={g} code={room.code} /> : <DistBoard g={g} seats={null} />;
}

/** Who has picked their name on a phone, and who has seen their character, live. */
function PhoneDistribute(props: { g: Game; code: string }) {
  const { g } = props;
  const { data } = useRoom(props.code);
  const seats = data?.seats?.gameId === g.id ? data.seats : null;
  // A character seen on a phone counts as seen in the Grimoire.
  useEffect(() => {
    const ids = (seats?.players ?? []).filter((s) => s.seen && !g.players.find((p) => p.id === s.id)?.seen).map((s) => s.id);
    if (ids.length) update((d) => { for (const p of d.players) if (ids.includes(p.id)) p.seen = true; });
  }, [seats]);
  return <DistBoard g={g} seats={Object.fromEntries((seats?.players ?? []).map((s) => [s.id, s]))} />;
}

/** The hand-out on the (hidden) circle: tap a player to hand them the iPad; those who have seen their character fade. */
function DistBoard(props: { g: Game; seats: Record<string, SeatState> | null }) {
  const { g, seats } = props;
  const phones = g.phoneDeal !== false;
  const { room, status } = useLive();
  const seen = g.players.filter((p) => p.seen).length;
  const nextP = g.players.find((p) => !p.seen);
  const show = (p: Player) => revealRole(p, () => update((d) => { d.players.find((x) => x.id === p.id)!.seen = true; }));
  const claimed = g.players.filter((p) => seats?.[p.id]?.claimed && !p.seen);
  // Highlighted: whoever is looking right now (phone) or is next (iPad). Faded: those who have seen their character.
  const hl: Record<string, string> = Object.fromEntries(claimed.map((p) => [p.id, `📱 ${T('Identifié·e', 'Identified')}`]));
  if (!seats && nextP) hl[nextP.id] = T('Suivant', 'Next');
  const center: [string, string, string?] = [`${seen}/${g.players.length}`, T('ont vu leur rôle', 'have seen their character'),
    phones && seats ? T('Touchez un joueur sans téléphone pour lui passer l’iPad', 'Tap a player without a phone to hand them the iPad') : T('Touchez un joueur pour lui passer l’iPad', 'Tap a player to hand them the iPad')];

  return (
    <div class="table-step dist-step">
      <div class="table-circle">
        <Circle game={g} hidden overlay={{ center, hl, links: [], noDim: true, faded: g.players.filter((p) => p.seen).map((p) => p.id) }} onTap={(id) => show(g.players.find((p) => p.id === id)!)} />
      </div>
      <aside class="table-side dist-side">
        <Seg value={phones ? 'phones' : 'ipad'} onChange={(v) => update((d) => { d.phoneDeal = v === 'phones'; })}
          options={[{ v: 'phones', label: T('Sur les téléphones', 'On the phones') }, { v: 'ipad', label: T('En passant l’iPad', 'Passing the iPad') }]} />
        <div class="dist-head">
          <h2>{seen} {T('sur', 'of')} {g.players.length} {T('ont vu leur rôle', 'have seen their character')}</h2>
          <div class="progress"><div style={{ width: `${(seen / g.players.length) * 100}%` }} /></div>
        </div>
        {phones ? (
          room ? (
            <>
              <p class="side-text">{T('Chacun scanne le QR code, touche son prénom et maintient le bouton pour voir son personnage. Il s’affiche aussi sur la TV si la diffusion est ouverte.', 'Everyone scans the QR code, taps their name and holds the button to see their character. It also shows on the TV if the broadcast is on.')}</p>
              <div class="qr-box"><QrCode text={liveUrl(room.code)} size={200} label={T('QR code pour découvrir son personnage', 'QR code to discover your character')} /></div>
              <div class="live-code">{room.code}</div>
              <div class={`live-status ${status}`}><i class={`live-dot ${status === 'ok' ? 'on' : ''}`} />{status === 'ok' ? T('En ligne : les téléphones voient les prénoms', 'Online: phones see the names') : status === 'error' ? T('Relais injoignable : passez l’iPad', 'Relay unreachable: pass the iPad') : T('Connexion…', 'Connecting…')}</div>
              {claimed.map((p) => (
                <div key={p.id} class="dist-row next">
                  <span class="dist-name">📱 {p.name}</span>
                  <span class="dist-state amber-text">{T('Identifié·e · regarde…', 'Identified · looking…')}</span>
                  <button type="button" class="btn xs" onClick={() => void releaseSeat(p.id)}>{T('Libérer', 'Free')}</button>
                </div>
              ))}
              <div class="home-note">{T('Sans téléphone ? Touchez son nom sur le cercle pour lui passer l’iPad. « Libérer » si quelqu’un s’est trompé de prénom.', 'No phone? Tap their name on the circle to hand them the iPad. “Free” if someone picked the wrong name.')}</div>
            </>
          ) : <div class="small muted">{T('Ouverture…', 'Opening…')}</div>
        ) : (
          <>
            <p class="side-text">{T('Tendez l’iPad au joueur. Un écran neutre s’affiche, il appuie longuement pour voir son personnage, puis le rend. Touchez un joueur sur le cercle pour le servir hors ordre ou lui remontrer son rôle.', 'Hand the iPad to the player. A neutral screen appears; they press and hold to see their character, then hand it back. Tap a player on the circle to serve them out of order or show their character again.')}</p>
            {nextP ? (
              <>
                <div class="next-card"><div class="eyebrow">{T('SUIVANT', 'NEXT')}</div><div class="next-name">{nextP.name}</div><div class="home-note">{T('Place', 'Seat')} {seatNo(g, nextP)}</div></div>
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
