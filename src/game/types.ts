import type { Alignment, L10n, RoleId } from '../data/roles';
import type { DrawStyle } from './drawStyles';

export type MarkerKey =
  | 'poisoned'    // Poisoner target (tonight + tomorrow)
  | 'protected'   // Monk target (tonight)
  | 'master'      // Butler's master
  | 'redherring'  // Fortune Teller red herring
  | 'diedtonight' // killed during the current/last night
  | 'executed'    // executed today
  | 'used'        // once-per-game ability spent (Virgin, Slayer)
  | 'threevotes'  // Bureaucrat target
  | 'negvote'     // Thief target
  | 'drunk'       // manual "drunk" (storyteller judgement)
  | 'wwtownsfolk' | 'wwwrong'    // Washerwoman reminders (first night)
  | 'liboutsider' | 'libwrong'   // Librarian reminders
  | 'invminion' | 'invwrong'     // Investigator reminders
  | 'chefpair';                  // Chef: player in an evil pair

export interface Marker {
  key: MarkerKey;
  /** Player whose ability placed the marker (it only works if that player is sober & healthy). */
  by?: string;
}

export interface Player {
  id: string;
  name: string;
  role: RoleId;
  /** For the Drunk: the Townsfolk they believe they are. */
  believedRole?: RoleId;
  alignment: Alignment;
  alive: boolean;
  /** Dead players keep one ghost vote. */
  ghostVote: boolean;
  markers: Marker[];
  notes: string;
  /** Has seen their character during distribution. */
  seen: boolean;
}

/** Pre-step state of every player a step changed, so that reopening the step can take its effects back. */
export type PlayerState = Pick<Player, 'alive' | 'ghostVote' | 'role' | 'alignment' | 'believedRole' | 'markers'>;
export interface StepUndo {
  players: Record<string, PlayerState>;
  pendingWin: PendingWin | null;
  /** Extra step data created as a side effect (the new Imp's own step after a star-pass). */
  dropData: string[];
}

export interface StepAction {
  targets: string[];
  role?: RoleId | null;
  value?: number | boolean | null;
  /** Players that "misregister" for this step (Spy as good, Recluse as evil...). */
  misreg?: string[];
  result?: L10n;
  /** Empath: the living neighbours when the info was given (to spot contradictions later). */
  neighbours?: string[];
  /** The player was drunk or poisoned when the step was done. */
  impaired?: boolean;
  /** The information given was false. */
  lie?: boolean;
  undo?: StepUndo;
}

export interface NightState {
  number: number;
  done: string[];
  data: Record<string, StepAction>;
  /** Players alive at dusk: the live view only shows the night's deaths at dawn. Absent in games saved before it existed. */
  aliveAtDusk?: string[];
}

export interface Nomination {
  nominator: string;
  nominee: string;
  voters: string[];
  total: number | null; // null = vote not recorded yet
  /** Votes needed when the vote was recorded: a later death (Gunslinger, exile...) does not change it. */
  needed?: number;
  exile: boolean;
  virginTrigger?: boolean;
}

export interface DayState {
  number: number;
  nominations: Nomination[];
  blockId: string | null;
  blockVotes: number;
  ended: boolean;
}

export interface LogEntry {
  id: string;
  phase: 'setup' | 'night' | 'day' | 'end';
  num: number;
  text: L10n;
  important?: boolean;
}

export type Phase = 'setup' | 'night' | 'day' | 'ended';
export type SetupStep = 'players' | 'roles' | 'assign' | 'rules' | 'distribute';

export interface PendingWin {
  winner: Alignment;
  reason: L10n;
}

export interface Game {
  id: string;
  version: 1;
  createdAt: number;
  updatedAt: number;
  title: string;
  demo: boolean;
  phase: Phase;
  setupStep: SetupStep;
  playerCount: number;
  selectedRoles: RoleId[];
  /** Play style used to draw the characters. Absent in games saved before it existed (= 'simple'). */
  drawStyle?: DrawStyle;
  players: Player[];
  bluffs: RoleId[];
  nightNumber: number;
  dayNumber: number;
  night: NightState | null;
  /** Earlier nights, oldest first (for each character's history). Absent in games saved before it existed. */
  pastNights?: NightState[];
  day: DayState | null;
  /** Player executed during the last day (for the Undertaker). */
  executedToday: string | null;
  /** Player who became the Imp today via the Scarlet Woman. */
  swPromoted: string | null;
  pendingWin: PendingWin | null;
  winner: Alignment | null;
  winReason: L10n | null;
  log: LogEntry[];
  /** Characters handed out on the players' phones (QR code) rather than by passing the iPad around. */
  phoneDeal?: boolean;
  /** Turns the grimoire's circle by this many seats (clockwise), to match where the Storyteller sits. */
  rotation?: number;
}
