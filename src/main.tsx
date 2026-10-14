import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { GuideHost } from './components/Guide';
import { Handout, isHandoutHash } from './components/Handout';
import { Home } from './components/Home';
import { LiveView } from './components/Live';
import { Lock } from './components/Lock';
import { Play } from './components/Play';
import { ShowCardHost } from './components/ShowCard';
import { ToastHost } from './components/ui';
import { useIconTheme } from './data/icons';
import { initAccess, useAccess } from './game/access';
import { initLive, liveCodeFromHash } from './game/liveClient';
import { loadInitial, useStore } from './game/store';
import { getLang, useLang } from './i18n';
import { initUpdates, useStale } from './update';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import './styles.css';

const pad = (n: number) => String(n).padStart(2, '0');
const built = new Date(__BUILD_TIME__);
const VERSION = `v${__APP_VERSION__} · ${pad(built.getDate())}/${pad(built.getMonth() + 1)} ${pad(built.getHours())}:${pad(built.getMinutes())}`;

/** App version and build time, barely visible: to check the iPad picked up the latest update. */
const AppVersion = () => <div class="app-version" aria-hidden="true">{VERSION}</div>;

function App() {
  useLang();
  useIconTheme();
  const { game } = useStore();
  // Creating or opening games needs the storyteller's password; the player sheet and the live view never do.
  const access = useAccess();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [resumed, setResumed] = useState(false);
  const stale = useStale();
  // Players open the public sheet (#fiche) on their own phones: no game is loaded or shown.
  const [handout, setHandout] = useState(isHandoutHash(location.hash));
  // The TV and the players' phones follow the live view (#live/CODE): public information only, no game loaded.
  const [live, setLive] = useState(liveCodeFromHash(location.hash));
  useEffect(() => {
    const onHash = () => { setHandout(isHandoutHash(location.hash)); setLive(liveCodeFromHash(location.hash)); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.lang = getLang();
    initAccess();
    // Resumes the live broadcast (if one is on) once the game is loaded.
    void loadInitial().then(() => { setReady(true); initLive(); });
  }, []);
  // Resume straight into an unfinished game after a refresh.
  useEffect(() => {
    if (!ready) return;
    if (game && game.phase !== 'ended') setScreen('game');
    setResumed(true);
  }, [ready]);
  // A newer build is applied only on the home page, never during a game, the player sheet or the live view.
  const onHome = ready && resumed && access !== 'checking' && access !== 'locked' && !live && !handout && screen === 'home';
  useEffect(() => { if (stale && onHome) location.reload(); }, [stale, onHome]);

  if (live) return <><LiveView code={live} /><AppVersion /></>;
  if (handout) return <><Handout /><ToastHost /><AppVersion /></>;
  if (!ready || access === 'checking') return <div class="loading"><div class="halo" /></div>;
  if (access === 'locked') return <><Lock /><ToastHost /><AppVersion /></>;
  return (
    <>
      {screen === 'game' && game ? <Play game={game} onHome={() => setScreen('home')} /> : <Home onOpen={() => setScreen('game')} />}
      <GuideHost />
      <ShowCardHost />
      <ToastHost />
      <AppVersion />
    </>
  );
}

render(<App />, document.getElementById('app')!);

initUpdates();
