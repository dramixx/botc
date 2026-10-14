import { useEffect, useState } from 'preact/hooks';
import {
  byId, endDay, executeNow, hasMarker, isImpaired, isTraveller, killPlayer, nameOf, nominate, recordVote,
  nominationNeeded, slayerShot, startNight, teamOf, voteWeight,
} from '../game/engine';
import { setLiveVote } from '../game/liveClient';
import { update } from '../game/store';
import type { Game, Nomination, Player } from '../game/types';
import { T, loc } from '../i18n';
import { type Alert, executionAlerts, noExecutionAlerts, unvotedAlerts } from '../game/alerts';
import { AlertScreen, HoldButton } from './Alerts';
import { type PanelCtx, useAutoHide, useOverlay, useTap } from './hooks';
import { EXECUTION } from '../data/guide';
import { DayTimer, PleaTimer } from './DayTimer';
import { Narration } from './Guide';
import { Eyebrow, Modal, PlayerPicker, Switch, toast } from './ui';

type Mode = { k: 'idle' } | { k: 'nominate'; exile?: boolean } | { k: 'vote'; i: number } | { k: 'end' };

export function DayPanel(props: { game: Game; ctx: PanelCtx }) {
  const g = props.game;
  const day = g.day!;
  const [mode, setMode] = useState<Mode>({ k: 'idle' });
  const back = () => setMode({ k: 'idle' });

  if (day.ended) return <EndedPanel g={g} ctx={props.ctx} />;
  if (mode.k === 'nominate') return <NominatePanel g={g} ctx={props.ctx} exile={mode.exile} onCancel={back} onVote={(i) => setMode({ k: 'vote', i })} onExecuted={back} />;
  if (mode.k === 'vote' && day.nominations[mode.i]) return <VotePanel g={g} ctx={props.ctx} index={mode.i} onDone={back} />;
  if (mode.k === 'end') return <EndDayPanel g={g} ctx={props.ctx} onBack={back} onExile={() => setMode({ k: 'nominate', exile: true })} />;
  return <IdlePanel g={g} ctx={props.ctx} onNominate={(exile) => setMode({ k: 'nominate', exile })} onVote={(i) => setMode({ k: 'vote', i })} onEnd={() => setMode({ k: 'end' })} />;
}

// --- idle ---------------------------------------------------------------------

function IdlePanel(props: { g: Game; ctx: PanelCtx; onNominate: (exile?: boolean) => void; onVote: (i: number) => void; onEnd: () => void }) {
  const { g } = props;
  const day = g.day!;
  const [slaying, setSlaying] = useState(false);
  const [killing, setKilling] = useState(false);
  const block = byId(g, day.blockId);
  const virgin = g.players.find((p) => p.role === 'virgin');
  const travellers = g.players.filter(isTraveller);
  useOverlay(props.ctx, undefined);

  return (
    <div class="panel-col">
      <div class="panel-head"><Eyebrow tone="amb">{T('JOUR', 'DAY')} {day.number}</Eyebrow><h2 class="panel-title">{T('Débats et nominations', 'Debates and nominations')}</h2></div>
      <DayTimer game={g} />
      <div class="grid-2 tight">
        <div class="stat-box"><span>{T('Bûcher', 'Block')}</span><b>{block ? `${block.name} (${day.blockVotes})` : T('Personne', 'Nobody')}</b></div>
        <div class="stat-box"><span>{T('Nominations', 'Nominations')}</span><b>{day.nominations.length} {T('aujourd’hui', 'today')}</b></div>
      </div>
      {day.nominations.length === 0 ? (
        <div class="dashed-hint center">{T('Aucune nomination pour l’instant.', 'No nominations yet.')}<br />{T('Touchez « Nommer » quand un joueur nomine.', 'Tap “Nominate” when a player nominates.')}</div>
      ) : (
        <div class="stack-xs">
          {day.nominations.map((n, i) => <NominationRow key={i} g={g} n={n} onVote={() => props.onVote(i)} />)}
        </div>
      )}
      {!props.ctx.hidden && <div class="stack-xs">
        <div class="eyebrow">{T('CAPACITÉS DE JOUR', 'DAY ABILITIES')}</div>
        {virgin && <div class="row-line"><span><b>{loc(ROLE_NAME_VIRGIN)}</b> · {virgin.name}</span><span class={hasMarker(virgin, 'used') ? 'muted' : 'amber-text'}>{hasMarker(virgin, 'used') ? T('utilisée', 'used') : T('intacte', 'intact')}</span></div>}
        <button type="button" class="row-line btn-row" onClick={() => setSlaying(true)}><span><b>{T('Pourfendeur', 'Slayer')}</b> · {T('tir', 'shot')}</span><span class="muted">›</span></button>
        <button type="button" class="row-line btn-row" onClick={() => setKilling(true)}><span><b>{T('Mort / capacité', 'Death / ability')}</b></span><span class="muted">›</span></button>
        {travellers.length > 0 && <button type="button" class="row-line btn-row" onClick={() => props.onNominate(true)}><span><b>{T('Exil', 'Exile')}</b> {T('d’un Voyageur', 'of a Traveller')}</span><span class="muted">{travellers.map((t) => t.name).join(', ')}</span></button>}
      </div>}
      <div class="grow" />
      <div class="panel-foot col">
        <button type="button" class="btn amber lg" onClick={() => props.onNominate()}>{T('Nommer', 'Nominate')}</button>
        <button type="button" class="btn" onClick={props.onEnd}>{T('Terminer le jour', 'End the day')}</button>
      </div>
      {slaying && <SlayerModal g={g} onClose={() => setSlaying(false)} />}
      {killing && <KillModal g={g} onClose={() => setKilling(false)} />}
    </div>
  );
}
const ROLE_NAME_VIRGIN = { fr: 'Vierge', en: 'Virgin' };

function NominationRow(props: { g: Game; n: Nomination; onVote: () => void }) {
  const { g, n } = props;
  const needed = nominationNeeded(g, n);
  return (
    <button type="button" class={`nom-row ${n.total !== null && n.total >= needed ? 'passed' : ''}`} onClick={props.onVote}>
      <span class="grow-text"><b>{nameOf(g, n.nominator)} → {nameOf(g, n.nominee)}</b>{n.exile && <span class="tag"> ✈ {T('Exil', 'Exile')}</span>}</span>
      <span class="mono">{n.total === null ? '—' : n.total}</span>
      <span class="small muted">{n.total === null ? T('à voter', 'to vote') : T('revoter', 're-vote')}</span>
    </button>
  );
}

// --- nomination ---------------------------------------------------------------

function NominatePanel(props: { g: Game; ctx: PanelCtx; exile?: boolean; onCancel: () => void; onVote: (i: number) => void; onExecuted: () => void }) {
  const { g } = props;
  const noms = g.day!.nominations;
  const [nominator, setNominator] = useState<string | null>(null);
  const [nominee, setNominee] = useState<string | null>(null);
  const [virgin, setVirgin] = useState<{ index: number; nominator: string; spy?: boolean } | null>(null);
  // Calling for an exile is not a nomination: it doesn't use up the player's nomination, and the dead may do it.
  const nominated = (id: string) => noms.some((n) => n.nominator === id && n.exile === !!props.exile);
  const wasNominated = (id: string) => noms.some((n) => n.nominee === id && n.exile === !!props.exile);
  const canNominate = (p: Player) => props.exile || p.alive;
  const nomineeP = byId(g, nominee);
  const nominatorP = byId(g, nominator);
  const block = byId(g, g.day!.blockId);
  const pub = props.ctx.hidden;
  const [peek, setPeek] = useState(false);
  useAutoHide(props.ctx);

  useOverlay(props.ctx, {
    hl: { ...(nominator ? { [nominator]: T('Nomine', 'Nominates') } : {}), ...(nominee ? { [nominee]: T('Nominé', 'Nominated') } : {}) },
    links: nominator && nominee ? [{ from: nominator, to: nominee, tone: 'amb', label: T('nomine', 'nominates') }] : [],
    center: [`${T('Jour', 'Day')} ${g.dayNumber}`, nominator && nominee ? `${nominatorP?.name} ${T('nomine', 'nominates')} ${nomineeP?.name}` : T('Choisissez qui nomine et qui est nominé', 'Choose who nominates and who is nominated'), `${T('Bûcher', 'Block')} : ${block ? block.name : T('personne', 'nobody')}`],
  });
  useTap(props.ctx, (id) => {
    const p = byId(g, id);
    if (!p) return false;
    if (!nominator) { if (canNominate(p) && !nominated(id)) setNominator(id); return true; }
    if (id === nominator) { setNominator(null); return true; }
    if (!wasNominated(id) && (!props.exile || isTraveller(p))) setNominee(id);
    return true;
  });

  const open = () => {
    if (!nominator || !nominee) return;
    const target = byId(g, nominee)!;
    const virginBefore = target.role === 'virgin' && target.alive && !hasMarker(target, 'used');
    // The Spy might register as a Townsfolk: the storyteller decides.
    const spy = virginBefore && !isImpaired(target) && byId(g, nominator)?.role === 'spy';
    let nom: Nomination | undefined;
    update((d) => { nom = nominate(d, nominator, nominee); });
    const index = noms.length;
    if (nom?.virginTrigger || spy) setVirgin({ index, nominator, spy });
    else {
      if (virginBefore && !pub) toast(T('Capacité de la Vierge utilisée — sans effet', 'Virgin ability used — no effect'));
      props.onVote(index);
    }
  };

  return (
    <div class="panel-col">
      <h2 class="panel-title">{props.exile ? T('Exiler un Voyageur', 'Exile a Traveller') : T('Nouvelle nomination', 'New nomination')}</h2>
      <div class="stack-xs">
        <div class="eyebrow">{T('QUI NOMINE', 'WHO NOMINATES')}</div>
        <PlayerPicker game={g} value={nominator ? [nominator] : []} onChange={(ids) => setNominator(ids[0] ?? null)}
          filter={canNominate} disabled={(p) => nominated(p.id) && (props.exile ? T('a appelé à l’exil', 'has called for exile') : T('a nominé', 'has nominated'))} />
        <div class="eyebrow gap-top">{props.exile ? T('QUEL VOYAGEUR', 'WHICH TRAVELLER') : T('QUI EST NOMINÉ', 'WHO IS NOMINATED')}</div>
        <PlayerPicker game={g} value={nominee ? [nominee] : []} onChange={(ids) => setNominee(ids[0] ?? null)}
          filter={props.exile ? isTraveller : undefined} disabled={(p) => wasNominated(p.id) && T('déjà nominé', 'already nominated')} />
      </div>
      {!pub && nomineeP?.role === 'virgin' && nomineeP.alive && !hasMarker(nomineeP, 'used') && <div class="info-box">{T('C’est la Vierge (1re nomination).', 'This is the Virgin (1st nomination).')}{isImpaired(nomineeP) ? T(' Elle est ivre/empoisonnée : pas d’effet.', ' She is drunk/poisoned: no effect.') : nominatorP && teamOf(nominatorP) !== 'townsfolk' ? T(' Le nominateur n’est pas un Villageois : pas d’effet.', ' The nominator is not a Townsfolk: no effect.') : ''}</div>}
      {nomineeP && isTraveller(nomineeP) && <div class="info-box">{T('Exil d’un Voyageur : tout le monde peut voter, même les morts, sans dépenser leur vote fantôme.', 'Traveller exile: everyone may vote, even the dead, without spending their ghost vote.')}</div>}
      <div class="info-box">{props.exile
        ? T('N’importe quel joueur, même mort, peut appeler à l’exil. Ce n’est pas une nomination.', 'Any player, even a dead one, may call for exile. It is not a nomination.')
        : T('Les morts ne peuvent pas nominer. Un toucher sur le cercle choisit le nominateur puis le nominé.', 'The dead cannot nominate. Tapping the circle picks the nominator, then the nominee.')}</div>
      <div class="grow" />
      <div class="grid-nav panel-foot">
        <button type="button" class="btn" onClick={props.onCancel}>{T('Annuler', 'Cancel')}</button>
        <button type="button" class="btn amber lg" disabled={!nominator || !nominee} onClick={open}>{T('Ouvrir le vote', 'Open the vote')}</button>
      </div>
      {virgin && pub && !peek && (
        <Modal eyebrow={T('ACTION PARTICULIÈRE', 'SPECIAL ACTION')} eyebrowTone="amb" title={T('Le Conteur doit vérifier', 'The Storyteller must check')} onClose={() => {}}>
          <p class="modal-text">{T('Une capacité se déclenche sur cette nomination. Regardez seul(e) l’écran avant de continuer.', 'An ability triggers on this nomination. Look at the screen alone before going on.')}</p>
          <HoldButton class="btn amber lg" label={T('Maintenir pour voir', 'Hold to see')} onHold={() => setPeek(true)} />
        </Modal>
      )}
      {virgin && (!pub || peek) && (
        <Modal eyebrow={T('VIERGE · PREMIÈRE NOMINATION', 'VIRGIN · FIRST NOMINATION')} eyebrowTone="amb" title={virgin.spy ? `${nameOf(g, virgin.nominator)} ${T('est l’Espion', 'is the Spy')}` : `${nameOf(g, virgin.nominator)} ${T('est un Villageois', 'is a Townsfolk')}`} onClose={() => { setVirgin(null); props.onVote(virgin.index); }}>
          <p class="modal-text">{virgin.spy
            ? T('L’Espion peut être perçu comme un Villageois. À vous de décider : s’il l’est, il est exécuté immédiatement et le jour s’achève.', 'The Spy might register as a Townsfolk. Your call: if so, they are executed immediately and the day ends.')
            : T('Il est exécuté immédiatement. Le jour s’achève, sans vote.', 'They are executed immediately. The day ends, with no vote.')}</p>
          <div class="info-box">{T('La Vierge n’est ni ivre ni empoisonnée. La capacité est maintenant utilisée.', 'The Virgin is neither drunk nor poisoned. The ability is now spent.')}</div>
          <div class="stack-sm">
            <button type="button" class="btn danger" onClick={() => { update((d) => executeNow(d, virgin.nominator)); setVirgin(null); props.onExecuted(); }}>{T('Exécuter', 'Execute')} {nameOf(g, virgin.nominator)}</button>
            <button type="button" class="btn" onClick={() => { setVirgin(null); props.onVote(virgin.index); }}>{T('Ignorer — nomination normale', 'Ignore — normal nomination')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- vote ---------------------------------------------------------------------

function VotePanel(props: { g: Game; ctx: PanelCtx; index: number; onDone: () => void }) {
  const { g } = props;
  const n = g.day!.nominations[props.index];
  const [voters, setVoters] = useState<string[]>(n.voters);
  const needed = nominationNeeded(g, n);
  const w = (id: string) => voteWeight(g, byId(g, id)!, n.exile);
  const total = voters.reduce((sum, id) => sum + w(id), 0);
  const start = g.players.findIndex((p) => p.id === n.nominee);
  const order = g.players.map((_, i) => g.players[(start + 1 + i) % g.players.length]);
  const canVote = (id: string) => { const p = byId(g, id)!; return p.alive || n.exile || p.ghostVote || n.voters.includes(id); };
  const toggle = (id: string) => { if (canVote(id)) setVoters((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id])); };
  const nominee = byId(g, n.nominee)!;
  const others = g.day!.nominations.filter((_, i) => i !== props.index && !_.exile && _.total !== null && _.total >= nominationNeeded(g, _));
  const best = others.reduce((m, o) => Math.max(m, o.total ?? 0), 0);
  // A dead Butler has lost their ability and votes freely.
  const butlerWarnings = g.players.filter((b) => !n.exile && b.role === 'butler' && b.alive && !isImpaired(b) && voters.includes(b.id)).filter((b) => {
    const master = g.players.find((p) => p.markers.some((m) => m.key === 'master' && m.by === b.id));
    return master && !voters.includes(master.id);
  });

  const pub = props.ctx.hidden;
  useAutoHide(props.ctx);
  useEffect(() => { setLiveVote({ index: props.index, voters }); }, [props.index, voters]);
  useEffect(() => () => setLiveVote(null), []);

  useOverlay(props.ctx, {
    hl: { [n.nominee]: T('Nominé', 'Nominated'), ...Object.fromEntries(voters.map((id) => [id, w(id) > 1 ? `${T('Vote', 'Vote')} ×${w(id)}` : !byId(g, id)!.alive ? T('Fantôme', 'Ghost') : T('Vote', 'Vote')])) },
    links: [{ from: n.nominator, to: n.nominee, tone: 'amb', label: T('nomine', 'nominates') }],
    center: [`${total} ${T('votes', 'votes')}`, `${T('Seuil', 'Threshold')} ${needed}${best ? ` · ${T('à battre', 'to beat')} : ${best}` : ''}`, total >= needed && total > best ? `${nominee.name} ${T('irait au bûcher', 'would be on the block')}` : undefined],
  });
  useTap(props.ctx, (id) => { toggle(id); return true; });

  const label = total >= needed ? (total > best ? `${T('Valider', 'Confirm')} · ${nominee.name} ${n.exile ? T('exilé', 'exiled') : T('au bûcher', 'on the block')}` : `${T('Valider', 'Confirm')} · ${T('égalité', 'tie')}`) : T('Valider le vote', 'Confirm the vote');

  return (
    <div class="panel-col tight-col">
      <div class="vote-head">
        <div><span class="small muted">{nameOf(g, n.nominator)} {n.exile ? T('appelle à l’exil de', 'calls for the exile of') : T('nomine', 'nominates')}</span><h2 class="panel-title">{nominee.name}</h2></div>
        <div class="vote-total"><b class={total >= needed ? 'amber-text' : ''}>{total}</b><span>/ {needed} {T('requis', 'needed')}</span></div>
      </div>
      {!n.exile && <PleaTimer game={g} />}
      <div class="voters">
        {order.map((p) => {
          const on = voters.includes(p.id);
          const ok = canVote(p.id);
          const weight = w(p.id);
          // Public view: nothing that gives a character away (Butler, Bureaucrat or Thief targets).
          const tag = !p.alive ? (ok ? T('Vote fantôme', 'Ghost vote') : T('Mort · plus de vote', 'Dead · no vote left')) : p.role === 'butler' && !pub ? T('Majordome', 'Butler') : isTraveller(p) ? T('Voyageur', 'Traveller') : '';
          const shownWeight = pub ? 1 : weight;
          return (
            <div key={p.id} class={`voter ${on ? 'on' : ''} ${ok ? '' : 'off'}`} onClick={() => toggle(p.id)}>
              <span class="voter-name">{p.name}</span>
              <span class="voter-tag">{tag}{shownWeight !== 1 ? ` ${shownWeight > 0 ? `×${shownWeight}` : `−${-shownWeight}`}` : ''}</span>
              <span class="voter-w">{on ? `${shownWeight > 0 ? '+' : '−'}${Math.abs(shownWeight)}` : ''}</span>
              <Switch on={on} disabled={!ok} label={p.name} onChange={() => toggle(p.id)} />
            </div>
          );
        })}
      </div>
      {!pub && butlerWarnings.map((b) => <div key={b.id} class="banner warn small"><b class="mono">!</b><span>{b.name} ({T('Majordome', 'Butler')}) {T('vote sans son maître', 'votes without their master')}.</span></div>)}
      <div class="grid-nav panel-foot">
        <button type="button" class="btn" onClick={props.onDone}>{T('Annuler', 'Cancel')}</button>
        <button type="button" class="btn amber lg" onClick={() => { update((d) => recordVote(d, props.index, voters)); props.onDone(); }}>{label}</button>
      </div>
    </div>
  );
}

// --- end of day -----------------------------------------------------------------

function EndDayPanel(props: { g: Game; ctx: PanelCtx; onBack: () => void; onExile: () => void }) {
  const { g } = props;
  const day = g.day!;
  const block = byId(g, day.blockId);
  const travellers = g.players.filter(isTraveller);
  const scapegoats = g.players.filter((p) => p.role === 'scapegoat' && p.alive && block && p.alignment === block.alignment && p.id !== block.id);
  const passing = day.nominations.filter((n) => !n.exile && n.total !== null && n.total >= nominationNeeded(g, n));
  const top = passing.reduce((m, n) => Math.max(m, n.total ?? 0), 0);
  const tied = !block && passing.filter((n) => n.total === top);
  const pub = props.ctx.hidden;
  const [ask, setAsk] = useState<{ alerts: Alert[]; label: string; danger?: boolean; run: () => void } | null>(null);
  useOverlay(props.ctx, undefined);

  /** Asks first when the execution (or its absence) has a special effect: Saint, Demon, Mayor, nominations not voted on. */
  const guarded = (alerts: Alert[], label: string, run: () => void, danger?: boolean) => {
    if (alerts.length) setAsk({ alerts, label, danger, run });
    else run();
  };
  const execute = (scapegoatId?: string) => guarded([...unvotedAlerts(g), ...executionAlerts(g, scapegoatId ?? block?.id)],
    `${T('Exécuter', 'Execute')} ${nameOf(g, scapegoatId ?? block?.id)}`, () => finish(true, scapegoatId), true);
  const spare = () => guarded([...unvotedAlerts(g), ...noExecutionAlerts(g)], `${T('Nuit', 'Night')} ${g.nightNumber + 1} →`, () => finish(false));

  const finish = (execute: boolean, scapegoatId?: string) => update((d) => {
    if (!execute && d.day) d.day.blockId = null;
    endDay(d, { scapegoatId });
    // Nobody died today: go straight to the night, unless the end of the game needs confirming.
    if (!(execute && block) && !d.pendingWin && d.phase === 'day') startNight(d);
  });

  return (
    <div class="panel-col">
      <h2 class="panel-title">{T('Nominations du jour', 'Today’s nominations')}</h2>
      <div class="stack-xs">
        {day.nominations.length === 0 && <div class="dashed-hint center">{T('Aucune nomination aujourd’hui.', 'No nominations today.')}</div>}
        {day.nominations.map((n, i) => {
          const isBlock = !n.exile && n.nominee === day.blockId;
          const st = n.exile ? (n.total !== null && n.total >= nominationNeeded(g, n) ? T('exilé', 'exiled') : T('exil refusé', 'exile refused'))
            : n.total === null ? T('pas voté', 'not voted') : isBlock ? T('BÛCHER', 'BLOCK') : n.total < nominationNeeded(g, n) ? T('sous le seuil', 'below threshold') : tied && n.total === top ? T('égalité', 'tie') : T('battu', 'beaten');
          return (
            <div key={i} class={`nom-row static ${isBlock ? 'passed' : ''}`}>
              <span class="grow-text"><b>{nameOf(g, n.nominator)} → {nameOf(g, n.nominee)}</b></span>
              <span class="mono">{n.total ?? '—'}</span>
              <span class={`small ${isBlock ? 'amber-text bold' : 'muted'}`}>{st}</span>
            </div>
          );
        })}
      </div>
      {block && <Narration lines={EXECUTION} names={[block.name]} seed={g.dayNumber} />}
      {tied && tied.length > 1 && <div class="banner warn small"><b class="mono">!</b><span>{T('Égalité à', 'Tie at')} {top} {T('entre', 'between')} {tied.map((n) => nameOf(g, n.nominee)).join(` ${T('et', 'and')} `)} : {T('personne ne serait exécuté. Corrigez un vote ou confirmez.', 'nobody would be executed. Fix a vote or confirm.')}</span></div>}
      <div class="grow" />
      <div class="panel-foot col">
      {pub ? (
        <>
          <div class="info-box">{T('Démasquez le Grimoire (appui long en haut) pour exécuter ou passer à la nuit : le Conteur doit voir les rôles.', 'Unhide the Grimoire (long press at the top) to execute or go to the night: the Storyteller needs to see the characters.')}</div>
          <button type="button" class="btn" onClick={props.onBack}>{T('Retour', 'Back')}</button>
        </>
      ) : (
        <>
          {travellers.length > 0 && <button type="button" class="btn" onClick={props.onExile}>{T('Exiler un Voyageur', 'Exile a Traveller')}</button>}
          {scapegoats.map((sg) => <button type="button" key={sg.id} class="btn" onClick={() => execute(sg.id)}>{T('Exécuter le Bouc émissaire', 'Execute the Scapegoat')} ({sg.name})</button>)}
          <div class="grid-nav">
            <button type="button" class="btn" onClick={block ? spare : props.onBack}>{block ? `${T('Personne', 'Nobody')} → ${T('Nuit', 'Night')} ${g.nightNumber + 1}` : T('Retour', 'Back')}</button>
            {block
              ? <button type="button" class="btn danger lg" onClick={() => execute()}>{T('Exécuter', 'Execute')} {block.name}</button>
              : <button type="button" class="btn amber lg" onClick={spare}>{T('Nuit', 'Night')} {g.nightNumber + 1} →</button>}
          </div>
        </>
      )}
      </div>
      {ask && <AlertScreen alerts={ask.alerts} onAck={() => setAsk(null)} confirm={{ label: ask.label, danger: ask.danger, onConfirm: () => { setAsk(null); ask.run(); } }} />}
    </div>
  );
}

function EndedPanel(props: { g: Game; ctx: PanelCtx }) {
  const { g } = props;
  useOverlay(props.ctx, undefined);
  return (
    <div class="panel-col">
      <div class="panel-head"><Eyebrow tone="amb">{T('FIN DU JOUR', 'END OF DAY')} {g.dayNumber}</Eyebrow><h2 class="panel-title">{g.executedToday ? `${nameOf(g, g.executedToday)} ${T('a été exécuté(e).', 'was executed.')}` : T('Personne n’a été exécuté.', 'Nobody was executed.')}</h2></div>
      <div class="grow" />
      <div class="panel-foot"><button type="button" class="btn amber lg" onClick={() => update((d) => startNight(d))}>{T('Nuit', 'Night')} {g.nightNumber + 1} →</button></div>
    </div>
  );
}

// --- modals ---------------------------------------------------------------------

function SlayerModal(props: { g: Game; onClose: () => void }) {
  const [shooter, setShooter] = useState<string[]>([]);
  const [target, setTarget] = useState<string[]>([]);
  const [recluse, setRecluse] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const t = byId(props.g, target[0]);
  const sh = byId(props.g, shooter[0]);
  return (
    <Modal title={T('Tir du Pourfendeur', 'Slayer shot')} onClose={props.onClose} wide>
      <div class="eyebrow">{T('QUI TIRE (N’IMPORTE QUEL JOUEUR PEUT PRÉTENDRE L’ÊTRE)', 'WHO SHOOTS (ANY PLAYER MAY CLAIM IT)')}</div>
      <PlayerPicker game={props.g} value={shooter} onChange={setShooter} filter={(p) => p.alive} />
      {sh && (sh.role === 'drunk' && sh.believedRole === 'slayer' ? <div class="info-box">{T('C’est l’Ivrogne qui se croit Pourfendeur : rien ne se passera, sa capacité sera marquée utilisée.', 'This is the Drunk who thinks they are the Slayer: nothing will happen, the ability will be marked as used.')}</div>
        : sh.role !== 'slayer' ? <div class="info-box">{T('Ce n’est pas le vrai Pourfendeur : rien ne se passera.', 'Not the real Slayer: nothing will happen.')}</div>
        : hasMarker(sh, 'used') ? <div class="info-box">{T('Capacité déjà utilisée.', 'Ability already used.')}</div>
        : isImpaired(sh) ? <div class="info-box">{T('Pourfendeur ivre/empoisonné : rien ne se passera (capacité perdue).', 'Slayer is drunk/poisoned: nothing will happen (ability spent).')}</div> : null)}
      <div class="eyebrow">{T('CIBLE', 'TARGET')}</div>
      <PlayerPicker game={props.g} value={target} onChange={setTarget} />
      {t?.role === 'recluse' && (
        <div class="row-line"><span>{T('Le Reclus est perçu comme le Démon', 'The Recluse registers as the Demon')}</span><Switch on={recluse} onChange={setRecluse} /></div>
      )}
      {result && <div class="banner"><i class="bdot amber" /><span>{result}</span></div>}
      <div class="grid-2">
        <button type="button" class="btn" onClick={props.onClose}>{T('Fermer', 'Close')}</button>
        {!result && <button type="button" class="btn amber" disabled={!shooter[0] || !target[0]} onClick={() => {
          let txt = '';
          update((d) => { txt = loc(slayerShot(d, shooter[0], target[0], recluse)); });
          setResult(txt);
        }}>{T('Tirer', 'Shoot')}</button>}
      </div>
    </Modal>
  );
}

function KillModal(props: { g: Game; onClose: () => void }) {
  const [target, setTarget] = useState<string[]>([]);
  const [ask, setAsk] = useState<Alert[] | null>(null);
  if (ask) {
    return <AlertScreen alerts={ask} onAck={() => setAsk(null)}
      confirm={{ label: `${T('Exécuter', 'Execute')} ${nameOf(props.g, target[0])}`, danger: true, onConfirm: () => { update((d) => executeNow(d, target[0])); props.onClose(); } }} />;
  }
  return (
    <Modal title={T('Faire mourir un joueur', 'Kill a player')} onClose={props.onClose} wide>
      <p class="modal-text">{T('Pour le Pistolero, une exécution décidée par le Conteur, etc.', 'For the Gunslinger, a storyteller-decided death, etc.')}</p>
      <PlayerPicker game={props.g} value={target} onChange={setTarget} filter={(p) => p.alive} />
      <div class="stack-sm">
        <button type="button" class="btn" disabled={!target[0]} onClick={() => {
          const alerts = executionAlerts(props.g, target[0]);
          if (alerts.length) setAsk(alerts);
          else { update((d) => executeNow(d, target[0])); props.onClose(); }
        }}>{T('Exécuter (fin du jour)', 'Execute (ends day)')}</button>
        <div class="grid-2">
          <button type="button" class="btn" onClick={props.onClose}>{T('Annuler', 'Cancel')}</button>
          <button type="button" class="btn danger" disabled={!target[0]} onClick={() => { update((d) => killPlayer(d, target[0], 'ability')); props.onClose(); }}>{T('Faire mourir', 'Kill')}</button>
        </div>
      </div>
    </Modal>
  );
}

