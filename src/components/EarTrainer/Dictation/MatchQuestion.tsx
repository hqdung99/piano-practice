import { useEffect, useState } from 'react';
import { melodySound, staffNotes } from '../../../utils/earTraining/dictation';
import type { MatchQuestion as Question } from '../../../utils/earTraining/dictation';
import { SpeakerIcon } from '../Icons';
import { MiniStaff } from './MiniStaff';
import { ListenButton, QuestionFooter, Verdict } from './parts';
import type { QuestionProps } from './shared';
import shell from '../EarTrainer.module.css';
import styles from './Dictation.module.css';

const LETTERS = ['A', 'B', 'C', 'D'];

/** Three look-alike melodies on paper; pick the one that played */
export function MatchQuestion({ question, module, onChecked, onNext, isLast }: QuestionProps<Question>) {
  const { key, options, answer } = question;
  const { play, isPlaying } = module.player;
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  useEffect(() => {
    play(melodySound(question.options[question.answer]));
  }, [play, question]);

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    onChecked(i === answer);
  };

  const cardClass = (i: number) => {
    const classes = [styles.option];
    if (answered && i === answer) classes.push(styles.optionGood);
    else if (answered && i === picked) classes.push(styles.optionBad);
    else if (answered) classes.push(styles.optionDim);
    return classes.join(' ');
  };

  return (
    <>
      <div className={`${shell.content} ${styles.questionContent}`}>
        <ListenButton playing={isPlaying} onClick={() => play(melodySound(options[answer]))}>
          Replay melody
        </ListenButton>
        <p className={styles.instructions}>
          {answered ? 'Tap the speakers to hear each melody.' : 'Which of these melodies did you hear?'}
        </p>

        <div className={styles.optionList}>
          {options.map((midis, i) => (
            <div key={i} className={cardClass(i)}>
              <button
                type="button"
                className={styles.optionPick}
                onClick={() => choose(i)}
                disabled={answered}
                aria-label={`Melody ${LETTERS[i]}`}
              >
                <span className={styles.optionLetter}>{LETTERS[i]}</span>
                <MiniStaff notes={staffNotes(midis, key)} keySignature={key} label={`Melody ${LETTERS[i]}`} />
              </button>
              {answered && (
                <button
                  type="button"
                  className={styles.optionHear}
                  onClick={() => play(melodySound(midis))}
                  aria-label={`Hear melody ${LETTERS[i]}`}
                >
                  <SpeakerIcon size={18} />
                </button>
              )}
            </div>
          ))}
        </div>

        {answered && (
          <Verdict correct={picked === answer}>
            {picked === answer ? `Yes — it was ${LETTERS[answer]}` : `It was ${LETTERS[answer]}, not ${LETTERS[picked]}`}
          </Verdict>
        )}
      </div>
      {answered && <QuestionFooter checked canCheck={false} onCheck={() => {}} onNext={onNext} isLast={isLast} />}
    </>
  );
}
