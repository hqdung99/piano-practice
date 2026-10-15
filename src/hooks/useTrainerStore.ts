import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DegreeLabels, Notation } from '../utils/earTraining/theory';
import type { Labels, PracticeConfig, SkillId } from '../utils/earTraining/skills';
import {
  XP_CORRECT,
  XP_TRY,
  confusionKey,
  dayKey,
  itemKey,
  newBadges,
  nextItemStat,
  weightsFor,
} from '../utils/earTraining/progress';
import type { ProgressData } from '../utils/earTraining/progress';
import { profileKey } from '../utils/profiles';

export type NoteLength = 'short' | 'normal' | 'long';

export interface TrainerSettings {
  notation: Notation;
  /** How scale degrees are named */
  degreeLabels: DegreeLabels;
  /** After a miss, compare your pick with the answer before moving on */
  answerHints: boolean;
  /** Show a one-octave keyboard to answer pitch questions on */
  showKeyboard: boolean;
  /** Move to the next question by itself after a right answer */
  autoAdvance: boolean;
  /** Play a scale degree walking home after it is answered */
  resolve: boolean;
  /** Light up the keys that sound while listening and after answering */
  lightKeys: boolean;
  /** Playback speed, 1 is normal */
  speed: number;
  noteLength: NoteLength;
}

interface TrainerData extends ProgressData {
  settings: TrainerSettings;
  /** Last practice setup per skill */
  configs: Partial<Record<SkillId, PracticeConfig>>;
  /** Skills whose placement test has been taken */
  placed: Partial<Record<SkillId, boolean>>;
}

const STORAGE_KEY = 'piano.earTrainer';

export const DEFAULT_SETTINGS: TrainerSettings = {
  notation: 'flat',
  degreeLabels: 'numbers',
  answerHints: true,
  showKeyboard: false,
  autoAdvance: true,
  resolve: true,
  lightKeys: true,
  speed: 1,
  noteLength: 'normal',
};

const DEFAULT_DATA: TrainerData = {
  settings: DEFAULT_SETTINGS,
  stars: {},
  configs: {},
  placed: {},
  items: {},
  confusions: {},
  days: {},
  xp: 0,
  bests: {},
  counters: {},
  badges: {},
};

function load(): TrainerData {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey(STORAGE_KEY)) ?? 'null') as Partial<TrainerData> | null;
    if (saved) {
      return {
        ...DEFAULT_DATA,
        ...saved,
        settings: { ...DEFAULT_SETTINGS, ...saved.settings },
      };
    }
  } catch {
    // Storage can be blocked or hold old data; start fresh
  }
  return DEFAULT_DATA;
}

/** Adds XP and a day's activity, then stamps any badges that are now earned */
function logActivity(d: TrainerData, answered: number, correct: number, xp: number): TrainerData {
  const today = dayKey();
  const day = d.days[today] ?? { answered: 0, correct: 0, xp: 0 };
  const next: TrainerData = {
    ...d,
    xp: d.xp + xp,
    days: { ...d.days, [today]: { answered: day.answered + answered, correct: day.correct + correct, xp: day.xp + xp } },
  };
  return withBadges(next);
}

function withBadges(d: TrainerData): TrainerData {
  const badges = newBadges(d);
  return badges ? { ...d, badges } : d;
}

/** Ear trainer progress, stats, settings and practice setups, remembered in this browser */
export function useTrainerStore() {
  const [data, setData] = useState<TrainerData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(profileKey(STORAGE_KEY), JSON.stringify(data));
    } catch {
      // Not remembering progress is fine
    }
  }, [data]);

  const updateSettings = useCallback((patch: Partial<TrainerSettings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  /** Keeps the best result for a lesson */
  const recordStars = useCallback((lessonId: string, stars: number) => {
    setData((d) =>
      stars > (d.stars[lessonId] ?? 0) ? withBadges({ ...d, stars: { ...d.stars, [lessonId]: stars } }) : d
    );
  }, []);

  /** Passes many lessons at once, e.g. after a placement test */
  const passLessons = useCallback((skill: SkillId, lessonIds: string[]) => {
    setData((d) => {
      const stars = { ...d.stars };
      for (const id of lessonIds) stars[id] = Math.max(stars[id] ?? 0, 1);
      return withBadges({ ...d, stars, placed: { ...d.placed, [skill]: true } });
    });
  }, []);

  const saveConfig = useCallback((skill: SkillId, config: PracticeConfig) => {
    setData((d) => ({ ...d, configs: { ...d.configs, [skill]: config } }));
  }, []);

  /** One answered recognition question */
  const recordAnswer = useCallback((skill: SkillId, answer: string, picked: string | null, correct: boolean) => {
    setData((d) => {
      const key = itemKey(skill, answer);
      const items = { ...d.items, [key]: nextItemStat(d.items[key], correct) };
      let confusions = d.confusions;
      if (!correct && picked !== null) {
        const ck = confusionKey(skill, answer, picked);
        confusions = { ...confusions, [ck]: (confusions[ck] ?? 0) + 1 };
      }
      return logActivity({ ...d, items, confusions }, 1, correct ? 1 : 0, correct ? XP_CORRECT : XP_TRY);
    });
  }, []);

  /** One play-back, dictation or other activity outside the recognition quizzes */
  const recordActivity = useCallback((kind: string, correct: boolean) => {
    setData((d) => {
      const counters = { ...d.counters, [kind]: (d.counters[kind] ?? 0) + 1 };
      return logActivity({ ...d, counters }, 1, correct ? 1 : 0, correct ? XP_CORRECT * 1.5 : XP_TRY);
    });
  }, []);

  /** Adds to a running total, e.g. finished rounds */
  const bumpCounter = useCallback((key: string, by = 1) => {
    setData((d) => withBadges({ ...d, counters: { ...d.counters, [key]: (d.counters[key] ?? 0) + by } }));
  }, []);

  /** Keeps the higher of the saved best and `value` */
  const recordBest = useCallback((key: string, value: number) => {
    setData((d) => (value > (d.bests[key] ?? 0) ? withBadges({ ...d, bests: { ...d.bests, [key]: value } }) : d));
  }, []);

  /** Forgets a mix-up once it has been drilled */
  const clearConfusion = useCallback((skill: SkillId, answer: string, picked: string) => {
    setData((d) => {
      const confusions = { ...d.confusions };
      delete confusions[confusionKey(skill, answer, picked)];
      delete confusions[confusionKey(skill, picked, answer)];
      return { ...d, confusions };
    });
  }, []);

  const resetProgress = useCallback(() => setData((d) => ({ ...d, stars: {}, placed: {} })), []);

  const resetStats = useCallback(
    () =>
      setData((d) => ({ ...d, items: {}, confusions: {}, days: {}, xp: 0, bests: {}, counters: {}, badges: {} })),
    []
  );

  const weights = useCallback((skill: SkillId, items: string[]) => weightsFor(data, skill, items), [data]);

  const { notation, degreeLabels } = data.settings;
  const labels: Labels = useMemo(() => ({ notation, degrees: degreeLabels }), [notation, degreeLabels]);

  return {
    ...data,
    labels,
    updateSettings,
    recordStars,
    passLessons,
    saveConfig,
    recordAnswer,
    recordActivity,
    bumpCounter,
    recordBest,
    clearConfusion,
    resetProgress,
    resetStats,
    weights,
  };
}

export type TrainerStore = ReturnType<typeof useTrainerStore>;
