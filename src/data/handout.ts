// Players' handout: how to play each character, a glossary and advice. Public information only.
import type { L10n, RoleId } from './roles';

const l = (fr: string, en: string): L10n => ({ fr, en });

/** A short "how to play it" tip for each character. */
export const ROLE_TIPS: Record<RoleId, L10n> = {
  washerwoman: l('Votre info est solide dès le premier matin : partagez-la tôt pour blanchir un Villageois, ou gardez-la pour piéger un menteur qui revendiquerait le même rôle.', 'Your info is solid from the first morning: share it early to clear a Townsfolk, or keep it to trap a liar claiming that same character.'),
  librarian: l('Un « 0 » est précieux : s’il n’y a aucun Étranger, tous ceux qui se disent Étranger mentent (attention au Baron, qui en ajoute).', 'A “0” is precious: with no Outsiders, anyone claiming to be one is lying (watch out for the Baron, who adds some).'),
  investigator: l('Vous tenez un suspect sérieux parmi deux joueurs. Croisez avec les autres infos avant de lancer une nomination.', 'You hold a serious suspect among two players. Cross-check with other info before nominating.'),
  chef: l('Un 0 signifie qu’aucun méchant n’est assis à côté d’un autre. Combinez avec l’ordre de la table et les revendications.', 'A 0 means no evil player sits next to another. Combine it with the seating and the claims.'),
  empath: l('Votre info change chaque nuit : suivez l’évolution. Si un voisin meurt, votre « voisin vivant » change aussi.', 'Your info changes every night: follow how it evolves. If a neighbour dies, your “living neighbour” changes too.'),
  fortuneteller: l('Un joueur gentil vous répond « oui » à tort (le faux positif). Testez des paires variées et recoupez vos résultats.', 'One good player wrongly answers “yes” (the red herring). Test varied pairs and cross-check your results.'),
  undertaker: l('Vous confirmez ou démentez la revendication de l’exécuté. Très utile pour savoir si le village a frappé juste.', 'You confirm or deny the executed player’s claim. Very useful to know if the town got it right.'),
  monk: l('Protégez celui qui vous semble le plus précieux… ou le plus menacé. Le Démon ne sait pas qui vous protégez.', 'Protect whoever seems most valuable… or most threatened. The Demon doesn’t know who you protect.'),
  ravenkeeper: l('Si vous mourez la nuit, vous apprenez un personnage. Se faire passer pour une cible tentante peut être une bonne idée.', 'If you die at night, you learn a character. Looking like a tempting target can be a good idea.'),
  virgin: l('Si un Villageois vous nomine en premier, il est exécuté sur-le-champ : vous prouvez alors que vous êtes la Vierge et qu’il est Villageois.', 'If a Townsfolk nominates you first, they are executed on the spot: this proves you are the Virgin and they are a Townsfolk.'),
  slayer: l('Un seul tir de toute la partie. Attendez d’avoir un vrai suspect : un tir réussi tue le Démon (mais avec 5 vivants ou plus, la Succube peut le remplacer).', 'One shot all game. Wait until you have a real suspect: a successful shot kills the Demon (but with 5 or more alive, the Scarlet Woman may take over).'),
  soldier: l('Le Démon ne peut pas vous tuer : vous pouvez revendiquer sans crainte… ou laisser le Démon gaspiller une nuit sur vous.', 'The Demon cannot kill you: you can claim safely… or let the Demon waste a night on you.'),
  mayor: l('À 3 vivants, s’il n’y a pas d’exécution, le Bien gagne. Et la nuit, le Démon qui vous vise peut tuer quelqu’un d’autre.', 'With 3 alive and no execution, Good wins. And at night, a Demon targeting you may kill someone else instead.'),
  butler: l('Choisissez chaque nuit un maître : vous ne pouvez voter que s’il vote aussi. Vous êtes gentil, faites-le savoir.', 'Each night, pick a master: you may only vote if they vote too. You are good, make it known.'),
  drunk: l('Vous ne le savez pas… vous croyez être un Villageois. Si vos infos contredisent tout le monde, posez-vous la question.', 'You don’t know it… you think you are a Townsfolk. If your info contradicts everyone, ask yourself the question.'),
  recluse: l('Vous pouvez être perçu comme méchant, voire comme le Démon. Annoncez-vous tôt pour que vos alliés en tiennent compte.', 'You may register as evil, even as the Demon. Announce yourself early so your allies take it into account.'),
  saint: l('Si vous êtes exécuté, le Bien perd. Dites-le dès que des soupçons se portent sur vous.', 'If you are executed, Good loses. Say so as soon as suspicion turns to you.'),
  poisoner: l('Empoisonnez les joueurs qui reçoivent des infos (Empathe, Voyante…) pour les faire douter. Restez discret. Dès le premier jour, allez voir le Démon en privé : il connaît 3 personnages absents que vous pouvez bluffer sans risque.', 'Poison players who get information (Empath, Fortune Teller…) to make them doubt. Stay discreet. On day one, see the Demon in private: they know 3 characters not in play you can bluff safely.'),
  spy: l('Vous voyez le Grimoire chaque nuit : vous savez tout. Utilisez-le pour bluffer un rôle crédible et guider le Mal. Dès le premier jour, allez voir le Démon en privé : il connaît 3 personnages absents que vous pouvez bluffer sans risque.', 'You see the Grimoire every night: you know everything. Use it to bluff a believable character and guide Evil. On day one, see the Demon in private: they know 3 characters not in play you can bluff safely.'),
  scarletwoman: l('Si le Démon meurt avec 5 vivants ou plus, vous le devenez. Restez en vie et hors de soupçon. Dès le premier jour, allez voir le Démon en privé : il connaît 3 personnages absents que vous pouvez bluffer sans risque.', 'If the Demon dies with 5 or more alive, you become it. Stay alive and above suspicion. On day one, see the Demon in private: they know 3 characters not in play you can bluff safely.'),
  baron: l('Votre présence ajoute 2 Étrangers : beaucoup d’Étrangers revendiqués est un indice de Baron. Brouillez les pistes. Dès le premier jour, allez voir le Démon en privé : il connaît 3 personnages absents que vous pouvez bluffer sans risque.', 'Your presence adds 2 Outsiders: many claimed Outsiders hint at a Baron. Muddy the waters. On day one, see the Demon in private: they know 3 characters not in play you can bluff safely.'),
  imp: l('Vous connaissez 3 rôles absents : bluffez-en un, et transmettez-les discrètement à vos Sbires pendant les discussions privées pour qu’ils bluffent sans risque. Tuez les joueurs les mieux informés. Vous pouvez vous tuer pour passer le rôle à un Sbire.', 'You know 3 characters not in play: bluff one, and pass them on discreetly to your Minions during private chats so they can bluff safely. Kill the best-informed players. You may kill yourself to pass the role to a Minion.'),
  bureaucrat: l('Votre cible vote ×3 demain. Pratique pour peser sur une exécution… ou la faire basculer.', 'Your target votes ×3 tomorrow. Handy to weigh on an execution… or to swing it.'),
  thief: l('Le vote de votre cible compte en négatif demain. Utilisez-le pour freiner une exécution.', 'Your target’s vote counts negative tomorrow. Use it to slow down an execution.'),
  gunslinger: l('Après le premier vote du jour, vous pouvez abattre un votant. Un pouvoir public et redoutable.', 'After the day’s first vote, you may shoot a voter. A public and fearsome power.'),
  scapegoat: l('Vous pouvez être exécuté à la place d’un joueur de votre camp. Un bouclier… ou un piège.', 'You may be executed instead of a player of your team. A shield… or a trap.'),
  beggar: l('Vous votez grâce aux votes que les morts vous donnent, et vous apprenez leur camp.', 'You vote with the votes the dead give you, and you learn their team.'),
};

/** An advanced tip or play style for each character. Storyteller only: shown in the grimoire reference, never on the player sheet. */
export const ROLE_ADVANCED: Record<RoleId, L10n> = {
  washerwoman: l('Ne révélez d’abord que le rôle vu, sans les deux noms : si quelqu’un revendique ce rôle, vous saurez s’il fait partie de votre paire avant de dévoiler le reste.', 'Reveal only the character first, not the two names: if someone claims that character, you’ll know whether they are in your pair before showing the rest.'),
  librarian: l('Les Sbires et le Démon aiment bluffer un Étranger pour justifier une info bizarre. Votre paire permet de démasquer un faux Ivrogne ou un faux Saint.', 'Minions and the Demon like to bluff an Outsider to excuse odd info. Your pair can expose a fake Drunk or a fake Saint.'),
  investigator: l('Le Reclus peut apparaître comme un Sbire dans votre paire. Si l’un des deux se dit Reclus, l’autre devient votre suspect principal.', 'The Recluse can show up as a Minion in your pair. If one of the two claims Recluse, the other becomes your main suspect.'),
  chef: l('Votre nombre s’use bien en fin de partie : une fois quelques méchants identifiés, il dit si leurs voisins sont suspects ou innocents.', 'Your number shines late in the game: once a few evil players are known, it tells whether their neighbours are suspicious or innocent.'),
  empath: l('Restez discret au début : un Empathe connu est une cible prioritaire. Si vos voisins meurent, votre info porte sur des joueurs plus éloignés, gardez une carte de la table.', 'Stay quiet early: a known Empath is a priority target. As neighbours die, your info covers players further away, so keep a map of the table.'),
  fortuneteller: l('Testez-vous vous-même avec un autre joueur : un « oui » révèle alors l’autre joueur ou vous désigne comme faux positif. Retestez les joueurs déjà « non » pour repérer le faux positif.', 'Test yourself with another player: a “yes” then points at them, or shows you are the red herring. Retest “no” players to locate the red herring.'),
  undertaker: l('Annoncez votre info le lendemain, mais pas forcément votre rôle : un Démon qui vous connaît vous tuera vite. Un Ivrogne peut vous mentir sans le savoir.', 'Share your info the next day, but not necessarily your character: a Demon who knows you will kill you fast. A Drunk may lie to you without knowing.'),
  monk: l('Ne protégez pas toujours le même joueur : le Démon devine vos habitudes. Un Démon qui « rate » sa nuit révèle souvent votre réussite, gardez-le pour vous.', 'Don’t always protect the same player: the Demon reads your habits. A Demon who “misses” a night often reveals your success, keep it to yourself.'),
  ravenkeeper: l('Bluffez un rôle puissant (Empathe, Voyante) pour attirer le Démon. Choisissez de nuit un joueur dont le rôle déciderait le plus de choses.', 'Bluff a strong character (Empath, Fortune Teller) to draw the Demon. At night, pick the player whose character would settle the most.'),
  virgin: l('Invitez publiquement un joueur que vous croyez Villageois à vous nominer : s’il meurt, vous confirmez deux gentils d’un coup ; sinon, il est sans doute Étranger ou méchant.', 'Publicly invite a player you believe is Townsfolk to nominate you: if they die, you confirm two good players at once; if not, they are likely an Outsider or evil.'),
  slayer: l('Bluffez un autre rôle pour que le Démon ne vous tue pas. Un tir manqué reste une info : la cible n’est pas le Démon (sauf si vous êtes ivre ou empoisonné).', 'Bluff another character so the Demon won’t kill you. A missed shot is still info: the target isn’t the Demon (unless you are drunk or poisoned).'),
  soldier: l('Revendiquez un rôle très informé : le Démon perdra une nuit à vous viser. Mais l’Empoisonneur peut vous rendre vulnérable.', 'Claim a well-informed character: the Demon will waste a night on you. But the Poisoner can make you vulnerable.'),
  mayor: l('Préparez la fin : à 3 vivants, convainquez le village de ne pas voter. Restez discret avant, sinon le Démon visera d’autres joueurs à votre place.', 'Plan the endgame: with 3 alive, convince the town not to vote. Stay low-key before, or the Demon will target others instead of you.'),
  butler: l('Prenez pour maître un joueur fiable qui vote souvent. Changer de maître après un vote douteux est aussi une façon de montrer à qui vous ne faites plus confiance.', 'Pick a reliable master who votes often. Switching master after a doubtful vote is also a way to signal whom you no longer trust.'),
  drunk: l('Si votre info est trop belle ou contredit tout le monde, envisagez d’être l’Ivrogne. Les Villageois « vous savez la première nuit » sont souvent le rôle choisi.', 'If your info is too good or contradicts everyone, consider being the Drunk. “First night only” Townsfolk are a common pick.'),
  recluse: l('Vous pouvez faire tomber un Enquêteur ou une Voyante dans le panneau : annoncez-vous avant qu’ils ne vous accusent. Votre exécution fait perdre une journée au village.', 'You can fool an Investigator or Fortune Teller: claim before they accuse you. Your execution costs the town a day.'),
  saint: l('Le Mal adore pousser un Saint au bûcher. Si on vous nomine, demandez qui pousse le vote : c’est souvent un méchant.', 'Evil loves to push a Saint to the block. If nominated, watch who pushes the vote: it’s often evil.'),
  poisoner: l('Visez le joueur qui deviendra crédible : l’Empathe la nuit où il parle, la Vierge le jour où on la teste, le Tueur avant son tir.', 'Target whoever is about to become credible: the Empath the night they speak, the Virgin on the day they are tested, the Slayer before they shoot.'),
  spy: l('Comme vous êtes perçu comme gentil, revendiquez un Villageois réellement en jeu et donnez de vraies infos au début : on vous fera confiance pour la suite.', 'Since you register as good, claim a Townsfolk actually in play and give true info early: you’ll be trusted later on.'),
  scarletwoman: l('Ne vous liez pas au Démon. Si le Démon est soupçonné, laissez-le être exécuté plutôt que de le défendre : vous reprenez le flambeau.', 'Don’t tie yourself to the Demon. If they are suspected, let them be executed rather than defend them: you take over.'),
  baron: l('Encouragez les vrais Étrangers à se révéler, puis attaquez la crédibilité de chacun : le village ne saura plus qui est réellement Étranger.', 'Encourage real Outsiders to come out, then undermine each one: the town won’t know who is really an Outsider.'),
  imp: l('Le « star-pass » : si vous êtes repéré, tuez-vous la nuit et un Sbire devient l’Imp. Vous pouvez aussi épargner un joueur bien informé pour le faire passer pour suspect.', 'The “star-pass”: if you are caught, kill yourself at night and a Minion becomes the Imp. You can also spare a well-informed player to make them look suspicious.'),
  bureaucrat: l('Donnez votre ×3 à un joueur dont le vote sera décisif, ou à un joueur que vous testez : son usage révèle ses intentions.', 'Give your ×3 to a player whose vote will be decisive, or to one you are testing: how they use it reveals their intentions.'),
  thief: l('Visez un joueur qui risque de faire basculer un vote serré. Votre choix trahit votre camp, variez-le.', 'Target a player likely to swing a close vote. Your choice betrays your team, so vary it.'),
  gunslinger: l('Le simple risque d’être abattu pèse sur les votes : utilisez-le pour pousser le village à voter avec conviction.', 'The mere risk of being shot weighs on votes: use it to push the town to vote with conviction.'),
  scapegoat: l('Votre camp est secret : faites croire que vous protégez l’autre camp pour semer le doute au moment d’une exécution clé.', 'Your team is secret: make it seem you protect the other side to sow doubt at a key execution.'),
  beggar: l('Les morts qui vous donnent leur vote en disent long : un mort gentil hésite rarement, un mort méchant peut vouloir garder son vote.', 'Which dead players give you their vote says a lot: a good one rarely hesitates, an evil one may want to keep theirs.'),
};

/** "Each night*": the asterisk means the ability does not work on the first night. */
export const NIGHT_STAR = l('* Sauf la première nuit.', '* Except the first night.');
export const hasNightStar = (ability: L10n) => ability.fr.includes('*');

/** A concrete example of each character in play. */
export const ROLE_EXAMPLES: Record<RoleId, L10n> = {
  washerwoman: l('Le Conteur vous montre le jeton Moine et désigne Léa et Marc : l’un des deux est le Moine.', 'The storyteller shows you the Monk token and points at Lea and Marc: one of them is the Monk.'),
  librarian: l('Le Conteur vous montre le jeton Saint et désigne Hugo et Inès : l’un des deux est le Saint. S’il vous montre « 0 », aucun Étranger n’est en jeu.', 'The storyteller shows you the Saint token and points at Hugo and Ines: one of them is the Saint. If they show you “0”, no Outsider is in play.'),
  investigator: l('Le Conteur vous montre le jeton Empoisonneur et désigne Camille et Théo : l’un des deux est l’Empoisonneur.', 'The storyteller shows you the Poisoner token and points at Camille and Theo: one of them is the Poisoner.'),
  chef: l('Deux méchants assis côte à côte et un troisième ailleurs : vous apprenez 1. Trois méchants à la suite : 2. Aucun méchant voisin d’un autre : 0.', 'Two evil players sitting side by side and a third elsewhere: you learn 1. Three evil players in a row: 2. No evil player next to another: 0.'),
  empath: l('Vos voisins vivants sont Nora (gentille) et Paul (le Diable) : vous apprenez 1. Si Paul meurt, votre nouveau voisin est le joueur vivant suivant.', 'Your living neighbours are Nora (good) and Paul (the Imp): you learn 1. If Paul dies, your new neighbour is the next living player.'),
  fortuneteller: l('Vous désignez Lucas et Emma ; Lucas est le Diable : « oui ». Vous désignez Jade et Tom, tous deux gentils : « non »… sauf si l’un d’eux est le faux positif.', 'You choose Lucas and Emma; Lucas is the Imp: “yes”. You choose Jade and Tom, both good: “no”… unless one of them is the red herring.'),
  undertaker: l('Max a été exécuté en se disant Cuisinier. Cette nuit, le Conteur vous montre le jeton Empoisonneur : Max mentait.', 'Max was executed claiming to be the Chef. Tonight, the storyteller shows you the Poisoner token: Max was lying.'),
  monk: l('Vous protégez Sarah. Le Diable l’attaque cette nuit : elle survit, et personne ne meurt.', 'You protect Sarah. The Imp attacks her tonight: she survives, and nobody dies.'),
  ravenkeeper: l('Le Diable vous tue la nuit 3. Le Conteur vous réveille, vous désignez Rémi : il vous montre le jeton Baron.', 'The Imp kills you on night 3. The storyteller wakes you, you point at Remi: they show you the Baron token.'),
  virgin: l('Jules, Lavandière, vous nomine le premier : il est exécuté sur-le-champ. Si c’était un Sbire, rien ne se passe, mais votre capacité est épuisée.', 'Jules, the Washerwoman, nominates you first: they are executed on the spot. Had it been a Minion, nothing would happen, but your ability is used up.'),
  slayer: l('Au jour 2, vous annoncez : « Je vise Antoine. » S’il est le Diable, il meurt ; sinon, rien ne se passe et votre tir est perdu.', 'On day 2, you announce: “I slay Antoine.” If they are the Imp, they die; otherwise nothing happens and your shot is spent.'),
  soldier: l('Le Diable vous choisit cette nuit : vous ne mourez pas, et personne ne meurt cette nuit-là.', 'The Imp chooses you tonight: you don’t die, and nobody dies that night.'),
  mayor: l('Il reste 3 vivants : vous, Zoé et Noah. Le village décide de n’exécuter personne : le Bien gagne.', 'Three players are left: you, Zoe and Noah. The town decides not to execute anyone: Good wins.'),
  butler: l('Vous choisissez Clara comme Maître. Demain, vous ne pouvez lever la main pour voter que si Clara lève aussi la sienne.', 'You choose Clara as your master. Tomorrow, you may only raise your hand to vote if Clara raises hers too.'),
  drunk: l('Vous pensez être l’Empathe et recevez un chiffre chaque nuit… mais ces chiffres peuvent être faux.', 'You think you are the Empath and get a number each night… but those numbers may be wrong.'),
  recluse: l('L’Enquêteur peut apprendre que vous êtes « peut-être l’Empoisonneur », et la Voyante peut obtenir « oui » en vous désignant.', 'The Investigator may learn you are “maybe the Poisoner”, and the Fortune Teller may get a “yes” when choosing you.'),
  saint: l('Le village veut vous exécuter : dites-le haut et fort. Si vous êtes exécuté, le Mal gagne aussitôt.', 'The town wants to execute you: say it loud and clear. If you are executed, Evil wins at once.'),
  poisoner: l('Vous empoisonnez l’Empathe : cette nuit, il peut recevoir un faux chiffre, sans le savoir. Demain, sa capacité ne marche pas non plus.', 'You poison the Empath: tonight they may get a false number without knowing it. Tomorrow their ability doesn’t work either.'),
  spy: l('Dans le Grimoire, vous voyez que Léo est le Moine et Zoé la Voyante : prévenez le Démon, et revendiquez un rôle que personne d’autre ne prendra.', 'In the Grimoire, you see Leo is the Monk and Zoe the Fortune Teller: tell the Demon, and claim a character nobody else will.'),
  scarletwoman: l('Il reste 6 vivants et le Diable est exécuté : vous devenez le Diable et la partie continue.', 'Six players are alive and the Imp is executed: you become the Imp and the game goes on.'),
  baron: l('À 7 joueurs, au lieu de 5 Villageois et 0 Étranger, il y a 3 Villageois et 2 Étrangers.', 'With 7 players, instead of 5 Townsfolk and 0 Outsiders, there are 3 Townsfolk and 2 Outsiders.'),
  imp: l('Nuit 2 : vous désignez l’Empathe, il meurt. Plus tard, soupçonné, vous vous désignez vous-même : vous mourez et un Sbire devient le Diable.', 'Night 2: you choose the Empath, they die. Later, under suspicion, you choose yourself: you die and a Minion becomes the Imp.'),
  bureaucrat: l('Vous choisissez Elsa : demain, quand elle lève la main, sa voix compte pour 3.', 'You choose Elsa: tomorrow, when she raises her hand, her vote counts as 3.'),
  thief: l('Vous choisissez Elsa : demain, quand elle lève la main, sa voix retire 1 au total au lieu d’en ajouter 1.', 'You choose Elsa: tomorrow, when she raises her hand, her vote takes 1 off the total instead of adding 1.'),
  gunslinger: l('Après le premier vote du jour, Hugo avait levé la main : vous le désignez, il meurt.', 'After the day’s first vote, Hugo had raised their hand: you choose them, they die.'),
  scapegoat: l('Un joueur de votre camp va être exécuté : le Conteur peut décider que c’est vous qui mourez à sa place.', 'A player of your team is about to be executed: the storyteller may decide you die in their place.'),
  beggar: l('Lina, morte, vous donne son jeton de vote : vous pouvez voter, et le Conteur vous dit si elle était gentille ou méchante.', 'Lina, who is dead, gives you her vote token: you may vote, and the storyteller tells you whether she was good or evil.'),
};

export interface Term { term: L10n; def: L10n }
export const GLOSSARY: Term[] = [
  { term: l('Bûcher', 'Block'), def: l('Le joueur qui a reçu le plus de voix (au moins la moitié des vivants) attend sur le bûcher. Il est exécuté en fin de journée.', 'The player with the most votes (at least half the living) waits on the block. They are executed at the end of the day.') },
  { term: l('Nominer', 'Nominate'), def: l('Proposer un joueur à l’exécution. Une fois par jour par vivant ; chacun ne peut être nominé qu’une fois par jour.', 'Put a player up for execution. Once a day per living player; each player can be nominated only once a day.') },
  { term: l('Exécution', 'Execution'), def: l('La mort décidée par le vote du village. Au plus une par jour.', 'The death decided by the town’s vote. At most one a day.') },
  { term: l('Vote fantôme', 'Ghost vote'), def: l('Le seul vote qui reste à un joueur mort, pour toute la fin de la partie.', 'The single vote a dead player keeps for the rest of the game.') },
  { term: l('Chaque nuit*', 'Each night*'), def: l('L’astérisque signifie « sauf la première nuit » : la capacité ne sert qu’à partir de la deuxième nuit.', 'The asterisk means “except the first night”: the ability only works from the second night.') },
  { term: l('Ivre', 'Drunk'), def: l('Le joueur n’a plus de capacité sans le savoir ; ses infos peuvent être fausses.', 'The player has no ability without knowing it; their info may be false.') },
  { term: l('Empoisonné', 'Poisoned'), def: l('Comme ivre, mais causé par l’Empoisonneur, pour une nuit et un jour.', 'Like drunk, but caused by the Poisoner, for one night and one day.') },
  { term: l('Perçu comme', 'Registers as'), def: l('Un personnage peut être vu autrement par les capacités : l’Espion comme gentil, le Reclus comme méchant.', 'A character may be seen differently by abilities: the Spy as good, the Recluse as evil.') },
  { term: l('Bluff', 'Bluff'), def: l('Un faux personnage que l’on revendique. Le Démon reçoit 3 personnages absents pour bluffer sans risque.', 'A fake character you claim. The Demon receives 3 characters not in play to bluff safely.') },
  { term: l('Faux positif', 'Red herring'), def: l('Le joueur gentil que la Voyante voit comme le Démon.', 'The good player the Fortune Teller sees as the Demon.') },
  { term: l('Revendiquer', 'Claim'), def: l('Annoncer son personnage (vrai ou faux) aux autres.', 'Announce your character (true or false) to others.') },
  { term: l('Voyageur', 'Traveller'), def: l('Personnage public d’un joueur arrivé en retard ou partant tôt ; son camp est secret. Il peut être exilé.', 'Public character of a player arriving late or leaving early; their team is secret. They can be exiled.') },
];

export const TEAM_ADVICE: { title: L10n; items: L10n[] }[] = [
  {
    title: l('Si vous êtes gentil', 'If you are good'),
    items: [
      l('Partagez vos infos, mais pas forcément avec tout le monde : choisissez à qui faire confiance.', 'Share your info, but not necessarily with everyone: choose whom to trust.'),
      l('Notez ce que chacun revendique et ce qu’il dit chaque jour : les incohérences trahissent les menteurs.', 'Note what everyone claims and says each day: inconsistencies betray liars.'),
      l('Votez ! Ne rien exécuter fait le jeu du Démon, qui tue chaque nuit.', 'Vote! Executing nobody plays into the Demon’s hands, since it kills every night.'),
      l('Vous pouvez mentir pour protéger un rôle important ou attirer le Démon.', 'You may lie to protect an important character or to bait the Demon.'),
    ],
  },
  {
    title: l('Si vous êtes méchant', 'If you are evil'),
    items: [
      l('Choisissez un bluff crédible et tenez-le. Démon : transmettez vos 3 bluffs à vos Sbires. Sbires : allez les demander au Démon dès le premier jour.', 'Pick a believable bluff and stick to it. Demon: pass your 3 bluffs on to your Minions. Minions: ask the Demon for them on day one.'),
      l('Ne défendez pas trop vos complices : cela vous relie à eux.', 'Don’t defend your allies too much: it links you to them.'),
      l('Semez le doute sur les joueurs bien informés plutôt que de les attaquer de front.', 'Cast doubt on well-informed players rather than attacking them head-on.'),
      l('À la fin, chaque vote compte : comptez les vivants et les votes fantômes.', 'At the end, every vote counts: count the living and the ghost votes.'),
    ],
  },
  {
    title: l('Si vous êtes mort', 'If you are dead'),
    items: [
      l('Vous jouez toujours : parlez, enquêtez, conseillez.', 'You are still playing: talk, investigate, advise.'),
      l('Gardez votre vote fantôme pour l’exécution décisive.', 'Keep your ghost vote for the decisive execution.'),
    ],
  },
];
