// Storyteller's guide: how to run an evening, the story of Ravenswood Bluff, the rules, advice,
// the table presentation and atmosphere lines. Everything is written for Trouble Brewing.
import type { L10n } from './roles';

const l = (fr: string, en: string): L10n => ({ fr, en });

export type Block =
  | { k: 'p'; text: L10n }
  | { k: 'h'; text: L10n }
  | { k: 'list'; items: L10n[] }
  | { k: 'quote'; text: L10n }
  | { k: 'tip'; text: L10n };

export interface Topic { id: string; title: L10n; blocks: Block[] }

const p = (fr: string, en: string): Block => ({ k: 'p', text: l(fr, en) });
const h = (fr: string, en: string): Block => ({ k: 'h', text: l(fr, en) });
const quote = (fr: string, en: string): Block => ({ k: 'quote', text: l(fr, en) });
const tip = (fr: string, en: string): Block => ({ k: 'tip', text: l(fr, en) });
const list = (...items: [string, string][]): Block => ({ k: 'list', items: items.map(([fr, en]) => l(fr, en)) });

// --- 1. Running an evening, step by step ------------------------------------------------

export type StartAction = 'newgame' | 'briefing' | 'timer' | 'rules' | 'story';
export interface StartStep { title: L10n; time: L10n; text: L10n; items: L10n[]; action?: { id: StartAction; label: L10n } }

export const START_STEPS: StartStep[] = [
  {
    title: l('Avant la soirée', 'Before the evening'), time: l('5 min', '5 min'),
    text: l('Blood on the Clocktower se joue de 5 à 15 joueurs (idéalement 8 à 12), plus vous, le Conteur. Comptez 1 h à 1 h 30 de jeu, plus 15 minutes d’explications pour une première partie.',
      'Blood on the Clocktower plays with 5 to 15 players (ideally 8 to 12), plus you, the storyteller. Count 1 to 1.5 hours of play, plus 15 minutes of explanations for a first game.'),
    items: [
      l('Chargez l’iPad et ouvrez Grimoire une fois avec du réseau : ensuite tout marche hors-ligne.', 'Charge the iPad and open Grimoire once online: afterwards everything works offline.'),
      l('Disposez les chaises en cercle, assez d’espace autour pour les discussions privées (une autre pièce, un couloir, un jardin…).', 'Put the chairs in a circle, with room around for private chats (another room, a hallway, a garden…).'),
      l('Prévoyez une place pour vous, idéalement hors du cercle ou à une table à part, pour garder l’écran caché.', 'Plan a seat for yourself, ideally outside the circle or at a separate table, to keep the screen hidden.'),
      l('Lisez au moins une fois l’onglet « Règles » et l’onglet « Le Conteur ».', 'Read the “Rules” and “Storyteller” tabs at least once.'),
    ],
    action: { id: 'rules', label: l('Lire les règles', 'Read the rules') },
  },
  {
    title: l('Préparer la partie dans l’app', 'Set up the game in the app'), time: l('5 min', '5 min'),
    text: l('« Nouvelle partie » vous guide en quatre étapes. L’app calcule la répartition officielle et vérifie votre sélection.', '“New game” guides you in four steps. The app computes the official distribution and checks your selection.'),
    items: [
      l('Joueurs : le nombre, puis les noms dans l’ordre de la table, dans le sens horaire. L’ordre compte (voisins de l’Empathe, du Cuisinier…).', 'Players: the count, then the names in table order, clockwise. The order matters (Empath’s and Chef’s neighbours…).'),
      l('Personnages : à la main ou « Tirer au hasard ». Pour une première partie, évitez l’Ivrogne, l’Espion et le Reclus, qui brouillent les informations.', 'Characters: by hand or “Random”. For a first game, avoid the Drunk, the Spy and the Recluse, which muddy information.'),
      l('Attribution : qui reçoit quoi, le faux rôle de l’Ivrogne, le faux positif de la Voyante, les 3 bluffs du Démon.', 'Assignment: who gets what, the Drunk’s fake character, the Fortune Teller’s red herring, the Demon’s 3 bluffs.'),
      l('Distribution : à faire après la présentation des règles (étape suivante).', 'Hand out: do it after presenting the rules (next step).'),
    ],
    action: { id: 'newgame', label: l('Nouvelle partie', 'New game') },
  },
  {
    title: l('Présenter le jeu aux joueurs', 'Present the game to the players'), time: l('10–15 min', '10–15 min'),
    text: l('La présentation guidée déroule l’histoire, le but, la nuit, le jour, les votes et la mort, avec vos chiffres de ce soir. Lisez les textes en italique à voix haute, ou montrez l’écran à la table.',
      'The guided presentation goes through the story, the goal, the night, the day, voting and death, with tonight’s numbers. Read the italic texts aloud, or show the screen to the table.'),
    items: [
      l('Racontez l’histoire avec un peu de mise en scène : l’ambiance fait la moitié du jeu.', 'Tell the story with a bit of flair: atmosphere is half the game.'),
      l('Insistez sur trois points : on peut mentir, on ne montre jamais son jeton, et les morts continuent à jouer.', 'Stress three things: you may lie, you never show your token, and the dead keep playing.'),
      l('Terminez par les questions. Celles sur un personnage précis se posent en privé, plus tard.', 'End with questions. Questions about a specific character are asked in private, later.'),
      l('Faites scanner le QR code de la fiche joueur (dernier écran, ou menu de la partie) : chacun relit les pouvoirs et les règles sur son téléphone.', 'Have players scan the player sheet QR code (last screen, or the game menu): everyone can reread abilities and rules on their phone.'),
    ],
    action: { id: 'briefing', label: l('Lancer la présentation', 'Start the presentation') },
  },
  {
    title: l('Distribuer les personnages', 'Hand out the characters'), time: l('3–5 min', '3–5 min'),
    text: l('Passez l’iPad à chaque joueur : un écran neutre, un appui long pour voir son personnage, puis il le rend. Chacun lit sa capacité tranquillement.', 'Pass the iPad to each player: a neutral screen, a long press to see their character, then they hand it back. Everyone reads their ability calmly.'),
    items: [
      l('L’Ivrogne voit le Villageois qu’il croit être : ne le prévenez jamais.', 'The Drunk sees the Townsfolk they believe they are: never tell them.'),
      l('Rappelez que l’on garde son personnage secret… ou que l’on ment à son sujet.', 'Remind everyone to keep their character secret… or to lie about it.'),
    ],
  },
  {
    title: l('La première nuit', 'The first night'), time: l('3–5 min', '3–5 min'),
    text: l('« Tout le monde ferme les yeux. » Suivez les étapes de l’app : elle saute les rôles absents et calcule les vraies informations. Réveillez chacun d’une tape sur l’épaule.',
      '“Everyone close your eyes.” Follow the app’s steps: it skips absent characters and computes the true information. Wake each player with a tap on the shoulder.'),
    items: [
      l('Dès 7 joueurs : les Sbires découvrent le Démon, le Démon découvre ses Sbires et 3 personnages qui ne sont pas en jeu (ses bluffs).', 'From 7 players: the Minions learn the Demon, the Demon learns their Minions and 3 characters not in play (their bluffs).'),
      l('Faites le tour du cercle et touchez aussi des joueurs qui ne se réveillent pas, pour masquer qui agit.', 'Walk around the circle and also touch players who don’t wake, to hide who acts.'),
      l('Parlez par gestes, sans bruit. Les informations s’affichent en grand pour être montrées au joueur.', 'Communicate with gestures, silently. Information is displayed large so you can show it to the player.'),
    ],
  },
  {
    title: l('Les journées', 'The days'), time: l('10–20 min chacune', '10–20 min each'),
    text: l('À l’aube, annoncez les morts (le nom seulement, jamais le rôle). Puis le minuteur rythme la journée : discussions privées, débat public, nominations et votes, exécution.',
      'At dawn, announce the deaths (the name only, never the character). Then the timer paces the day: private chats, public debate, nominations and votes, execution.'),
    items: [
      l('Les durées sont conseillées selon le nombre de vivants et raccourcissent au fil des jours. Réglez-les dans ⚙.', 'Durations are recommended from the number of living players and shrink as days pass. Adjust them in ⚙.'),
      l('Prévenez une minute avant la fin des discussions : « Encore une minute ! ».', 'Give a one-minute warning before chats end: “One more minute!”.'),
      l('L’app compte les votes, le seuil, le bûcher, et gère la Vierge, le Pourfendeur, le Majordome…', 'The app counts the votes, the threshold, the block, and handles the Virgin, the Slayer, the Butler…'),
    ],
    action: { id: 'timer', label: l('Durées conseillées', 'Recommended durations') },
  },
  {
    title: l('Les nuits suivantes', 'The following nights'), time: l('3–5 min chacune', '3–5 min each'),
    text: l('Même rituel : yeux fermés, l’app vous donne l’ordre de réveil. Le Démon choisit une victime, le Moine protège, l’Empoisonneur empoisonne… Les infos fausses (ivre, empoisonné) sont proposées par l’app.',
      'Same ritual: eyes closed, the app gives you the waking order. The Demon picks a victim, the Monk protects, the Poisoner poisons… False information (drunk, poisoned) is suggested by the app.'),
    items: [
      l('Gardez un rythme régulier, même pour les étapes sans réveil : le silence trahit.', 'Keep a steady rhythm, even for steps where nobody wakes: silence gives things away.'),
    ],
  },
  {
    title: l('La fin de partie', 'The end of the game'), time: l('10 min', '10 min'),
    text: l('Le Bien gagne quand le Démon meurt. Le Mal gagne quand il ne reste que 2 joueurs vivants. L’app détecte la victoire et vous la fait confirmer.',
      'Good wins when the Demon dies. Evil wins when only 2 players are alive. The app detects the win and asks you to confirm it.'),
    items: [
      l('Révélez le Grimoire : qui était qui, qui était ivre ou empoisonné, les faux positifs.', 'Reveal the Grimoire: who was who, who was drunk or poisoned, the red herrings.'),
      l('Racontez la partie avec le journal : les joueurs adorent découvrir ce qui se passait la nuit.', 'Tell the story of the game with the log: players love finding out what happened at night.'),
    ],
  },
];

// --- 2. The story ---------------------------------------------------------------------------

/** The legend of Ravenswood Bluff, read aloud during the presentation. */
export const STORY_TEXT: L10n = l(
  'Ravenswood Bluff est un village paisible, perché sur sa colline. Ce soir, l’orage gronde. Sur la place, l’horloge de la vieille tour s’est arrêtée à minuit… et un cri a déchiré la nuit. On a retrouvé le corps du sonneur de cloches, au pied de la tour.\n\nLes anciens connaissent cette histoire. Un Démon s’est glissé parmi nous. Le jour, il porte un visage familier — celui d’un voisin, d’un ami, peut-être le vôtre. La nuit, il tue. Et il n’est pas seul : des Sbires le servent dans l’ombre, prêts à mentir, à empoisonner, à semer le doute.\n\nMais les villageois ont leurs propres dons. Certains voient ce que d’autres ignorent, certains protègent, d’autres sentent le mal tout proche. Chaque jour, le village se réunit sur la place pour débattre, accuser… et exécuter celui qu’il croit coupable.\n\nTuez le Démon, et le village est sauvé. Échouez, et il ne restera bientôt plus personne pour sonner les cloches.',
    'Ravenswood Bluff is a quiet village perched on its hill. Tonight, thunder rolls. On the square, the old tower clock has stopped at midnight… and a scream has torn the night. The bell ringer was found dead at the foot of the tower.\n\nThe elders know this story. A Demon has slipped in among us. By day, it wears a familiar face — a neighbour’s, a friend’s, perhaps yours. By night, it kills. And it is not alone: Minions serve it in the shadows, ready to lie, to poison, to sow doubt.\n\nBut the villagers have gifts of their own. Some see what others cannot, some protect, others sense evil close by. Each day, the village gathers on the square to debate, to accuse… and to execute whoever it believes guilty.\n\nKill the Demon, and the village is saved. Fail, and soon there will be no one left to ring the bells.');

export const STORY: Block[] = [
  h('Ravenswood Bluff', 'Ravenswood Bluff'),
  { k: 'quote', text: STORY_TEXT },
  tip('Lisez lentement, baissez la voix sur les phrases sombres, marquez des pauses. Une bougie ou une lumière tamisée aide beaucoup.', 'Read slowly, lower your voice on the dark lines, take pauses. A candle or dim light helps a lot.'),
  h('Le Conteur', 'The storyteller'),
  p('Vous êtes le Conteur : à la fois narrateur, arbitre et maître du temps. Vous connaissez tous les secrets — le Grimoire — et vous les gardez. Vous ne jouez pour aucun camp : votre but est une partie serrée et mémorable, où chacun garde une chance jusqu’au bout.',
    'You are the storyteller: narrator, referee and timekeeper at once. You know every secret — the Grimoire — and you keep them. You play for neither team: your goal is a close, memorable game where everyone keeps a chance until the end.'),
  p('Votre voix rythme tout : la tombée de la nuit, les réveils silencieux, l’annonce des morts à l’aube, le verdict sur la place. Utilisez les textes d’ambiance ci-dessous, ou inventez les vôtres.',
    'Your voice sets the rhythm: nightfall, the silent wakings, the dawn announcements, the verdict on the square. Use the atmosphere lines below, or make up your own.'),
  h('Textes d’ambiance', 'Atmosphere lines'),
  p('Au crépuscule :', 'At dusk:'),
  quote('« Le soleil se couche sur Ravenswood Bluff. Les volets se ferment, les lanternes s’éteignent une à une. Tout le monde ferme les yeux… la nuit commence. »', '“The sun sets over Ravenswood Bluff. Shutters close, lanterns go out one by one. Everyone close your eyes… the night begins.”'),
  p('À l’aube, s’il y a eu une victime :', 'At dawn, if someone died:'),
  quote('« Le coq chante, mais personne n’a envie de se lever. Devant sa porte, on a retrouvé… [nom]. Le Démon a encore frappé. »', '“The rooster crows, but nobody wants to get up. On their doorstep, we found… [name]. The Demon has struck again.”'),
  p('À l’aube, sans victime :', 'At dawn, with no victim:'),
  quote('« Le jour se lève sur un village étrangement calme. Chacun compte ses voisins… tout le monde est là. Cette nuit, personne n’est mort. »', '“Day breaks on a strangely quiet village. Everyone counts their neighbours… all are here. Tonight, nobody died.”'),
  p('À l’exécution :', 'At an execution:'),
  quote('« Le village a parlé. On conduit [nom] jusqu’au gibet, sous le regard de tous. La corde se tend… Que justice soit faite. »', '“The village has spoken. [Name] is led to the gallows, under everyone’s gaze. The rope tightens… Let justice be done.”'),
];

// --- 3. The rules -------------------------------------------------------------------------------

export const RULES: Topic[] = [
  {
    id: 'goal', title: l('Le but du jeu', 'The goal'),
    blocks: [
      p('Deux équipes s’affrontent en secret. Personne ne sait qui est dans quelle équipe — sauf le Mal, qui se connaît.', 'Two teams face off in secret. Nobody knows who is on which team — except Evil, who know each other.'),
      list(
        ['Le Bien : les Villageois et les Étrangers. Ils gagnent quand le Démon meurt.', 'Good: the Townsfolk and the Outsiders. They win when the Demon dies.'],
        ['Le Mal : le Démon (le Diable) et ses Sbires. Ils gagnent quand il ne reste que 2 joueurs vivants (les Voyageurs ne comptent pas).', 'Evil: the Demon (the Imp) and their Minions. They win when only 2 players are left alive (Travellers don’t count).'],
      ),
      p('Certains personnages changent ces règles : le Saint (s’il est exécuté, le Bien perd), le Maire (victoire possible à 3 joueurs sans exécution), la Succube (elle devient le Démon s’il meurt avec 5 vivants ou plus).',
        'Some characters change these rules: the Saint (if executed, Good loses), the Mayor (a possible win with 3 players and no execution), the Scarlet Woman (she becomes the Demon if it dies with 5 or more alive).'),
      tip('Un joueur mort gagne ou perd avec son équipe. Personne n’est jamais « éliminé » du jeu.', 'A dead player wins or loses with their team. Nobody is ever “eliminated” from the game.'),
    ],
  },
  {
    id: 'teams', title: l('Les équipes et la répartition', 'Teams and distribution'),
    blocks: [
      list(
        ['Villageois (bleu) : des gentils aux capacités utiles, souvent de l’information.', 'Townsfolk (blue): good players with helpful abilities, often information.'],
        ['Étrangers (turquoise) : des gentils dont la capacité gêne leur propre équipe (Ivrogne, Reclus, Saint, Majordome).', 'Outsiders (teal): good players whose ability hinders their own team (Drunk, Recluse, Saint, Butler).'],
        ['Sbires (orange) : des méchants qui aident le Démon (Empoisonneur, Espion, Succube, Baron).', 'Minions (orange): evil players who help the Demon (Poisoner, Spy, Scarlet Woman, Baron).'],
        ['Démon (rouge) : le Diable, qui tue chaque nuit à partir de la deuxième.', 'Demon (red): the Imp, who kills every night from the second one.'],
      ),
      p('Le nombre de chaque type dépend du nombre de joueurs ; il est public. L’app l’applique et l’affiche. Le Baron ajoute 2 Étrangers à la place de 2 Villageois.',
        'How many of each type depends on the player count; it is public. The app applies and shows it. The Baron adds 2 Outsiders instead of 2 Townsfolk.'),
    ],
  },
  {
    id: 'night', title: l('La nuit', 'The night'),
    blocks: [
      p('Tout le monde ferme les yeux. Le Conteur réveille les personnages un par un, dans un ordre précis, d’une tape sur l’épaule. Le joueur réveillé ouvre les yeux, reçoit une information ou désigne un joueur du doigt, puis se rendort. Tout se fait en silence, par gestes.',
        'Everyone closes their eyes. The storyteller wakes characters one by one, in a set order, with a tap on the shoulder. The woken player opens their eyes, receives information or points at a player, then goes back to sleep. Everything is silent, with gestures.'),
      list(
        ['Première nuit : le Mal se découvre (dès 7 joueurs) et les personnages « la première nuit seulement » reçoivent leur information. Le Démon ne tue pas.', 'First night: Evil meets (from 7 players) and the “you start knowing” characters get their information. The Demon does not kill.'],
        ['Nuits suivantes : le Démon tue, d’autres agissent ou apprennent quelque chose.', 'Other nights: the Demon kills, others act or learn something.'],
        ['On ne regarde pas, on ne parle pas, on ne fait pas de bruit. Tricher la nuit gâche la partie de tous.', 'No peeking, no talking, no noise. Cheating at night ruins the game for everyone.'],
      ),
    ],
  },
  {
    id: 'day', title: l('Le jour', 'The day'),
    blocks: [
      p('À l’aube, le Conteur annonce qui est mort pendant la nuit — le nom seulement. Puis le village discute.', 'At dawn, the storyteller announces who died in the night — the name only. Then the village talks.'),
      list(
        ['Discussions privées : on s’isole à deux ou trois pour échanger des informations… ou des mensonges.', 'Private chats: players split off in twos or threes to trade information… or lies.'],
        ['Débat public : tout le monde revient en cercle pour mettre les informations en commun et soupçonner.', 'Public debate: everyone comes back to the circle to share information and raise suspicions.'],
        ['Nominations et votes : le village peut exécuter un joueur (voir ci-dessous).', 'Nominations and votes: the village may execute a player (see below).'],
      ),
      p('On peut dire tout ce que l’on veut, y compris mentir sur son personnage. Mais on ne montre jamais son jeton : la seule preuve, c’est la parole.',
        'You may say anything you like, including lying about your character. But you never show your token: the only proof is your word.'),
      tip('Le Mal ment, mais le Bien aussi peut mentir pour protéger un rôle important ou piéger le Démon.', 'Evil lies, but Good may lie too, to protect an important character or to trap the Demon.'),
    ],
  },
  {
    id: 'nominations', title: l('Nominations et votes', 'Nominations and votes'),
    blocks: [
      list(
        ['Chaque joueur vivant peut nominer une fois par jour, et chaque joueur ne peut être nominé qu’une fois par jour.', 'Each living player may nominate once per day, and each player may be nominated only once per day.'],
        ['Le nominateur explique pourquoi, le nominé se défend (environ une minute chacun).', 'The nominator explains why, the nominee defends themselves (about a minute each).'],
        ['Le Conteur fait le tour du cercle dans le sens horaire, en commençant par le voisin du nominé et en finissant par lui. Chacun lève la main quand son tour arrive ; on ne peut plus changer d’avis ensuite.', 'The storyteller goes around the circle clockwise, starting next to the nominee and ending with them. Each player raises their hand when their turn comes; no changing your mind afterwards.'],
        ['Pour envoyer le nominé sur le bûcher, il faut un nombre de voix au moins égal à la moitié des vivants (arrondie au supérieur). Le seuil se calcule sur les vivants, mais le vote fantôme d’un mort compte dans le total.', 'To put the nominee on the block, the vote count must reach at least half the living players (rounded up). The threshold is based on the living, but a dead player’s ghost vote counts towards the total.'],
        ['Pour le remplacer, une nomination suivante doit faire strictement plus de voix. À égalité, personne n’est sur le bûcher.', 'To replace them, a later nomination needs strictly more votes. On a tie, nobody is on the block.'],
        ['À la fin du jour, le joueur sur le bûcher est exécuté. Au plus une exécution par jour ; il peut n’y en avoir aucune.', 'At the end of the day, the player on the block is executed. At most one execution per day; there may be none.'],
      ),
      tip('Exécuter un innocent n’est pas grave en soi : ne rien faire fait gagner le Mal, qui tue chaque nuit.', 'Executing an innocent player is not a disaster: doing nothing lets Evil win, since they kill every night.'),
    ],
  },
  {
    id: 'death', title: l('La mort', 'Death'),
    blocks: [
      list(
        ['Un mort garde son personnage secret, continue à parler, à débattre et à gagner avec son équipe.', 'A dead player keeps their character secret, keeps talking, debating and winning with their team.'],
        ['Un mort perd sa capacité et ne peut plus nominer.', 'A dead player loses their ability and can no longer nominate.'],
        ['Un mort a un seul vote pour tout le reste de la partie (le vote fantôme). Une fois utilisé, il ne vote plus.', 'A dead player has a single vote for the rest of the game (the ghost vote). Once used, they vote no more.'],
      ),
      tip('Le vote fantôme est précieux : les morts devraient le garder pour la fin, quand chaque voix compte.', 'The ghost vote is precious: the dead should keep it for the end, when every vote counts.'),
    ],
  },
  {
    id: 'drunk', title: l('Ivresse, poison et fausses informations', 'Drunkenness, poison and false information'),
    blocks: [
      p('Un joueur ivre ou empoisonné n’a plus de capacité, mais il ne le sait pas : le Conteur fait comme si elle marchait. S’il doit recevoir une information, elle peut être fausse.',
        'A drunk or poisoned player has no ability, but they don’t know it: the storyteller acts as if it worked. If they should receive information, it may be false.'),
      list(
        ['L’Ivrogne croit être un Villageois : il reçoit de fausses informations toute la partie.', 'The Drunk believes they are a Townsfolk: they receive false information all game.'],
        ['L’Empoisonneur empoisonne un joueur chaque nuit, jusqu’au soir suivant.', 'The Poisoner poisons a player each night, until the next dusk.'],
        ['L’Espion peut être perçu comme gentil, le Reclus comme méchant : une information juste peut donc sembler fausse.', 'The Spy may register as good, the Recluse as evil: so true information may look wrong.'],
      ),
      tip('C’est ce qui rend le jeu passionnant : aucune information n’est sûre à 100 %. Il faut recouper.', 'That is what makes the game thrilling: no information is 100% certain. Cross-check.'),
    ],
  },
  {
    id: 'table', title: l('Les règles de la table', 'Table rules'),
    blocks: [
      list(
        ['Ne jamais montrer son jeton ni son écran de personnage.', 'Never show your token or your character screen.'],
        ['La nuit : yeux fermés, silence, pas de bruit pour se signaler.', 'At night: eyes closed, silence, no noises to signal anything.'],
        ['On peut poser une question au Conteur à tout moment, en privé.', 'You may ask the storyteller a question at any time, in private.'],
        ['La décision du Conteur est définitive : il peut se tromper, mais il tranche.', 'The storyteller’s ruling is final: they may make mistakes, but they decide.'],
        ['On reste dans le jeu après sa mort : les morts sont souvent les meilleurs enquêteurs.', 'Stay in the game after you die: the dead are often the best detectives.'],
      ),
    ],
  },
  {
    id: 'travellers', title: l('Les Voyageurs (facultatif)', 'Travellers (optional)'),
    blocks: [
      p('Un joueur qui arrive en retard ou doit partir tôt peut jouer un Voyageur. Son personnage est public, mais son équipe est secrète (le Conteur la choisit). Il peut être exilé : tout le monde vote, même les morts, sans dépenser leur vote fantôme.',
        'A player who arrives late or must leave early can play a Traveller. Their character is public, but their team is secret (the storyteller picks it). They can be exiled: everyone votes, even the dead, without spending their ghost vote.'),
    ],
  },
];

// --- 4. Storyteller advice ---------------------------------------------------------------------

export const ADVICE: Topic[] = [
  {
    id: 'role', title: l('Votre rôle', 'Your role'),
    blocks: [
      p('Le Conteur n’est pas un adversaire. Vous voulez une partie serrée, où les deux équipes y croient jusqu’au bout. Quand vous avez le choix (information d’un joueur ivre, faux positif, Espion, Reclus…), choisissez ce qui rend la partie plus intéressante, pas ce qui fait gagner un camp.',
        'The storyteller is not an opponent. You want a close game where both teams believe until the end. When you have a choice (a drunk player’s information, red herring, Spy, Recluse…), pick what makes the game more interesting, not what makes one side win.'),
      tip('Si le Bien a tout compris dès le jour 2, rendez les fausses infos plus crédibles. Si le Mal écrase tout, donnez des infos vraies et utiles.', 'If Good has it all figured out by day 2, make false information more believable. If Evil is crushing it, give true, useful information.'),
    ],
  },
  {
    id: 'firstgame', title: l('Pour une première partie', 'For a first game'),
    blocks: [
      list(
        ['Choisissez des rôles simples : Lavandière, Bibliothécaire, Enquêteur, Cuisinier, Empathe, Voyante, Croque-mort, Moine, Corneille, Vierge, Pourfendeur, Soldat, Maire.', 'Pick simple characters: Washerwoman, Librarian, Investigator, Chef, Empath, Fortune Teller, Undertaker, Monk, Ravenkeeper, Virgin, Slayer, Soldier, Mayor.'],
        ['Évitez l’Ivrogne, l’Espion et le Reclus au début ; le Baron et le Saint sont faciles à comprendre.', 'Avoid the Drunk, the Spy and the Recluse at first; the Baron and the Saint are easy to grasp.'],
        ['L’Empoisonneur et la Succube sont de bons Sbires pour débuter.', 'The Poisoner and the Scarlet Woman are good beginner Minions.'],
        ['Allongez un peu les journées (rythme « Détendu » dans le minuteur).', 'Make days a bit longer (“Relaxed” pace in the timer).'],
      ),
    ],
  },
  {
    id: 'night', title: l('Mener la nuit', 'Running the night'),
    blocks: [
      list(
        ['Gardez un rythme régulier : passez le même temps sur chaque étape, même celles où personne ne se réveille.', 'Keep a steady rhythm: spend the same time on each step, even those where nobody wakes.'],
        ['Faites le tour du cercle et effleurez plusieurs épaules : on ne doit pas deviner qui se réveille au bruit de vos pas.', 'Walk around the circle and brush several shoulders: nobody should guess who wakes from your footsteps.'],
        ['Montrez l’écran de l’app au joueur réveillé ; elle affiche les infos en grand.', 'Show the app’s screen to the woken player; it displays the information large.'],
        ['Mettez la luminosité de l’iPad au minimum la nuit, et utilisez « Masquer » si quelqu’un approche.', 'Turn the iPad’s brightness down at night, and use “Hide” if someone comes close.'],
      ),
    ],
  },
  {
    id: 'false', title: l('Donner de fausses informations', 'Giving false information'),
    blocks: [
      p('Quand un joueur est ivre ou empoisonné, l’app propose une fausse information. Elle doit rester crédible : une info absurde trahit l’empoisonnement.', 'When a player is drunk or poisoned, the app suggests false information. It must stay believable: an absurd answer gives the poison away.'),
      list(
        ['Une fausse info qui accuse un innocent crée du débat ; une qui blanchit un méchant aide le Mal. Dosez.', 'False information accusing an innocent creates debate; one clearing an evil player helps Evil. Balance it.'],
        ['Vous pouvez aussi donner une information vraie à un joueur empoisonné : c’est permis.', 'You may also give true information to a poisoned player: it is allowed.'],
        ['Le Diable qui se tue lui-même passe son rôle à un Sbire : un coup de théâtre à garder pour un moment fort.', 'An Imp who kills themselves passes the role to a Minion: a twist to save for a big moment.'],
      ),
    ],
  },
  {
    id: 'day', title: l('Mener le jour', 'Running the day'),
    blocks: [
      list(
        ['Annoncez clairement chaque moment : discussions privées, débat public, nominations. Le minuteur vous aide.', 'Announce each part clearly: private chats, public debate, nominations. The timer helps.'],
        ['Prévenez avant la fin : « Encore une minute ! ». Puis « Tout le monde revient sur la place ! ».', 'Warn before the end: “One more minute!”. Then “Everyone back to the square!”.'],
        ['Pendant un vote, comptez à voix haute en faisant le tour du cercle, lentement.', 'During a vote, count aloud while going around the circle, slowly.'],
        ['Si le débat tourne en rond, raccourcissez ; si une piste passionnante émerge, laissez une minute de plus.', 'If the debate goes in circles, cut it short; if an exciting lead appears, allow an extra minute.'],
        ['Rappelez aux morts qu’ils jouent toujours et qu’il leur reste un vote.', 'Remind the dead that they are still playing and have one vote left.'],
      ),
    ],
  },
  {
    id: 'mistakes', title: l('En cas d’erreur', 'When you make a mistake'),
    blocks: [
      p('Tout le monde se trompe. Si l’erreur est discrète, corrigez-la en silence (↶ annule la dernière action). Si elle est visible, annoncez une correction simplement et continuez : la partie compte plus que la perfection.',
        'Everyone makes mistakes. If it went unnoticed, fix it quietly (↶ undoes the last action). If it is visible, announce a correction simply and move on: the game matters more than perfection.'),
    ],
  },
  {
    id: 'end', title: l('Après la partie', 'After the game'),
    blocks: [
      p('Révélez tout : le Grimoire, les ivresses, les empoisonnements, les bluffs du Démon. Lisez les temps forts du journal. C’est souvent le meilleur moment de la soirée — et ce qui donne envie de rejouer.',
        'Reveal everything: the Grimoire, the drunkenness, the poisonings, the Demon’s bluffs. Read the highlights of the log. It is often the best moment of the evening — and what makes people want to play again.'),
    ],
  },
];

// --- 5. Presentation to the table ------------------------------------------------------------------

export interface BriefingCtx {
  count: number;
  expected: { townsfolk: number; outsider: number; minion: number; demon: number };
  /** Votes needed to put someone on the block with everyone alive. */
  needed: number;
  /** Recommended durations of day 1, in minutes. */
  minutes: { private: number; public: number; nominations: number };
}
export interface Slide { id: string; eyebrow: L10n; title: L10n; points: L10n[]; say: L10n; distrib?: boolean }

export function briefingSlides(c: BriefingCtx): Slide[] {
  const evilInfo = c.count >= 7;
  const plural = (n: number, fr: string, en: string) => l(`${n} ${fr}${n > 1 ? 's' : ''}`, `${n} ${en}${n === 1 ? '' : 's'}`);
  const out = plural(c.expected.outsider, 'Étranger', 'Outsider');
  const min = plural(c.expected.minion, 'Sbire', 'Minion');
  return [
    {
      id: 'welcome', eyebrow: l('BIENVENUE', 'WELCOME'), title: l('Blood on the Clocktower', 'Blood on the Clocktower'),
      points: [
        l('Un jeu de bluff et de déduction, en équipes secrètes.', 'A bluffing and deduction game, in secret teams.'),
        l(`Ce soir : ${c.count} joueurs et un Conteur.`, `Tonight: ${c.count} players and a storyteller.`),
        l('Environ 1 h à 1 h 30 de partie.', 'About 1 to 1.5 hours of play.'),
      ],
      say: l('Bienvenue à tous ! Je serai votre Conteur ce soir : je connais tous les secrets, je mène la nuit et j’arbitre le jour. Je ne joue pour personne. Installez-vous, je vais vous raconter ce qui se passe à Ravenswood Bluff…',
        'Welcome everyone! I will be your storyteller tonight: I know every secret, I run the night and referee the day. I play for nobody. Settle in, let me tell you what is happening in Ravenswood Bluff…'),
    },
    {
      id: 'story', eyebrow: l('L’HISTOIRE', 'THE STORY'), title: l('Un Démon à Ravenswood Bluff', 'A Demon in Ravenswood Bluff'),
      points: [
        l('Un Démon se cache parmi les villageois. Chaque nuit, il tue.', 'A Demon hides among the villagers. Every night, it kills.'),
        l('Ses Sbires l’aident dans l’ombre.', 'Its Minions help it from the shadows.'),
        l('Chaque jour, le village peut exécuter un suspect.', 'Each day, the village may execute a suspect.'),
      ],
      say: STORY_TEXT,
    },
    {
      id: 'goal', eyebrow: l('LE BUT', 'THE GOAL'), title: l('Deux équipes secrètes', 'Two secret teams'),
      points: [
        l('Le Bien (Villageois et Étrangers) gagne si le Démon meurt.', 'Good (Townsfolk and Outsiders) wins if the Demon dies.'),
        l('Le Mal (Démon et Sbires) gagne s’il ne reste que 2 joueurs vivants.', 'Evil (Demon and Minions) wins if only 2 players are left alive.'),
        l('Les morts gagnent ou perdent avec leur équipe.', 'The dead win or lose with their team.'),
      ],
      say: l('Il y a deux équipes. Le Bien, ce sont les Villageois et les Étrangers : vous gagnez dès que le Démon meurt. Le Mal, c’est le Démon et ses Sbires : ils gagnent quand il ne reste plus que deux joueurs en vie. Les gentils ne savent pas qui est qui. Les méchants, eux, se connaissent.',
        'There are two teams. Good is the Townsfolk and the Outsiders: you win as soon as the Demon dies. Evil is the Demon and their Minions: they win when only two players are left alive. The good players don’t know who is who. The evil ones know each other.'),
    },
    {
      id: 'distrib', eyebrow: l('CE SOIR', 'TONIGHT'), title: l(`Répartition pour ${c.count} joueurs`, `Distribution for ${c.count} players`), distrib: true,
      points: [
        l(`${c.expected.townsfolk} Villageois, ${out.fr}, ${min.fr} et 1 Démon.`, `${c.expected.townsfolk} Townsfolk, ${out.en}, ${min.en} and 1 Demon.`),
        l('Chaque personnage est unique et a une capacité.', 'Each character is unique and has an ability.'),
        l('Le Baron, s’il est là, ajoute 2 Étrangers.', 'The Baron, if present, adds 2 Outsiders.'),
      ],
      say: l(`Nous sommes ${c.count}. Parmi vous : ${c.expected.townsfolk} Villageois, ${out.fr}, ${min.fr} et un seul Démon. Chacun aura un personnage unique, avec une capacité écrite sur sa fiche. La liste des personnages possibles est publique : vous pouvez la consulter.`,
        `There are ${c.count} of us. Among you: ${c.expected.townsfolk} Townsfolk, ${out.en}, ${min.en} and a single Demon. Each of you gets a unique character, with an ability written on its card. The list of possible characters is public: you may look at it.`),
    },
    {
      id: 'characters', eyebrow: l('VOTRE PERSONNAGE', 'YOUR CHARACTER'), title: l('Un secret à garder… ou à travestir', 'A secret to keep… or to disguise'),
      points: [
        l('Je vais vous passer l’iPad : appuyez longuement pour voir votre personnage.', 'I will pass you the iPad: press and hold to see your character.'),
        l('Ne montrez jamais votre écran ni votre jeton.', 'Never show your screen or your token.'),
        l('Vous pouvez dire la vérité… ou mentir.', 'You may tell the truth… or lie.'),
        evilInfo ? l('Le Mal découvrira ses complices la première nuit.', 'Evil will meet their allies on the first night.') : l('À moins de 7 joueurs, le Mal ne se découvre pas la première nuit.', 'With fewer than 7 players, Evil does not meet on the first night.'),
      ],
      say: l('Chacun va découvrir son personnage en secret. Lisez bien votre capacité. Vous pourrez annoncer votre vrai rôle, en annoncer un faux, ou ne rien dire : c’est votre stratégie. Une seule interdiction : ne jamais montrer votre écran ou votre jeton. Votre parole est votre seule preuve.',
        'Each of you will discover your character in secret. Read your ability carefully. You may announce your real character, a fake one, or say nothing: that is your strategy. One thing is forbidden: never show your screen or token. Your word is your only proof.'),
    },
    {
      id: 'night', eyebrow: l('LA NUIT', 'THE NIGHT'), title: l('Yeux fermés, en silence', 'Eyes closed, in silence'),
      points: [
        l('Tout le monde ferme les yeux.', 'Everyone closes their eyes.'),
        l('Je réveille certains joueurs d’une tape sur l’épaule.', 'I wake some players with a tap on the shoulder.'),
        l('On répond par gestes : montrer du doigt, hocher la tête.', 'Answer with gestures: point, nod.'),
        l('Le Démon tue à partir de la deuxième nuit.', 'The Demon kills from the second night on.'),
      ],
      say: l('La nuit, tout le monde ferme les yeux et ne fait aucun bruit. Je ferai le tour du cercle ; si je vous tape sur l’épaule, ouvrez les yeux : je vous montrerai quelque chose ou vous me désignerez quelqu’un, du doigt, sans parler. Puis vous refermez les yeux. Je toucherai aussi des gens qui ne se réveillent pas, pour brouiller les pistes.',
        'At night, everyone closes their eyes and makes no noise. I will walk around the circle; if I tap your shoulder, open your eyes: I will show you something or you will point at someone, silently. Then close your eyes again. I will also touch people who don’t wake, to cover tracks.'),
    },
    {
      id: 'day', eyebrow: l('LE JOUR', 'THE DAY'), title: l('Parler, enquêter, convaincre', 'Talk, investigate, convince'),
      points: [
        l('À l’aube, j’annonce qui est mort (le nom, pas le rôle).', 'At dawn, I announce who died (the name, not the character).'),
        l(`Discussions privées : environ ${c.minutes.private} min, à deux ou trois.`, `Private chats: about ${c.minutes.private} min, in twos or threes.`),
        l(`Débat public : environ ${c.minutes.public} min, tous ensemble.`, `Public debate: about ${c.minutes.public} min, all together.`),
        l('Puis les nominations et les votes.', 'Then nominations and votes.'),
      ],
      say: l(`Au matin, je vous dirai qui est mort cette nuit. Ensuite, vous aurez environ ${c.minutes.private} minutes pour vous isoler à deux ou trois et parler en secret, puis environ ${c.minutes.public} minutes de débat public tous ensemble. Les journées raccourciront au fil de la partie. Je vous préviendrai avant la fin.`,
        `In the morning, I will tell you who died during the night. Then you will have about ${c.minutes.private} minutes to split off in twos or threes and talk in secret, then about ${c.minutes.public} minutes of public debate all together. Days get shorter as the game goes on. I will warn you before time is up.`),
    },
    {
      id: 'votes', eyebrow: l('NOMINATIONS ET VOTES', 'NOMINATIONS AND VOTES'), title: l('Le bûcher', 'The block'),
      points: [
        l('Chaque vivant peut nominer une fois par jour ; chacun ne peut être nominé qu’une fois.', 'Each living player may nominate once a day; each player can be nominated only once.'),
        l('Accusation, défense, puis vote à main levée, dans le sens horaire.', 'Accusation, defence, then a show of hands, clockwise.'),
        l(`Il faut au moins la moitié des vivants : ${c.needed} voix aujourd’hui. Les votes fantômes des morts comptent.`, `At least half the living players are needed: ${c.needed} votes today. The dead’s ghost votes count.`),
        l('Le plus de voix va sur le bûcher ; égalité = personne. Une exécution par jour au plus.', 'Most votes go on the block; a tie = nobody. At most one execution a day.'),
      ],
      say: l(`Quand vous soupçonnez quelqu’un, vous pouvez le nominer. Vous expliquez pourquoi, il se défend, puis je fais le tour du cercle et vous levez la main pour voter. Il faut au moins la moitié des vivants, ${c.needed} voix pour commencer, pour l’envoyer sur le bûcher. Une autre nomination doit faire plus de voix pour le remplacer ; à égalité, personne. À la fin de la journée, celui qui est sur le bûcher est exécuté.`,
        `When you suspect someone, you may nominate them. You explain why, they defend themselves, then I go around the circle and you raise your hand to vote. At least half the living players, ${c.needed} votes to start with, are needed to put them on the block. Another nomination needs more votes to replace them; on a tie, nobody. At the end of the day, whoever is on the block is executed.`),
    },
    {
      id: 'death', eyebrow: l('LA MORT', 'DEATH'), title: l('Les morts jouent encore', 'The dead still play'),
      points: [
        l('Un mort continue à parler et gagne avec son équipe.', 'A dead player keeps talking and wins with their team.'),
        l('Il perd sa capacité et ne peut plus nominer.', 'They lose their ability and can no longer nominate.'),
        l('Il garde un seul vote pour toute la fin de la partie.', 'They keep a single vote for the rest of the game.'),
      ],
      say: l('Mourir n’est pas la fin ! Les morts continuent à discuter, à enquêter, et gagnent avec leur équipe. Ils perdent leur capacité, ne peuvent plus nominer, et n’ont plus qu’un seul vote pour tout le reste de la partie : gardez-le pour le moment décisif.',
        'Dying is not the end! The dead keep talking, investigating, and win with their team. They lose their ability, can no longer nominate, and have a single vote left for the rest of the game: save it for the decisive moment.'),
    },
    {
      id: 'doubt', eyebrow: l('LE DOUTE', 'DOUBT'), title: l('Aucune information n’est sûre', 'No information is certain'),
      points: [
        l('Un joueur ivre ou empoisonné perd sa capacité sans le savoir.', 'A drunk or poisoned player loses their ability without knowing.'),
        l('Ses informations peuvent alors être fausses.', 'Their information may then be false.'),
        l('Certains personnages sont perçus autrement qu’ils ne sont.', 'Some characters register as something they are not.'),
      ],
      say: l('Attention : certains d’entre vous recevront peut-être de fausses informations, parce qu’ils sont ivres ou empoisonnés… sans le savoir. Et certains personnages peuvent être perçus autrement. Recoupez tout, faites confiance… mais pas trop.',
        'Beware: some of you may receive false information, because they are drunk or poisoned… without knowing it. And some characters can register as something else. Cross-check everything, trust… but not too much.'),
    },
    {
      id: 'table', eyebrow: l('LES RÈGLES DE LA TABLE', 'TABLE RULES'), title: l('Avant de commencer', 'Before we start'),
      points: [
        l('Ne montrez jamais votre personnage.', 'Never show your character.'),
        l('La nuit : yeux fermés, silence.', 'At night: eyes closed, silence.'),
        l('Une question ? Venez me voir en privé.', 'A question? Come see me in private.'),
        l('Ma décision est définitive. Amusez-vous !', 'My ruling is final. Have fun!'),
      ],
      say: l('Dernières règles : on ne montre jamais son personnage, on ne triche pas la nuit, et si vous avez une question sur votre capacité, venez me la poser en privé. Ma décision est définitive. Des questions générales avant de commencer ?',
        'Last rules: never show your character, no cheating at night, and if you have a question about your ability, ask me in private. My ruling is final. Any general questions before we start?'),
    },
  ];
}

// --- 6. Atmosphere lines for the app's dawn and execution screens -----------------------------------------

export const DAWN_DEATH: L10n[] = [
  l('Le coq chante, mais personne n’a envie de se lever. Devant sa porte, on a retrouvé… {names}.', 'The rooster crows, but nobody wants to get up. On their doorstep, we found… {names}.'),
  l('Une brume froide recouvre le village. Quand elle se lève, {names} ne répond plus.', 'A cold mist covers the village. When it lifts, {names} no longer answers.'),
  l('Les cloches sonnent le glas. Cette nuit, le Démon a emporté {names}.', 'The bells toll. Tonight, the Demon took {names}.'),
  l('Des traces de griffes sur une porte, une lanterne renversée… {names} ne verra pas ce matin.', 'Claw marks on a door, an overturned lantern… {names} will not see this morning.'),
];
export const DAWN_NONE: L10n[] = [
  l('Le jour se lève sur un village étrangement calme. Chacun compte ses voisins… tout le monde est là.', 'Day breaks on a strangely quiet village. Everyone counts their neighbours… all are here.'),
  l('Le Démon a rôdé, mais il est reparti les mains vides. Personne n’est mort cette nuit.', 'The Demon prowled, but left empty-handed. Nobody died tonight.'),
  l('Un hurlement dans la nuit… puis plus rien. Au matin, aucun corps. Qui a été épargné, et pourquoi ?', 'A howl in the night… then nothing. In the morning, no body. Who was spared, and why?'),
];
export const DUSK: L10n[] = [
  l('Le soleil se couche sur Ravenswood Bluff. Les volets se ferment, les lanternes s’éteignent une à une. Tout le monde ferme les yeux…', 'The sun sets over Ravenswood Bluff. Shutters close, lanterns go out one by one. Everyone close your eyes…'),
  l('La nuit tombe. Quelque part dans le village, quelque chose s’éveille. Fermez les yeux.', 'Night falls. Somewhere in the village, something stirs. Close your eyes.'),
  l('L’horloge de la tour sonne minuit. Chacun rentre chez soi et verrouille sa porte. Fermez les yeux.', 'The tower clock strikes midnight. Everyone goes home and locks their door. Close your eyes.'),
];
export const EXECUTION: L10n[] = [
  l('Le village a parlé. On conduit {names} jusqu’au gibet, sous le regard de tous…', 'The village has spoken. {names} is led to the gallows, under everyone’s gaze…'),
  l('La foule s’écarte. {names} monte les marches de l’échafaud. Que justice soit faite.', 'The crowd parts. {names} climbs the scaffold steps. Let justice be done.'),
];
