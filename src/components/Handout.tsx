// Players' handout, opened on their own phones (#fiche): characters, rules and useful info. Public only.
import qrcode from 'qrcode-generator';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { RULES } from '../data/guide';
import { GLOSSARY, NIGHT_STAR, ROLE_EXAMPLES, ROLE_TIPS, TEAM_ADVICE, hasNightStar } from '../data/handout';
import { useIconTheme } from '../data/icons';
import { ALL_ROLES, DISTRIBUTION, FIRST_NIGHT, OTHER_NIGHT, ROLES, type RoleId, type Team } from '../data/roles';
import { T, TEAM_NAMES, getLang, loc, roleName, setLang, useLang } from '../i18n';
import { RoleIcon, Seg, roleSide, toast } from './ui';

export const HANDOUT_HASH = '#fiche';
type Tab = 'roles' | 'rules' | 'info';
const TABS: Tab[] = ['roles', 'rules', 'info'];
const SLUG: Record<Tab, string> = { roles: 'personnages', rules: 'regles', info: 'infos' };
const FROM_APP = 'botc.handoutFromApp';

export const isHandoutHash = (h: string) => h === HANDOUT_HASH || h.startsWith(`${HANDOUT_HASH}/`);
const tabFromHash = (h: string): Tab => (TABS.find((t) => h === `${HANDOUT_HASH}/${SLUG[t]}`) ?? 'roles');
/** Public address of the app, used in the QR code whatever device or address the storyteller uses (override with VITE_PUBLIC_URL). */
export const PUBLIC_URL: string = import.meta.env.VITE_PUBLIC_URL || 'https://botc.dramixx.work/';
export const handoutUrl = () => `${PUBLIC_URL.replace(/\/?$/, '/')}${HANDOUT_HASH}`;

/** Opens the handout in the storyteller's app (with a way back). */
export function openHandout() {
  try { sessionStorage.setItem(FROM_APP, '1'); } catch { /* ignore */ }
  location.hash = HANDOUT_HASH;
}

const TEAMS: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller'];
const TEAM_BLURB: Record<Team, { fr: string; en: string }> = {
  townsfolk: { fr: 'Gentils. Des capacités utiles, souvent des informations.', en: 'Good. Helpful abilities, often information.' },
  outsider: { fr: 'Gentils, mais leur capacité gêne leur propre équipe.', en: 'Good, but their ability hinders their own team.' },
  minion: { fr: 'Méchants. Ils connaissent le Démon et l’aident.', en: 'Evil. They know the Demon and help them.' },
  demon: { fr: 'Méchant. Tue chaque nuit à partir de la deuxième.', en: 'Evil. Kills every night from the second.' },
  traveller: { fr: 'Facultatifs. Personnage public, camp secret.', en: 'Optional. Public character, secret team.' },
};
const tabLabel = (t: Tab) => ({ roles: T('Personnages', 'Characters'), rules: T('Règles', 'Rules'), info: T('Infos utiles', 'Useful info') }[t]);

export function Handout() {
  useLang();
  useIconTheme();
  const [tab, setTab] = useState<Tab>(tabFromHash(location.hash));
  let fromApp = false;
  try { fromApp = sessionStorage.getItem(FROM_APP) === '1'; } catch { /* ignore */ }
  useEffect(() => {
    document.documentElement.lang = getLang();
    document.title = T('Fiche joueur — Blood on the Clocktower', 'Player sheet — Blood on the Clocktower');
    return () => { document.title = 'Grimoire — Blood on the Clocktower'; };
  }, [getLang()]);
  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `${HANDOUT_HASH}/${SLUG[t]}`);
    window.scrollTo(0, 0);
  };

  return (
    <div class="handout">
      <div class="ho-head">
        <header class="ho-bar">
          {fromApp && <button type="button" class="btn xs" onClick={() => { location.hash = ''; }}>← Grimoire</button>}
          <div class="ho-title"><b>Blood on the Clocktower</b><span>Trouble Brewing · {T('fiche joueur', 'player sheet')}</span></div>
          <Seg small value={getLang()} onChange={setLang} options={[{ v: 'fr', label: 'FR' }, { v: 'en', label: 'EN' }]} />
        </header>
        <nav class="ho-tabs" aria-label={T('Sections', 'Sections')}>
          {TABS.map((t) => <button type="button" key={t} class={tab === t ? 'on' : ''} aria-current={tab === t ? 'page' : undefined} onClick={() => go(t)}>{tabLabel(t)}</button>)}
        </nav>
      </div>
      <main class="ho-main">
        {tab === 'roles' && <RolesTab />}
        {tab === 'rules' && <RulesTab />}
        {tab === 'info' && <InfoTab />}
      </main>
    </div>
  );
}

// --- characters -------------------------------------------------------------------------

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function RolesTab() {
  const [q, setQ] = useState('');
  const [team, setTeam] = useState<Team | 'all'>('all');
  const query = norm(q.trim());
  const match = (id: RoleId) => !query || norm(roleName(id)).includes(query) || norm(loc(ROLES[id].ability)).includes(query);
  return (
    <>
      <div class="ho-search">
        <input type="search" class="text-input" placeholder={T('Chercher un personnage ou un mot…', 'Search a character or a word…')} value={q}
          onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label={T('Chercher', 'Search')} />
        <div class="ho-chips">
          {(['all', ...TEAMS] as const).map((t) => (
            <button type="button" key={t} class={`filter ${team === t ? 'on' : ''}`} onClick={() => setTeam(t)}>{t === 'all' ? T('Tous', 'All') : loc(TEAM_NAMES[t])}</button>
          ))}
        </div>
      </div>
      {TEAMS.filter((t) => team === 'all' || team === t).map((t) => {
        const roles = ALL_ROLES.filter((r) => r.team === t && match(r.id));
        if (!roles.length) return null;
        return (
          <section key={t} class="ho-team">
            <h2 class={`ho-team-title tone-${roleSide(roles[0].id)}`}>{loc(TEAM_NAMES[t])} <span class="mono">{roles.length}</span></h2>
            <p class="ho-team-blurb">{loc(TEAM_BLURB[t])}</p>
            {roles.map((r) => (
              <article key={r.id} class={`ho-role tone-${roleSide(r.id)}`}>
                <span class="ref-ico"><RoleIcon role={r.id} size={26} /></span>
                <div class="ho-role-text">
                  <h3 class="ho-role-name">{roleName(r.id)}</h3>
                  <p class="ho-ability">{loc(r.ability)}</p>
                  {hasNightStar(r.ability) && <p class="ho-star">{loc(NIGHT_STAR)}</p>}
                  <details class="ho-tip">
                    <summary>{T('Conseil de jeu', 'How to play it')}</summary>
                    <p><b>{T('Exemple', 'Example')} :</b> {loc(ROLE_EXAMPLES[r.id])}</p>
                    <p><b>{T('Conseil', 'Tip')} :</b> {loc(ROLE_TIPS[r.id])}</p>
                  </details>
                </div>
              </article>
            ))}
          </section>
        );
      })}
      {!TEAMS.some((t) => (team === 'all' || team === t) && ALL_ROLES.some((r) => r.team === t && match(r.id))) && (
        <div class="dashed-hint center">{T('Aucun personnage ne correspond.', 'No character matches.')}</div>
      )}
    </>
  );
}

// --- rules ------------------------------------------------------------------------------------

const ESSENTIALS: [string, string][] = [
  ['Deux équipes secrètes : le Bien (Villageois, Étrangers) et le Mal (Sbires, Démon).', 'Two secret teams: Good (Townsfolk, Outsiders) and Evil (Minions, Demon).'],
  ['Le Bien gagne si le Démon meurt. Le Mal gagne s’il ne reste que 2 vivants.', 'Good wins if the Demon dies. Evil wins if only 2 players are alive.'],
  ['La nuit, yeux fermés : le Conteur réveille certains joueurs. Le Démon tue.', 'At night, eyes closed: the storyteller wakes some players. The Demon kills.'],
  ['Le jour, on discute, on ment si on veut, puis on nomine et on vote.', 'By day, talk, lie if you like, then nominate and vote.'],
  ['Pour mettre quelqu’un sur le bûcher, il faut des voix égales à au moins la moitié des vivants (les votes des morts comptent). Une exécution par jour au plus.', 'To put someone on the block, votes must reach at least half the living (the dead’s votes count). At most one execution a day.'],
  ['Une exécution ne dévoile pas le personnage du joueur : on ne sait jamais avec certitude qui est mort.', 'An execution does not reveal the player’s character: you never know for sure who died.'],
  ['Les morts parlent encore, gagnent avec leur équipe et gardent un seul vote.', 'The dead still talk, win with their team and keep a single vote.'],
  ['Ne montrez jamais votre personnage.', 'Never show your character.'],
];

function RulesTab() {
  return (
    <>
      <section class="ho-card">
        <h2 class="ho-h">{T('L’essentiel en 30 secondes', 'The essentials in 30 seconds')}</h2>
        <ul class="guide-list">{ESSENTIALS.map(([fr, en], i) => <li key={i}>{T(fr, en)}</li>)}</ul>
      </section>
      <div class="stack-sm">
        {RULES.map((topic) => (
          <details key={topic.id} class="guide-topic">
            <summary>{loc(topic.title)}</summary>
            <div class="guide-topic-body">
              {topic.blocks.map((b, i) =>
                b.k === 'list' ? <ul key={i} class="guide-list">{b.items.map((it, j) => <li key={j}>{loc(it)}</li>)}</ul>
                  : b.k === 'tip' ? <div key={i} class="guide-tip"><b>{T('Conseil', 'Tip')}</b><span>{loc(b.text)}</span></div>
                    : <p key={i} class="guide-p">{loc(b.text)}</p>)}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

// --- useful info ------------------------------------------------------------------------------------

const nightLabel = (key: string) =>
  key === 'minioninfo' ? T('Les Sbires découvrent le Démon (7 joueurs et plus)', 'Minions learn the Demon (7+ players)')
    : key === 'demoninfo' ? T('Le Démon découvre ses Sbires et 3 bluffs (7 joueurs et plus)', 'The Demon learns their Minions and 3 bluffs (7+ players)')
      : roleName(key as RoleId);

function InfoTab() {
  const counts = Object.keys(DISTRIBUTION).map(Number);
  return (
    <div class="stack-sm">
      <details class="guide-topic" open>
        <summary>{T('Répartition des personnages', 'Character distribution')}</summary>
        <div class="guide-topic-body">
          <div class="timer-table-wrap">
            <table class="timer-table ho-table">
              <thead><tr><th>{T('Joueurs', 'Players')}</th><th class="tone-bon">{T('Cit.', 'Town')}</th><th class="tone-out">{T('Étr.', 'Out')}</th><th class="tone-min">{T('Sbi.', 'Min')}</th><th class="tone-dem">{T('Dém.', 'Dem')}</th></tr></thead>
              <tbody>{counts.map((n) => <tr key={n}><td class="mono">{n}</td>{DISTRIBUTION[n].map((v, i) => <td key={i} class="mono">{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <p class="guide-p">{T('Le Baron remplace 2 Villageois par 2 Étrangers. Les Voyageurs s’ajoutent en plus.', 'The Baron replaces 2 Townsfolk with 2 Outsiders. Travellers come on top.')}</p>
        </div>
      </details>
      <details class="guide-topic">
        <summary>{T('Votes nécessaires', 'Votes needed')}</summary>
        <div class="guide-topic-body">
          <p class="guide-p">{T('Pour mettre un joueur sur le bûcher : des voix égales à au moins la moitié des vivants, arrondie au supérieur. Le seuil se calcule sur les vivants, mais les votes fantômes des morts comptent dans le total. Pour le remplacer, il faut strictement plus de voix.', 'To put a player on the block: votes equal to at least half the living, rounded up. The threshold is based on the living, but the dead’s ghost votes count towards the total. To replace them, strictly more votes are needed.')}</p>
          <div class="ho-votes">
            {Array.from({ length: 13 }, (_, i) => i + 3).map((n) => <div key={n}><b class="mono">{Math.ceil(n / 2)}</b><span>{n} {T('vivants', 'alive')}</span></div>)}
          </div>
        </div>
      </details>
      <details class="guide-topic">
        <summary>{T('Ordre de la nuit', 'Night order')}</summary>
        <div class="guide-topic-body">
          <p class="guide-p">{T('Seuls les personnages en jeu se réveillent. Le Conteur peut toucher d’autres joueurs pour brouiller les pistes.', 'Only characters in play wake. The storyteller may touch other players to cover tracks.')}</p>
          <div class="ho-night">
            <div><h3 class="ho-h3">{T('Première nuit', 'First night')}</h3><ol>{FIRST_NIGHT.filter((k) => k !== 'dusk' && k !== 'dawn').map((k) => <li key={k}>{nightLabel(k)}</li>)}</ol></div>
            <div><h3 class="ho-h3">{T('Autres nuits', 'Other nights')}</h3><ol>{OTHER_NIGHT.filter((k) => k !== 'dusk' && k !== 'dawn').map((k) => <li key={k}>{nightLabel(k)}</li>)}</ol></div>
          </div>
        </div>
      </details>
      {TEAM_ADVICE.map((a, i) => (
        <details key={i} class="guide-topic">
          <summary>{loc(a.title)}</summary>
          <div class="guide-topic-body"><ul class="guide-list">{a.items.map((it, j) => <li key={j}>{loc(it)}</li>)}</ul></div>
        </details>
      ))}
      <details class="guide-topic">
        <summary>{T('Lexique', 'Glossary')}</summary>
        <div class="guide-topic-body">
          <dl class="ho-glossary">{GLOSSARY.map((g, i) => <div key={i}><dt>{loc(g.term)}</dt><dd>{loc(g.def)}</dd></div>)}</dl>
        </div>
      </details>
    </div>
  );
}

// --- sharing (storyteller side) ---------------------------------------------------------------------------

/** QR code as an SVG path (dark modules on a light square, for any phone camera). */
export function QrCode(props: { text: string; size?: number; label?: string }) {
  const { n, d } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(props.text);
    qr.make();
    const count = qr.getModuleCount();
    let path = '';
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) path += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { n: count + 8, d: path };
  }, [props.text]);
  return (
    <svg class="qr" width={props.size ?? 220} height={props.size ?? 220} viewBox={`0 0 ${n} ${n}`} role="img" aria-label={props.label ?? T('QR code de la fiche joueur', 'Player sheet QR code')} shape-rendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

export function ShareHandout() {
  const url = handoutUrl();
  const copy = () => {
    void navigator.clipboard?.writeText(url).then(() => toast(T('Lien copié', 'Link copied')), () => toast(url));
  };
  return (
    <div class="share-handout">
      <p class="modal-text">{T('Les joueurs scannent ce code avec leur téléphone pour lire les personnages, les règles et les infos utiles. La fiche ne contient aucune information de la partie.', 'Players scan this code with their phone to read the characters, the rules and useful info. The sheet contains no information about the game.')}</p>
      <div class="qr-box"><QrCode text={url} /></div>
      <div class="mono-box center">{url}</div>
      <div class="grid-2">
        <button type="button" class="btn" onClick={copy}>{T('Copier le lien', 'Copy link')}</button>
        {typeof navigator.share === 'function'
          ? <button type="button" class="btn" onClick={() => { void navigator.share({ title: 'Blood on the Clocktower', url }).catch(() => {}); }}>{T('Partager', 'Share')}</button>
          : <button type="button" class="btn" onClick={openHandout}>{T('Ouvrir la fiche', 'Open the sheet')}</button>}
      </div>
      {typeof navigator.share === 'function' && <button type="button" class="btn" onClick={openHandout}>{T('Ouvrir la fiche', 'Open the sheet')}</button>}
    </div>
  );
}
