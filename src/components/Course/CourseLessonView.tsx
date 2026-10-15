import { useEffect, useRef } from 'react';
import { courseStars, describeActivity } from '../../utils/course';
import type { CourseLesson } from '../../utils/course';
import { allSongs } from '../../utils/songLibrary';
import type { UseNoteGameReturn } from '../../hooks/useNoteGame';
import type { UseSongPracticeReturn } from '../../hooks/useSongPractice';
import type { UseChordGameReturn } from '../../hooks/useChordGame';
import type { InputSource } from '../../hooks/useInputSource';
import { NoteGame } from '../NoteGame/NoteGame';
import { SongPractice } from '../SongPractice/SongPractice';
import { ChordGame } from '../ChordGame/ChordGame';
import { Stars } from './Stars';
import styles from './Course.module.css';

interface CourseLessonViewProps {
  lesson: CourseLesson;
  /** e.g. "Soloist · Unit 1 · Lesson 2" */
  kicker: string;
  next?: CourseLesson;
  /** Label of the button that opens `next` */
  nextLabel?: string;
  /** A workout activity is done when finished, whatever the score */
  isWorkout?: boolean;
  game: UseNoteGameReturn;
  practice: UseSongPracticeReturn;
  chordGame: UseChordGameReturn;
  inputSource: InputSource;
  bestStars: number;
  onFinish: (stars: number) => void;
  onNext: (lesson: CourseLesson) => void;
  onBack: () => void;
}

export function CourseLessonView({
  lesson,
  kicker,
  next,
  nextLabel = 'Next lesson →',
  isWorkout = false,
  game,
  practice,
  chordGame,
  inputSource,
  bestStars,
  onFinish,
  onNext,
  onBack,
}: CourseLessonViewProps) {
  const { activity } = lesson;
  const run =
    activity.type === 'reading'
      ? { status: game.status, startTime: game.startTime, played: game.totalPlayed, correct: game.totalCorrect }
      : activity.type === 'chords'
        ? { status: chordGame.status, startTime: chordGame.startTime, played: chordGame.totalPlayed, correct: chordGame.totalCorrect }
        : { status: practice.status, startTime: practice.startTime, played: 0, correct: 0 };
  const percent =
    activity.type === 'song' ? practice.accuracy : run.played ? Math.round((run.correct / run.played) * 100) : 0;
  const stars = courseStars(percent, lesson.pass);
  const finished = run.status === 'done';

  // Save each finished run once
  const recordedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!finished || recordedRef.current === run.startTime) return;
    recordedRef.current = run.startTime;
    if (stars > 0) onFinish(stars);
  }, [finished, run.startTime, stars, onFinish]);

  const passedEver = bestStars > 0 || (finished && stars > 0);
  const songTitle = activity.type === 'song' ? allSongs().find((s) => s.id === activity.songId)?.title : undefined;
  const measure = activity.type === 'song' && activity.pace === 'tempo' ? 'of notes on time' : 'first-try accuracy';
  const goal = isWorkout ? 'Goal: just finish it — any score counts' : `Goal: ${lesson.pass}% ${measure}`;

  return (
    <div className={styles.lessonView}>
      <div className={`${styles.banner} ${lesson.kind === 'checkpoint' ? styles.bannerCheckpoint : ''}`}>
        <button className={styles.btn} onClick={onBack}>
          ← Course
        </button>
        <div className={styles.bannerText}>
          <span className={styles.bannerKicker}>{kicker}</span>
          <strong>{lesson.title}</strong>
          <span>
            {lesson.subtitle} {songTitle && <em>({songTitle})</em>}
          </span>
          <span className={styles.meta}>
            {describeActivity(activity)} · {goal}
          </span>
        </div>
        <div className={styles.bannerResult}>
          {finished ? (
            stars > 0 ? (
              <>
                <span className={styles.pass}>
                  {isWorkout ? 'Done' : 'Passed'} · {percent}%
                </span>
                {!isWorkout && <Stars count={stars} />}
              </>
            ) : (
              <span className={styles.fail}>
                {percent}% — need {lesson.pass}%. Try again!
              </span>
            )
          ) : bestStars > 0 && !isWorkout ? (
            <>
              <span className={styles.best}>Best</span>
              <Stars count={bestStars} />
            </>
          ) : null}
          {passedEver && next && (
            <button className={`${styles.btn} ${styles.primary}`} onClick={() => onNext(next)}>
              {nextLabel}
            </button>
          )}
          {passedEver && !next && (
            <span className={styles.pass}>{isWorkout ? 'Workout complete!' : 'Track complete!'}</span>
          )}
        </div>
      </div>

      {activity.type === 'reading' ? (
        <NoteGame game={game} locked />
      ) : activity.type === 'chords' ? (
        <ChordGame game={chordGame} locked />
      ) : (
        <SongPractice practice={practice} inputSource={inputSource} locked />
      )}
    </div>
  );
}
