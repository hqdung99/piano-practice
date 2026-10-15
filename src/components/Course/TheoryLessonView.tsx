import { useState } from 'react';
import { THEORY_LESSONS } from '../../utils/theory101';
import type { TheoryExample } from '../../utils/theory101';
import { useSequencePlayer } from '../../hooks/useSequencePlayer';
import type { PlayEvent } from '../../utils/earTraining/skills';
import styles from './Course.module.css';

interface TheoryLessonViewProps {
  lessonId: string;
  playNote: (note: string, velocity?: number) => void;
  releaseNote: (note: string) => void;
  onFinish: () => void;
  onBack: () => void;
}

const DEFAULT_MS = 450;

function toEvents(example: TheoryExample): PlayEvent[] {
  let at = 0;
  return example.notes.map((n, i) => {
    const dur = example.ms?.[i] ?? DEFAULT_MS;
    const event = { notes: n.split('+'), at, dur: dur * 0.95 };
    at += dur;
    return event;
  });
}

export function TheoryLessonView({ lessonId, playNote, releaseNote, onFinish, onBack }: TheoryLessonViewProps) {
  const lesson = THEORY_LESSONS.find((l) => l.id === lessonId)!;
  const [index, setIndex] = useState(0);
  const player = useSequencePlayer({ playNote, releaseNote });
  const slide = lesson.slides[index];
  const last = index === lesson.slides.length - 1;

  return (
    <div className={styles.course}>
      <div className={styles.theoryHeader}>
        <button className={styles.btn} onClick={onBack}>
          ← Course
        </button>
        <span className={styles.bannerKicker}>
          Theory 101 · {lesson.title} · {index + 1} of {lesson.slides.length}
        </span>
      </div>
      <div className={styles.slide}>
        <h3>{slide.title}</h3>
        <p>{slide.body}</p>
        {slide.examples && (
          <div className={styles.examples}>
            {slide.examples.map((ex) => (
              <button key={ex.label} className={styles.example} onClick={() => player.play(toEvents(ex))}>
                ♪ {ex.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={styles.slideNav}>
        <div className={styles.dots}>
          {lesson.slides.map((s, i) => (
            <span key={s.title} className={i === index ? styles.dotActive : ''} />
          ))}
        </div>
        <button className={styles.btn} disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Back
        </button>
        <button
          className={`${styles.btn} ${styles.primary}`}
          onClick={() => (last ? onFinish() : setIndex(index + 1))}
        >
          {last ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  );
}
