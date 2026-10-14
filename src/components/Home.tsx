import { useEffect, useRef, useState } from 'preact/hooks';
import { demoGame, newGame } from '../game/engine';
import {
  MAX_HISTORY, deleteHistory, exportGame, listHistory, parseImport, setGame, storageEstimate, useStore, type HistoryItem,
} from '../game/store';
import type { Game } from '../game/types';
import { T, getLang, setLang } from '../i18n';
import { openBriefing, openGuide } from './Guide';
import { ShareHandout, openHandout } from './Handout';
import { JoinLive } from './Live';
import { Modal, Seg } from './ui';

const locale = () => (getLang() === 'fr' ? 'fr-FR' : 'en-GB');
const fmtDay = (t: number) => new Date(t).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
const fmtAgo = (t: number) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return T('à l’instant', 'just now');
  if (m < 60) return T(`il y a ${m} min`, `${m} min ago`);
  const h = Math.round(m / 60);
  if (h < 24) return T(`il y a ${h} h`, `${h} h ago`);
  return fmtDay(t);
};
const fmtDuration = (ms: number) => {
  const mins = Math.max(1, Math.round(ms / 60000));
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')}`;
};

export function phaseLabel(g: Pick<Game, 'phase' | 'nightNumber' | 'dayNumber'>) {
  switch (g.phase) {
    case 'setup': return T('Préparation', 'Setup');
    case 'night': return `${T('Nuit', 'Night')} ${g.nightNumber}`;
    case 'day': return `${T('Jour', 'Day')} ${g.dayNumber}`;
    case 'ended': return T('Terminée', 'Finished');
  }
}

const resultOf = (h: Pick<HistoryItem, 'phase' | 'winner'>) =>
  h.winner === 'good' ? { label: T('Bien', 'Good'), cls: 'tone-bon' } : h.winner === 'evil' ? { label: T('Mal', 'Evil'), cls: 'tone-mal' } : { label: '—', cls: 'tone-neu' };

const LangSwitch = () => (
  <Seg small value={getLang()} onChange={setLang} options={[{ v: 'fr', label: 'FR' }, { v: 'en', label: 'EN' }]} />
);

export function Home(props: { onOpen: () => void }) {
  const { game } = useStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [importError, setImportError] = useState<{ file: string; reason: string } | null>(null);
  const [deleting, setDeleting] = useState<HistoryItem | null>(null);
  const [sharing, setSharing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () => {
    void listHistory().then((h) => { setHistory(h); setLoaded(true); });
    void storageEstimate().then(setStorage);
  };
  useEffect(refresh, [game?.id]);

  const open = (g: Game) => { setGame(g); props.onOpen(); };
  const demo = () => open(demoGame(7 + Math.floor(Math.random() * 6)));

  const onImport = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    file.text().then((txt) => {
      try { open(parseImport(txt)); } catch (err) { setImportError({ file: file.name, reason: (err as Error).message }); }
    }).catch(() => setImportError({ file: file.name, reason: T('Lecture impossible', 'Could not read the file') }));
  };

  const resumable = game && game.phase !== 'ended' ? game : null;
  const empty = loaded && history.length === 0 && !resumable;

  const importInput = <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onImport} />;
  const dialogs = (
    <>
      {importInput}
      {importError && (
        <Modal eyebrow={T('IMPORT IMPOSSIBLE', 'IMPORT FAILED')} eyebrowTone="mal" title={T('Ce fichier n’est pas une partie lisible', 'This file is not a readable game')} onClose={() => setImportError(null)}>
          <div class="mono-box">{importError.file}<br />{importError.reason}</div>
          <p class="modal-text">{T('Aucune donnée n’a été modifiée. Choisissez un fichier exporté depuis Grimoire.', 'Nothing was changed. Pick a file exported from Grimoire.')}</p>
          <div class="grid-2">
            <button type="button" class="btn" onClick={() => setImportError(null)}>{T('Fermer', 'Close')}</button>
            <button type="button" class="btn amber" onClick={() => { setImportError(null); fileInput.current?.click(); }}>{T('Autre fichier', 'Another file')}</button>
          </div>
        </Modal>
      )}
      {sharing && <Modal eyebrow={T('FICHE JOUEUR', 'PLAYER SHEET')} title={T('Sur le téléphone des joueurs', 'On the players’ phones')} onClose={() => setSharing(false)}><ShareHandout /></Modal>}
      {deleting && (
        <Modal title={T(`Supprimer « ${deleting.title || 'Partie sans nom'} » ?`, `Delete “${deleting.title || 'Untitled game'}”?`)} onClose={() => setDeleting(null)}>
          <p class="modal-text">
            {deleting.players} {T('joueurs', 'players')} · {fmtDay(deleting.createdAt)}{deleting.phase === 'ended' ? ` · ${deleting.winner === 'good' ? T('Victoire du Bien', 'Good won') : deleting.winner === 'evil' ? T('Victoire du Mal', 'Evil won') : T('Abandonnée', 'Abandoned')}` : ''}.{' '}
            {T('La suppression est définitive et ne peut pas être annulée.', 'Deleting is permanent and cannot be undone.')}
          </p>
          <div class="stack-sm">
            <button type="button" class="btn" onClick={() => { exportGame(deleting.game); void deleteHistory(deleting.id).then(refresh); setDeleting(null); }}>{T('Exporter puis supprimer', 'Export then delete')}</button>
            <div class="grid-2">
              <button type="button" class="btn" onClick={() => setDeleting(null)}>{T('Annuler', 'Cancel')}</button>
              <button type="button" class="btn danger" onClick={() => { void deleteHistory(deleting.id).then(refresh); setDeleting(null); }}>{T('Supprimer', 'Delete')}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );

  if (empty) {
    return (
      <div class="home empty">
        <div class="home-lang"><LangSwitch /></div>
        <div class="empty-hero">
          <div class="halo" />
          <h1 class="home-title xl">Grimoire</h1>
          <p class="empty-text">{T('Aucune partie pour l’instant. Préparez votre première table ou explorez une partie de démo.', 'No games yet. Set up your first table or explore a demo game.')}</p>
        </div>
        <div class="empty-actions">
          <button type="button" class="btn amber lg" onClick={() => open(newGame())}>{T('Nouvelle partie', 'New game')}</button>
          <div class="grid-2">
            <button type="button" class="btn" onClick={demo}>{T('Partie de démo', 'Demo game')}</button>
            <button type="button" class="btn" onClick={() => fileInput.current?.click()}>{T('Importer un .json', 'Import a .json')}</button>
          </div>
          <button type="button" class="btn outline" onClick={() => openGuide('start', () => open(newGame()))}>{T('Première fois ? Guide du Conteur', 'First time? Storyteller’s guide')}</button>
          <button type="button" class="btn outline" onClick={openHandout}>{T('Vous êtes joueur ? La fiche joueur', 'A player? The player sheet')}</button>
          <JoinLive />
        </div>
        <div class="home-foot">{T('Installée · fonctionne sans connexion · sauvegarde automatique sur cet appareil', 'Installed · works offline · saved automatically on this device')}</div>
        {dialogs}
      </div>
    );
  }

  return (
    <div class="home">
      <section class="home-left">
        <header>
          <h1 class="home-title">Grimoire</h1>
          <div class="home-sub">Blood on the Clocktower · Trouble Brewing</div>
        </header>

        {resumable && (
          <div class="card current">
            <Eyebrow2>{T('PARTIE EN COURS', 'CURRENT GAME')}</Eyebrow2>
            <div class="current-title">{resumable.title || T('Partie sans nom', 'Untitled game')}</div>
            <div class="chips">
              <span class="chip">{phaseLabel(resumable)}</span>
              <span class="chip">{resumable.players.length} {T('joueurs', 'players')}</span>
              {resumable.phase !== 'setup' && <span class="chip">{resumable.players.filter((p) => p.alive).length} {T('vivants', 'alive')}</span>}
            </div>
            <button type="button" class="btn amber lg" onClick={props.onOpen}>{T('Reprendre la partie', 'Resume game')}</button>
            <div class="home-note">{T('Sauvegardée automatiquement', 'Saved automatically')} · {fmtAgo(resumable.updatedAt)}</div>
          </div>
        )}

        <div class="tiles">
          <button type="button" class="tile" onClick={() => open(newGame())}><b>{T('Nouvelle partie', 'New game')}</b><span>{T('Préparation guidée', 'Guided setup')}</span></button>
          <button type="button" class="tile" onClick={demo}><b>{T('Partie de démo', 'Demo game')}</b><span>{T('Noms et rôles au hasard', 'Random names and characters')}</span></button>
          <button type="button" class="tile" onClick={() => fileInput.current?.click()}><b>{T('Importer', 'Import')}</b><span>{T('Fichier .json', '.json file')}</span></button>
        </div>

        <div class="card guide-card">
          <div class="eyebrow tone-amb">{T('GUIDE DU CONTEUR', 'STORYTELLER’S GUIDE')}</div>
          <p class="modal-text">{T('Le déroulé d’une soirée, l’histoire à raconter, les règles, les conseils et les durées conseillées du jour.', 'How an evening runs, the story to tell, the rules, advice and recommended day durations.')}</p>
          <div class="grid-2">
            <button type="button" class="btn" onClick={() => openGuide('start', () => open(newGame()))}>{T('Ouvrir le guide', 'Open the guide')}</button>
            <button type="button" class="btn" onClick={() => openBriefing(false)}>{T('Présenter les règles', 'Present the rules')}</button>
          </div>
        </div>

        <div class="card guide-card">
          <div class="eyebrow tone-amb">{T('FICHE JOUEUR', 'PLAYER SHEET')}</div>
          <p class="modal-text">{T('Tous les personnages et leurs pouvoirs, les règles et les infos utiles, à ouvrir sur le téléphone de chaque joueur (QR code).', 'Every character and ability, the rules and useful info, to open on each player’s phone (QR code).')}</p>
          <div class="grid-2">
            <button type="button" class="btn" onClick={() => setSharing(true)}>{T('QR code / lien', 'QR code / link')}</button>
            <button type="button" class="btn" onClick={openHandout}>{T('Voir la fiche', 'View the sheet')}</button>
          </div>
        </div>

        <div class="card guide-card">
          <div class="eyebrow tone-amb">{T('SUIVRE UNE DIFFUSION', 'FOLLOW A BROADCAST')}</div>
          <p class="modal-text">{T('Le code est affiché sur la TV, sous le QR code.', 'The code is shown on the TV, next to the QR code.')}</p>
          <JoinLive />
        </div>
      </section>

      <section class="home-right">
        <div class="home-right-head">
          <div class="baseline"><h2>{T('Historique', 'History')}</h2><span class="mono muted">{history.length} / {MAX_HISTORY}</span></div>
          <LangSwitch />
        </div>
        <ul class="history">
          {history.map((h) => {
            const r = resultOf(h);
            const meta = [fmtDay(h.createdAt), `${h.players} ${T('joueurs', 'players')}`,
              h.phase === 'ended' && h.winner ? fmtDuration(h.updatedAt - h.createdAt) : h.phase === 'ended' ? T('abandonnée', 'abandoned') : phaseLabel(h.game)].join(' · ');
            return (
              <li key={h.id} class={h.id === game?.id ? 'is-current' : ''}>
                <button type="button" class="history-main" onClick={() => (h.id === game?.id ? props.onOpen() : open(h.game))}>
                  <span class="history-title"><span>{h.title || T('Partie sans nom', 'Untitled game')}</span>{h.demo && <span class="tag">{T('Démo', 'Demo')}</span>}</span>
                  <span class="history-meta">{meta}</span>
                </button>
                <span class={`history-result ${r.cls}`}>{r.label}</span>
                <button type="button" class="btn sm" onClick={() => exportGame(h.game)}>{T('Exporter', 'Export')}</button>
                <button type="button" class="icon-btn danger-text" aria-label={T('Supprimer', 'Delete')} onClick={() => setDeleting(h)}>×</button>
              </li>
            );
          })}
        </ul>
        {storage && (
          <div class="home-note">{T('Stockage utilisé', 'Storage used')} : {(storage.usage / 1024 / 1024).toFixed(1)} {T('Mo', 'MB')} / {(storage.quota / 1024 / 1024).toFixed(0)} {T('Mo', 'MB')}</div>
        )}
      </section>
      {dialogs}
    </div>
  );
}

const Eyebrow2 = (props: { children: string }) => <div class="eyebrow tone-amb">{props.children}</div>;
