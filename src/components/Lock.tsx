import { useState } from 'preact/hooks';
import { unlock } from '../game/access';
import { T } from '../i18n';
import { openHandout } from './Handout';
import { JoinLive } from './Live';

/** Shown instead of the home page until the storyteller types the password (GRIMOIRE_PASSWORD on the server). */
export function Lock() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    const ok = await unlock(password);
    setBusy(false);
    if (!ok) { setWrong(true); setPassword(''); }
  };

  return (
    <div class="home empty lock">
      <div class="empty-hero">
        <div class="halo" />
        <h1 class="home-title xl">Grimoire</h1>
        <p class="empty-text">{T('Réservé au Conteur. Entrez le mot de passe pour préparer ou reprendre une partie.', 'Storyteller only. Enter the password to set up or resume a game.')}</p>
      </div>
      <form class="empty-actions" onSubmit={submit}>
        <input class="text-input" type="password" autocomplete="current-password" autofocus aria-label={T('Mot de passe', 'Password')}
          placeholder={T('Mot de passe', 'Password')} value={password}
          onInput={(e) => { setPassword((e.target as HTMLInputElement).value); setWrong(false); }} />
        {wrong && <p class="lock-error" role="alert">{T('Mot de passe incorrect.', 'Wrong password.')}</p>}
        <button type="submit" class="btn amber lg" disabled={!password || busy}>{busy ? T('Vérification…', 'Checking…') : T('Entrer', 'Enter')}</button>
      </form>
      {/* Players land here from the QR code on the TV: the player sheet, or the broadcast with the TV's code. */}
      <div class="empty-actions lock-players">
        <div class="eyebrow tone-amb">{T('VOUS ÊTES JOUEUR ?', 'A PLAYER?')}</div>
        <button type="button" class="btn amber" onClick={openHandout}>{T('La fiche joueur', 'The player sheet')}</button>
        <JoinLive />
      </div>
    </div>
  );
}
