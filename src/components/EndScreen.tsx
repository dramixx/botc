import { useState } from 'preact/hooks';
import { exportGame, undo, useStore } from '../game/store';
import type { Game } from '../game/types';
import { T, loc, roleName } from '../i18n';
import { LogList } from './LogPanel';
import { teamTone } from './ui';
import { ROLES } from '../data/roles';
import { nameOf, nightHistory, wakeRole } from '../game/engine';
import { summary } from './History';
import { RoleIcon } from './ui';

const fmtDuration = (ms: number) => {
  const mins = Math.max(1, Math.round(ms / 60000));
  return mins < 60 ? `${mins} MIN` : `${Math.floor(mins / 60)} H ${String(mins % 60).padStart(2, '0')}`;
};

type View = 'who' | 'story' | 'log';
const VIEWS: Record<View, () => string> = {
  who: () => T('Qui était quoi', 'Who was what'),
  story: () => T('Récit de la partie', 'Game story'),
  log: () => T('Journal complet', 'Full log'),
};

/** Night by night: what each character was told or did (with false info flagged), then the day's deaths and votes. */
function StoryRecap(props: { game: Game }) {
  const g = props.game;
  const entries = nightHistory(g, {});
  const last = Math.max(g.nightNumber, g.dayNumber);
  const phases: { title: string; night?: number; day?: number }[] = [];
  for (let n = 1; n <= last; n++) {
    phases.push({ title: `${T('Nuit', 'Night')} ${n}`, night: n });
    phases.push({ title: `${T('Jour', 'Day')} ${n}`, day: n });
  }
  const dayLines = (n: number) => g.log.filter((e) => e.phase === 'day' && e.num === n && !e.text.fr.startsWith('☀') && (e.important || e.text.fr.startsWith('Vote sur')));
  const shown = phases.filter((ph) => (ph.night && entries.some((e) => e.night === ph.night && e.role !== 'spy')) || (ph.day && dayLines(ph.day).length));
  if (!shown.length) return <div class="dashed-hint center">{T('Rien à raconter : aucune nuit ni aucun jour joué.', 'Nothing to tell: no night or day was played.')}</div>;
  return (
    <div class="story">
      {shown.map((ph) => {
        const steps = ph.night ? entries.filter((e) => e.night === ph.night && e.role !== 'spy') : [];
        const lines = ph.day ? dayLines(ph.day) : [];
        return (
          <div key={ph.title} class="story-phase">
            <div class="eyebrow">{ph.title.toUpperCase()}</div>
            {steps.map((e) => (
              <div key={e.key} class="story-row">
                <span class={`tone-${teamTone(ROLES[e.role].team)} story-icon`}><RoleIcon role={e.role} size={18} /></span>
                <span class="hist-what"><span class="hist-who">{nameOf(g, e.playerId)} · {roleName(e.role)} </span>{summary(g, e) ?? <span class="muted">{T('passé', 'skipped')}</span>}</span>
                <span class="hist-flags">
                  {e.data.impaired && <span class="hist-flag warn">{T('ivre/emp.', 'drunk/pois.')}</span>}
                  {e.data.lie && <span class="hist-flag lie">{T('fausse', 'false')}</span>}
                </span>
              </div>
            ))}
            {lines.map((e) => <div key={e.id} class={`log-item ${e.important ? 'key' : ''}`}><i /><span>{loc(e.text)}</span></div>)}
          </div>
        );
      })}
    </div>
  );
}

/** Recap shown once the game is over: result, key moments and who was what. */
export function EndScreen(props: { game: Game; onHome: () => void }) {
  const g = props.game;
  const { past } = useStore();
  const [view, setView] = useState<View>('who');
  const tone = g.winner === 'good' ? 'bon' : g.winner === 'evil' ? 'mal' : 'neu';
  const moments = g.log.filter((e) => e.important && !e.text.fr.startsWith('🌙') && !e.text.fr.startsWith('☀') && e.phase !== 'setup').slice(-5);
  const tag = (e: Game['log'][number]) => `${e.phase === 'night' ? T('N', 'N') : T('J', 'D')}${e.num}`;
  const title = g.winner === 'good' ? T('Le Bien l’emporte', 'Good wins') : g.winner === 'evil' ? T('Le Mal l’emporte', 'Evil wins') : T('Partie abandonnée', 'Game abandoned');
  const dayNum = g.dayNumber || g.nightNumber;

  return (
    <div class="end-screen">
      <section class={`end-left tone-${tone}`}>
        <span class="mono end-eyebrow">{T('FIN', 'END')} · {T('JOUR', 'DAY')} {dayNum} · {fmtDuration(g.updatedAt - g.createdAt)}</span>
        <h1 class="end-title">{title}</h1>
        <p class="end-reason">{loc(g.winReason)}</p>
        {moments.length > 0 && (
          <div class="stack-xs">
            <div class="eyebrow">{T('MOMENTS CLÉS', 'KEY MOMENTS')}</div>
            {moments.map((e) => <span key={e.id} class="moment"><b class="mono">{tag(e)}</b> · {loc(e.text)}</span>)}
          </div>
        )}
        <div class="grow" />
        {past.length > 0 && <button type="button" class="btn" onClick={undo}>↶ {T('Revenir en arrière', 'Go back')}</button>}
        <div class="grid-2">
          <button type="button" class="btn" onClick={() => exportGame(g)}>{T('Exporter JSON', 'Export JSON')}</button>
          <button type="button" class="btn amber" onClick={props.onHome}>{T('Accueil', 'Home')}</button>
        </div>
      </section>
      <section class="end-right">
        <div class="between wrap"><h2>{VIEWS[view]()}</h2>
          <div class="end-tabs">{(Object.keys(VIEWS) as View[]).filter((v) => v !== view).map((v) => <button type="button" key={v} class="link-btn" onClick={() => setView(v)}>{VIEWS[v]()} ▸</button>)}</div></div>
        {view === 'log' ? <div class="end-log"><LogList game={g} /></div> : view === 'story' ? <div class="end-log"><StoryRecap game={g} /></div> : (
          <div class="recap">
            {g.players.map((p) => {
              const shown = wakeRole(p) !== p.role ? `${roleName(p.role)} (${T('croyait', 'thought')} ${roleName(wakeRole(p))})` : roleName(p.role);
              return (
                <div key={p.id} class="recap-row">
                  <span class="recap-name">{p.name}</span>
                  <span class={`recap-role serif tone-${teamTone(ROLES[p.role].team)}`}>{shown}{ROLES[p.role].team === 'traveller' ? ` · ${T('Voyageur', 'Traveller')}` : ''}</span>
                  <span class={`small ${p.alive ? 'muted' : ''}`}>{p.alive ? T('Vivant', 'Alive') : T('Mort', 'Dead')}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
