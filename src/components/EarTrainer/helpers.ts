import type { CSSProperties } from 'react';
import { SKILLS, makeContext } from '../../utils/earTraining/skills';
import type { PracticeConfig, SkillId, SoundContext } from '../../utils/earTraining/skills';
import { OCTAVE_BASE, chordDef } from '../../utils/earTraining/theory';
import { LESSONS } from '../../utils/earTraining/lessons';
import type { QuizResult } from '../../hooks/useQuiz';

export function masteredPercent(skill: SkillId, stars: Record<string, number>): number {
  const lessons = LESSONS[skill];
  const done = lessons.filter((l) => (stars[l.id] ?? 0) > 0).length;
  return Math.round((done / lessons.length) * 100);
}

/** Sets the skill's colours for everything inside */
export function skillStyle(skill: SkillId): CSSProperties {
  return { '--accent': SKILLS[skill].color, '--accent-soft': SKILLS[skill].colorSoft } as CSSProperties;
}

/** Every answer side by side, from the same root, so the differences stand out */
export function listenContext(skill: SkillId, config: PracticeConfig): SoundContext {
  // Random material (melodies, chord picks) is drawn once, then shared by every answer
  const ctx = makeContext(skill, config.items[0] ?? '0', { ...config, octave: config.octave === 'custom' ? 'medium' : config.octave });
  const base = config.octave === 'custom' ? 60 : OCTAVE_BASE[config.octave];
  const fixedRoot = skill === 'pitch' || skill === 'tonic' ? base : base + (config.root ?? 0);
  return {
    ...ctx,
    rootMidi: fixedRoot,
    direction: config.direction === 'desc' ? 'desc' : 'asc',
    style: config.playStyle === 'harmonic' ? 'harmonic' : 'melodic',
    // The tune for the tonic skill is rebuilt on C so every candidate can be compared
    notes: skill === 'tonic' ? [60, 62, 64, 65, 67, 65, 64, 62] : skill === 'compare' ? [base + 2, 5] : ctx.notes,
    pick: skill === 'tonic' ? '0' : skill === 'inversions' ? inversionQuality(config) : ctx.pick,
  };
}

/** A chord quality that can show every inversion being listened to */
function inversionQuality(config: PracticeConfig): string {
  const needsFour = config.items.includes('3rd');
  return config.qualities.find((q) => !needsFour || chordDef(q).tones.length >= 4) ?? 'dom7';
}

/** First-try score, as a whole percentage */
export function resultPercent(results: QuizResult[]): number {
  if (results.length === 0) return 0;
  return Math.round((results.filter((r) => r.correct).length / results.length) * 100);
}
