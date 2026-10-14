# Grimoire — Blood on the Clocktower (Trouble Brewing)

Grimoire du Conteur pour iPad, en PWA hors-ligne (marche aussi sur ordi, à la souris).

## Fonctionnalités

- **Préparation** : de 5 à 15 joueurs, ordre de la table, répartition officielle (avec le Baron), rôles choisis à la main ou au hasard, attribution avec échange automatique, Ivrogne (faux rôle), faux positif de la Voyante, bluffs du Démon, Voyageurs.
- **Règles puis distribution** : après l'attribution, une étape « Règles » pour présenter l'histoire et les règles à voix haute, puis la distribution. Par défaut, **sur les téléphones** : l'iPad (et la TV si la diffusion est ouverte) affiche un QR code ; chaque joueur le scanne, touche son prénom et maintient un bouton pour voir son personnage (l'Ivrogne voit le rôle qu'il croit avoir). L'iPad suit en direct qui s'est identifié et qui a vu son rôle, et peut « Libérer » une place prise par erreur. Dès que la nuit 1 commence, le personnage ne s'affiche plus sur les téléphones (il reste la fiche joueur). Sans téléphone ou sans réseau : « En passant l'iPad », avec un écran de confidentialité.
- **Alertes de situation particulière** : quand il se passe quelque chose qu'il ne faut pas rater, une alerte plein écran s'affiche jusqu'à ce que le Conteur la valide, puis reste épinglée sur l'étape. Par exemple : le joueur réveillé est empoisonné ou ivre (et par qui), c'est l'Ivrogne, le Diable vise le Maire, le Soldat ou un joueur protégé par le Moine, le Diable se tue lui-même (passation), la Succube devient Démon, le Gardien des corbeaux a été tué, l'Espion regarde le Grimoire, des étapes de nuit ont été oubliées à l'aube. Le jour, le Conteur doit confirmer l'exécution du Saint ou du Démon, une fin de jour sans exécution qui fait gagner le Maire, et des nominations restées sans vote.
- **Mode masqué le jour** : masquer cache le cercle mais garde un panneau public (minuteurs, nominations, comptage des votes en touchant le cercle), sans rien qui trahisse un personnage. Il se met tout seul pendant les nominations et les votes (réglable dans le menu). Pour démasquer, il faut un appui long.
- **Mode démo** : noms et rôles tirés au hasard, tout reste modifiable.
- **Grimoire** : les joueurs en cercle, avec marqueurs (empoisonné, protégé, maître…, et les jetons de rappel de la première nuit comme dans le Grimoire officiel : Lavandière « Villageois / Faux », Bibliothécaire « Étranger / Faux », Enquêteur « Sbire / Faux », et « Paire » du Cuisinier sur les méchants voisins comptés, posés automatiquement), morts, votes fantômes et mode masqué.
- **Nuits guidées** : ordre officiel, rôles absents ou morts sautés, texte à lire, cibles, et **vraies infos calculées** (Cuisinier, Empathe, Voyante, Lavandière, Bibliothécaire, Enquêteur, Croque-mort, Corneille), toutes modifiables. Avertissement si le joueur est ivre ou empoisonné, avec un bouton pour générer une fausse info. Gère aussi l’Espion et le Reclus (chaque chiffre qu’ils peuvent produire est proposé au Cuisinier et à l’Empathe), le Diable, le Moine, le Soldat, le Maire, le passage du Diable à un Sbire et la Succube.
- **Historique par personnage** : à chaque étape de nuit, des mini-jetons apparaissent sur le cercle, à côté des joueurs que ce rôle a déjà désignés ou appris, comme les jetons de rappel du vrai Grimoire. Chaque jeton porte l'icône du rôle, le n° de nuit et l'info donnée (2, oui/non, Moine…), avec un bord pointillé si le rôle était ivre/empoisonné et ✗ si l'info était fausse. La fiche d'un joueur les montre aussi, avec la liste de tout ce qu'il a reçu (utile pour la Lavandière, le Cuisinier… qui ne se réveillent qu'une fois).
- **Jour** : nominations, votes (×3 du Bureaucrate, −1 du Voleur, avertissement pour le Majordome), bûcher, Vierge, Pourfendeur, exil des Voyageurs, Bouc émissaire.
- **Victoire** : détection automatique (Démon mort, 2 joueurs vivants, Saint exécuté, Maire), à confirmer par le Conteur.
- **Guide du Conteur** (accueil, préparation, menu de la partie) : le déroulé complet d'une soirée en 8 étapes, l'histoire de Ravenswood Bluff à raconter, toutes les règles de Trouble Brewing, des conseils de Conteur (première partie, nuit, fausses infos, rythme du jour, erreurs) et des textes d'ambiance (crépuscule, aube, exécution), aussi proposés directement dans la nuit et le jour.
- **Présentation des règles à la table** : 11 écrans à montrer ou à lire (texte « à dire à voix haute »), avec les chiffres de la partie (répartition publique, votes nécessaires, durées du jour). Elle enchaîne sur la distribution des personnages.
- **Fiche joueur** (adresse `…/#fiche`, QR code dans l'accueil, le menu de la partie et le dernier écran de la présentation) : une page pensée pour le téléphone des joueurs, en trois onglets. **Personnages** : les 27 pouvoirs avec recherche, filtre par équipe et un conseil de jeu par personnage. **Règles** : l'essentiel en 30 secondes puis les règles en blocs repliables. **Infos utiles** : répartition, votes nécessaires, ordre de la nuit, conseils par camp, lexique. Elle n'affiche jamais rien de la partie en cours. Le QR code pointe toujours vers `https://botc.dramixx.work/#fiche`, même si l'app est ouverte depuis une autre adresse (variable `VITE_PUBLIC_URL` au build pour la changer).
- **Diffusion en direct** (menu de la partie → « Diffusion en direct ») : un QR code et un lien `…/#live/CODE` à ouvrir sur la **TV** (navigateur, bouton plein écran) ou sur les **téléphones**. On y voit le cercle avec les morts et les votes fantômes, le nombre de vivants, les votes pour exécuter, les votes fantômes restants, la répartition de départ, les nominations du jour avec leurs voix et le bûcher (le minuteur reste sur l’iPad du Conteur). **Uniquement des informations publiques** : ni personnages (sauf ceux des Voyageurs, qui sont publics), ni camps, ni marqueurs. Les morts de la nuit n'apparaissent qu'au lever du jour. Le lien reste le même pour toutes les parties de la soirée, survit au rechargement (côté Conteur comme côté écran) et l'iPad renvoie l'état dès que le réseau revient : la partie, elle, continue hors-ligne.
- **Mot de passe du Conteur** (variable d'environnement `GRIMOIRE_PASSWORD` côté serveur) : l'accueil, et donc la création, la reprise ou l'import d'une partie, demande ce mot de passe. La **fiche joueur** (`#fiche`) et la **diffusion en direct** (`#live/CODE`, sur la TV ou les téléphones) restent ouvertes à tous, sans mot de passe. Une fois saisi, il est gardé sur l'appareil (l'iPad continue de marcher hors-ligne) et revérifié à chaque ouverture : changer le mot de passe reverrouille les appareils. Le relais refuse aussi d'ouvrir une salle de diffusion sans lui. Sans variable (ou sans relais joignable), l'app reste ouverte comme avant. C'est une protection simple, pas un coffre-fort : elle empêche un visiteur de créer une partie, rien de plus.
- **Minuteur du jour** : discussions privées, débat public, nominations, avec des durées conseillées selon le nombre de vivants et le jour (plus courtes au fil de la partie), un rythme Détendu / Normal / Rapide, des durées personnalisables, un temps de parole pour l'accusation et la défense, une sonnerie et une vibration. Il reste affiché dans la barre du haut et survit au rechargement.
- **Version** : en bas à droite, très discrète (`v1.1.0 · 02/10 14:05` = version et heure du build) pour vérifier que l'iPad a bien pris la dernière mise à jour. Chaque PR augmente la version de `package.json` (la CI le vérifie).
- **Contradictions** : pendant la nuit, un bandeau prévient si l'info qu'on s'apprête à donner contredit une info déjà donnée (Empathe, Voyante, Croque-mort, Corneille, Bibliothécaire…), utile surtout pour les fausses infos.
- **Récit de la partie** : à la fin, nuit par nuit, ce que chaque personnage a reçu ou fait (fausses infos marquées), puis les votes et les morts de chaque jour, à montrer aux joueurs.
- **Annuler / rétablir** (↶ ↷, ou Ctrl/Cmd+Z), journal complet, FR/EN.
- **Sauvegarde automatique** : localStorage et IndexedDB, rien n'est perdu au rechargement. Historique des parties (60 max), export/import JSON.

## Interface

Direction visuelle « Lanterne » (maquette Claude Design) : sombre et chaude, lisible à la lueur d'une bougie. Le cercle des joueurs reste à gauche, le panneau de droite porte l'action en cours (nuit, jour, vote, fiche d'un joueur, journal) ; en portrait, il devient un tiroir en bas. Une seule couleur d'action (l'ambre) ; le bleu et le rouge sont réservés aux alignements. Les polices (Cormorant Garamond, IBM Plex) sont embarquées, donc disponibles hors-ligne.

Deux thèmes d'icônes pour les personnages, au choix dans le menu de la partie : **Classique** (les motifs des jetons officiels, redessinés en aplats modernes ; par défaut) et **Illustré** (des scènes plus détaillées). Toutes sont des SVG en couleur du camp (`src/data/icons-*.ts`).

## Développement

```bash
npm install
npm run dev      # http://localhost:5173 (accessible sur le réseau local avec --host)
npm run lint     # Biome
npm run typecheck
npm test         # tests du moteur de règles + simulation de parties (vitest)
npm run test:e2e # tests Playwright (build + preview automatiques)
npm run build    # → dist/
npm run live     # relais de la diffusion en direct (port 8081), à lancer à côté de `npm run dev`
```

### Simulation et tests de bout en bout

- `src/game/simulate.ts` joue des parties entières contre le moteur (bot `random` ou `logic`) et vérifie des invariants après chaque action. `SIM_GAMES=1000 npm test` pour en lancer davantage ; chaque partie a une graine, donc un échec se rejoue à l'identique.
- `e2e/` contient les tests Playwright, lancés sur deux formats (tablette 1180×820 et téléphone 390×844) : accueil, préparation, nuits, jour et votes, victoires, menu et fiche joueur, diffusion en direct, sauvegarde, PWA hors-ligne, mise en page, et `autoplay.spec.ts` qui joue des parties complètes au hasard **via l'interface** en vérifiant les invariants de `simulate.ts` sur la sauvegarde après chaque clic. Les parties de test sont construites avec le moteur (`e2e/helpers.ts`) et injectées dans `localStorage`.
- Première utilisation : `npx playwright install chromium`.

La CI GitHub Actions (`.github/workflows/ci.yml`) lance lint, typecheck, tests, build, les tests Playwright et l'image Docker à chaque PR et à chaque push sur `main`.

## Déploiement

### Docker

```bash
docker build -t botc-grimoire .
docker run -d --name grimoire -p 8080:8080 -e GRIMOIRE_PASSWORD='mot-de-passe' --restart unless-stopped botc-grimoire
```

`GRIMOIRE_PASSWORD` protège l'accueil (création de parties) ; sans elle, pas de mot de passe. Elle est lue au démarrage du conteneur, pas besoin de reconstruire l'image pour la changer.

Image nginx non-root sur le port **8080**, avec un healthcheck sur `/healthz`. Mets-la derrière ton reverse proxy en HTTPS (Traefik, Caddy, nginx…).

La même image fait tourner le **relais de la diffusion en direct** (`server/live.mjs`, Node sans dépendance) derrière nginx sur `/api/live`. Les salles sont gardées 24 h après leur dernière mise à jour, dans `/data` : ajoute `-v grimoire-live:/data` pour les garder d'un déploiement à l'autre (sans volume, l'iPad recrée de toute façon sa salle, avec le même code, au premier envoi). Si ton reverse proxy bufferise les réponses, désactive-le pour `/api/live/` (Server-Sent Events).

### Sans Docker

`npm run build`, puis copier le contenu de `dist/` sur n'importe quel serveur statique (dans un sous-dossier, c'est OK : les chemins sont relatifs). Pour la diffusion en direct, lancer aussi `node server/live.mjs` (variables `LIVE_PORT`, `LIVE_HOST`, `LIVE_DATA_DIR`, `LIVE_TTL_HOURS`, `GRIMOIRE_PASSWORD`) et faire suivre `…/api/live` vers lui, sans buffering. Sans relais, tout le reste de l'app marche normalement.

**HTTPS est obligatoire** pour le mode hors-ligne (service worker), sauf sur `localhost`.

Sur l'iPad : ouvrir l'URL dans Safari → Partager → **Sur l'écran d'accueil**. L'app s'ouvre alors en plein écran et fonctionne sans réseau. Installée sur l'écran d'accueil, ses données ne sont pas effacées automatiquement par Safari.

## Structure

- `src/data/roles.ts` : personnages, ordre de nuit, table de répartition.
- `src/game/engine.ts` : règles du jeu (fonctions pures, testées dans `engine.test.ts`).
- `src/game/store.ts` : état, annuler/rétablir, persistance, historique.
- `src/game/timer.ts` : durées conseillées du jour et minuteur (testés dans `timer.test.ts`).
- `src/game/live.ts` : la vue publique de la partie envoyée aux écrans (testée dans `live.test.ts`) ; `src/game/liveClient.ts` : l'envoi au relais ; `src/components/Live.tsx` : l'écran TV/téléphone et la fenêtre de partage ; `server/live.mjs` : le relais.
- `src/game/access.ts` : le mot de passe du Conteur (vérifié par le relais) ; `src/components/Lock.tsx` : l'écran qui le demande.
- `src/data/handout.ts` : conseils par personnage, lexique et conseils de la fiche joueur.
- `src/data/guide.ts` : contenu du Guide du Conteur, de la présentation des règles et des textes d'ambiance.
- `src/components/` : interface (Preact). `Circle.tsx` dessine le cercle, `Play.tsx` assemble barre de jeu, cercle et panneau ; `Setup`, `NightPanel`, `DayPanel`, `DayTimer`, `Guide`, `PlayerSheet`, `LogPanel`, `EndScreen`, `ShowCard` sont les écrans.
- `src/styles.css` : jetons de design (couleurs, polices) et styles de tous les écrans.
