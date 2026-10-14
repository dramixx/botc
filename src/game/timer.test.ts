import { afterEach, describe, expect, it, vi } from 'vitest';
import { briefingSlides } from '../data/guide';
import {
  SEGMENTS, activeTimer, addTime, durationFor, fmtClock, fmtMinutes, pause, recommended, recommendedDay, remainingOf, resetTimer,
  setPrefs, setSegment, start, timerFor, DEFAULT_PREFS,
} from './timer';
import { checkSetup } from './engine';

afterEach(() => { resetTimer(); setPrefs(DEFAULT_PREFS); vi.useRealTimers(); });

describe('recommended day durations', () => {
  it('gives round values (30 s steps) for 8 players on day 1', () => {
    expect(recommendedDay(8, 1)).toEqual({ private: 360, public: 210, nominations: 300 });
  });

  it('grows with the number of players and shrinks over the days', () => {
    for (const s of SEGMENTS) {
      for (let n = 5; n < 15; n++) expect(recommended(s, n + 1, 1)).toBeGreaterThanOrEqual(recommended(s, n, 1));
      for (let d = 1; d < 6; d++) expect(recommended(s, 10, d + 1)).toBeLessThanOrEqual(recommended(s, 10, d));
    }
    expect(recommended('private', 15, 1)).toBeGreaterThan(recommended('private', 5, 1));
    expect(recommended('private', 10, 3)).toBeLessThan(recommended('private', 10, 1));
  });

  it('never goes below the minimums, even with 2 players left', () => {
    expect(recommended('private', 2, 9)).toBeGreaterThanOrEqual(120);
    expect(recommended('public', 2, 9)).toBeGreaterThanOrEqual(120);
    expect(recommended('nominations', 2, 9)).toBeGreaterThanOrEqual(180);
  });

  it('follows the pace', () => {
    expect(recommended('private', 10, 1, 'relaxed')).toBeGreaterThan(recommended('private', 10, 1));
    expect(recommended('private', 10, 1, 'fast')).toBeLessThan(recommended('private', 10, 1));
  });

  it('uses custom durations when set', () => {
    setPrefs({ custom: { public: 90 } });
    expect(durationFor('public', 10, 1)).toBe(90);
    expect(durationFor('private', 10, 1)).toBe(recommended('private', 10, 1));
  });

  it('formats clocks and minutes', () => {
    expect(fmtClock(65)).toBe('1:05');
    expect(fmtClock(0.2)).toBe('0:01');
    expect(fmtClock(-3)).toBe('0:00');
    expect(fmtMinutes(210)).toBe('3 min 30');
    expect(fmtMinutes(300)).toBe('5 min');
  });
});

describe('countdown', () => {
  it('starts paused on private chats, then runs, pauses and resumes', () => {
    vi.useFakeTimers({ now: 1_000_000 });
    const t = timerFor('g1', 1, 8);
    expect(t).toMatchObject({ segment: 'private', total: 360, remaining: 360, endsAt: null });
    expect(activeTimer('g1', 1)).toBeNull();
    start(t);
    vi.advanceTimersByTime(60_000);
    const running = activeTimer('g1', 1)!;
    expect(remainingOf(running)).toBe(300);
    pause(running);
    vi.advanceTimersByTime(60_000);
    expect(remainingOf(activeTimer('g1', 1)!)).toBe(300);
    addTime(activeTimer('g1', 1)!, 60);
    expect(remainingOf(activeTimer('g1', 1)!)).toBe(360);
  });

  it('belongs to one day of one game', () => {
    start(timerFor('g1', 1, 8));
    expect(activeTimer('g1', 2)).toBeNull();
    expect(activeTimer('g2', 1)).toBeNull();
    expect(timerFor('g1', 2, 6)).toMatchObject({ day: 2, endsAt: null, total: recommended('private', 6, 2) });
  });

  it('switches segment with the right duration', () => {
    const t = timerFor('g1', 1, 8);
    setSegment(t, 'nominations', 8, true);
    const n = activeTimer('g1', 1)!;
    expect(n.segment).toBe('nominations');
    expect(n.total).toBe(300);
    expect(n.endsAt).not.toBeNull();
  });
});

describe('rules presentation', () => {
  it('uses the public distribution and the votes needed', () => {
    const slides = briefingSlides({ count: 10, expected: checkSetup(10, []).expected, needed: 5, minutes: { private: 7, public: 4, nominations: 6 } });
    const distrib = slides.find((s) => s.distrib)!;
    expect(distrib.points[0].fr).toBe('7 Villageois, 0 Étranger, 2 Sbires et 1 Démon.');
    expect(distrib.points[0].en).toBe('7 Townsfolk, 0 Outsiders, 2 Minions and 1 Demon.');
    expect(slides.find((s) => s.id === 'votes')!.points.some((p) => p.fr.includes('5 voix'))).toBe(true);
    expect(slides.find((s) => s.id === 'day')!.say.fr).toContain('7 minutes');
  });

  it('only tells evil they meet on the first night from 7 players', () => {
    const at = (count: number) => briefingSlides({ count, expected: checkSetup(count, []).expected, needed: Math.ceil(count / 2), minutes: { private: 5, public: 3, nominations: 4 } })
      .find((s) => s.id === 'characters')!.points.map((p) => p.en).join(' ');
    expect(at(6)).toContain('fewer than 7');
    expect(at(7)).toContain('meet their allies');
  });
});
