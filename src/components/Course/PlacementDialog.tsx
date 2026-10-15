import { useState } from 'react';
import { placementSkips } from '../../utils/course';
import type { PlacementAnswers } from '../../utils/course';
import styles from './Course.module.css';

interface PlacementDialogProps {
  onApply: (lessonIds: string[]) => void;
  onClose: () => void;
}

const QUESTIONS: { key: keyof PlacementAnswers; question: string; options: string[] }[] = [
  {
    key: 'playing',
    question: 'Have you played the piano before?',
    options: ['Never', 'Simple tunes with one hand', 'Pieces with both hands'],
  },
  {
    key: 'reading',
    question: 'Can you read sheet music?',
    options: ['Not yet', 'The treble staff', 'Both staves'],
  },
  {
    key: 'chords',
    question: 'Do you know any chords?',
    options: ['No', 'C, F and G'],
  },
];

/** A few questions that skip the lessons a learner doesn't need */
export function PlacementDialog({ onApply, onClose }: PlacementDialogProps) {
  const [answers, setAnswers] = useState<PlacementAnswers>({ playing: 0, reading: 0, chords: 0 });
  const skips = placementSkips(answers);

  return (
    <div className={styles.dialogBackdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Find your level">
        <h3>Find your level</h3>
        <p className={styles.intro}>Answer three questions and the course starts where you are.</p>
        {QUESTIONS.map((q) => (
          <fieldset key={q.key} className={styles.question}>
            <legend>{q.question}</legend>
            {q.options.map((label, value) => (
              <label key={label} className={answers[q.key] === value ? styles.optionOn : styles.option}>
                <input
                  type="radio"
                  name={q.key}
                  checked={answers[q.key] === value}
                  onChange={() => setAnswers((a) => ({ ...a, [q.key]: value }))}
                />
                {label}
              </label>
            ))}
          </fieldset>
        ))}
        <p className={styles.placementResult}>
          {skips.length === 0
            ? 'Start from the first lesson — it moves quickly if it feels easy.'
            : `${skips.length} lesson${skips.length > 1 ? 's' : ''} will be marked as done. You can still play them any time.`}
        </p>
        <div className={styles.dialogActions}>
          <button className={styles.btn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={`${styles.btn} ${styles.primary}`}
            onClick={() => {
              onApply(skips.map((l) => l.id));
              onClose();
            }}
          >
            {skips.length ? 'Skip ahead' : 'Start from the beginning'}
          </button>
        </div>
      </div>
    </div>
  );
}
