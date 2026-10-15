import { useCallback, useEffect, useState } from 'react';
import { profileKey } from '../utils/profiles';
import { dayKey } from '../utils/course';

const COURSE_KEY = 'piano.course';
const WORKOUT_KEY = 'piano.workout';

interface CourseData {
  /** Best stars per passed lesson */
  stars: Record<string, number>;
  /** Lessons passed by the placement questions rather than played */
  skipped: string[];
  /** Theory 101 lessons read to the end */
  theory: string[];
}

interface WorkoutData {
  /** Day the `done` list belongs to */
  day: string;
  done: number[];
  streak: number;
  best: number;
  /** Last day every workout activity was finished */
  lastComplete: string | null;
}

function load<T>(key: string, fallback: T): T {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey(key)) ?? 'null') as Partial<T> | null;
    if (saved) return { ...fallback, ...saved };
  } catch {
    // Storage can be blocked or hold old data; start fresh
  }
  return fallback;
}

function usePersisted<T>(key: string, fallback: T) {
  const [data, setData] = useState<T>(() => load(key, fallback));
  useEffect(() => {
    try {
      localStorage.setItem(profileKey(key), JSON.stringify(data));
    } catch {
      // Not remembering progress is fine
    }
  }, [key, data]);
  return [data, setData] as const;
}

/** Course progress for the active learner, remembered in this browser */
export function useCourseStore() {
  const [data, setData] = usePersisted<CourseData>(COURSE_KEY, { stars: {}, skipped: [], theory: [] });

  /** Keeps the best result for a lesson */
  const recordStars = useCallback(
    (lessonId: string, value: number) => {
      setData((d) =>
        value > (d.stars[lessonId] ?? 0) || d.skipped.includes(lessonId)
          ? {
              ...d,
              stars: { ...d.stars, [lessonId]: Math.max(value, d.stars[lessonId] ?? 0) },
              skipped: d.skipped.filter((id) => id !== lessonId),
            }
          : d
      );
    },
    [setData]
  );

  /** Placement: mark lessons as passed without playing them */
  const skipLessons = useCallback(
    (ids: string[]) => {
      setData((d) => {
        const fresh = ids.filter((id) => !(d.stars[id] > 0));
        const stars = { ...d.stars };
        fresh.forEach((id) => (stars[id] = 1));
        return { ...d, stars, skipped: [...d.skipped, ...fresh] };
      });
    },
    [setData]
  );

  const markTheory = useCallback(
    (id: string) => setData((d) => (d.theory.includes(id) ? d : { ...d, theory: [...d.theory, id] })),
    [setData]
  );

  const resetProgress = useCallback(() => setData({ stars: {}, skipped: [], theory: [] }), [setData]);

  return { ...data, recordStars, skipLessons, markTheory, resetProgress };
}

function previousDay(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** The daily workout and practice streak for the active learner */
export function useWorkoutStore(activityCount: number) {
  const [data, setData] = usePersisted<WorkoutData>(WORKOUT_KEY, {
    day: '',
    done: [],
    streak: 0,
    best: 0,
    lastComplete: null,
  });
  const [today] = useState(() => dayKey());
  const done = data.day === today ? data.done : [];
  // A streak survives until a whole day is missed
  const streak = data.lastComplete === today || data.lastComplete === previousDay(today) ? data.streak : 0;

  const markDone = useCallback(
    (index: number) => {
      setData((d) => {
        const current = d.day === today ? d.done : [];
        if (current.includes(index)) return d;
        const nextDone = [...current, index];
        const next = { ...d, day: today, done: nextDone };
        if (nextDone.length < activityCount || d.lastComplete === today) return next;
        const nextStreak = d.lastComplete === previousDay(today) ? d.streak + 1 : 1;
        return { ...next, streak: nextStreak, best: Math.max(d.best, nextStreak), lastComplete: today };
      });
    },
    [setData, today, activityCount]
  );

  return { today, done, streak, best: data.best, completeToday: data.lastComplete === today, markDone };
}
