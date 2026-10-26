import { ROLES, type RoleId, type Team } from '../data/roles';
import { isImpaired, isTraveller, stats, wakeRole } from '../game/engine';
import type { Game, Player } from '../game/types';
import { T, loc, roleName } from '../i18n';
import { MARKERS, markerLabel } from './markers';
import type { Link, Overlay, Tone, TrailMark } from './overlay';
import { RoleIcon, TONE_VAR, roleSide, sideOf, teamTone } from './ui';

const TONE_ARROW: Record<Tone, string> = { bon: 'bon', mal: 'mal', amb: 'amb', neu: 'neu' };

/** Arrows implied by the markers already on the table (poison, master, protection). */
export function standingLinks(g: Game): Link[] {
  const links: Link[] = [];
  for (const p of g.players) {
    for (const m of p.markers) {
      if (!m.by || m.by === p.id) continue;
      if (m.key === 'poisoned') links.push({ from: m.by, to: p.id, tone: 'mal', label: T('empoisonne', 'poisons'), op: 0.5 });
      else if (m.key === 'master') links.push({ from: m.by, to: p.id, tone: 'neu', label: T('maître', 'master'), dashed: true, op: 0.5 });
      else if (m.key === 'protected') links.push({ from: m.by, to: p.id, tone: 'bon', label: T('protège', 'protects'), op: 0.5 });
    }
  }
  return links;
}

function centerText(g: Game, hidden: boolean): [string, string, string?] {
  const s = stats(g);
  const block = g.day?.blockId ? g.players.find((p) => p.id === g.day!.blockId) : null;
  if (hidden) return [T('Grimoire masqué', 'Grimoire hidden'), T('Rôles et marqueurs cachés', 'Characters and reminders hidden'), T('Touchez « Démasquer » pour révéler', 'Tap “Unhide” to reveal')];
  if (g.phase === 'night') return [`${T('Nuit', 'Night')} ${g.nightNumber}`, `${s.alive}/${s.total} ${T('vivants', 'alive')}`];
  if (g.phase === 'day') {
    return [`${T('Jour', 'Day')} ${g.dayNumber}`, `${s.alive} ${T('vivants', 'alive')} · ${s.needed} ${T('votes pour exécuter', 'votes to execute')}`,
      `${T('Bûcher', 'Block')} : ${block ? block.name : T('personne', 'nobody')}`];
  }
  if (g.phase === 'ended') return [g.winner === 'good' ? T('Le Bien l’emporte', 'Good wins') : g.winner === 'evil' ? T('Le Mal l’emporte', 'Evil wins') : T('Partie terminée', 'Game over'), loc(g.winReason)];
  return ['', ''];
}

/** A straight arrow between two token centres (in % of the circle), trimmed to the card edges, and where its label goes. */
export function linkGeometry([x1, y1]: [number, number], [x2, y2]: [number, number], k: number) {
  const hw = 9 * k, hh = 6.6 * k;
  const inCard = (x: number, y: number, cx: number, cy: number) => x > cx - hw && x < cx + hw && y > cy - hh && y < cy + hh;
  const pts: [number, number][] = [];
  for (let s = 0; s <= 200; s++) {
    const t = s / 200, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
    if (!inCard(x, y, x1, y1) && !inCard(x, y, x2, y2)) pts.push([x, y]);
  }
  const p0 = pts[0] ?? [x1, y1], p1 = pts[pts.length - 1] ?? [x2, y2];
  const seg = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const lt = Math.hypot(mx - 50, my - 50) > 18 ? 0.5 : 0.8;
  let lp: [number, number] = [p0[0] + (p1[0] - p0[0]) * lt, p0[1] + (p1[1] - p0[1]) * lt];
  if (seg < 30) {
    const vx = 50 - lp[0], vy = 50 - lp[1], vl = Math.hypot(vx, vy) || 1;
    lp = [lp[0] + (vx / vl) * 5, lp[1] + (vy / vl) * 5];
  }
  return { d: `M${p0[0].toFixed(2)} ${p0[1].toFixed(2)} L${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`, lp, seg };
}

export function Circle(props: { game: Game; hidden: boolean; overlay?: Overlay; onTap: (id: string) => void }) {
  const { game: g, hidden } = props;
  const ov = props.overlay ?? {};
  const n = g.players.length;
  const k = n <= 11 ? 1 : n <= 13 ? 0.9 : 0.8;
  const rx = 39, ry = 40;
  const rot = g.rotation ?? 0;
  const pos = (i: number): [number, number] => {
    const a = ((-90 + ((i + rot) * 360) / n) * Math.PI) / 180;
    return [50 + rx * Math.cos(a), 50 + ry * Math.sin(a)];
  };
  const index = new Map(g.players.map((p, i) => [p.id, i]));
  const hl = ov.hl ?? {};
  const hasHl = Object.keys(hl).length > 0;
  const [c0, c1, c2] = ov.center ?? centerText(g, hidden);

  // --- arrows between tokens, trimmed so they start and end at the card edges
  const rawLinks = hidden ? [] : ov.links ?? standingLinks(g);
  const links = rawLinks.flatMap((l) => {
    const a = index.get(l.from), b = index.get(l.to);
    if (a === undefined || b === undefined || a === b) return [];
    const { d, lp, seg } = linkGeometry(pos(a), pos(b), k);
    return [{ ...l, d, lp, label: seg < 15 ? '' : l.label }];
  });

  const titleLong = c0.length > 10;

  return (
    <div class={`circle ${ov.dim ? 'dim' : ''}`} style={{ '--k': String(k) }}>
      <div class="circle-ring" />
      <div class="circle-center">
        <div class={`circle-title ${titleLong ? 'long' : ''}`}>{c0}</div>
        <div class="circle-sub">{c1}</div>
        {c2 && <div class="circle-pill">{c2}</div>}
      </div>
      <svg class="circle-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          {(['mal', 'bon', 'amb', 'neu'] as Tone[]).map((t) => (
            <marker key={t} id={`ah-${t}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.2" markerHeight="2.2" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0 0L10 5L0 10z" fill={TONE_VAR[t]} />
            </marker>
          ))}
        </defs>
        {links.map((l, i) => (
          <path key={i} d={l.d} fill="none" stroke={TONE_VAR[l.tone]} stroke-width="2.5" stroke-dasharray={l.dashed ? '6 5' : 'none'}
            stroke-linecap="round" stroke-linejoin="round" opacity={l.op ?? 1} vector-effect="non-scaling-stroke" marker-end={`url(#ah-${TONE_ARROW[l.tone]})`} />
        ))}
      </svg>
      {g.players.map((p, i) => {
        const [x, y] = pos(i);
        return <Token key={p.id} p={p} seat={i + 1} x={x} y={y} hidden={hidden} badge={hl[p.id]} trail={hidden ? undefined : ov.trail?.[p.id]} dim={!!ov.faded?.includes(p.id) || hasHl && !ov.noDim && !hl[p.id] && !(!hidden && ov.trail?.[p.id]?.length)} onTap={() => props.onTap(p.id)} />;
      })}
      {links.filter((l) => l.label).map((l, i) => (
        <div key={i} class="circle-label" style={{ left: `${l.lp[0]}%`, top: `${l.lp[1]}%`, color: TONE_VAR[l.tone], borderColor: TONE_VAR[l.tone], opacity: l.op ?? 1 }}>{l.label}</div>
      ))}
    </div>
  );
}

/** Short team label on the token, so that colour is never the only signal. Townsfolk are the default and carry none. */
const TEAM_BADGE: Record<Team, () => string> = {
  townsfolk: () => '',
  outsider: () => T('ÉTR.', 'OUT.'),
  minion: () => T('SBIRE', 'MINION'),
  demon: () => T('DÉMON', 'DEMON'),
  traveller: () => T('VOY.', 'TRAV.'),
};

function Token(props: { p: Player; seat: number; x: number; y: number; hidden: boolean; badge?: string; trail?: TrailMark[]; dim: boolean; onTap: () => void }) {
  const { p, hidden } = props;
  const role = ROLES[p.role];
  const trav = isTraveller(p);
  // The Drunk shows the character they believe they are, as the Storyteller treats them, with a Drunk badge.
  const drunk = p.role === 'drunk' && !!p.believedRole;
  const shown = drunk ? wakeRole(p) : p.role;
  const tone = hidden ? 'hid' : teamTone(ROLES[shown].team);
  const mismatch = !hidden && (trav || sideOf(role.team) !== sideOf(role.team, p.alignment));
  const name = roleName(shown);
  const marks: { t: string; tone: Tone | 'out'; role?: RoleId }[] = [];
  if (!hidden) {
    if (drunk) marks.push({ t: roleName('drunk'), tone: 'out' });
    if (mismatch) marks.push({ t: p.alignment === 'evil' ? T('Maléfique', 'Evil') : T('Bon', 'Good'), tone: p.alignment === 'evil' ? 'mal' : 'bon' });
    for (const m of p.markers) marks.push({ t: markerLabel(m), tone: MARKERS[m.key].tone, role: MARKERS[m.key].role });
    if (isImpaired(p) && !p.markers.some((m) => m.key === 'poisoned' || m.key === 'drunk') && p.role !== 'drunk') marks.push({ t: T('Ivre / empoisonné', 'Impaired'), tone: 'mal' });
  }
  const teamBadge = hidden ? '' : TEAM_BADGE[ROLES[shown].team]();
  const status = !p.alive ? T('MORT', 'DEAD') : teamBadge;
  return (
    <button type="button" class={`ptoken tone-${tone} ${p.alive ? '' : 'dead'} ${trav ? 'trav' : ''} ${props.badge ? 'hl' : ''} ${props.dim ? 'faded' : ''}`}
      style={{ left: `${props.x}%`, top: `${props.y}%` }} onClick={props.onTap}>
      <span class="pcard">
        {props.badge && <span class="phl">{props.badge}</span>}
        <span class="prow">
          <span class="pleft">
            <span class="pico">
              {hidden ? null : <RoleIcon role={shown} size={18} />}
              {!hidden && drunk && <span class="pdrunk tone-out" title={roleName('drunk')}><RoleIcon role="drunk" size={10} /></span>}
            </span>
            <span class="pseat">{String(props.seat).padStart(2, '0')}</span>
          </span>
          <span class="pstat">{status}{!p.alive && <i class={`ghostdot ${p.ghostVote ? '' : 'spent'}`} title={p.ghostVote ? T('Vote fantôme disponible', 'Ghost vote available') : T('Vote fantôme utilisé', 'Ghost vote spent')} />}</span>
        </span>
        <span class={`prole ${name.length > 13 ? 'xl' : name.length > 9 ? 'lg' : ''}`}>{hidden ? '· · ·' : name}</span>
        <span class={`pname ${p.name ? '' : 'unnamed'}`}>{p.name || T('sans prénom', 'no name')}</span>
      </span>
      {(marks.length > 0 || !!props.trail?.length) && (
        <span class="pmarks">
          {marks.map((m, i) => <span key={i} class={`pill tone-${m.tone}`} title={m.role ? roleName(m.role) : undefined}>{m.role && <RoleIcon role={m.role} size={10} />}{m.t}</span>)}
          {props.trail?.map((m) => (
            <span key={m.role} class={`mini tone-${roleSide(m.role)}`}
              title={`${roleName(m.role)} · ${m.nights.map((x) => `${T('nuit', 'night')} ${x.night}${x.text ? ` : ${x.text}` : ''}${x.flag === 'lie' ? ` (${T('info fausse', 'false info')})` : x.flag === 'impaired' ? ` (${T('ivre/empoisonné', 'drunk/poisoned')})` : ''}`).join(', ')}`}>
              <RoleIcon role={m.role} size={12} />
              {m.nights.map((x) => <span key={x.night} class={`mini-seg ${x.flag ?? ''}`}><span class="mini-n">{x.night}</span>{x.text && <b class="mini-t">{x.text}</b>}</span>)}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
