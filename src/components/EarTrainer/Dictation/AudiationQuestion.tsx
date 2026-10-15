import { useState } from 'react';
import { cadenceSound } from '../../../utils/earTraining/skills';
import { displayName, keyTonic, melodySound, staffNotes } from '../../../utils/earTraining/dictation';
import type { AudiationQuestion as Question } from '../../../utils/earTraining/dictation';
import { SpeakerIcon } from '../Icons';
import { MiniStaff } from './MiniStaff';
import { Card, Tool } from './parts';
import type { QuestionProps } from './shared';
import shell from '../EarTrainer.module.css';
import styles from './Dictation.module.css';

/** Read a melody, imagine or sing it, then hear it and rate yourself */
export function AudiationQuestion({ question, module, onChecked, onNext, isLast }: QuestionProps<Question>) {
  const { key, notes } = question;
  const { play } = module.player;
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState<boolean | null>(null);
  const first = displayName(notes[0], key, module.labels);

  const reveal = () => {
    setRevealed(true);
    play(melodySound(notes));
  };

  const rate = (right: boolean) => {
    if (rating !== null) return;
    setRating(right);
    onChecked(right);
  };

  return (
    <>
      <div className={`${shell.content} ${styles.questionContent}`}>
        <p className={styles.instructions}>
          {revealed
            ? 'Was that the melody you heard in your head?'
            : `Read the melody and hear it in your head — or sing it. It starts on ${first}.`}
        </p>

        <Card label={`${key} major · starts on ${first}`}>
          <MiniStaff notes={staffNotes(notes, key)} keySignature={key} label={`Melody starting on ${first}`} />
        </Card>

        <div className={styles.tools}>
          <Tool onClick={() => play(melodySound(notes.slice(0, 1), 1200))}>
            <SpeakerIcon size={16} /> First note
          </Tool>
          <Tool onClick={() => play(cadenceSound(keyTonic(key)))}>
            <SpeakerIcon size={16} /> Key
          </Tool>
          {revealed && (
            <Tool onClick={() => play(melodySound(notes))}>
              <SpeakerIcon size={16} /> Play again
            </Tool>
          )}
        </div>

        {revealed && rating === null && (
          <div className={styles.rateRow}>
            <button type="button" className={styles.rateGood} onClick={() => rate(true)}>
              I heard it right
            </button>
            <button type="button" className={styles.rateBad} onClick={() => rate(false)}>
              Not quite
            </button>
          </div>
        )}
        {rating !== null && (
          <p className={rating ? styles.rateNoteGood : styles.rateNoteBad}>
            {rating ? 'Great — your inner ear is getting sharper.' : 'No problem. Try singing it again along with the replay.'}
          </p>
        )}
      </div>
      <div className={shell.stickyFooter}>
        {!revealed ? (
          <button className={shell.primaryBtn} onClick={reveal}>
            Play it
          </button>
        ) : (
          <button className={shell.primaryBtn} onClick={onNext} disabled={rating === null}>
            {rating === null ? 'Rate yourself first' : isLast ? 'See results' : 'Next'}
          </button>
        )}
      </div>
    </>
  );
}
