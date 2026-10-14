// Day timer: a card in the day panel, a pill in the game bar, the settings and the plea timer of a vote.
import { useEffect, useRef, useState } from 'preact/hooks';
import { aliveAll } from '../game/engine';
import {
  DEFAULT_PREFS, PACE_NAMES, SEGMENTS, SEGMENT_CALLS, SEGMENT_NAMES, activeTimer, addTime, durationFor, fmtClock, fmtMinutes,
  isRunning, markRang, nextSegment, pause, pleaFor, recommended, recommendedPlea, remainingOf, ring, setPrefs, setSegment, start,
  timerFor, unlockAudio, useTimer, type Pace, type Segment,
} from '../game/timer';
import type { Game } from '../game/types';
import { T, loc } from '../i18n';
import { Modal, Seg, Switch } from './ui';

/** Rings once when the day's timer reaches zero (mounted in the game bar, so it works on every panel). */
function useAlarm(g: Game) {
  const { timer, prefs } = useTimer();
  const t = g.phase === 'day' ? activeTimer(g.id, g.dayNumber) : null;
  const left = t ? remainingOf(t) : 1;
  useEffect(() => {
    if (!t || !isRunning(t) || left > 0) return;
    ring();
    const next = nextSegment(t.segment);
    if (prefs.chain && next) setSegment(t, next, aliveAll(g), true);
    else markRang(t);
  }, [timer, left <= 0]);
}

/** Countdown shown in the game bar during the day; a tap brings back the day panel. */
export function TimerPill(props: { game: Game; onOpen: () => void }) {
  const g = props.game;
  useAlarm(g);
  const t = g.phase === 'day' ? activeTimer(g.id, g.dayNumber) : null;
  if (!t || (!isRunning(t) && !t.rang && t.remaining === t.total)) return null;
  const left = remainingOf(t);
  return (
    <button type="button" class={`timer-pill ${t.rang ? 'rang' : ''} ${isRunning(t) ? '' : 'paused'}`} onClick={props.onOpen}
      aria-label={`${loc(SEGMENT_NAMES[t.segment])} ${fmtClock(left)}`}>
      <i />{t.rang ? T('Temps !', 'Time!') : fmtClock(left)}
    </button>
  );
}

/** The day's timer, at the top of the day panel. */
export function DayTimer(props: { game: Game }) {
  const g = props.game;
  useTimer();
  const [settings, setSettings] = useState(false);
  const alive = aliveAll(g);
  const t = timerFor(g.id, g.dayNumber, alive);
  const left = remainingOf(t);
  const running = isRunning(t);
  const next = nextSegment(t.segment);
  const pct = t.total ? Math.min(100, (left / t.total) * 100) : 0;
  const low = running && left <= 30;

  return (
    <div class={`day-timer ${t.rang ? 'rang' : ''} ${low ? 'low' : ''}`}>
      <div class="between">
        <div class="timer-segs" role="group" aria-label={T('Moment de la journée', 'Part of the day')}>
          {SEGMENTS.map((s, i) => (
            <button type="button" key={s} class={`timer-seg ${s === t.segment ? 'on' : ''} ${SEGMENTS.indexOf(t.segment) > i ? 'past' : ''}`}
              onClick={() => setSegment(t, s, alive, running)}>{loc(SEGMENT_NAMES[s])}</button>
          ))}
        </div>
        <button type="button" class="icon-btn" aria-label={T('Réglages du minuteur', 'Timer settings')} onClick={() => setSettings(true)}>⚙</button>
      </div>
      <div class="timer-main">
        <span class="timer-clock mono" role="timer">{t.rang ? '0:00' : fmtClock(left)}</span>
        <span class="small muted">{t.rang ? T('Temps écoulé', 'Time is up') : `${T('sur', 'of')} ${fmtMinutes(t.total)}`}</span>
      </div>
      <div class="timer-bar"><div style={{ width: `${t.rang ? 0 : pct}%` }} /></div>
      <div class="timer-call">« {loc(t.rang && next ? SEGMENT_CALLS[next] : SEGMENT_CALLS[t.segment])} »</div>
      <div class="timer-ctrl">
        <button type="button" class="btn xs" onClick={() => addTime(t, -30)} disabled={t.rang}>−30 s</button>
        {t.rang && next ? (
          <button type="button" class="btn amber sm grow" onClick={() => { unlockAudio(); setSegment(t, next, alive, true); }}>{loc(SEGMENT_NAMES[next])} →</button>
        ) : running ? (
          <button type="button" class="btn sm grow" onClick={() => pause(t)}>❚❚ {T('Pause', 'Pause')}</button>
        ) : (
          <button type="button" class="btn amber sm grow" onClick={() => { unlockAudio(); start(t); }}>▶ {t.rang || left <= 0 ? T('Relancer', 'Restart') : left < t.total ? T('Reprendre', 'Resume') : T('Démarrer', 'Start')}</button>
        )}
        <button type="button" class="btn xs" onClick={() => addTime(t, 60)}>+1 min</button>
        {!t.rang && next && <button type="button" class="btn xs" aria-label={`${T('Passer à', 'Skip to')} ${loc(SEGMENT_NAMES[next])}`} onClick={() => setSegment(t, next, alive, running)}>⏭</button>}
      </div>
      {settings && <TimerSettings game={g} onClose={() => setSettings(false)} />}
    </div>
  );
}

const PLEA_OPTIONS = [0, 30, 45, 60, 90];

export function TimerSettings(props: { game?: Game; onClose: () => void }) {
  const { prefs } = useTimer();
  const g = props.game;
  const alive = g ? aliveAll(g) : 8;
  const day = g?.phase === 'day' ? g.dayNumber : 1;
  const tune = (s: Segment, delta: number) => {
    const cur = durationFor(s, alive, day, prefs);
    setPrefs({ custom: { ...prefs.custom, [s]: Math.max(30, Math.min(30 * 60, cur + delta)) } });
  };
  const resetSeg = (s: Segment) => { const c = { ...prefs.custom }; delete c[s]; setPrefs({ custom: c }); };
  const t = g?.phase === 'day' ? activeTimer(g.id, g.dayNumber) : null;

  return (
    <Modal eyebrow={T('MINUTEUR DU JOUR', 'DAY TIMER')} title={T('Durées de la journée', 'Day durations')} onClose={props.onClose} wide>
      <p class="modal-text">
        {g ? T(`Conseillé pour ${alive} vivants, jour ${day}.`, `Recommended for ${alive} alive, day ${day}.`) : T('Conseillé pour 8 joueurs, jour 1.', 'Recommended for 8 players, day 1.')}{' '}
        {T('Les durées raccourcissent au fil des jours et des morts. Ce sont des repères : le Conteur reste maître du rythme.', 'Durations shrink as days pass and players die. They are a guide: the storyteller keeps the pace.')}
      </p>
      <div class="stack-xs">
        <div class="eyebrow">{T('RYTHME', 'PACE')}</div>
        <Seg value={prefs.pace} onChange={(v: Pace) => setPrefs({ pace: v })} options={(Object.keys(PACE_NAMES) as Pace[]).map((v) => ({ v, label: loc(PACE_NAMES[v]) }))} />
      </div>
      <div class="stack-xs">
        {SEGMENTS.map((s) => {
          const rec = recommended(s, alive, day, prefs.pace);
          const custom = prefs.custom[s] !== undefined;
          return (
            <div key={s} class="timer-row">
              <span class="grow timer-row-name">
                <b>{loc(SEGMENT_NAMES[s])}</b>
                {custom
                  ? <button type="button" class="link-btn timer-reset" onClick={() => resetSeg(s)}>{T('Conseillé', 'Recommended')} : {fmtMinutes(rec)} · {T('rétablir', 'restore')}</button>
                  : <span class="small muted">{T('Durée conseillée', 'Recommended duration')}</span>}
              </span>
              <button type="button" class="btn xs" aria-label={`${loc(SEGMENT_NAMES[s])} −30 s`} onClick={() => tune(s, -30)}>−</button>
              <span class={`mono timer-row-val ${custom ? 'amber-text' : ''}`}>{fmtClock(durationFor(s, alive, day, prefs))}</span>
              <button type="button" class="btn xs" aria-label={`${loc(SEGMENT_NAMES[s])} +30 s`} onClick={() => tune(s, 30)}>+</button>
            </div>
          );
        })}
      </div>
      <div class="stack-xs">
        <div class="eyebrow">{T('TEMPS DE PAROLE PAR NOMINATION (ACCUSATION / DÉFENSE)', 'SPEAKING TIME PER NOMINATION (ACCUSATION / DEFENCE)')}</div>
        <Seg small value={String(prefs.plea)} onChange={(v) => setPrefs({ plea: Number(v) })}
          options={PLEA_OPTIONS.map((v) => ({ v: String(v), label: v === 0 ? `Auto · ${recommendedPlea(alive)} s` : `${v} s` }))} />
      </div>
      <div class="row-line"><span>{T('Son et vibration à la fin', 'Sound and vibration at the end')}</span><Switch on={prefs.sound} onChange={(v) => setPrefs({ sound: v })} label={T('Son', 'Sound')} /></div>
      <div class="row-line"><span>{T('Enchaîner automatiquement les moments', 'Chain the parts of the day automatically')}</span><Switch on={prefs.chain} onChange={(v) => setPrefs({ chain: v })} label={T('Enchaîner', 'Chain')} /></div>
      <details class="timer-table-box">
        <summary>{T('Tableau des durées conseillées (jour 1)', 'Recommended durations table (day 1)')}</summary>
        <RecommendationTable pace={prefs.pace} highlight={alive} />
      </details>
      <div class="grid-2">
        <button type="button" class="btn" onClick={() => { unlockAudio(); const s = prefs.sound; setPrefs({ sound: true }); ring(); setPrefs({ sound: s }); }}>{T('Tester la sonnerie', 'Test the alarm')}</button>
        <button type="button" class="btn" onClick={() => setPrefs({ ...DEFAULT_PREFS, sound: prefs.sound })}>{T('Tout réinitialiser', 'Reset all')}</button>
      </div>
      {t && !isRunning(t) && t.remaining === t.total && <div class="home-note">{T('Le minuteur en cours prendra les nouvelles durées au prochain changement de moment.', 'The current timer takes the new durations at the next part of the day.')}</div>}
      <button type="button" class="btn amber" onClick={() => {
        // A timer that hasn't started yet follows the new settings right away.
        if (t && !isRunning(t) && !t.rang && t.remaining === t.total && g) setSegment(t, t.segment, alive);
        props.onClose();
      }}>{T('Fermer', 'Close')}</button>
    </Modal>
  );
}

/** Recommended durations by number of players (day 1). */
export function RecommendationTable(props: { pace: Pace; highlight?: number }) {
  const counts = Array.from({ length: 11 }, (_, i) => i + 5);
  return (
    <div class="timer-table-wrap">
      <table class="timer-table">
        <thead>
          <tr><th>{T('Joueurs', 'Players')}</th>{SEGMENTS.map((s) => <th key={s}>{loc(SEGMENT_NAMES[s])}</th>)}<th>{T('Total', 'Total')}</th></tr>
        </thead>
        <tbody>
          {counts.map((n) => {
            const d = SEGMENTS.map((s) => recommended(s, n, 1, props.pace));
            return (
              <tr key={n} class={n === props.highlight ? 'on' : ''}>
                <td class="mono">{n}</td>
                {d.map((v, i) => <td key={i} class="mono">{fmtClock(v)}</td>)}
                <td class="mono">{fmtClock(d.reduce((a, b) => a + b, 0))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Short countdown for the nominator's accusation and the nominee's defence. */
export function PleaTimer(props: { game: Game }) {
  useTimer();
  const secs = pleaFor(aliveAll(props.game));
  const [who, setWho] = useState<'acc' | 'def' | null>(null);
  const [endsAt, setEndsAt] = useState(0);
  const [, tick] = useState(0);
  const rung = useRef(false);
  useEffect(() => {
    if (!who) return;
    const id = window.setInterval(() => {
      tick((n) => n + 1);
      if (Date.now() >= endsAt && !rung.current) { rung.current = true; ring(); }
    }, 250);
    return () => window.clearInterval(id);
  }, [who, endsAt]);
  const go = (w: 'acc' | 'def') => { unlockAudio(); rung.current = false; setWho(w); setEndsAt(Date.now() + secs * 1000); };
  const left = who ? Math.max(0, (endsAt - Date.now()) / 1000) : secs;
  return (
    <div class={`plea ${who && left <= 0 ? 'rang' : ''}`}>
      <span class="small muted">{T('Parole', 'Speech')}</span>
      <button type="button" class={`btn xs ${who === 'acc' ? 'on' : ''}`} onClick={() => go('acc')}>{T('Accusation', 'Accusation')}</button>
      <button type="button" class={`btn xs ${who === 'def' ? 'on' : ''}`} onClick={() => go('def')}>{T('Défense', 'Defence')}</button>
      <span class="mono plea-clock">{fmtClock(left)}</span>
      {who && <button type="button" class="icon-btn" aria-label={T('Arrêter', 'Stop')} onClick={() => setWho(null)}>×</button>}
    </div>
  );
}
