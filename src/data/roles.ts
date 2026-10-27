// Trouble Brewing: characters, night order and setup table.

export type Team = 'townsfolk' | 'outsider' | 'minion' | 'demon' | 'traveller';
export type Alignment = 'good' | 'evil';
export type L10n = { fr: string; en: string };

export type RoleId =
  | 'washerwoman' | 'librarian' | 'investigator' | 'chef' | 'empath' | 'fortuneteller'
  | 'undertaker' | 'monk' | 'ravenkeeper' | 'virgin' | 'slayer' | 'soldier' | 'mayor'
  | 'butler' | 'drunk' | 'recluse' | 'saint'
  | 'poisoner' | 'spy' | 'scarletwoman' | 'baron'
  | 'imp'
  | 'bureaucrat' | 'thief' | 'gunslinger' | 'scapegoat' | 'beggar';

export interface Role {
  id: RoleId;
  team: Team;
  icon: string;
  name: L10n;
  ability: L10n;
  /** What the storyteller does when this character wakes. */
  firstNight?: L10n;
  otherNight?: L10n;
}

export const ROLES: Record<RoleId, Role> = {
  washerwoman: {
    id: 'washerwoman', team: 'townsfolk', icon: '🧺',
    name: { fr: 'Lavandière', en: 'Washerwoman' },
    ability: {
      fr: 'La première nuit seulement, vous apprenez que l\'un de deux joueurs est un Villageois précis.',
      en: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
    },
    firstNight: {
      fr: 'Montrez le jeton d\'un Villageois en jeu et désignez 2 joueurs, dont l\'un a ce rôle.',
      en: 'Show the Townsfolk token and point to 2 players, one of whom is that character.',
    },
  },
  librarian: {
    id: 'librarian', team: 'townsfolk', icon: '📚',
    name: { fr: 'Bibliothécaire', en: 'Librarian' },
    ability: {
      fr: 'La première nuit seulement, vous apprenez que l\'un de deux joueurs est un Étranger précis (ou qu\'il n\'y en a aucun en jeu).',
      en: 'You start knowing that 1 of 2 players is a particular Outsider. (Or that zero are in play.)',
    },
    firstNight: {
      fr: 'Montrez le jeton d\'un Étranger en jeu et désignez 2 joueurs, dont l\'un a ce rôle. Sinon, montrez « 0 ».',
      en: 'Show the Outsider token and point to 2 players, one of whom is that character. Otherwise show "0".',
    },
  },
  investigator: {
    id: 'investigator', team: 'townsfolk', icon: '🔍',
    name: { fr: 'Enquêteur', en: 'Investigator' },
    ability: {
      fr: 'La première nuit seulement, vous apprenez que l\'un de deux joueurs est un Sbire précis.',
      en: 'You start knowing that 1 of 2 players is a particular Minion.',
    },
    firstNight: {
      fr: 'Montrez le jeton d\'un Sbire en jeu et désignez 2 joueurs, dont l\'un a ce rôle.',
      en: 'Show the Minion token and point to 2 players, one of whom is that character.',
    },
  },
  chef: {
    id: 'chef', team: 'townsfolk', icon: '🍳',
    name: { fr: 'Cuisinier', en: 'Chef' },
    ability: {
      fr: 'La première nuit seulement, vous apprenez combien de paires de joueurs Maléfiques sont assis côte à côte.',
      en: 'You start knowing how many pairs of evil players there are.',
    },
    firstNight: {
      fr: 'Montrez avec vos doigts le nombre de paires de joueurs Maléfiques voisins.',
      en: 'Show the number of pairs of neighbouring evil players with your fingers.',
    },
  },
  empath: {
    id: 'empath', team: 'townsfolk', icon: '💗',
    name: { fr: 'Empathe', en: 'Empath' },
    ability: {
      fr: 'Chaque nuit, vous apprenez combien de vos 2 voisins vivants sont Maléfiques.',
      en: 'Each night, you learn how many of your 2 alive neighbours are evil.',
    },
    firstNight: {
      fr: 'Montrez avec vos doigts le nombre de voisins vivants Maléfiques (0, 1 ou 2).',
      en: 'Show the number of evil alive neighbours with your fingers (0, 1 or 2).',
    },
    otherNight: {
      fr: 'Montrez avec vos doigts le nombre de voisins vivants Maléfiques (0, 1 ou 2).',
      en: 'Show the number of evil alive neighbours with your fingers (0, 1 or 2).',
    },
  },
  fortuneteller: {
    id: 'fortuneteller', team: 'townsfolk', icon: '🔮',
    name: { fr: 'Voyante', en: 'Fortune Teller' },
    ability: {
      fr: 'Chaque nuit, choisissez 2 joueurs : vous apprenez si l\'un d\'eux est un Démon. Un joueur Bon est perçu comme un Démon par vous.',
      en: 'Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you.',
    },
    firstNight: {
      fr: 'La Voyante désigne 2 joueurs. Hochez la tête (oui) si l\'un est le Démon ou le faux positif, sinon secouez-la (non).',
      en: 'The Fortune Teller points to 2 players. Nod (yes) if either is the Demon or the red herring, otherwise shake your head (no).',
    },
    otherNight: {
      fr: 'La Voyante désigne 2 joueurs. Hochez la tête (oui) si l\'un est le Démon ou le faux positif, sinon secouez-la (non).',
      en: 'The Fortune Teller points to 2 players. Nod (yes) if either is the Demon or the red herring, otherwise shake your head (no).',
    },
  },
  undertaker: {
    id: 'undertaker', team: 'townsfolk', icon: '⚰️',
    name: { fr: 'Croque-mort', en: 'Undertaker' },
    ability: {
      fr: 'Chaque nuit*, vous apprenez quel personnage a été exécuté aujourd\'hui.',
      en: 'Each night*, you learn which character died by execution today.',
    },
    otherNight: {
      fr: 'Si quelqu\'un a été exécuté aujourd\'hui, montrez le jeton de son personnage.',
      en: 'If a player was executed today, show their character token.',
    },
  },
  monk: {
    id: 'monk', team: 'townsfolk', icon: '🙏',
    name: { fr: 'Moine', en: 'Monk' },
    ability: {
      fr: 'Chaque nuit*, choisissez un joueur (pas vous) : il est protégé du Démon cette nuit.',
      en: 'Each night*, choose a player (not yourself): they are safe from the Demon tonight.',
    },
    otherNight: {
      fr: 'Le Moine désigne un joueur (pas lui-même), qui est protégé du Démon cette nuit.',
      en: 'The Monk points to a player (not themself), who is safe from the Demon tonight.',
    },
  },
  ravenkeeper: {
    id: 'ravenkeeper', team: 'townsfolk', icon: '🪶',
    name: { fr: 'Corneille', en: 'Ravenkeeper' },
    ability: {
      fr: 'Si vous mourez la nuit, vous êtes réveillé pour choisir un joueur : vous apprenez son personnage.',
      en: 'If you die at night, you are woken to choose a player: you learn their character.',
    },
    otherNight: {
      fr: 'S\'il est mort cette nuit : il désigne un joueur, montrez-lui le personnage de ce joueur.',
      en: 'If they died tonight: they point to a player, show them that player\'s character.',
    },
  },
  virgin: {
    id: 'virgin', team: 'townsfolk', icon: '🌸',
    name: { fr: 'Vierge', en: 'Virgin' },
    ability: {
      fr: 'La 1re fois que vous êtes nominée, si le nominateur est un Villageois, il est exécuté immédiatement.',
      en: 'The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately.',
    },
  },
  slayer: {
    id: 'slayer', team: 'townsfolk', icon: '🏹',
    name: { fr: 'Pourfendeur', en: 'Slayer' },
    ability: {
      fr: 'Une fois par partie, pendant le jour, choisissez publiquement un joueur : s\'il est le Démon, il meurt.',
      en: 'Once per game, during the day, publicly choose a player: if they are the Demon, they die.',
    },
  },
  soldier: {
    id: 'soldier', team: 'townsfolk', icon: '🛡️',
    name: { fr: 'Soldat', en: 'Soldier' },
    ability: { fr: 'Vous êtes protégé du Démon.', en: 'You are safe from the Demon.' },
  },
  mayor: {
    id: 'mayor', team: 'townsfolk', icon: '🎖️',
    name: { fr: 'Maire', en: 'Mayor' },
    ability: {
      fr: 'S\'il ne reste que 3 joueurs vivants et qu\'aucune exécution n\'a lieu, votre équipe gagne. Si vous mourez la nuit, un autre joueur peut mourir à votre place.',
      en: 'If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead.',
    },
  },
  butler: {
    id: 'butler', team: 'outsider', icon: '🤵',
    name: { fr: 'Majordome', en: 'Butler' },
    ability: {
      fr: 'Chaque nuit, choisissez un joueur (pas vous) : demain, vous ne pouvez voter que s\'il vote aussi.',
      en: 'Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too.',
    },
    firstNight: {
      fr: 'Le Majordome désigne son Maître (pas lui-même).',
      en: 'The Butler points to their Master (not themself).',
    },
    otherNight: {
      fr: 'Le Majordome désigne son Maître (pas lui-même).',
      en: 'The Butler points to their Master (not themself).',
    },
  },
  drunk: {
    id: 'drunk', team: 'outsider', icon: '🍺',
    name: { fr: 'Ivrogne', en: 'Drunk' },
    ability: {
      fr: 'Vous ne savez pas que vous êtes l\'Ivrogne. Vous pensez être un Villageois, mais ce n\'est pas le cas.',
      en: 'You do not know you are the Drunk. You think you are a Townsfolk character, but you are not.',
    },
  },
  recluse: {
    id: 'recluse', team: 'outsider', icon: '🏚️',
    name: { fr: 'Reclus', en: 'Recluse' },
    ability: {
      fr: 'Vous pouvez être perçu comme Maléfique et comme un Sbire ou un Démon, même mort.',
      en: 'You might register as evil & as a Minion or Demon, even if dead.',
    },
  },
  saint: {
    id: 'saint', team: 'outsider', icon: '😇',
    name: { fr: 'Saint', en: 'Saint' },
    ability: {
      fr: 'Si vous mourez par exécution, votre équipe perd.',
      en: 'If you die by execution, your team loses.',
    },
  },
  poisoner: {
    id: 'poisoner', team: 'minion', icon: '🧪',
    name: { fr: 'Empoisonneur', en: 'Poisoner' },
    ability: {
      fr: 'Chaque nuit, choisissez un joueur : il est empoisonné cette nuit et demain pendant le jour.',
      en: 'Each night, choose a player: they are poisoned tonight and tomorrow day.',
    },
    firstNight: {
      fr: 'L\'Empoisonneur désigne un joueur, qui est empoisonné.',
      en: 'The Poisoner points to a player, who is poisoned.',
    },
    otherNight: {
      fr: 'L\'Empoisonneur désigne un joueur, qui est empoisonné.',
      en: 'The Poisoner points to a player, who is poisoned.',
    },
  },
  spy: {
    id: 'spy', team: 'minion', icon: '🕵️',
    name: { fr: 'Espion', en: 'Spy' },
    ability: {
      fr: 'Chaque nuit, vous voyez le Grimoire. Vous pouvez être perçu comme Bon et comme un Villageois ou un Étranger, même mort.',
      en: 'Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead.',
    },
    firstNight: {
      fr: 'Montrez le Grimoire à l\'Espion aussi longtemps qu\'il le souhaite.',
      en: 'Show the Grimoire to the Spy for as long as they need.',
    },
    otherNight: {
      fr: 'Montrez le Grimoire à l\'Espion aussi longtemps qu\'il le souhaite.',
      en: 'Show the Grimoire to the Spy for as long as they need.',
    },
  },
  scarletwoman: {
    id: 'scarletwoman', team: 'minion', icon: '💋',
    name: { fr: 'Succube', en: 'Scarlet Woman' },
    ability: {
      fr: 'S\'il y a 5 joueurs vivants ou plus et que le Démon meurt, vous devenez le Démon. (Les Voyageurs ne comptent pas.)',
      en: 'If there are 5 or more players alive & the Demon dies, you become the Demon. (Travellers don\'t count.)',
    },
    otherNight: {
      fr: 'Si elle est devenue le Démon aujourd\'hui, montrez-lui le jeton « Vous êtes » puis le jeton du Démon.',
      en: 'If she became the Demon today, show her the "You are" card, then the Demon token.',
    },
  },
  baron: {
    id: 'baron', team: 'minion', icon: '🎩',
    name: { fr: 'Baron', en: 'Baron' },
    ability: {
      fr: 'Il y a des Étrangers supplémentaires en jeu. [+2 Étrangers]',
      en: 'There are extra Outsiders in play. [+2 Outsiders]',
    },
  },
  imp: {
    id: 'imp', team: 'demon', icon: '😈',
    name: { fr: 'Diable', en: 'Imp' },
    ability: {
      fr: 'Chaque nuit*, choisissez un joueur : il meurt. Si vous vous tuez ainsi, un Sbire devient le Diable.',
      en: 'Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.',
    },
    otherNight: {
      fr: 'Le Diable désigne un joueur, qui meurt. S\'il se désigne lui-même, un Sbire devient le Diable : réveillez-le pour le lui montrer.',
      en: 'The Imp points to a player, who dies. If the Imp chose themself, a Minion becomes the Imp: wake them to show them.',
    },
  },
  bureaucrat: {
    id: 'bureaucrat', team: 'traveller', icon: '📎',
    name: { fr: 'Bureaucrate', en: 'Bureaucrat' },
    ability: {
      fr: 'Chaque nuit, choisissez un joueur (pas vous) : son vote compte pour 3 demain.',
      en: 'Each night, choose a player (not yourself): their vote counts as 3 votes tomorrow.',
    },
    firstNight: {
      fr: 'Le Bureaucrate désigne un joueur : son vote comptera triple demain.',
      en: 'The Bureaucrat points to a player: their vote counts triple tomorrow.',
    },
    otherNight: {
      fr: 'Le Bureaucrate désigne un joueur : son vote comptera triple demain.',
      en: 'The Bureaucrat points to a player: their vote counts triple tomorrow.',
    },
  },
  thief: {
    id: 'thief', team: 'traveller', icon: '💰',
    name: { fr: 'Voleur', en: 'Thief' },
    ability: {
      fr: 'Chaque nuit, choisissez un joueur (pas vous) : son vote compte négativement demain.',
      en: 'Each night, choose a player (not yourself): their vote counts negatively tomorrow.',
    },
    firstNight: {
      fr: 'Le Voleur désigne un joueur : son vote comptera négativement demain.',
      en: 'The Thief points to a player: their vote counts negatively tomorrow.',
    },
    otherNight: {
      fr: 'Le Voleur désigne un joueur : son vote comptera négativement demain.',
      en: 'The Thief points to a player: their vote counts negatively tomorrow.',
    },
  },
  gunslinger: {
    id: 'gunslinger', team: 'traveller', icon: '🔫',
    name: { fr: 'Pistolero', en: 'Gunslinger' },
    ability: {
      fr: 'Chaque jour, après le décompte du 1er vote, vous pouvez choisir un joueur qui a voté : il meurt.',
      en: 'Each day, after the 1st vote has been tallied, you may choose a player that voted: they die.',
    },
  },
  scapegoat: {
    id: 'scapegoat', team: 'traveller', icon: '🐐',
    name: { fr: 'Bouc émissaire', en: 'Scapegoat' },
    ability: {
      fr: 'Si un joueur de votre alignement est exécuté, vous pouvez être exécuté à sa place.',
      en: 'If a player of your alignment is executed, you might be executed instead.',
    },
  },
  beggar: {
    id: 'beggar', team: 'traveller', icon: '🥣',
    name: { fr: 'Mendiant', en: 'Beggar' },
    ability: {
      fr: 'Vous devez utiliser un jeton de vote pour voter. Si un joueur mort vous donne le sien, vous apprenez son alignement. Vous êtes sobre et en bonne santé.',
      en: 'You must use a vote token to vote. If a dead player gives you theirs, you learn their alignment. You are sober & healthy.',
    },
  },
};

export const ALL_ROLES = Object.values(ROLES);
export const rolesOfTeam = (team: Team) => ALL_ROLES.filter((r) => r.team === team);

export const isGoodTeam = (team: Team) => team === 'townsfolk' || team === 'outsider';

/** Night order. Special steps: 'dusk', 'minioninfo', 'demoninfo', 'dawn'. */
export const FIRST_NIGHT: string[] = [
  'dusk', 'minioninfo', 'demoninfo', 'poisoner', 'bureaucrat', 'thief', 'spy',
  'washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'butler', 'dawn',
];
export const OTHER_NIGHT: string[] = [
  'dusk', 'poisoner', 'bureaucrat', 'thief', 'monk', 'spy', 'scarletwoman', 'imp', 'ravenkeeper',
  'empath', 'fortuneteller', 'undertaker', 'butler', 'dawn',
];

/** [townsfolk, outsiders, minions, demons] by player count (5..15). */
export const DISTRIBUTION: Record<number, [number, number, number, number]> = {
  5: [3, 0, 1, 1], 6: [3, 1, 1, 1], 7: [5, 0, 1, 1], 8: [5, 1, 1, 1], 9: [5, 2, 1, 1],
  10: [7, 0, 2, 1], 11: [7, 1, 2, 1], 12: [7, 2, 2, 1], 13: [9, 0, 3, 1], 14: [9, 1, 3, 1],
  15: [9, 2, 3, 1],
};

export function distributionFor(count: number, hasBaron: boolean): [number, number, number, number] {
  const n = Math.max(5, Math.min(15, count));
  const [t, o, m, d] = DISTRIBUTION[n];
  if (!hasBaron) return [t, o, m, d];
  // The Baron swaps 2 Townsfolk for 2 Outsiders (as long as Outsiders remain).
  const extra = Math.min(2, rolesOfTeam('outsider').length - o);
  return [t - extra, o + extra, m, d];
}

export const DEMO_NAMES = [
  'Anne', 'Vincent', 'Fayçal', 'Jérôme', 'Maëva', 'Fouf', 'Amandine',
  'Grisaille', 'Killian', 'Guillaume', 'Manon', 'Simon', 'Thomas',
];
