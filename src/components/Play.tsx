import { useEffect, useRef, useState } from 'preact/hooks';
import { ICON_THEMES, type IconTheme, getIconTheme, setIconTheme } from '../data/icons';
import { L, confirmWin, currentStep, declareWin, dismissWin, log, stats } from '../game/engine';
import { useLive } from '../game/liveClient';
import { exportGame, redo, undo, update, useStore } from '../game/store';
import type { Game } from '../game/types';
import { T, getLang, loc, setLang } from '../i18n';
import { Circle } from './Circle';
import { DayPanel } from './DayPanel';
import { TimerPill, TimerSettings } from './DayTimer';
import { EndScreen } from './EndScreen';
import { openBriefing, openGuide } from './Guide';
import { ShareHandout } from './Handout';
import { HoldButton } from './Alerts';
import { type PanelCtx, getAutoHide, setAutoHide } from './hooks';
import { ShareLive } from './Live';
import { JournalPanel, Reference } from './LogPanel';
import { NightPanel } from './NightPanel';
import type { Overlay, TapHandler } from './overlay';
import { PlayerSheet, RenameModal } from './PlayerSheet';
import { AddTravellerModal, Setup } from './Setup';
import { Modal, Seg, Switch } from './ui';

type View = 'phase' | 'log';
type Dialog = null | 'menu' | 'traveller' | 'rename' | 'finish' | 'abandon' | 'timer' | 'handout' | 'live';

export function Play(props: { game: Game; onHome: () => void }) {
  const g = props.game;
  const { past, future } = useStore();
  const live = useLive();
  const [hidden, setHiddenRaw] = useState(false);
  const [autoHide, setAutoHideState] = useState(getAutoHide);
  const [view, setView] = useState<View>('phase');
  const [sheet, setSheet] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [showRef, setShowRef] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const tapRef = useRef<TapHandler | null>(null);
  const setHidden = (v: boolean) => {
    setHiddenRaw(v);
    // The log and the player sheets are secret: hiding closes them.
    if (v) { setSheet(null); setView('phase'); }
  };
  const ctx: PanelCtx = { setOverlay, tapRef, hidden, setHidden };

  // Keyboard shortcuts on desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement).matches('input, textarea')) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // The sheet of a player who left the table closes by itself.
  useEffect(() => { if (sheet && !g.players.some((p) => p.id === sheet)) setSheet(null); }, [g.players.length]);
  // A new phase always starts on its own panel.
  useEffect(() => { setSheet(null); setView('phase'); }, [g.phase, g.nightNumber, g.dayNumber]);

  if (g.phase === 'setup') return <><Setup game={g} onHome={props.onHome} />{dialog === 'traveller' && <AddTravellerModal onClose={() => setDialog(null)} />}</>;
  if (g.phase === 'ended') return <EndScreen game={g} onHome={props.onHome} />;

  const s = stats(g);
  const dawn = g.phase === 'night' && currentStep(g)?.kind === 'dawn';
  const phaseName = dawn ? T('Aube', 'Dawn') : g.phase === 'night' ? `${T('Nuit', 'Night')} ${g.nightNumber}` : `${T('Jour', 'Day')} ${g.dayNumber}`;
  // During the day, hidden mode keeps a public panel: nominations, votes and timers go on, characters stay secret.
  const publicDay = hidden && g.phase === 'day';
  const onTap = (id: string) => {
    if (hidden && !publicDay) return;
    if (tapRef.current?.(id)) return;
    if (hidden) return;
    setView('phase');
    setSheet(id);
  };

  const panel = hidden && !publicDay ? (
    <div class="panel-col safe">
      <div class="safe-ico"><i /></div>
      <h2 class="panel-title">{T('Écran sûr', 'Safe screen')}</h2>
      <p class="modal-text center">{T('Noms, places, morts et votes fantômes restent visibles : ce sont des informations publiques.', 'Names, seats, deaths and ghost votes stay visible: they are public information.')}</p>
      <button type="button" class="btn lg" onClick={() => setHidden(false)}>{T('Démasquer', 'Unhide')}</button>
    </div>
  ) : view === 'log' && !hidden ? (
    <JournalPanel game={g} ctx={ctx} onClose={() => setView('phase')} />
  ) : sheet && !hidden ? (
    <PlayerSheet game={g} id={sheet} ctx={ctx} onClose={() => setSheet(null)} />
  ) : g.phase === 'night' ? (
    <NightPanel game={g} ctx={ctx} />
  ) : (
    <DayPanel game={g} ctx={ctx} />
  );

  const eff: Overlay | undefined = view === 'log' && !hidden ? { dim: true } : overlay;

  return (
    <div class={`play phase-${g.phase}`}>
      <header class="gamebar">
        <button type="button" class="icon-btn menu-btn" aria-label="Menu" onClick={() => setDialog('menu')}><i /><i /><i /></button>
        <div class="gamebar-title">{g.title || T('Grimoire', 'Grimoire')}</div>
        <div class="gamebar-mid">
          <div class="phase-pill"><i class={g.phase === 'night' && !dawn ? 'night' : ''} /><span>{phaseName}</span></div>
          <TimerPill game={g} onOpen={() => { setSheet(null); setView('phase'); }} />
          <div class="gamebar-stat"><b>{s.alive}/{s.total}</b> {T('vivants', 'alive')}</div>
          <span class="vsep" />
          <div class="gamebar-stat"><b>{s.needed}</b> <span class="hide-sm">{T('votes pour exécuter', 'votes to execute')}</span><span class="show-sm">{T('votes', 'votes')}</span></div>
        </div>
        <div class="gamebar-actions">
          <button type="button" class="icon-btn" disabled={!past.length} onClick={undo} aria-label={T('Annuler', 'Undo')}>↶</button>
          <button type="button" class="icon-btn" disabled={!future.length} onClick={redo} aria-label={T('Rétablir', 'Redo')}>↷</button>
          {hidden
            ? <HoldButton class="btn sm amber" label={T('Masqué', 'Hidden')} onHold={() => setHidden(false)} />
            : <button type="button" class="btn sm" onClick={() => setHidden(true)}>{T('Masquer', 'Hide')}</button>}
          <button type="button" class={`btn sm bar-extra ${view === 'log' ? 'on' : ''}`} onClick={() => { setSheet(null); setView(view === 'log' ? 'phase' : 'log'); }}>{T('Journal', 'Log')}</button>
          <button type="button" class="btn sm bar-extra" onClick={() => setShowRef(true)}>{T('Rôles', 'Roles')}</button>
          <button type="button" class="icon-btn bar-more" aria-label="Menu" onClick={() => setDialog('menu')}>⋯</button>
        </div>
      </header>

      <div class="play-main">
        <div class="play-circle"><Circle game={g} hidden={hidden} overlay={eff} onTap={onTap} /></div>
        <aside class={`panel ${expanded ? 'expanded' : ''}`}>
          <button type="button" class="drawer-grab" aria-label={T('Agrandir le panneau', 'Expand the panel')} onClick={() => setExpanded(!expanded)} />
          {publicDay && (
            <div class="public-bar">
              <span><b>{T('Grimoire masqué', 'Grimoire hidden')}</b> · {T('vue publique', 'public view')}</span>
              <HoldButton class="btn sm" label={T('Maintenir pour démasquer', 'Hold to unhide')} onHold={() => setHidden(false)} />
            </div>
          )}
          {panel}
        </aside>
      </div>

      {g.pendingWin && (
        <Modal eyebrow={T('CONDITION DE VICTOIRE ATTEINTE', 'WIN CONDITION MET')} eyebrowTone={g.pendingWin.winner === 'good' ? 'bon' : 'mal'}
          title={g.pendingWin.winner === 'good' ? T('Victoire du Bien ?', 'Good wins?') : T('Victoire du Mal ?', 'Evil wins?')} onClose={() => update(dismissWin)}>
          <p class="modal-text">{loc(g.pendingWin.reason)}</p>
          <div class="info-box">{T('Rejeter laisse la partie continuer — utile si vous appliquez une règle maison ou corrigez une erreur.', 'Rejecting lets the game go on — useful for a house rule or to fix a mistake.')}</div>
          <div class="grid-2 wide-right">
            <button type="button" class="btn" onClick={() => update(dismissWin)}>{T('Rejeter', 'Reject')}</button>
            <button type="button" class="btn amber" onClick={() => update(confirmWin)}>{T('Confirmer la victoire', 'Confirm the win')}</button>
          </div>
        </Modal>
      )}

      {dialog === 'menu' && (
        <Modal variant="drawer" onClose={() => setDialog(null)}>
          <div class="eyebrow">{T('PARTIE', 'GAME')}</div>
          <button type="button" class="row-line btn-row dark" onClick={() => setDialog('rename')}><span class="serif lg">{g.title || T('Partie sans nom', 'Untitled game')}</span><span class="small muted">{T('Renommer', 'Rename')}</span></button>
          <button type="button" class="menu-item only-portrait" onClick={() => { setDialog(null); setSheet(null); setView('log'); }}>{T('Journal', 'Log')}</button>
          <button type="button" class="menu-item only-portrait" onClick={() => { setDialog(null); setShowRef(true); }}>{T('Rôles', 'Roles')}</button>
          <button type="button" class="menu-item" onClick={() => { setDialog(null); openGuide('start'); }}>{T('Guide du Conteur', 'Storyteller’s guide')}</button>
          <button type="button" class="menu-item" onClick={() => { setDialog(null); openBriefing(); }}>{T('Présenter les règles', 'Present the rules')}</button>
          <button type="button" class="menu-item" onClick={() => setDialog('handout')}>{T('Fiche joueur (QR code)', 'Player sheet (QR code)')}</button>
          <button type="button" class="menu-item" onClick={() => setDialog('live')}>
            {T('Diffusion en direct (TV, téléphones)', 'Live broadcast (TV, phones)')}
            {live.room && <span class="live-on"><i class={`live-dot ${live.status === 'ok' ? 'on' : ''}`} />{live.room.code}</span>}
          </button>
          <button type="button" class="menu-item" onClick={() => setDialog('timer')}>{T('Minuteur du jour', 'Day timer')}</button>
          <div class="menu-item static"><span>{T('Masquer pendant nominations et votes', 'Hide during nominations and votes')}</span>
            <Switch on={autoHide} label={T('Masquer pendant nominations et votes', 'Hide during nominations and votes')} onChange={(on) => { setAutoHide(on); setAutoHideState(on); }} />
          </div>
          <button type="button" class="menu-item" onClick={() => setDialog('traveller')}>{T('Ajouter un Voyageur', 'Add a Traveller')}</button>
          <button type="button" class="menu-item" onClick={() => exportGame(g)}>{T('Exporter en JSON', 'Export as JSON')}</button>
          <div class="menu-item static"><span>{T('Orientation du cercle', 'Circle orientation')}</span>
            <span class="rotate-btns">
              <button type="button" class="icon-btn" aria-label={T('Tourner dans le sens inverse', 'Rotate counterclockwise')} onClick={() => update((d) => { d.rotation = ((d.rotation ?? 0) - 1 + d.players.length) % d.players.length; })}>↺</button>
              <button type="button" class="icon-btn" aria-label={T('Tourner dans le sens horaire', 'Rotate clockwise')} onClick={() => update((d) => { d.rotation = ((d.rotation ?? 0) + 1) % d.players.length; })}>↻</button>
            </span>
          </div>
          <div class="menu-item static"><span>{T('Langue', 'Language')}</span><Seg small value={getLang()} onChange={setLang} options={[{ v: 'fr', label: 'FR' }, { v: 'en', label: 'EN' }]} /></div>
          <div class="menu-item static"><span>{T('Icônes', 'Icons')}</span><Seg small value={getIconTheme()} onChange={setIconTheme} options={(Object.keys(ICON_THEMES) as IconTheme[]).map((v) => ({ v, label: loc(ICON_THEMES[v].name) }))} /></div>
          <button type="button" class="menu-item" onClick={() => { setDialog(null); props.onHome(); }}>{T('Retour à l’accueil', 'Back to home')}</button>
          <div class="grow" />
          <button type="button" class="menu-item" onClick={() => setDialog('finish')}>{T('Terminer la partie…', 'End the game…')}</button>
          <button type="button" class="menu-item danger-outline" onClick={() => setDialog('abandon')}>{T('Abandonner la partie', 'Abandon the game')}</button>
          <div class="home-note">{T('Sur ordinateur : ⌘Z annuler · ⇧⌘Z rétablir', 'On desktop: ⌘Z undo · ⇧⌘Z redo')}</div>
        </Modal>
      )}
      {dialog === 'traveller' && <AddTravellerModal onClose={() => setDialog(null)} />}
      {dialog === 'handout' && <Modal eyebrow={T('FICHE JOUEUR', 'PLAYER SHEET')} title={T('Sur le téléphone des joueurs', 'On the players’ phones')} onClose={() => setDialog(null)}><ShareHandout /></Modal>}
      {dialog === 'live' && <Modal eyebrow={T('DIFFUSION EN DIRECT', 'LIVE BROADCAST')} title={T('Sur la TV et les téléphones', 'On the TV and phones')} onClose={() => setDialog(null)}><ShareLive /></Modal>}
      {dialog === 'timer' && <TimerSettings game={g} onClose={() => setDialog(null)} />}
      {dialog === 'rename' && <RenameModal title={T('Nom de la partie', 'Game name')} name={g.title} onClose={() => setDialog(null)} onSave={(n) => update((d) => { d.title = n; })} />}
      {dialog === 'finish' && (
        <Modal title={T('Terminer la partie', 'End the game')} onClose={() => setDialog(null)}>
          <p class="modal-text">{T('Quelle équipe a gagné ?', 'Which team won?')}</p>
          <div class="grid-2">
            <button type="button" class="btn tone-bon-btn" onClick={() => { update((d) => declareWin(d, 'good')); setDialog(null); }}>{T('Victoire du Bien', 'Good wins')}</button>
            <button type="button" class="btn tone-mal-btn" onClick={() => { update((d) => declareWin(d, 'evil')); setDialog(null); }}>{T('Victoire du Mal', 'Evil wins')}</button>
          </div>
          <button type="button" class="btn" onClick={() => setDialog(null)}>{T('Annuler', 'Cancel')}</button>
        </Modal>
      )}
      {dialog === 'abandon' && (
        <Modal eyebrow={T('ABANDON', 'ABANDON')} eyebrowTone="mal" title={T('Abandonner la partie ?', 'Abandon the game?')} onClose={() => setDialog(null)}>
          <p class="modal-text">{T('La partie est marquée comme abandonnée et reste dans l’historique.', 'The game is marked as abandoned and stays in the history.')}</p>
          <div class="grid-2">
            <button type="button" class="btn" onClick={() => setDialog(null)}>{T('Annuler', 'Cancel')}</button>
            <button type="button" class="btn danger" onClick={() => {
              update((d) => { d.phase = 'ended'; d.winner = null; d.pendingWin = null; d.winReason = L('Partie abandonnée.', 'Game abandoned.'); log(d, d.winReason, true); });
              setDialog(null); props.onHome();
            }}>{T('Abandonner', 'Abandon')}</button>
          </div>
        </Modal>
      )}
      {showRef && <Reference game={g} onClose={() => setShowRef(false)} />}
    </div>
  );
}
