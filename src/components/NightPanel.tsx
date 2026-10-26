import { useEffect, useMemo, useState } from 'preact/hooks';
import { ROLES, rolesOfTeam, type RoleId } from '../data/roles';
import {
  aliveNeighbours, byId, chefNumber, completeStep, currentStep, empathNumber, falsePing, fortuneAnswer, hasMarker, isImpaired,
  infoConflicts, isTraveller, markerWorks, misregCandidates, nameOf, numberOptions, nightHistory, nightSteps, notInPlay, pingSuggestion, registersDemon, seedFor, starpassHeir,
  startDay, teamOf, uncompleteStep, type NightStep,
} from '../game/engine';
import { pick, seeded, type Rng } from '../game/rng';
import { update } from '../game/store';
import type { Game, Player, StepAction } from '../game/types';
import { T, loc, roleName } from '../i18n';
import { DAWN_DEATH, DAWN_NONE, DUSK } from '../data/guide';
import { stepAlerts } from '../game/alerts';
import { AlertPins, useAlertPopup } from './Alerts';
import { standingLinks } from './Circle';
import { Narration } from './Guide';
import { historyTrail } from './History';
import { type PanelCtx, useOverlay, useTap } from './hooks';
import type { Link } from './overlay';
import { showCard, type CardContent } from './ShowCard';
import { Eyebrow, PlayerPicker, RolePicker, Switch, roleSide } from './ui';

/** Alerts already acknowledged (game, night, step, alert): each one pops up only once. */
const SEEN_ALERTS = new Set<string>();
const keyAlerts = (g: Game, step: NightStep, alerts: ReturnType<typeof stepAlerts>) =>
  alerts.map((a) => ({ ...a, key: `${g.id}:${g.night?.number}:${step.key}:${a.key}` }));

export function stepTitle(s: NightStep) {
  switch (s.kind) {
    case 'dusk': return T('Crépuscule', 'Dusk');
    case 'dawn': return T('Aube', 'Dawn');
    case 'minioninfo': return T('Sbires', 'Minions');
    case 'demoninfo': return T('Démon', 'Demon');
    default: return roleName(s.role);
  }
}

export function NightPanel(props: { game: Game; ctx: PanelCtx }) {
  const g = props.game;
  const steps = nightSteps(g);
  const cur = currentStep(g);
  const [selected, setSelected] = useState<string | undefined>(cur?.key);
  // Follow the night's progress unless the storyteller picked another step.
  useEffect(() => { setSelected(cur?.key); }, [cur?.key]);
  const idx = Math.max(0, steps.findIndex((s) => s.key === (selected ?? cur?.key)));
  const step = steps[idx] ?? cur ?? steps[steps.length - 1];
  const done = g.night?.done ?? [];
  useEffect(() => {
    document.querySelector('.step-chip.cur')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [step?.key]);
  if (!step) return null;

  const total = steps.length;
  const lastBeforeDawn = [...steps].reverse().find((s) => s.kind !== 'dawn');

  return (
    <div class="panel-col night">
      <div class="step-chips">
        {steps.map((s) => {
          const d = done.includes(s.key);
          return (
            <button type="button" key={s.key} class={`step-chip ${s.key === step.key ? 'cur' : ''} ${d ? 'done' : ''}`} onClick={() => setSelected(s.key)}>
              {d ? '✓ ' : ''}{stepTitle(s)}
            </button>
          );
        })}
      </div>
      {step.kind === 'dawn'
        ? <DawnPanel key={step.key} game={g} step={step} ctx={props.ctx} num={idx + 1} total={total} onBack={() => lastBeforeDawn && setSelected(lastBeforeDawn.key)} />
        : <StepDetail key={step.key + (done.includes(step.key) ? ':done' : '')} game={g} step={step} done={done.includes(step.key)} ctx={props.ctx}
            num={idx + 1} total={total} onPrev={idx > 0 ? () => setSelected(steps[idx - 1].key) : undefined} />}
    </div>
  );
}

function DawnPanel(props: { game: Game; step: NightStep; ctx: PanelCtx; num: number; total: number; onBack: () => void }) {
  const g = props.game;
  const dead = g.players.filter((p) => hasMarker(p, 'diedtonight'));
  const alerts = keyAlerts(g, props.step, stepAlerts(g, props.step, { targets: [] }));
  const popup = useAlertPopup(alerts, SEEN_ALERTS, !g.night?.done.includes(props.step.key));
  useOverlay(props.ctx, {
    hl: Object.fromEntries(dead.map((p) => [p.id, T('Morte cette nuit', 'Died tonight')])),
    center: [T('Aube', 'Dawn'), `${T('Jour', 'Day')} ${g.nightNumber} · ${dead.length} ${T(dead.length > 1 ? 'morts' : 'mort', 'dead')}`],
    links: [],
  });
  return (
    <>
      <div class="panel-head"><Eyebrow tone="amb">{T('FIN DE LA NUIT', 'END OF NIGHT')} {g.nightNumber}</Eyebrow><h2 class="panel-title xl">{T('Le jour se lève', 'The day breaks')}</h2></div>
      <div class="dawn-box">
        <span class="muted">{dead.length ? T('Cette nuit est morte', 'Died tonight') : T('Cette nuit', 'Tonight')}</span>
        <span class="dawn-names">{dead.length ? dead.map((p) => p.name).join(', ') : T('Personne', 'Nobody')}</span>
      </div>
      <Narration lines={dead.length ? DAWN_DEATH : DAWN_NONE} names={dead.map((p) => p.name)} seed={g.nightNumber} />
      <div class="home-note">{T('Seuls les noms sont annoncés. Les rôles restent secrets. Tous les marqueurs de nuit expirés ont été retirés.', 'Only names are announced. Characters stay secret. All expired night reminders have been removed.')}</div>
      <AlertPins alerts={alerts} />
      {popup}
      <div class="grow" />
      <div class="panel-foot col">
        <button type="button" class="btn" onClick={props.onBack}>{T('Revenir sur la nuit', 'Back to the night')}</button>
        <button type="button" class="btn amber lg" onClick={() => update((d) => { completeStep(d, props.step, { targets: [] }); startDay(d); })}>{T('Commencer le jour', 'Start day')} {g.nightNumber}</button>
      </div>
    </>
  );
}

function initialData(g: Game, step: NightStep): StepAction {
  const saved = g.night?.data[step.key];
  if (saved && (g.night?.done.includes(step.key) || saved.value === true)) return structuredClone(saved);
  const p = byId(g, step.playerId);
  const rng = seedFor(g, step.key);
  switch (step.role) {
    case 'washerwoman': return pingSuggestion(g, p!.id, 'townsfolk', rng);
    case 'librarian': return pingSuggestion(g, p!.id, 'outsider', rng);
    case 'investigator': return pingSuggestion(g, p!.id, 'minion', rng);
    case 'chef': return { targets: [], value: chefNumber(g) };
    case 'empath': return { targets: [], value: empathNumber(g, p!.id) };
    case 'fortuneteller': return { targets: [], value: false };
    case 'undertaker': {
      const ex = byId(g, g.executedToday);
      return { targets: ex ? [ex.id] : [], role: ex?.role ?? null };
    }
    default: return { targets: [] };
  }
}

/** Character shown for a player (Ravenkeeper, Undertaker), when the Spy or the Recluse misregisters. */
function registeredRole(g: Game, q: Player, misreg: string[], rng: Rng): RoleId {
  if (!misreg.includes(q.id) || (q.role !== 'spy' && q.role !== 'recluse')) return q.role;
  const used = new Set(g.players.map((x) => x.role));
  const teams = q.role === 'spy' ? (['townsfolk', 'outsider'] as const) : (['minion', 'demon'] as const);
  const pool = teams.flatMap((t) => rolesOfTeam(t)).map((r) => r.id).filter((r) => !used.has(r));
  return pick(pool, rng) ?? (q.role === 'spy' ? 'washerwoman' : 'imp');
}

const TARGET_ROLES: (RoleId | undefined)[] = ['poisoner', 'monk', 'butler', 'bureaucrat', 'thief'];
/** Characters whose step gives information: true when their ability works, possibly false when they are drunk or poisoned. */
const INFO_ROLES: (RoleId | undefined)[] = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker', 'ravenkeeper'];
const allNonTravellerRoles = () =>
  (['townsfolk', 'outsider', 'minion', 'demon'] as const).flatMap((t) => rolesOfTeam(t).map((r) => r.id));

function StepDetail(props: { game: Game; step: NightStep; done: boolean; ctx: PanelCtx; num: number; total: number; onPrev?: () => void }) {
  const { game: g, step } = props;
  const p = byId(g, step.playerId);
  const [data, setDataRaw] = useState<StepAction>(() => initialData(g, step));
  const [reroll, setReroll] = useState(0);
  const [newImp, setNewImp] = useState<string | undefined>(undefined);
  const [mayorRedirect, setMayorRedirect] = useState<string | undefined>(undefined);
  const [editBluff, setEditBluff] = useState<number | null>(null);
  const setData = (d: Partial<StepAction>) => setDataRaw((prev) => ({ ...prev, ...d }));
  const impaired = !!p && isImpaired(p);
  const misreg = data.misreg ?? [];
  const isFirst = g.night?.number === 1;
  const reminder = step.role ? (isFirst ? ROLES[step.role].firstNight : ROLES[step.role].otherNight) : undefined;
  const promoted = step.role === 'imp' && data.value === true;

  const minions = g.players.filter((q) => teamOf(q) === 'minion');
  const demons = g.players.filter((q) => teamOf(q) === 'demon');
  const names = (list: typeof minions) => list.map((q) => q.name);
  const pingTeam = step.role === 'washerwoman' ? 'townsfolk' : step.role === 'librarian' ? 'outsider' : step.role === 'investigator' ? 'minion' : null;

  // ---- circle: highlights, arrows and taps
  const links: Link[] = [];
  const hl: Record<string, string> = {};
  const target = data.targets[0];
  if (p) hl[p.id] = T('Réveillé', 'Awake');
  if (step.kind === 'demoninfo' || step.kind === 'minioninfo') {
    for (const d of demons) hl[d.id] = T('Démon', 'Demon');
    for (const m of minions) { hl[m.id] = T('Sbire', 'Minion'); for (const d of demons) links.push({ from: d.id, to: m.id, tone: 'mal', label: T('Sbire', 'Minion') }); }
  } else if (step.role === 'empath' && p) {
    for (const nb of aliveNeighbours(g, p.id)) { hl[nb.id] = T('Voisin', 'Neighbour'); links.push({ from: p.id, to: nb.id, tone: 'amb', label: T('voisin', 'neighbour'), dashed: true }); }
  } else if (p) {
    for (const t of data.targets) if (t !== p.id) hl[t] = pingTeam || step.role === 'fortuneteller' ? T('Joueur', 'Player') : T('Cible', 'Target');
    const tone = step.role === 'monk' ? 'bon' : step.role === 'butler' ? 'neu' : step.role === 'bureaucrat' || step.role === 'thief' ? 'amb' : 'mal';
    const label = { poisoner: T('empoisonne', 'poisons'), monk: T('protège', 'protects'), butler: T('maître', 'master'), imp: T('tue', 'kills') }[step.role as string];
    if (target && label && target !== p.id) links.push({ from: p.id, to: target, tone, label, dashed: step.role === 'butler' });
    if (step.role === 'imp' && target) {
      const t = byId(g, target);
      const prot = t?.markers.find((m) => m.key === 'protected');
      if (prot?.by && prot.by !== target) links.push({ from: prot.by, to: target, tone: 'bon', label: isImpaired(byId(g, prot.by)!) ? T('protège · sans effet', 'protects · no effect') : T('protège', 'protects'), dashed: true });
    }
  }
  const redHerring = g.players.find((q) => hasMarker(q, 'redherring'));
  if (step.role === 'fortuneteller') {
    const tag = (id: string, label: string) => { hl[id] = hl[id] && hl[id] !== label ? `${hl[id]} · ${label}` : label; };
    for (const d of g.players.filter((q) => registersDemon(q, misreg))) tag(d.id, T('Démon', 'Demon'));
    if (redHerring) tag(redHerring.id, T('Faux positif', 'Red herring'));
  }
  const stepNames = new Set(links.map((l) => `${l.from}>${l.to}`));
  const standing = standingLinks(g).filter((l) => !stepNames.has(`${l.from}>${l.to}`)).map((l) => ({ ...l, op: 0.45 }));
  const past = step.kind === 'role' && step.role ? nightHistory(g, { role: step.role, pastOnly: true }) : [];
  useOverlay(props.ctx, {
    hl, links: [...links, ...standing], trail: historyTrail(past),
    center: [`${T('Nuit', 'Night')} ${g.night?.number}`, `${T('Étape', 'Step')} ${props.num} ${T('sur', 'of')} ${props.total}`, stepTitle(step)],
  });

  const maxT = TARGET_ROLES.includes(step.role) || (step.role === 'imp' && !promoted) || step.role === 'ravenkeeper' ? 1 : step.role === 'fortuneteller' || pingTeam ? 2 : 0;
  const exclude = step.role === 'poisoner' || step.role === 'imp' || step.role === 'ravenkeeper' || step.role === 'fortuneteller' ? [] : p ? [p.id] : [];
  const setTargets = (t: string[]) => {
    if (step.role === 'fortuneteller') setData({ targets: t, value: fortuneAnswer(g, t, misreg) });
    else if (step.role === 'ravenkeeper') {
      const q = byId(g, t[0]);
      setData({ targets: t, role: q ? registeredRole(g, q, misreg, seedFor(g, step.key + reroll)) : null });
    }
    else setData({ targets: t });
  };
  useTap(props.ctx, (id) => {
    if (!maxT || exclude.includes(id) || props.done) return false;
    const cur = data.targets;
    if (cur.includes(id)) setTargets(cur.filter((x) => x !== id));
    else if (maxT === 1) setTargets([id]);
    else setTargets(cur.length < maxT ? [...cur, id] : [...cur.slice(1), id]);
    return true;
  });

  const validate = () => lieForbidden || update((d) => {
    const s = nightSteps(d).find((x) => x.key === step.key) ?? step;
    completeStep(d, s, { ...data, lie: isInfo && isLie ? true : undefined }, { newImpId: newImp, mayorRedirect });
  });
  const reopen = () => update((d) => uncompleteStep(d, step.key));

  const recompute = (nextMisreg: string[]) => {
    if (step.role === 'chef') setData({ misreg: nextMisreg, value: chefNumber(g, nextMisreg) });
    else if (step.role === 'empath') setData({ misreg: nextMisreg, value: empathNumber(g, p!.id, nextMisreg) });
    else if (step.role === 'fortuneteller') setData({ misreg: nextMisreg, value: fortuneAnswer(g, data.targets, nextMisreg) });
    else if (pingTeam) setData({ ...pingSuggestion(g, p!.id, pingTeam, seedFor(g, step.key + reroll), nextMisreg), misreg: nextMisreg });
    else if (step.role === 'ravenkeeper' || step.role === 'undertaker') {
      const t = byId(g, data.targets[0]);
      setData({ misreg: nextMisreg, role: t ? registeredRole(g, t, nextMisreg, seedFor(g, step.key + reroll)) : data.role });
    }
    else setData({ misreg: nextMisreg });
  };
  const misregToggles = useMemo(() => misregCandidates(g), [g]);
  const showMisreg = ['chef', 'empath', 'fortuneteller', 'washerwoman', 'librarian', 'investigator', 'ravenkeeper', 'undertaker'].includes(step.role ?? '') && misregToggles.length > 0;

  // ---- true vs given information
  const isInfo = INFO_ROLES.includes(step.role) && step.kind === 'role';
  const shownTarget = byId(g, data.targets[0]);
  const truthNumber = step.role === 'chef' ? chefNumber(g, misreg) : step.role === 'empath' && p ? empathNumber(g, p.id, misreg) : undefined;
  const truthAnswer = step.role === 'fortuneteller' ? fortuneAnswer(g, data.targets, misreg) : undefined;
  const truthPing = pingTeam && p ? pingSuggestion(g, p.id, pingTeam, seedFor(g, step.key), misreg) : undefined;
  /** Is what the Storyteller is about to say false? */
  const isLie = (() => {
    if (!isInfo || !p) return false;
    if (truthNumber !== undefined) return Number(data.value) !== truthNumber;
    if (step.role === 'fortuneteller') return data.targets.length === 2 && !!data.value !== truthAnswer;
    if (pingTeam) {
      if (!data.role) return !!truthPing?.role;
      if (!truthPing?.role) return true;
      const okTarget = (id: string) => {
        const q = byId(g, id);
        if (!q) return false;
        if (misreg.includes(q.id)) return (q.role === 'spy' && pingTeam !== 'minion') || (q.role === 'recluse' && pingTeam === 'minion');
        return q.role === data.role;
      };
      return data.targets.length > 0 && !data.targets.some(okTarget);
    }
    if (step.role === 'undertaker' || step.role === 'ravenkeeper') {
      if (!shownTarget || !data.role) return false;
      return shownTarget.role !== data.role && !(misreg.includes(shownTarget.id) && (shownTarget.role === 'spy' || shownTarget.role === 'recluse'));
    }
    return false;
  })();
  /** Clashes with what players were already told. */
  const conflicts = isInfo && p ? infoConflicts(g, step, data) : [];
  /** A healthy, sober character always gets the truth. */
  const lieForbidden = isInfo && !impaired && isLie;
  const blockedMsg = lieForbidden ? T('Info fausse impossible : la capacité fonctionne. Donnez l’info juste.', 'False info not allowed: the ability works. Give the true info.') : '';

  /** Characters the Storyteller may show: only those in play when the info must be true, any otherwise (drunk/poisoned, Spy/Recluse registering). */
  const unrestricted = impaired || misreg.length > 0;
  const offerable = (roles: RoleId[]) => (unrestricted ? roles : roles.filter((r) => g.players.some((q) => q.role === r)));

  // ---- what the card shows to the player
  const card = (): CardContent | null => {
    const handTo = p?.name;
    switch (step.kind) {
      case 'minioninfo': return { handTo: names(minions).join(' & '), eyebrow: T('CECI EST LE DÉMON', 'THIS IS THE DEMON'), eyebrowTone: 'mal', players: names(demons), text: `${T('Sbires', 'Minions')} : ${names(minions).join(', ')}. ${T('Allez voir le Démon en privé : il connaît 3 personnages absents que vous pouvez bluffer.', 'Go and see the Demon in private: they know 3 characters not in play you can bluff.')}` };
      case 'demoninfo': return { handTo: names(demons).join(' & '), title: T('Tes Sbires', 'Your Minions'), players: names(minions), roles: g.bluffs, text: T('Ces personnages ne sont pas en jeu (bluffs). Transmets-les discrètement à tes Sbires pour qu’ils bluffent sans risque.', 'These characters are not in play (bluffs). Pass them on discreetly to your Minions so they can bluff safely.') };
    }
    switch (step.role) {
      case 'washerwoman': case 'librarian': case 'investigator':
        if (!data.role) return { handTo, title: T('Aucun Étranger en jeu', 'No Outsiders in play'), number: 0 };
        return { handTo, title: T('L’un de ces joueurs est', 'One of these players is'), roles: [data.role], players: data.targets.map((t) => nameOf(g, t)) };
      case 'chef': return { handTo, title: T('Paires de joueurs maléfiques côte à côte :', 'Pairs of evil players sitting together:'), number: Number(data.value ?? 0) };
      case 'empath': return { handTo, title: T('Parmi tes deux voisins vivants, maléfiques :', 'Among your two living neighbours, evil ones:'), number: Number(data.value ?? 0) };
      case 'fortuneteller': return { handTo, yesno: !!data.value, players: data.targets.map((t) => nameOf(g, t)) };
      case 'undertaker': case 'ravenkeeper': return data.role ? { handTo, title: step.role === 'undertaker' ? T('Le joueur exécuté était', 'The executed player was') : nameOf(g, data.targets[0]), roles: [data.role] } : null;
      case 'scarletwoman': return p ? { handTo, reveal: { role: 'imp', alignment: 'evil' } } : null;
      case 'imp': return promoted && p ? { handTo, reveal: { role: 'imp', alignment: 'evil' } } : null;
    }
    return null;
  };
  const cardContent = card();
  const cardLabel = step.kind === 'minioninfo' ? T('Montrer aux Sbires', 'Show the Minions') : step.kind === 'demoninfo' ? `${T('Montrer à', 'Show')} ${names(demons).join(' & ')}` : `${T('Montrer à', 'Show')} ${p?.name ?? ''}`;

  const poisonedBy = p?.markers.find((m) => m.key === 'poisoned')?.by;

  // ---- imp resolution lines
  const impLines = (() => {
    if (step.role !== 'imp' || promoted) return null;
    const t = byId(g, data.targets[0]);
    if (!t) return null;
    const lines: string[] = [];
    if (p && isImpaired(p)) lines.push(T('Le Diable est ivre ou empoisonné : pas de mort.', 'The Imp is drunk or poisoned: no death.'));
    if (!t.alive) lines.push(`${t.name} ${T('est déjà mort.', 'is already dead.')}`);
    const monkWorks = markerWorks(g, t, 'protected');
    if (hasMarker(t, 'protected')) {
      lines.push(monkWorks ? `${t.name} ${T('est protégé par le Moine.', 'is protected by the Monk.')}`
        : `${T('Le Moine qui protège', 'The Monk protecting')} ${t.name} ${T('est ivre ou empoisonné : sans effet.', 'is drunk or poisoned: no effect.')}`);
    }
    if (t.role === 'soldier') lines.push(isImpaired(t) ? `${T('Soldat', 'Soldier')} ${T('empoisonné : il meurt.', 'poisoned: they die.')}` : `${T('Le Soldat est protégé.', 'The Soldier is protected.')}`);
    if (t.role === 'mayor' && !isImpaired(t)) lines.push(T('C’est le Maire : vous pouvez faire mourir quelqu’un d’autre à sa place.', 'It is the Mayor: you may have someone else die instead.'));
    const safe = (p && isImpaired(p)) || !t.alive || monkWorks || (t.role === 'soldier' && !isImpaired(t));
    if (t.id === p?.id && monkWorks) lines.push(T('→ Personne ne meurt (pas de passation).', '→ Nobody dies (no star-pass).'));
    if (t.id !== p?.id) lines.push(safe ? T('→ Personne ne meurt.', '→ Nobody dies.') : `→ ${t.name} ${T('meurt cette nuit.', 'dies tonight.')}`);
    return { lines, t };
  })();

  const alerts = keyAlerts(g, step, stepAlerts(g, step, data));
  const popup = useAlertPopup(alerts, SEEN_ALERTS, !props.done);

  return (
    <>
      {popup}
      <div class="step-title">
        <h2 class="panel-title xl">{stepTitle(step)}</h2>
        <span class="muted">
          {step.role === 'imp' && target ? `${p?.name} · ${T('cible choisie', 'target chosen')} : ${nameOf(g, target)}` :
            step.role === 'empath' && p ? `${p.name} · ${T('voisins vivants', 'living neighbours')} : ${aliveNeighbours(g, p.id).map((q) => q.name).join(', ')}` :
            step.kind === 'demoninfo' ? names(demons).join(', ') + (demons[0] ? ` · ${roleName(demons[0].role)}` : '') :
            p ? `${p.name}${p.role === 'drunk' ? ` · ${T('Ivrogne', 'Drunk')}` : ''}${!p.alive ? ' · ☠' : ''}` : ''}
          {props.done && <span class="tag ok"> ✓ {T('Fait', 'Done')}</span>}
        </span>
      </div>

      <AlertPins alerts={alerts} />

      <div class="instr">
        {step.kind === 'dusk' ? T('Demandez à tous les joueurs de fermer les yeux.', 'Ask all players to close their eyes.') :
          step.kind === 'minioninfo' ? T('Réveillez tous les Sbires. Montrez-leur le Démon et laissez-les se reconnaître. Rappelez-leur d’aller demander les 3 bluffs au Démon dans la journée.', 'Wake all Minions. Show them the Demon and let them see each other. Remind them to ask the Demon for the 3 bluffs during the day.') :
          step.kind === 'demoninfo' ? T('Réveillez le Démon. Montrez-lui ses Sbires, puis 3 personnages absents (bluffs). Rappelez-lui de les transmettre à ses Sbires.', 'Wake the Demon. Show them their Minions, then 3 characters not in play (bluffs). Remind them to pass them on to their Minions.') :
          step.role === 'spy' ? T('Désactivez le mode masqué et montrez le Grimoire à l’Espion.', 'Turn off hidden mode and show the Grimoire to the Spy.') :
          reminder ? loc(reminder) : ''}
      </div>
      {step.kind === 'dusk' && <Narration lines={DUSK} seed={g.nightNumber - 1} />}

      {isInfo && p && (
        <details class={`verdict ${impaired ? 'lie' : 'truth'}`}>
          <summary><b class="verdict-tag">{impaired ? T('MENSONGE POSSIBLE', 'MAY LIE') : T('VÉRITÉ OBLIGATOIRE', 'TRUTH ONLY')}</b></summary>
          <span>
            {impaired
              ? <>{p.name} {p.role === 'drunk' ? T('est l’Ivrogne', 'is the Drunk') : T('est empoisonné(e)', 'is poisoned')}{poisonedBy ? ` (${T('par', 'by')} ${nameOf(g, poisonedBy)})` : ''}. {T('Sa capacité ne fonctionne pas : vous pouvez lui donner une info fausse mais plausible (ou vraie, au choix).', 'Their ability does not work: you may give false but plausible info (or true, your choice).')}</>
              : <>{T('Sa capacité fonctionne : l’information donnée doit être juste.', 'Their ability works: the information must be true.')}{showMisreg && (() => {
                  const names = [...new Set(misregToggles.map((q) => roleName(q.role)))].join(T(' ou ', ' or '));
                  return ` ${T(`Seul ${names} qui se perçoit différemment peut la modifier (interrupteurs ci-dessous).`, `Only the ${names} registering differently can change it (toggles below).`)}`;
                })()}</>}
          </span>
        </details>
      )}
      {conflicts.length > 0 && (
        <div class="banner warn small conflicts"><b class="mono">!</b><span>
          <b>{T('Contredit une info déjà donnée', 'Contradicts information already given')}</b>
          <ul class="conflict-list">{conflicts.map((c, i) => <li key={i}>{loc(c)}</li>)}</ul>
          <span class="muted">{T('Les joueurs comparent leurs infos : ils risquent de repérer le mensonge.', 'Players compare notes: they may spot the lie.')}</span>
        </span></div>
      )}

      {past.length > 0 && (
        <div class="trail-hint"><span class="mini tone-amb"><span class="mini-n">N</span></span>{T('Jetons sur le cercle : ce que ce rôle a déjà désigné ou appris (n° de nuit). Pointillé : ivre/empoisonné, ✗ : info fausse.', 'Tokens on the circle: what this character already picked or learnt (night number). Dashed: drunk/poisoned, ✗: false info.')}</div>
      )}

      {showMisreg && (
        <div class="misreg">
          <div class="eyebrow">{T('PERCEPTION DE L’ESPION / DU RECLUS', 'SPY / RECLUSE REGISTRATION')}</div>
          {misregToggles.map((q) => (
            <div key={q.id} class="row-line">
              <span>{q.name} ({roleName(q.role)}) — {q.role === 'spy' ? T('perçu comme Bon / Villageois', 'registers as good / Townsfolk') : T('perçu comme Maléfique / Démon / Sbire', 'registers as evil / Demon / Minion')}</span>
              <Switch on={misreg.includes(q.id)} onChange={(on) => recompute(on ? [...misreg, q.id] : misreg.filter((x) => x !== q.id))} />
            </div>
          ))}
        </div>
      )}

      {step.kind === 'minioninfo' && (
        <div class="info-block">
          <div class="eyebrow">{T('DÉMON', 'DEMON')}</div><div class="chips-row">{demons.map((d) => <span key={d.id} class="name-chip mal">{d.name}</span>)}</div>
          <div class="eyebrow">{T('SBIRES', 'MINIONS')}</div><div class="chips-row">{minions.map((m) => <span key={m.id} class="name-chip mal">{m.name} · {roleName(m.role)}</span>)}</div>
        </div>
      )}

      {step.kind === 'demoninfo' && (
        <div class="info-block">
          <div class="eyebrow">{T('SES SBIRES', 'THEIR MINIONS')}</div>
          <div class="chips-row">{minions.map((m) => <span key={m.id} class="name-chip mal">{m.name}</span>)}</div>
          <div class="eyebrow gap-top">{T('BLUFFS', 'BLUFFS')}</div>
          <div class="chips-row">{g.bluffs.map((b, i) => <button type="button" key={b} class={`bluff tone-${roleSide(b)}`} onClick={() => setEditBluff(i)}>{roleName(b)}</button>)}</div>
          {editBluff !== null && (
            <div class="inline-picker">
              <RolePicker roles={notInPlay(g).filter((r) => !g.bluffs.includes(r) || r === g.bluffs[editBluff])} value={g.bluffs[editBluff]}
                onChange={(r) => { update((d) => { d.bluffs[editBluff] = r; }); setEditBluff(null); }} />
            </div>
          )}
        </div>
      )}

      {/* --- choose-a-player roles --- */}
      {TARGET_ROLES.includes(step.role) && (
        <PlayerPicker game={g} value={data.targets} onChange={setTargets} exclude={exclude} />
      )}

      {/* --- 1-of-2 pings --- */}
      {pingTeam && (
        <div class="info-block">
          <div class="between"><div class="eyebrow">{T('PERSONNAGE MONTRÉ', 'CHARACTER SHOWN')}</div>
            <div class="row">
              <button type="button" class="btn xs" onClick={() => { const n = reroll + 1; setReroll(n); setData(pingSuggestion(g, p!.id, pingTeam, seedFor(g, step.key + n), misreg)); }}>{T('Autre vraie info', 'Other true info')}</button>
              {impaired && <button type="button" class="btn xs" onClick={() => { const n = reroll + 1; setReroll(n); setData(falsePing(g, p!.id, pingTeam, seeded(`${g.id}${step.key}f${n}`))); }}>{T('Fausse info', 'False info')}</button>}
            </div></div>
          <div class="truth-line"><span class="tg-label">{T('Vérité', 'Truth')} :</span> {(() => {
            const real = g.players.filter((q) => q.id !== p!.id && !isTraveller(q) && (misreg.includes(q.id) ? (q.role === 'spy' && pingTeam !== 'minion') || (q.role === 'recluse' && pingTeam === 'minion') : teamOf(q) === pingTeam));
            return real.length ? real.map((q) => `${q.name} (${roleName(q.role)})`).join(', ') : T('aucun joueur de ce type', 'no such player');
          })()}</div>
          <RolePicker roles={offerable(rolesOfTeam(pingTeam).map((r) => r.id))} value={data.role} onChange={(r) => setData({ role: r })} />
          {step.role === 'librarian' && <button type="button" class={`btn sm ${data.role === null ? 'amber' : ''}`} onClick={() => setData({ role: null, targets: [] })}>0 — {T('aucun Étranger', 'no Outsiders')}</button>}
          {data.role && (
            <>
              <div class="eyebrow gap-top">{T('DEUX JOUEURS (DONT UN A CE RÔLE)', 'TWO PLAYERS (ONE HAS THIS CHARACTER)')}</div>
              <PlayerPicker game={g} value={data.targets} onChange={setTargets} max={2} exclude={exclude} />
            </>
          )}
          {isLie && data.role && <div class="info-box lie-box">{T('Aucun de ces joueurs n’a ce rôle : c’est une info fausse.', 'Neither player has this character: this is false info.')}</div>}
          {isLie && !data.role && <div class="info-box lie-box">{T('Il y a bien un joueur de ce type : « 0 » serait une info fausse.', 'Such a player exists: “0” would be false info.')}</div>}
        </div>
      )}

      {(step.role === 'chef' || step.role === 'empath') && (() => {
        const max = step.role === 'empath' ? 2 : Math.min(7, g.players.length);
        const truth = truthNumber ?? 0;
        // Spy / Recluse may or may not register: every number they can produce is true.
        const count = (m: string[]) => step.role === 'chef' ? chefNumber(g, m) : p ? empathNumber(g, p.id, m) : 0;
        const options = numberOptions(g, count, misreg);
        return (
          <div class="info-block">
            <TruthGiven truth={String(truth)} given={String(data.value ?? '—')} lie={isLie} impaired={impaired} />
            <div class={`num-tiles n${max + 1}`}>
              {Array.from({ length: max + 1 }, (_, v) => (
                <button type="button" key={v} disabled={!impaired && !options.has(v)} class={`num-tile ${Number(data.value) === v ? 'on' : ''} ${v === truth ? 'truth' : ''}`}
                  onClick={() => setData(!impaired && options.has(v) ? { value: v, misreg: options.get(v) } : { value: v })}>{v}</button>
              ))}
            </div>
            {impaired && <button type="button" class="btn outline sm" onClick={() => {
              const opts = Array.from({ length: max + 1 }, (_, v) => v).filter((v) => !options.has(v));
              const v = pick(opts, seeded(`${g.id}${step.key}fake${reroll}`)); setReroll(reroll + 1); if (v !== undefined) setData({ value: v });
            }}>{T('Générer une fausse info plausible', 'Generate plausible false info')}</button>}
          </div>
        );
      })()}

      {step.role === 'fortuneteller' && (
        <div class="info-block">
          <div class="eyebrow">{T('LES 2 JOUEURS DÉSIGNÉS', 'THE 2 CHOSEN PLAYERS')}</div>
          <PlayerPicker game={g} value={data.targets} max={2} onChange={setTargets}
            sub={(q) => registersDemon(q, misreg) ? T('Démon', 'Demon') : hasMarker(q, 'redherring') && T('Faux positif', 'Red herring')} />
          {redHerring && <div class="redherring-box"><b>{T('Faux positif', 'Red herring')}</b> : {redHerring.name}<span class="muted"> · {T('sera pris pour le Démon', 'registers as the Demon')}</span></div>}
          {data.targets.length === 2 && (() => {
            const demon = data.targets.map((t) => byId(g, t)).find((q) => q && registersDemon(q, misreg));
            const rh = data.targets.map((t) => byId(g, t)).find((q) => q && hasMarker(q, 'redherring'));
            const why = demon ? `${T('Démon', 'Demon')} : ${demon.name}` : rh ? `${T('Faux positif', 'Red herring')} : ${rh.name}` : T('ni Démon ni faux positif', 'no Demon nor red herring');
            return <TruthGiven truth={truthAnswer ? T('OUI', 'YES') : T('NON', 'NO')} detail={why} given={data.value ? T('OUI', 'YES') : T('NON', 'NO')} lie={isLie} impaired={impaired} />;
          })()}
          <div class="seg"><button type="button" disabled={!impaired && data.targets.length === 2} class={data.value ? 'on tone-bon' : ''} onClick={() => setData({ value: true })}>{T('Oui', 'Yes')}</button><button type="button" disabled={!impaired && data.targets.length === 2} class={!data.value ? 'on tone-mal' : ''} onClick={() => setData({ value: false })}>{T('Non', 'No')}</button></div>
        </div>
      )}

      {step.role === 'undertaker' && (
        <div class="info-block">
          <div class="small">{T('Exécuté aujourd’hui', 'Executed today')} : <b>{nameOf(g, g.executedToday)}</b> ({roleName(byId(g, g.executedToday)?.role)})</div>
          <TruthGiven truth={roleName(byId(g, g.executedToday)?.role)} given={roleName(data.role)} lie={isLie} impaired={impaired} />
          <div class="eyebrow">{T('PERSONNAGE MONTRÉ', 'CHARACTER SHOWN')}</div>
          <RolePicker roles={offerable(allNonTravellerRoles())} value={data.role} onChange={(r) => setData({ role: r })} />
        </div>
      )}

      {step.role === 'ravenkeeper' && (
        <div class="info-block">
          <div class="eyebrow">{T('JOUEUR DÉSIGNÉ', 'CHOSEN PLAYER')}</div>
          <PlayerPicker game={g} value={data.targets} onChange={setTargets} />
          {data.targets[0] && (<><TruthGiven truth={roleName(shownTarget?.role)} given={roleName(data.role)} lie={isLie} impaired={impaired} />
            <div class="eyebrow gap-top">{T('PERSONNAGE MONTRÉ', 'CHARACTER SHOWN')}</div>
            <RolePicker roles={offerable(allNonTravellerRoles())} value={data.role} onChange={(r) => setData({ role: r })} /></>)}
        </div>
      )}

      {step.role === 'imp' && !promoted && (
        <>
          <PlayerPicker game={g} value={data.targets} onChange={setTargets} />
          {data.targets[0] === p?.id && (
            <div class="info-block">
              <div class="info-box">{T('Le Diable se cible lui-même : un Sbire devient le Diable.', 'The Imp targets themself: a Minion becomes the Imp.')}</div>
              <PlayerPicker game={g} value={[newImp ?? starpassHeir(g, p!.id)?.id ?? '']} onChange={(t) => setNewImp(t[0])} filter={(q) => q.alive && teamOf(q) === 'minion'} />
            </div>
          )}
          {impLines && (
            <div class="resolution">
              <div class="eyebrow">{T('RÉSOLUTION', 'RESOLUTION')}</div>
              {impLines.lines.map((l, i) => <div key={i} class={l.startsWith('→') ? 'res-final' : 'res-line'}>{l.startsWith('→') ? <><span class="tone-mal">→</span><span>{l.slice(2)}</span></> : <><span class="amber-text">{i + 1}</span><span>{l}</span></>}</div>)}
            </div>
          )}
          {impLines?.t.role === 'mayor' && !isImpaired(impLines.t) && (
            <div class="info-block"><div class="eyebrow">{T('FAIRE MOURIR QUELQU’UN D’AUTRE (OPTIONNEL)', 'HAVE SOMEONE ELSE DIE (OPTIONAL)')}</div>
              <PlayerPicker game={g} value={mayorRedirect ? [mayorRedirect] : []} onChange={(x) => setMayorRedirect(x[0])} filter={(q) => q.id !== impLines.t.id} />
              <div class="small muted">{T('Un joueur mort, le Soldat ou un joueur protégé par le Moine ne meurt pas.', 'A dead player, the Soldier or a Monk-protected player does not die.')}</div></div>
          )}
          {data.result && <div class="banner small"><i class="bdot amber" /><span>{loc(data.result)}</span></div>}
        </>
      )}
      {promoted && <div class="instr">{T('Réveillez ce joueur et montrez-lui qu’il est désormais le Diable. Il ne tue pas cette nuit.', 'Wake this player and show them they are now the Imp. They do not kill tonight.')}</div>}

      {step.role === 'spy' && (
        <div class="info-block">
          <div class="eyebrow">{T('CE QUE VOIT L’ESPION', 'WHAT THE SPY SEES')}</div>
          <div class="small muted">{T('Le Grimoire montre tout : personnages, marqueurs (poison, ivresse, Maître du Majordome, faux positif…). C’est normal : l’Espion voit le Grimoire en entier.', 'The Grimoire shows everything: characters and reminders (poison, drunkenness, Butler’s master, red herring…). That is expected: the Spy sees the whole Grimoire.')}</div>
          <div class="eyebrow gap-top">{T('PERSONNAGES ABSENTS', 'CHARACTERS NOT IN PLAY')}</div>
          <div class="chips-row">{notInPlay(g).map((r) => <span key={r} class={`bluff-chip tone-${roleSide(r)} ${g.bluffs.includes(r) ? 'is-bluff' : ''}`}>{roleName(r)}{g.bluffs.includes(r) ? ` · ${T('bluff', 'bluff')}` : ''}</span>)}</div>
        </div>
      )}

      <div class="grow" />
      <div class="panel-foot col">
      {blockedMsg && <div class="banner bad small"><b class="mono">!</b><span>{blockedMsg}</span></div>}
      {(cardContent || !props.done) && (
        <div class="row">
          {cardContent && <button type="button" class="btn grow" onClick={() => showCard(cardContent)}>{cardLabel}</button>}
          {!props.done && step.kind !== 'dusk' && <button type="button" class="btn" onClick={() => update((d) => completeStep(d, step, { targets: [] }))}>{T('Passer', 'Skip')}</button>}
        </div>
      )}
      <div class="grid-nav">
        <button type="button" class="btn" disabled={!props.onPrev} onClick={props.onPrev}>← {T('Préc.', 'Prev')}</button>
        {props.done
          ? <button type="button" class="btn lg" onClick={reopen}>{T('Rouvrir l’étape', 'Reopen step')}</button>
          : <button type="button" class="btn amber lg" disabled={lieForbidden} onClick={validate}>{step.role === 'imp' && impLines && impLines.lines.some((l) => l.startsWith('→ ') && !l.includes('Personne') && !l.includes('Nobody')) ? T('Confirmer la mort', 'Confirm the death') : `${T('Étape faite', 'Step done')} →`}</button>}
      </div>
      </div>
    </>
  );
}

/** "True info" next to "info given": the Storyteller sees at a glance whether they are about to lie. */
function TruthGiven(props: { truth: string; given: string; detail?: string; lie: boolean; impaired: boolean }) {
  return (
    <div class="truthgiven">
      <div class="tg truth">
        <span class="tg-label">{T('Info juste', 'True info')} :</span> <b>{props.truth}</b>
        {props.detail && <i>{props.detail}</i>}
      </div>
      <div class={`tg given ${props.lie ? 'lie' : ''}`}>
        <span class="tg-label">{T('Info donnée', 'Info given')} :</span> <b>{props.given}</b>
        <i>{props.lie ? (props.impaired ? T('fausse', 'false') : T('FAUSSE — interdit', 'FALSE — not allowed')) : T('juste', 'true')}</i>
      </div>
    </div>
  );
}
