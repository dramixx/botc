// Live view (#live/CODE): the public state of the game, on the TV or the players' phones. Read-only.
// The latest state is kept locally, so a refresh shows it at once, even before the relay answers.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ROLES, type RoleId } from '../data/roles';
import { TEAM_NAMES, T, getLang, loc, roleName, setLang, useLang } from '../i18n';
import type { LiveSnapshot, PublicSeats } from '../game/live';
import {
  type MySeat, type Room, type LiveStatus, type SeatCard, LIVE_HASH, apiBase, claimSeat, liveCodeFromHash, liveUrl, markSeatSeen, readMySeat, releaseMySeat,
  startLive, stopLive, useLive, writeMySeat,
} from '../game/liveClient';
import { linkGeometry } from './Circle';
import { QrCode, handoutUrl } from './Handout';
import { RoleReveal } from './ShowCard';
import { RoleIcon, Seg, toast } from './ui';

interface Payload { snap: LiveSnapshot | null; seats?: PublicSeats | null; updatedAt: number; now: number }
interface Received extends Payload { offset: number }
type Conn = 'connecting' | 'live' | 'retrying' | 'missing' | 'closed';

const cacheKey = (code: string) => `botc.liveView.${code}`;
function readCache(code: string): Received | null {
  try { return JSON.parse(localStorage.getItem(cacheKey(code)) ?? 'null') as Received | null; } catch { return null; }
}
function writeCache(code: string, r: Received) {
  try { localStorage.setItem(cacheKey(code), JSON.stringify(r)); } catch { /* ignore */ }
}

/** Follows a room: Server-Sent Events, with a check (and slower retries) when the room is unknown. */
export function useRoom(code: string) {
  const [data, setData] = useState<Received | null>(() => readCache(code));
  const [conn, setConn] = useState<Conn>('connecting');
  useEffect(() => {
    let es: EventSource | null = null;
    let retry: number | undefined;
    let stopped = false;
    const open = () => {
      if (stopped) return;
      es = new EventSource(`${apiBase()}/${code}/events`);
      es.addEventListener('state', (e) => {
        const p = JSON.parse((e as MessageEvent<string>).data) as Payload;
        const r: Received = { ...p, offset: p.now - Date.now() };
        setData(r);
        writeCache(code, r);
        setConn('live');
      });
      es.addEventListener('closed', () => {
        es?.close();
        setConn('closed');
        try { localStorage.removeItem(cacheKey(code)); } catch { /* ignore */ }
      });
      es.onerror = () => {
        if (es?.readyState !== EventSource.CLOSED) { setConn('retrying'); return; }
        // The browser gave up (unknown room, relay down): find out why, then try again later.
        es = null;
        void fetch(`${apiBase()}/${code}`, { cache: 'no-store' })
          .then((r) => setConn(r.status === 404 ? 'missing' : 'retrying'), () => setConn('retrying'))
          .finally(() => { retry = window.setTimeout(open, 5000); });
      };
    };
    open();
    return () => { stopped = true; es?.close(); window.clearTimeout(retry); };
  }, [code]);
  return { data, conn };
}

/** Keeps the screen on (TV, phone left on the table). */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    const get = () => { if (document.visibilityState === 'visible') nav.wakeLock?.request('screen').then((l) => { lock = l; }, () => {}); };
    get();
    document.addEventListener('visibilitychange', get);
    return () => { document.removeEventListener('visibilitychange', get); void lock?.release().catch(() => {}); };
  }, []);
}

export function LiveView(props: { code: string }) {
  useLang();
  useWakeLock();
  const { data, conn } = useRoom(props.code);
  const s = data?.snap ?? null;
  const seats = data?.seats ?? null;
  // Once the game has started, the character is no longer shown on the phone.
  const started = !!s && s.phase !== 'waiting' && s.phase !== 'setup';
  useEffect(() => { if (started) writeMySeat(props.code, null); }, [started]);

  const status = conn === 'live' ? null
    : conn === 'missing' ? T('Partie introuvable : vérifiez le code', 'Game not found: check the code')
    : conn === 'closed' ? T('Diffusion terminée', 'Broadcast ended')
    : conn === 'connecting' ? T('Connexion…', 'Connecting…')
    : T('Connexion perdue, nouvel essai…', 'Connection lost, retrying…');
  // Each screen sits somewhere else in the room: the TV keeps its own orientation, on this device only.
  const [rotation, setRotation] = useState(readRotation);
  const rotate = (by: number) => {
    const r = rotation + by;
    setRotation(r);
    try { localStorage.setItem(ROTATION_KEY, String(r)); } catch { /* ignore */ }
  };
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <div class={`live phase-${s?.phase ?? 'waiting'}`}>
      <header class="live-bar">
        <div class="live-title">
          <b>{s?.title || 'Blood on the Clocktower'}</b>
          <span><i class={`live-dot ${conn === 'live' ? 'on' : ''}`} />{status ?? T('En direct', 'Live')} · {props.code}</span>
        </div>
        <button type="button" class="icon-btn live-rotate" aria-label={T('Tourner dans le sens inverse', 'Rotate counterclockwise')} onClick={() => rotate(-1)}>↺</button>
        <button type="button" class="icon-btn live-rotate" aria-label={T('Tourner dans le sens horaire', 'Rotate clockwise')} onClick={() => rotate(1)}>↻</button>
        <a class="btn sm live-sheet" href={handoutUrl()}>{T('Fiche joueur', 'Player sheet')}</a>
        <Seg small value={getLang()} onChange={setLang} options={[{ v: 'fr', label: 'FR' }, { v: 'en', label: 'EN' }]} />
        {typeof document.documentElement.requestFullscreen === 'function' && (
          <button type="button" class="icon-btn live-fs" aria-label={T('Plein écran', 'Full screen')} onClick={fullscreen}>⛶</button>
        )}
      </header>
      {seats && !started ? (
        <DealView code={props.code} seats={seats} />
      ) : !s || s.phase === 'waiting' || s.phase === 'setup' ? (
        <div class="live-wait">
          <div class="halo" />
          <h1>{s?.phase === 'setup' ? T('La partie se prépare…', 'The game is being set up…') : T('En attente de la partie', 'Waiting for the game')}</h1>
          <p>{T('Cet écran se mettra à jour tout seul.', 'This screen will update by itself.')}</p>
          <JoinCode code={props.code} />
        </div>
      ) : (
        <div class="live-main">
          <div class="live-circle"><LiveCircle s={s} rotation={rotation} /></div>
          <aside class="live-side">
            <LiveStats s={s} />
            {s.phase === 'day' && <LiveVotes s={s} />}
            {s.phase === 'night' && <div class="live-card live-join"><JoinCode code={props.code} compact /></div>}
          </aside>
        </div>
      )}
    </div>
  );
}

// --- characters handed out on the phones -------------------------------------------------------------

/**
 * Setup, before night 1: the TV shows the QR code and who has seen their character; each phone picks its name
 * and reveals its character by holding a button. The character disappears from the phone when the game starts.
 */
function DealView(props: { code: string; seats: PublicSeats }) {
  const { code, seats } = props;
  const [mine, setMine] = useState<MySeat | null>(() => readMySeat(code));
  const [card, setCard] = useState<SeatCard | null>(null);
  const [stage, setStage] = useState<'hold' | 'reveal' | 'done'>('hold');
  const [ask, setAsk] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  // The relay has shown this seat as ours (a seat restored from this phone's storage counts): if it is then free, the Storyteller freed it.
  const confirmed = useRef(!!mine);
  const seat = mine && mine.gameId === seats.gameId ? seats.players.find((p) => p.id === mine.id) : undefined;

  const forget = (text = '') => { writeMySeat(code, null); setMine(null); setCard(null); setStage('hold'); setMsg(text); };
  useEffect(() => {
    if (!mine) return;
    if (!seat) { forget(); return; }
    // Freed by the Storyteller (right after our own claim, its broadcast may still be on its way: wait for it).
    if (!seat.claimed) { if (confirmed.current) forget(T('Le Conteur a libéré ta place : choisis ton prénom.', 'The Storyteller freed your seat: pick your name.')); return; }
    confirmed.current = true;
    if (card && card.v === seat.v) return;
    claimSeat(code, mine.id, mine.key).then((c) => {
      if (card && c.v !== card.v) { setStage('hold'); setMsg(T('Ton personnage a changé : regarde-le à nouveau.', 'Your character changed: look at it again.')); }
      setCard(c);
    }, (e: Error) => { if (e.message !== 'network') forget(); });
  }, [seats, mine?.id]);

  const claim = (id: string) => {
    setBusy(true);
    setMsg('');
    claimSeat(code, id).then((c) => {
      const m = { gameId: seats.gameId, id, key: c.key };
      confirmed.current = false;
      writeMySeat(code, m);
      setMine(m);
      setCard(c);
      setStage('hold');
    }, (e: Error) => setMsg(e.message === 'taken' ? T('Ce prénom vient d’être choisi par quelqu’un d’autre.', 'Someone else just picked this name.')
      : e.message === 'closed' ? T('La distribution est fermée.', 'The hand-out is closed.') : T('Connexion impossible, réessaie.', 'Cannot connect, try again.')))
      .finally(() => { setBusy(false); setAsk(null); });
  };

  if (mine && seat && card && card.role in ROLES) {
    const role = card.role as RoleId;
    if (stage === 'reveal') {
      return (
        <RoleReveal name={card.name} role={role} alignment={card.alignment}>
          <button type="button" class="btn lg showcard-done" onClick={() => setStage('done')}>{T('Cacher mon personnage', 'Hide my character')}</button>
        </RoleReveal>
      );
    }
    if (stage === 'hold') {
      return (
        <div class="showcard privacy deal-hold">
          <div class="showcard-hand">
            <div class="showcard-lead">{T('Ton personnage', 'Your character')}</div>
            <div class="showcard-name">{card.name}</div>
          </div>
          {msg && <div class="banner warn small"><b class="mono">!</b><span>{msg}</span></div>}
          <PhoneHold label={<>{card.name},<br />{T('maintiens', 'hold')}<br />{T('ici', 'here')}</>} onReveal={() => {
            setStage('reveal');
            setMsg('');
            if (!seat.seen) void markSeatSeen(code, mine.id, mine.key);
          }} />
          <div class="showcard-hint">{T('Cache ton écran : personne d’autre ne doit le voir.', 'Hide your screen: nobody else must see it.')}</div>
          <button type="button" class="link-btn" onClick={() => { void releaseMySeat(code, mine.id, mine.key); forget(); }}>{T('Ce n’est pas moi', 'This is not me')}</button>
        </div>
      );
    }
    return (
      <div class="deal">
        <div class="deal-done">
          <div class="halo" />
          <h1>{card.name}</h1>
          <p>{T('Garde ton personnage secret. Tu peux le revoir jusqu’au début de la partie ; ensuite il ne s’affiche plus ici.', 'Keep your character secret. You can see it again until the game starts; after that it is no longer shown here.')}</p>
          <button type="button" class="btn amber lg" onClick={() => setStage('hold')}>{T('Revoir mon personnage', 'See my character again')}</button>
        </div>
      </div>
    );
  }

  const seen = seats.players.filter((p) => p.seen).length;
  const asked = seats.players.find((p) => p.id === ask);
  return (
    <div class="deal">
      <figure class="deal-qr">
        <div class="qr-box"><QrCode text={liveUrl(code)} size={260} label={T('QR code pour découvrir son personnage', 'QR code to discover your character')} /></div>
        <figcaption>{T('Scannez pour découvrir votre personnage', 'Scan to discover your character')}<b class="live-join-code">{code}</b></figcaption>
      </figure>
      <div class="deal-main">
        <h1>{T('Qui es-tu ?', 'Who are you?')}</h1>
        <p class="muted">{T('Touche ton prénom pour découvrir ton personnage.', 'Tap your name to discover your character.')} · {seen}/{seats.players.length} {T('ont vu leur personnage', 'have seen their character')}</p>
        {msg && <div class="banner warn small"><b class="mono">!</b><span>{msg}</span></div>}
        {mine && !card && <div class="small muted">{T('Récupération de ton personnage…', 'Fetching your character…')}</div>}
        <div class="deal-list">
          {seats.players.map((p, i) => (
            <button type="button" key={p.id} class={`deal-row ${p.seen ? 'seen' : p.claimed ? 'taken' : ''}`} disabled={p.claimed || busy || !!mine} onClick={() => setAsk(p.id)}>
              <span class="mono muted">{String(i + 1).padStart(2, '0')}</span>
              <span class="deal-name">{p.name}</span>
              <span class="deal-state">{p.seen ? `✓ ${T('a vu', 'seen')}` : p.claimed ? T('identifié·e', 'identified') : ''}</span>
            </button>
          ))}
        </div>
      </div>
      {asked && (
        <div class="backdrop center" onClick={(e) => { if (e.target === e.currentTarget) setAsk(null); }}>
          <div class="modal center" role="dialog" aria-modal="true">
            <h2 class="modal-title">{T('Tu es bien', 'Are you')} {asked.name} ?</h2>
            <p class="modal-text">{T('Seul ce téléphone pourra voir ce personnage.', 'Only this phone will be able to see this character.')}</p>
            <div class="grid-2">
              <button type="button" class="btn" onClick={() => setAsk(null)}>{T('Non', 'No')}</button>
              <button type="button" class="btn amber" disabled={busy} onClick={() => claim(asked.id)}>{T('Oui, c’est moi', 'Yes, it’s me')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Press and hold to reveal (like the iPad's privacy screen). */
function PhoneHold(props: { label: ComponentChildren; onReveal: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number>();
  const start = () => { setHolding(true); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => { setHolding(false); props.onReveal(); }, 450); };
  const stop = () => { window.clearTimeout(timer.current); setHolding(false); };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button type="button" class={`hold ${holding ? 'holding' : ''}`} aria-label={T('Maintenir pour révéler', 'Hold to reveal')}
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') props.onReveal(); }} onContextMenu={(e) => e.preventDefault()}>
      <span class="hold-inner">{props.label}</span>
    </button>
  );
}

/** This screen's code, for the players to follow the broadcast from the home page (no QR code on the TV). */
function JoinCode(props: { code: string; compact?: boolean }) {
  return (
    <figure class={`live-join-qr ${props.compact ? 'compact' : ''}`}>
      <figcaption>
        <span>{T('Fiche joueur, ou suivre la partie avec le code', 'Player sheet, or follow the game with the code')}</span>
        <b class="live-join-code">{props.code}</b>
      </figcaption>
    </figure>
  );
}

/** Players' side of the home page: type the code shown on the TV to follow the broadcast. */
export function JoinLive() {
  const [code, setCode] = useState('');
  const target = liveCodeFromHash(`${LIVE_HASH}/${code.trim()}`);
  const submit = (e: Event) => {
    e.preventDefault();
    if (target) location.hash = `${LIVE_HASH}/${target}`;
  };
  return (
    <form class="join-live" onSubmit={submit}>
      <input class="text-input" type="text" inputMode="text" autocapitalize="characters" autocomplete="off" spellcheck={false} maxLength={8}
        aria-label={T('Code de la diffusion', 'Broadcast code')} placeholder={T('Code de la TV', 'Code on the TV')}
        value={code} onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())} />
      <button type="submit" class="btn" disabled={!target}>{T('Rejoindre', 'Join')}</button>
    </form>
  );
}

function phaseTitle(s: LiveSnapshot): [string, string] {
  if (s.phase === 'night') return [`${T('Nuit', 'Night')} ${s.night}`, T('La ville dort…', 'The town sleeps…')];
  if (s.phase === 'day') return [`${T('Jour', 'Day')} ${s.day}`, `${s.alive} ${T('vivants', 'alive')} · ${s.needed} ${T('votes pour exécuter', 'votes to execute')}`];
  if (s.phase === 'ended') {
    return [s.winner === 'good' ? T('Le Bien l’emporte', 'Good wins') : s.winner === 'evil' ? T('Le Mal l’emporte', 'Evil wins') : T('Partie terminée', 'Game over'), T('Merci d’avoir joué !', 'Thanks for playing!')];
  }
  return ['', ''];
}

const ROTATION_KEY = 'botc.liveRotation';
function readRotation(): number {
  try { return Number(localStorage.getItem(ROTATION_KEY)) || 0; } catch { return 0; }
}

function LiveCircle(props: { s: LiveSnapshot; rotation: number }) {
  const { s } = props;
  const n = s.players.length;
  const k = n <= 11 ? 1 : n <= 13 ? 0.9 : 0.8;
  const pos = (i: number): [number, number] => {
    const a = ((-90 + ((i + props.rotation) * 360) / n) * Math.PI) / 180;
    return [50 + 39 * Math.cos(a), 50 + 40 * Math.sin(a)];
  };
  // The latest nomination stays on the circle (arrow, nominator, nominee, raised hands) until the next one or the execution.
  const nom = s.phase === 'day' && s.executed === null ? s.nominations[s.nominations.length - 1] : undefined;
  const counting = !!nom && nom.votes === null;
  const nomLabel = (i: number) => {
    if (!nom) return '';
    const vote = (nom.voters ?? []).includes(i) ? (s.players[i]?.alive || nom.exile ? T('Vote', 'Vote') : T('Fantôme', 'Ghost')) : '';
    if (i === nom.nominee) return nom.exile ? T('Exil', 'Exile') : !counting && s.block?.seat === i ? T('Bûcher', 'Block') : T('Nominé·e', 'Nominated');
    if (i === nom.nominator) return vote ? `${T('Nomine', 'Nominates')} · ${vote}` : T('Nomine', 'Nominates');
    return vote;
  };
  const arrow = nom && nom.nominator >= 0 && nom.nominee >= 0 && nom.nominator !== nom.nominee ? linkGeometry(pos(nom.nominator), pos(nom.nominee), k) : null;
  const [title, sub] = counting ? [`${nom.tally ?? 0} ${T(Math.abs(nom.tally ?? 0) > 1 ? 'votes' : 'vote', Math.abs(nom.tally ?? 0) === 1 ? 'vote' : 'votes')}`, nom.exile ? T('Vote d’exil', 'Exile vote') : `${T('Seuil', 'Threshold')} ${s.needed}`] : phaseTitle(s);
  return (
    <div class="circle live-ring" style={{ '--k': String(k) }}>
      <div class="circle-ring" />
      <div class="circle-center">
        <div class={`circle-title ${title.length > 10 ? 'long' : ''} ${s.winner ? `tone-${s.winner === 'good' ? 'bon' : 'mal'}` : ''}`}>{title}</div>
        <div class="circle-sub">{sub}</div>
      </div>
      {arrow && (
        <svg class="circle-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="live-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.6" markerHeight="2.6" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="var(--amber)" />
            </marker>
          </defs>
          <path class="live-arrow" d={arrow.d} fill="none" stroke="var(--amber)" stroke-width="3.5" stroke-linecap="round" vector-effect="non-scaling-stroke" marker-end="url(#live-ah)" />
        </svg>
      )}
      {s.players.map((p, i) => {
        const [x, y] = pos(i);
        const badge = s.executed === i ? T('Exécuté', 'Executed') : nomLabel(i) || (s.block?.seat === i ? T('Bûcher', 'Block') : '');
        const faded = !!nom && !badge;
        return (
          <div key={i} class={`ptoken tone-${p.traveller ? 'trv' : 'hid'} ${p.alive ? '' : 'dead'} ${p.traveller ? 'trav' : ''} ${badge ? 'hl' : ''} ${faded ? 'faded' : ''}`}
            style={{ left: `${x}%`, top: `${y}%` }}>
            <span class="pcard">
              {badge && <span class="phl">{badge}</span>}
              <span class="prow">
                <span class="pleft">
                  {p.traveller && <span class="pico"><RoleIcon role={p.traveller} size={18} /></span>}
                  <span class="pseat">{String(i + 1).padStart(2, '0')}</span>
                </span>
                <span class="pstat">{p.alive ? '' : T('MORT', 'DEAD')}{!p.alive && <i class={`ghostdot ${p.ghostVote ? '' : 'spent'}`} title={p.ghostVote ? T('Vote fantôme disponible', 'Ghost vote available') : T('Vote fantôme utilisé', 'Ghost vote spent')} />}</span>
              </span>
              <span class={`live-name ${p.name.length > 11 ? 'lg' : ''}`}>{p.name}</span>
              <span class="live-sub">{p.traveller ? roleName(p.traveller) : !p.alive ? (p.ghostVote ? T('vote fantôme', 'ghost vote') : T('a voté', 'vote spent')) : ''}</span>
            </span>
          </div>
        );
      })}
      {arrow && arrow.seg >= 15 && (
        <div class="circle-label live-arrow-label" style={{ left: `${arrow.lp[0]}%`, top: `${arrow.lp[1]}%`, color: 'var(--amber)', borderColor: 'var(--amber)' }}>
          {nom?.exile ? T('exil', 'exile') : T('nomine', 'nominates')}
        </div>
      )}
    </div>
  );
}

function Stat(props: { value: string | number; label: string; tone?: string }) {
  return <div class={`live-stat ${props.tone ?? ''}`}><b>{props.value}</b><span>{props.label}</span></div>;
}

function LiveStats(props: { s: LiveSnapshot }) {
  const { s } = props;
  const d = s.distribution;
  return (
    <>
      <div class="live-stats">
        <Stat value={`${s.alive}/${s.total}`} label={T('vivants', 'alive')} />
        <Stat value={s.needed} label={T('votes pour exécuter', 'votes to execute')} tone="tone-amb" />
        <Stat value={s.ghostVotes} label={T('votes fantômes restants', 'ghost votes left')} />
      </div>
      {d && (
        <div class="live-card">
          <div class="eyebrow">{T('RÉPARTITION DE DÉPART', 'STARTING SETUP')}</div>
          <div class="live-dist">
            <span class="tone-bon"><b>{d[0]}</b> {loc(TEAM_NAMES.townsfolk)}</span>
            <span class="tone-out"><b>{d[1]}</b> {loc(TEAM_NAMES.outsider)}</span>
            <span class="tone-min"><b>{d[2]}</b> {loc(TEAM_NAMES.minion)}</span>
            <span class="tone-dem"><b>{d[3]}</b> {loc(TEAM_NAMES.demon)}</span>
          </div>
          <div class="small muted">{T('Le Baron peut changer le nombre d’Étrangers.', 'The Baron may change the number of Outsiders.')}</div>
        </div>
      )}
    </>
  );
}

/** How many nominations fit under the stats on this screen's height. */
function useMaxNoms() {
  const fitting = () => (window.innerHeight < 640 ? 2 : window.innerHeight < 900 ? 3 : 4);
  const [max, setMax] = useState(fitting);
  useEffect(() => {
    const on = () => setMax(fitting());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return max;
}

function LiveVotes(props: { s: LiveSnapshot }) {
  const { s } = props;
  const max = useMaxNoms();
  const name = (i: number) => s.players[i]?.name ?? '?';
  // Only the latest ones, so the TV never has to scroll; the block line says who is up.
  const shown = s.nominations.slice(-max);
  const earlier = s.nominations.length - shown.length;
  return (
    <div class="live-card">
      <div class="between"><span class="eyebrow">{T('NOMINATIONS DU JOUR', 'TODAY’S NOMINATIONS')}</span>{earlier > 0 && <span class="small muted">+{earlier} {T('plus tôt', 'earlier')}</span>}</div>
      {s.nominations.length === 0 && <div class="small muted">{T('Aucune nomination pour l’instant.', 'No nomination yet.')}</div>}
      {shown.map((n, i) => (
        <div key={i} class={`live-nom ${s.block?.seat === n.nominee && !n.exile ? 'on' : ''}`}>
          <span class="live-nom-who"><b>{name(n.nominee)}</b><span class="small muted">{n.exile ? T('exil demandé par', 'exile called by') : T('nommé·e par', 'nominated by')} {name(n.nominator)}</span></span>
          <span class="live-nom-votes">{n.votes === null ? '…' : `${n.votes} / ${s.needed}`}</span>
        </div>
      ))}
      <div class="live-block">
        {s.executed !== null ? `${T('Exécuté·e', 'Executed')} : ${name(s.executed)}`
          : s.block ? `${T('Sur le bûcher', 'On the block')} : ${name(s.block.seat)} (${s.block.votes} ${T('voix', 'votes')})`
          : T('Personne sur le bûcher', 'Nobody on the block')}
      </div>
    </div>
  );
}

// --- storyteller side ------------------------------------------------------------------------

const STATUS_TEXT: Record<LiveStatus, () => string> = {
  off: () => '',
  sending: () => T('Envoi…', 'Sending…'),
  ok: () => T('En direct : les écrans sont à jour', 'Live: screens are up to date'),
  error: () => T('Relais injoignable, nouvel essai automatique (la partie continue normalement)', 'Relay unreachable, retrying automatically (the game goes on normally)'),
};

export function ShareLive() {
  const { room, status } = useLive();
  const [busy, setBusy] = useState(false);
  if (!room) {
    return (
      <div class="share-handout">
        <p class="modal-text">{T('Affichez l’état de la partie sur la TV ou sur les téléphones : qui est mort, les votes fantômes, le nombre de votes pour exécuter et les nominations.', 'Show the state of the game on the TV or on phones: who is dead, ghost votes, votes needed to execute and nominations.')}</p>
        <div class="info-box">{T('Seules les informations publiques sont envoyées : jamais les personnages, les camps ou les marqueurs. Les morts de la nuit n’apparaissent qu’au lever du jour.', 'Only public information is sent: never characters, alignments or reminders. The night’s deaths only appear when the day starts.')}</div>
        <button type="button" class="btn amber lg" disabled={busy} onClick={() => { setBusy(true); void startLive().finally(() => setBusy(false)); }}>{T('Démarrer la diffusion', 'Start broadcasting')}</button>
      </div>
    );
  }
  return <LiveRoom room={room} status={status} />;
}

function LiveRoom(props: { room: Room; status: LiveStatus }) {
  const url = liveUrl(props.room.code);
  const copy = () => { void navigator.clipboard?.writeText(url).then(() => toast(T('Lien copié', 'Link copied')), () => toast(url)); };
  return (
    <div class="share-handout">
      <p class="modal-text">{T('Scannez ce code avec la TV (navigateur) ou un téléphone. Le lien reste le même pour toutes les parties de la soirée.', 'Scan this code with the TV (browser) or a phone. The link stays the same for every game of the evening.')}</p>
      <div class="qr-box"><QrCode text={url} /></div>
      <div class="live-code">{props.room.code}</div>
      <div class="mono-box center">{url}</div>
      <div class={`live-status ${props.status}`}><i class={`live-dot ${props.status === 'ok' ? 'on' : ''}`} />{STATUS_TEXT[props.status]()}</div>
      <div class="grid-2">
        <button type="button" class="btn" onClick={copy}>{T('Copier le lien', 'Copy link')}</button>
        <button type="button" class="btn" onClick={() => window.open(url, '_blank')}>{T('Ouvrir l’écran', 'Open the screen')}</button>
      </div>
      <button type="button" class="btn danger-outline" onClick={stopLive}>{T('Arrêter la diffusion', 'Stop broadcasting')}</button>
    </div>
  );
}
