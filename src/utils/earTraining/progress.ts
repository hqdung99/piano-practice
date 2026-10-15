import { SKILL_IDS } from './skills';
import type { SkillId, Weights } from './skills';
import { LESSONS } from './lessons';

/** How well one answer is known: a Leitner box from 0 (new / shaky) to 5 (solid) */
export interface ItemStat {
  seen: number;
  correct: number;
  box: number;
  /** Last time it was asked, ms since epoch */
  last: number;
}

export interface DayLog {
  answered: number;
  correct: number;
  xp: number;
}

/** Everything progress-related the trainer remembers */
export interface ProgressData {
  stars: Record<string, number>;
  /** Keyed `skill:item` */
  items: Record<string, ItemStat>;
  /** How often an answer was mistaken for another, keyed `skill:answer>picked` */
  confusions: Record<string, number>;
  /** Keyed YYYY-MM-DD */
  days: Record<string, DayLog>;
  xp: number;
  /** Best results, keyed e.g. `streak:intervals`, `speed:pitch` */
  bests: Record<string, number>;
  /** Running totals, e.g. `rounds`, `perfect`, `play`, `dictation` */
  counters: Record<string, number>;
  /** Badge id -> day it was earned */
  badges: Record<string, string>;
}

export const MAX_BOX = 5;
export const XP_CORRECT = 10;
export const XP_TRY = 2;

/** Local date as YYYY-MM-DD */
export function dayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function itemKey(skill: SkillId | string, item: string): string {
  return `${skill}:${item}`;
}

export function confusionKey(skill: SkillId, answer: string, picked: string): string {
  return `${skill}:${answer}>${picked}`;
}

/** 0..1, how well an answer is known */
export function mastery(data: Pick<ProgressData, 'items'>, skill: SkillId, item: string): number {
  return (data.items[itemKey(skill, item)]?.box ?? 0) / MAX_BOX;
}

/** Weak and unseen answers come up more often */
export function weightsFor(data: Pick<ProgressData, 'items'>, skill: SkillId, items: string[]): Weights {
  const weights: Weights = {};
  for (const item of items) {
    const stat = data.items[itemKey(skill, item)];
    weights[item] = stat ? 1 + (MAX_BOX - stat.box) * 0.6 : 2;
  }
  return weights;
}

/** Updated stats for one answer */
export function nextItemStat(stat: ItemStat | undefined, correct: boolean): ItemStat {
  const s = stat ?? { seen: 0, correct: 0, box: 0, last: 0 };
  return {
    seen: s.seen + 1,
    correct: s.correct + (correct ? 1 : 0),
    box: correct ? Math.min(MAX_BOX, s.box + 1) : Math.max(0, s.box - 2),
    last: Date.now(),
  };
}

// ---------- Levels & streaks ----------

/** Level n needs 100 × (1 + 2 + … + n-1) XP */
export function levelOf(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let floor = 0;
  while (xp >= floor + level * 100) {
    floor += level * 100;
    level++;
  }
  return { level, into: xp - floor, needed: level * 100 };
}

/** Days in a row with practice, counting back from today (or yesterday, if today is still open) */
export function dayStreak(days: Record<string, DayLog>, today = new Date()): number {
  const d = new Date(today);
  if (!days[dayKey(d)]?.answered) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days[dayKey(d)]?.answered) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function bestDayStreak(days: Record<string, DayLog>): number {
  const keys = Object.keys(days).filter((k) => days[k].answered > 0).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const [y, m, dd] = k.split('-').map(Number);
    const date = new Date(y, m - 1, dd);
    const gap = prev ? Math.round((date.getTime() - prev.getTime()) / 86400000) : 0;
    run = prev && gap === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

/** The most frequent mix-ups, worst first */
export function topConfusions(
  confusions: Record<string, number>,
  limit = 5,
  minCount = 2
): { skill: SkillId; answer: string; picked: string; count: number }[] {
  return Object.entries(confusions)
    .filter(([, n]) => n >= minCount)
    .map(([key, count]) => {
      const [skill, pair] = key.split(':');
      const [answer, picked] = pair.split('>');
      return { skill: skill as SkillId, answer, picked, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Percent of a skill's lessons passed */
export function lessonsPassed(skill: SkillId, stars: Record<string, number>): number {
  const lessons = LESSONS[skill];
  return lessons.filter((l) => (stars[l.id] ?? 0) > 0).length;
}

// ---------- Badges ----------

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: (data: ProgressData) => boolean;
}

const total = (data: ProgressData, key: string) => data.counters[key] ?? 0;
const answeredAll = (data: ProgressData) => Object.values(data.items).reduce((s, i) => s + i.seen, 0);
const correctAll = (data: ProgressData) => Object.values(data.items).reduce((s, i) => s + i.correct, 0);
const skillDone = (data: ProgressData, skill: SkillId) => LESSONS[skill].every((l) => (data.stars[l.id] ?? 0) > 0);

export const BADGES: BadgeDef[] = [
  { id: 'first-answer', title: 'First Note', description: 'Answer your first question.', icon: '🎵', earned: (d) => answeredAll(d) >= 1 },
  { id: 'first-lesson', title: 'Student', description: 'Pass your first lesson.', icon: '📘', earned: (d) => Object.values(d.stars).some((s) => s > 0) },
  { id: 'perfect', title: 'Perfect Round', description: 'Score 100% in a round.', icon: '💯', earned: (d) => total(d, 'perfect') >= 1 },
  { id: 'correct-100', title: 'Century', description: 'Get 100 answers right.', icon: '💪', earned: (d) => correctAll(d) >= 100 },
  { id: 'correct-1000', title: 'Golden Ear', description: 'Get 1,000 answers right.', icon: '🏆', earned: (d) => correctAll(d) >= 1000 },
  { id: 'streak-3', title: 'Warming Up', description: 'Practise 3 days in a row.', icon: '🔥', earned: (d) => bestDayStreak(d.days) >= 3 },
  { id: 'streak-7', title: 'Week Strong', description: 'Practise 7 days in a row.', icon: '📅', earned: (d) => bestDayStreak(d.days) >= 7 },
  { id: 'streak-30', title: 'Habit Formed', description: 'Practise 30 days in a row.', icon: '🌟', earned: (d) => bestDayStreak(d.days) >= 30 },
  {
    id: 'endless-20',
    title: 'On a Roll',
    description: 'Answer 20 in a row in Endless mode.',
    icon: '♾️',
    earned: (d) => SKILL_IDS.some((s) => (d.bests[`streak:${s}`] ?? 0) >= 20),
  },
  {
    id: 'speed-20',
    title: 'Quick Ear',
    description: 'Get 20 right in one Speed challenge.',
    icon: '⚡',
    earned: (d) => SKILL_IDS.some((s) => (d.bests[`speed:${s}`] ?? 0) >= 20),
  },
  { id: 'play-50', title: 'By Ear', description: 'Play back 50 things you heard.', icon: '🎹', earned: (d) => total(d, 'play') >= 50 },
  { id: 'dictation-25', title: 'Scribe', description: 'Complete 25 dictations.', icon: '✍️', earned: (d) => total(d, 'dictation') >= 25 },
  { id: 'daily-mix-5', title: 'Well Rounded', description: 'Finish 5 daily mixes.', icon: '🎯', earned: (d) => total(d, 'dailyMix') >= 5 },
  { id: 'intervals-done', title: 'Interval Master', description: 'Pass every interval lesson.', icon: '📏', earned: (d) => skillDone(d, 'intervals') },
  { id: 'chords-done', title: 'Chord Master', description: 'Pass every chord lesson.', icon: '🎼', earned: (d) => skillDone(d, 'chords') },
  { id: 'degrees-done', title: 'Functional Ear', description: 'Pass every scale-degree lesson.', icon: '🧭', earned: (d) => skillDone(d, 'degrees') },
  {
    id: 'all-skills',
    title: 'Explorer',
    description: 'Answer a question in every skill.',
    icon: '🗺️',
    earned: (d) => SKILL_IDS.every((s) => Object.keys(d.items).some((k) => k.startsWith(`${s}:`))),
  },
  { id: 'level-10', title: 'Level 10', description: 'Reach level 10.', icon: '🚀', earned: (d) => levelOf(d.xp).level >= 10 },
];

/** Badges earned now that weren't before, stamped with today's date */
export function newBadges(data: ProgressData): Record<string, string> | null {
  const fresh = BADGES.filter((b) => !data.badges[b.id] && b.earned(data));
  if (!fresh.length) return null;
  const today = dayKey();
  return { ...data.badges, ...Object.fromEntries(fresh.map((b) => [b.id, today])) };
}
