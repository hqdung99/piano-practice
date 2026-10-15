import { useState } from 'react';
import {
  CHORDS_TRACK_NEEDS,
  COURSE_LESSONS,
  TRACKS,
  describeActivity,
  isTrackOpen,
  isUnlocked,
  trackLessons,
} from '../../utils/course';
import type { CourseLesson, TrackId } from '../../utils/course';
import { THEORY_LESSONS } from '../../utils/theory101';
import { PlacementDialog } from './PlacementDialog';
import { Stars } from './Stars';
import styles from './Course.module.css';

interface CoursePathProps {
  stars: Record<string, number>;
  skipped: string[];
  theoryDone: string[];
  workout: CourseLesson[];
  workoutDone: number[];
  streak: number;
  bestStreak: number;
  onOpen: (lesson: CourseLesson) => void;
  onOpenWorkout: (index: number) => void;
  onOpenTheory: (id: string) => void;
  onSkip: (lessonIds: string[]) => void;
  onReset: () => void;
}

export function CoursePath({
  stars,
  skipped,
  theoryDone,
  workout,
  workoutDone,
  streak,
  bestStreak,
  onOpen,
  onOpenWorkout,
  onOpenTheory,
  onSkip,
  onReset,
}: CoursePathProps) {
  const [trackId, setTrackId] = useState<TrackId>('soloist');
  const [placing, setPlacing] = useState(false);
  const track = TRACKS.find((t) => t.id === trackId)!;
  const lessons = trackLessons(trackId);
  const trackOpen = isTrackOpen(trackId, stars);
  const passedHere = lessons.filter((l) => (stars[l.id] ?? 0) > 0).length;
  const next = trackOpen ? lessons.find((l) => !(stars[l.id] > 0)) : undefined;
  const anyProgress = COURSE_LESSONS.some((l) => stars[l.id] > 0);
  const nextWorkout = workout.findIndex((_, i) => !workoutDone.includes(i));

  return (
    <div className={styles.course}>
      <div className={styles.header}>
        <div>
          <span className={styles.label}>Piano Course</span>
          <p className={styles.intro}>Pass each lesson to unlock the next. A little every day builds your streak.</p>
        </div>
        <div className={styles.streak} title={`Best streak: ${bestStreak} day${bestStreak === 1 ? '' : 's'}`}>
          <span className={styles.flame}>🔥</span>
          <strong>{streak}</strong>
          <span>day streak</span>
        </div>
      </div>

      <section className={styles.workout}>
        <div className={styles.workoutHead}>
          <strong>Today's 5-minute workout</strong>
          <span>
            {workoutDone.length === workout.length
              ? 'Done for today — see you tomorrow!'
              : `${workoutDone.length} of ${workout.length} done`}
          </span>
        </div>
        <div className={styles.workoutSteps}>
          {workout.map((w, i) => (
            <button
              key={w.id}
              className={`${styles.workoutStep} ${workoutDone.includes(i) ? styles.workoutDone : ''} ${
                i === nextWorkout ? styles.current : ''
              }`}
              onClick={() => onOpenWorkout(i)}
            >
              <span className={styles.node}>{workoutDone.includes(i) ? '✓' : i + 1}</span>
              <span className={styles.lessonText}>
                <strong>{w.title}</strong>
                <span className={styles.meta}>{describeActivity(w.activity)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className={styles.trackTabs}>
        {TRACKS.map((t) => (
          <button key={t.id} className={t.id === trackId ? styles.trackActive : ''} onClick={() => setTrackId(t.id)}>
            {t.title} track
            {!isTrackOpen(t.id, stars) && ' 🔒'}
          </button>
        ))}
        <span className={styles.trackSub}>{track.subtitle}</span>
        <span className={styles.spacer} />
        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: `${(passedHere / lessons.length) * 100}%` }} />
        </div>
        <span className={styles.progressText}>
          {passedHere} / {lessons.length}
        </span>
        {next && (
          <button className={`${styles.btn} ${styles.primary}`} onClick={() => onOpen(next)}>
            {passedHere === 0 ? 'Start' : 'Continue'}
          </button>
        )}
      </div>

      {!trackOpen && (
        <p className={styles.lockedNote}>
          The Chords track opens after the Soloist basics: finish “{CHORDS_TRACK_NEEDS.title}” first.
        </p>
      )}

      {track.units.map((unit, u) => (
        <section key={unit.id} className={styles.unit}>
          <h3 className={styles.unitTitle}>
            Unit {u + 1} · {unit.title}
            <span>{unit.subtitle}</span>
          </h3>
          <ol className={styles.lessons}>
            {unit.lessons.map((lesson) => {
              const lessonStars = stars[lesson.id] ?? 0;
              const open = isUnlocked(lesson.id, stars);
              const current = lesson.id === next?.id;
              const number = lessons.indexOf(lesson) + 1;
              const wasSkipped = skipped.includes(lesson.id);
              return (
                <li key={lesson.id}>
                  <button
                    className={[
                      styles.lesson,
                      lesson.kind === 'checkpoint' ? styles.checkpoint : '',
                      current ? styles.current : '',
                      open ? '' : styles.locked,
                    ].join(' ')}
                    disabled={!open}
                    onClick={() => onOpen(lesson)}
                  >
                    <span className={styles.node}>{lessonStars > 0 ? '✓' : open ? number : '🔒'}</span>
                    <span className={styles.lessonText}>
                      {lesson.kind === 'checkpoint' && <span className={styles.badge}>Checkpoint</span>}
                      <strong>{lesson.title}</strong>
                      <span>{lesson.subtitle}</span>
                      <span className={styles.meta}>
                        {describeActivity(lesson.activity)} · pass {lesson.pass}%
                      </span>
                    </span>
                    {wasSkipped ? (
                      <span className={styles.skipped}>Skipped</span>
                    ) : lessonStars > 0 ? (
                      <Stars count={lessonStars} />
                    ) : (
                      current && <span className={styles.go}>Start</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <section className={styles.unit}>
        <h3 className={styles.unitTitle}>
          Theory 101
          <span>Short reads on how music is written — open any time.</span>
        </h3>
        <ol className={styles.lessons}>
          {THEORY_LESSONS.map((t, i) => (
            <li key={t.id}>
              <button className={styles.lesson} onClick={() => onOpenTheory(t.id)}>
                <span className={styles.node}>{theoryDone.includes(t.id) ? '✓' : i + 1}</span>
                <span className={styles.lessonText}>
                  <strong>{t.title}</strong>
                  <span>{t.subtitle}</span>
                  <span className={styles.meta}>{t.slides.length} short slides</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.footerLinks}>
        {!anyProgress && (
          <button className={styles.reset} onClick={() => setPlacing(true)}>
            Already play a little? Find your level
          </button>
        )}
        {anyProgress && (
          <button
            className={styles.reset}
            onClick={() => {
              if (window.confirm('Reset your course progress?')) onReset();
            }}
          >
            Reset course progress
          </button>
        )}
      </div>

      {placing && <PlacementDialog onApply={onSkip} onClose={() => setPlacing(false)} />}
    </div>
  );
}
