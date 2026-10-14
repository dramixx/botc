// Storyteller's guide (how to run an evening, story, rules, advice, timer) and the rules presentation for the table.
import { useEffect, useState } from 'preact/hooks';
import {
  ADVICE, RULES, START_STEPS, STORY, briefingSlides, type Block, type BriefingCtx, type StartAction, type Topic,
} from '../data/guide';
import { checkSetup, isTraveller } from '../game/engine';
import { update, useStore } from '../game/store';
import { PACE_NAMES, getPrefs, recommended, setPrefs, useTimer, type Pace } from '../game/timer';
import type { L10n } from '../data/roles';
import { T, TEAM_NAMES, loc } from '../i18n';
import { RecommendationTable, TimerSettings } from './DayTimer';
import { QrCode, handoutUrl } from './Handout';
import { Seg } from './ui';

export type GuideTab = 'start' | 'story' | 'rules' | 'advice' | 'timer';
type Open =
  | { kind: 'guide'; tab: GuideTab; onNewGame?: () => void }
  | { kind: 'briefing'; withGame: boolean };

let open: Open | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

/** Opens the storyteller's guide on a tab. `onNewGame` adds a "New game" shortcut (from the home screen). */
export function openGuide(tab: GuideTab = 'start', onNewGame?: () => void) { open = { kind: 'guide', tab, onNewGame }; emit(); }
/** Opens the rules presentation for the table, with the current game's numbers or a player count to choose. */
export function openBriefing(withGame = true) { open = { kind: 'briefing', withGame }; emit(); }
function closeAll() { open = null; emit(); }

export function GuideHost() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  if (!open) return null;
  return open.kind === 'briefing' ? <Briefing withGame={open.withGame} onClose={closeAll} /> : <Guide key={open.tab} tab={open.tab} onNewGame={open.onNewGame} onClose={closeAll} />;
}

// --- content blocks -------------------------------------------------------------------

function Blocks(props: { blocks: Block[] }) {
  return (
    <>
      {props.blocks.map((b, i) => {
        switch (b.k) {
          case 'h': return <h3 key={i} class="guide-h">{loc(b.text)}</h3>;
          case 'p': return <p key={i} class="guide-p">{loc(b.text)}</p>;
          case 'quote': return <blockquote key={i} class="guide-quote">{loc(b.text).split('\n\n').map((para, j) => <p key={j}>{para}</p>)}</blockquote>;
          case 'tip': return <div key={i} class="guide-tip"><b>{T('Conseil', 'Tip')}</b><span>{loc(b.text)}</span></div>;
          default: return <ul key={i} class="guide-list">{b.items.map((it, j) => <li key={j}>{loc(it)}</li>)}</ul>;
        }
      })}
    </>
  );
}

function Topics(props: { topics: Topic[] }) {
  return (
    <div class="stack-sm">
      {props.topics.map((t, i) => (
        <details key={t.id} class="guide-topic" open={i === 0}>
          <summary>{loc(t.title)}</summary>
          <div class="guide-topic-body"><Blocks blocks={t.blocks} /></div>
        </details>
      ))}
    </div>
  );
}

// --- guide ------------------------------------------------------------------------------------

const TABS: GuideTab[] = ['start', 'story', 'rules', 'advice', 'timer'];
const tabLabel = (t: GuideTab) => ({
  start: T('Déroulé', 'Walkthrough'), story: T('Histoire', 'Story'), rules: T('Règles', 'Rules'),
  advice: T('Le Conteur', 'Storyteller'), timer: T('Minuteur', 'Timer'),
}[t]);

export function Guide(props: { tab: GuideTab; onNewGame?: () => void; onClose: () => void }) {
  const [tab, setTab] = useState<GuideTab>(props.tab);
  useEffect(() => { document.querySelector('.guide-body')?.scrollTo(0, 0); }, [tab]);
  const act = (a: StartAction) => {
    if (a === 'briefing') openBriefing(!props.onNewGame);
    else if (a === 'newgame') { closeAll(); props.onNewGame?.(); }
    else setTab(a);
  };
  return (
    <div class="guide" role="dialog" aria-label={T('Guide du Conteur', 'Storyteller’s guide')}>
      <header class="ref-bar guide-bar">
        <button type="button" class="btn sm" onClick={props.onClose}>← {T('Retour', 'Back')}</button>
        <span class="serif lg">{T('Guide du Conteur', 'Storyteller’s guide')}</span>
        <div class="grow" />
        <nav class="row wrap guide-tabs">
          {TABS.map((t) => <button type="button" key={t} class={`filter ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{tabLabel(t)}</button>)}
        </nav>
      </header>
      <div class="guide-body">
        <div class="guide-col">
          {tab === 'start' && <StartTab onAction={act} canNew={!!props.onNewGame} />}
          {tab === 'story' && <Blocks blocks={STORY} />}
          {tab === 'rules' && <><p class="guide-p muted">{T('Les règles de Trouble Brewing, le script d’initiation. Les capacités de chaque personnage sont dans « Rôles ».', 'The rules of Trouble Brewing, the beginner script. Each character’s ability is in “Roles”.')}</p><Topics topics={RULES} /></>}
          {tab === 'advice' && <Topics topics={ADVICE} />}
          {tab === 'timer' && <TimerTab />}
        </div>
      </div>
    </div>
  );
}

function StartTab(props: { onAction: (a: StartAction) => void; canNew: boolean }) {
  return (
    <>
      <div class="guide-intro">
        <p class="guide-p">{T('Tout ce qu’il faut pour mener une soirée, de l’installation à la révélation finale. Suivez les étapes dans l’ordre ; l’app vous accompagne à chacune.', 'Everything you need to run an evening, from setting up to the final reveal. Follow the steps in order; the app helps at each one.')}</p>
        <button type="button" class="btn amber" onClick={() => props.onAction('briefing')}>{T('Présenter le jeu à la table', 'Present the game to the table')}</button>
      </div>
      <ol class="guide-steps">
        {START_STEPS.map((s, i) => (
          <li key={i} class="guide-step">
            <span class="guide-step-num mono">{i + 1}</span>
            <div class="guide-step-body">
              <div class="between"><h3 class="guide-step-title">{loc(s.title)}</h3><span class="chip">{loc(s.time)}</span></div>
              <p class="guide-p">{loc(s.text)}</p>
              <ul class="guide-list">{s.items.map((it, j) => <li key={j}>{loc(it)}</li>)}</ul>
              {s.action && (s.action.id !== 'newgame' || props.canNew) && (
                <button type="button" class="btn sm guide-step-btn" onClick={() => props.onAction(s.action!.id)}>{loc(s.action.label)} →</button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function TimerTab() {
  const { prefs } = useTimer();
  const [settings, setSettings] = useState(false);
  return (
    <>
      <p class="guide-p">{T('Pendant le jour, un minuteur rythme les trois moments de la journée : discussions privées, débat public, nominations. Il sonne et vibre à la fin de chaque moment, et reste visible dans la barre du haut.', 'During the day, a timer paces the three parts of the day: private chats, public debate, nominations. It rings and vibrates at the end of each part, and stays visible in the top bar.')}</p>
      <p class="guide-p">{T('Les durées conseillées dépendent du nombre de joueurs vivants et raccourcissent au fil des jours (le premier jour est le plus long, il y a tout à découvrir). Chaque nomination prévoit aussi un temps de parole pour l’accusation et la défense.', 'Recommended durations depend on the number of living players and shrink as days pass (day 1 is the longest, there is everything to discover). Each nomination also has speaking time for the accusation and the defence.')}</p>
      <div class="stack-xs">
        <div class="eyebrow">{T('RYTHME', 'PACE')}</div>
        <Seg value={prefs.pace} onChange={(v: Pace) => setPrefs({ pace: v })} options={(Object.keys(PACE_NAMES) as Pace[]).map((v) => ({ v, label: loc(PACE_NAMES[v]) }))} />
      </div>
      <h3 class="guide-h">{T('Durées conseillées du premier jour', 'Recommended durations on day 1')}</h3>
      <RecommendationTable pace={prefs.pace} />
      <div class="guide-tip"><b>{T('Conseil', 'Tip')}</b><span>{T('Débutants : rythme « Détendu ». Joueurs habitués : « Rapide ». Les jours suivants, les discussions privées raccourcissent d’environ 20 % par jour.', 'Beginners: “Relaxed” pace. Seasoned players: “Fast”. On later days, private chats shrink by about 20% a day.')}</span></div>
      <button type="button" class="btn" onClick={() => setSettings(true)}>{T('Personnaliser les durées', 'Customise durations')}</button>
      {settings && <TimerSettings onClose={() => setSettings(false)} />}
    </>
  );
}

// --- rules presentation (for the table) -------------------------------------------------------

function Briefing(props: { withGame: boolean; onClose: () => void }) {
  const store = useStore();
  const game = props.withGame && store.game?.phase !== 'ended' ? store.game : null;
  const fromGame = game ? game.players.filter((p) => !isTraveller(p)).length : null;
  const [count, setCount] = useState(fromGame ?? 8);
  const [i, setI] = useState(0);
  const [say, setSay] = useState(true);
  const pace = getPrefs().pace;
  const mins = (s: 'private' | 'public' | 'nominations') => Math.max(1, Math.round(recommended(s, count, 1, pace) / 60));
  // The Baron's extra Outsiders stay secret: the table only hears the base distribution.
  const expected = checkSetup(count, []).expected;
  const travellers = game ? game.players.filter(isTraveller).length : 0;
  const ctx: BriefingCtx = { count, expected, needed: Math.ceil((count + travellers) / 2), minutes: { private: mins('private'), public: mins('public'), nominations: mins('nominations') } };
  const slides = briefingSlides(ctx);
  const s = slides[Math.min(i, slides.length - 1)];
  const last = i >= slides.length - 1;
  const canDistribute = game?.phase === 'setup' && ['assign', 'rules', 'distribute'].includes(game.setupStep);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, slides.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length]);

  return (
    <div class="guide briefing" role="dialog" aria-label={T('Présentation des règles', 'Rules presentation')}>
      <header class="ref-bar guide-bar">
        <button type="button" class="btn sm" onClick={props.onClose}>← {T('Retour', 'Back')}</button>
        <span class="serif lg hide-sm">{T('Présentation des règles', 'Rules presentation')}</span>
        <div class="grow" />
        {fromGame === null && (
          <div class="row brief-count">
            <span class="small muted">{T('Joueurs', 'Players')}</span>
            <button type="button" class="btn xs" disabled={count <= 5} onClick={() => setCount(count - 1)} aria-label="−">−</button>
            <span class="mono">{count}</span>
            <button type="button" class="btn xs" disabled={count >= 15} onClick={() => setCount(count + 1)} aria-label="+">+</button>
          </div>
        )}
        <button type="button" class={`btn sm ${say ? 'on' : ''}`} aria-pressed={say} onClick={() => setSay(!say)}>{T('Texte à lire', 'Script')}</button>
      </header>
      <div class="guide-body brief-body">
        <div class="brief-slide" key={s.id}>
          <div class="eyebrow tone-amb">{loc(s.eyebrow)} · {i + 1} / {slides.length}</div>
          <h2 class="brief-title">{loc(s.title)}</h2>
          {s.distrib && (
            <div class="distrib brief-distrib">
              {(['townsfolk', 'outsider', 'minion', 'demon'] as const).map((t) => (
                <div key={t} class="distrib-cell">
                  <span class={`distrib-num tone-${t === 'townsfolk' ? 'bon' : t === 'outsider' ? 'out' : t === 'minion' ? 'min' : 'dem'}`}>{expected[t]}</span>
                  <span class="distrib-label">{loc(TEAM_NAMES[t])}</span>
                </div>
              ))}
            </div>
          )}
          <ul class="brief-points">{s.points.map((pt, j) => <li key={j}>{loc(pt)}</li>)}</ul>
          {last && (
            <div class="brief-qr">
              <QrCode text={handoutUrl()} size={150} />
              <span>{T('Scannez pour retrouver sur votre téléphone tous les personnages, les règles et les infos utiles.', 'Scan to get every character, the rules and useful info on your phone.')}</span>
            </div>
          )}
          {say && (
            <div class="brief-say">
              <div class="eyebrow">{T('À DIRE À VOIX HAUTE', 'READ ALOUD')}</div>
              {loc(s.say).split('\n\n').map((para, j) => <p key={j}>{para}</p>)}
            </div>
          )}
        </div>
      </div>
      <footer class="brief-foot">
        <button type="button" class="btn" disabled={i === 0} onClick={() => setI(i - 1)}>← {T('Précédent', 'Previous')}</button>
        <div class="brief-dots" aria-hidden="true">{slides.map((sl, j) => <button type="button" key={sl.id} tabIndex={-1} class={`brief-dot ${j === i ? 'on' : ''} ${j < i ? 'past' : ''}`} onClick={() => setI(j)} />)}</div>
        {!last ? (
          <button type="button" class="btn amber" onClick={() => setI(i + 1)}>{T('Suivant', 'Next')} →</button>
        ) : canDistribute ? (
          <button type="button" class="btn amber" onClick={() => { update((d) => { d.setupStep = 'distribute'; }); props.onClose(); }}>{T('Distribuer les personnages', 'Hand out characters')} →</button>
        ) : (
          <button type="button" class="btn amber" onClick={props.onClose}>{T('Terminer', 'Finish')}</button>
        )}
      </footer>
    </div>
  );
}

// --- atmosphere lines ----------------------------------------------------------------------------

/** A line for the storyteller to read aloud, with a button to pick another one. `{names}` is replaced. */
export function Narration(props: { lines: L10n[]; names?: string[]; seed?: number }) {
  const [n, setN] = useState(props.seed ?? 0);
  const text = loc(props.lines[n % props.lines.length]).replace('{names}', (props.names ?? []).join(T(' et ', ' and ')));
  return (
    <div class="narration">
      <span class="narration-text">« {text} »</span>
      {props.lines.length > 1 && <button type="button" class="icon-btn" aria-label={T('Autre texte d’ambiance', 'Another atmosphere line')} onClick={() => setN(n + 1)}>↻</button>}
    </div>
  );
}
