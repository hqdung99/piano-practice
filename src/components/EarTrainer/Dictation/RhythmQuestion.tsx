import { useEffect, useState } from 'react';
import {
  BAR_STEPS,
  formatBeats,
  piecesFor,
  remainingPieces,
  rhythmSound,
  rhythmStaffNotes,
} from '../../../utils/earTraining/dictation';
import type { RhythmQuestion as Question } from '../../../utils/earTraining/dictation';
import { SpeakerIcon } from '../Icons';
import { RhythmStaff } from './MiniStaff';
import { Card, ListenButton, QuestionFooter, Tool, Verdict } from './parts';
import { INK } from './shared';
import type { QuestionProps } from './shared';
import shell from '../EarTrainer.module.css';
import styles from './Dictation.module.css';

/** Where each note or rest starts, mapped to its signed length */
function byPosition(steps: number[]): Map<number, number> {
  const map = new Map<number, number>();
  let pos = 0;
  for (const s of steps) {
    map.set(pos, s);
    pos += Math.abs(s);
  }
  return map;
}

/** Hear a rhythm and rebuild it from note and rest values */
export function RhythmQuestion({ question, module, onChecked, onNext, isLast }: QuestionProps<Question>) {
  const { steps, bars, bpm, level } = question;
  const { play, isPlaying } = module.player;
  const [entered, setEntered] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const total = bars * BAR_STEPS;
  const used = entered.reduce((s, x) => s + Math.abs(x), 0);
  const left = total - used;
  const leftInBar = left === 0 ? 0 : BAR_STEPS - (used % BAR_STEPS);

  useEffect(() => {
    play(rhythmSound(question.steps, question.bpm));
  }, [play, question]);

  const answerAt = byPosition(steps);
  const yoursAt = [...byPosition(entered).entries()];
  const rightFlags = yoursAt.map(([pos, s]) => answerAt.get(pos) === s);
  const correct = entered.length === steps.length && entered.every((s, i) => s === steps[i]);

  const check = () => {
    setChecked(true);
    onChecked(correct);
  };

  const colors = checked ? rightFlags.map((ok) => (ok ? INK.good : INK.bad)) : undefined;
  const barWord = bars > 1 ? 'bars' : 'bar';

  return (
    <>
      <div className={`${shell.content} ${styles.questionContent}`}>
        <ListenButton playing={isPlaying} onClick={() => play(rhythmSound(steps, bpm))}>
          Replay rhythm
        </ListenButton>
        <p className={styles.instructions}>
          {checked ? 'Compare your rhythm with the answer.' : `Fill the ${barWord} with the rhythm you heard, in order.`}
        </p>

        <Card
          label={
            checked ? 'Yours' : left === 0 ? `${bars > 1 ? 'Both bars' : 'Bar'} full` : `${formatBeats(left / 4)} beats left`
          }
          tone={checked ? (correct ? 'good' : 'bad') : undefined}
        >
          <RhythmStaff
            notes={rhythmStaffNotes(entered, colors)}
            pad={rhythmStaffNotes(remainingPieces(used, total), undefined, used)}
            label="Your rhythm"
          />
        </Card>

        {checked && !correct && (
          <Card label="Answer">
            <RhythmStaff notes={rhythmStaffNotes(steps)} label="The rhythm that played" />
          </Card>
        )}

        {checked && <Verdict correct={correct}>{correct ? 'Spot on!' : 'Not quite — compare the two'}</Verdict>}

        {checked ? (
          <div className={styles.tools}>
            <Tool onClick={() => play(rhythmSound(entered, bpm))}>
              <SpeakerIcon size={16} /> Hear yours
            </Tool>
            <Tool onClick={() => play(rhythmSound(steps, bpm))}>
              <SpeakerIcon size={16} /> Hear answer
            </Tool>
          </div>
        ) : (
          <>
            <div className={styles.pieceGrid}>
              {piecesFor(level).map((p) => (
                <button
                  key={p.steps}
                  type="button"
                  className={`${styles.piece} ${p.steps < 0 ? styles.pieceRest : ''}`}
                  disabled={Math.abs(p.steps) > leftInBar}
                  onClick={() => setEntered((e) => [...e, p.steps])}
                >
                  <strong>{p.label}</strong>
                  <span>
                    {formatBeats(Math.abs(p.steps) / 4)} {Math.abs(p.steps) > 4 ? 'beats' : 'beat'}
                  </span>
                </button>
              ))}
            </div>
            <div className={styles.tools}>
              <Tool onClick={() => setEntered((e) => e.slice(0, -1))} disabled={entered.length === 0}>
                Undo
              </Tool>
              <Tool onClick={() => setEntered([])} disabled={entered.length === 0}>
                Clear
              </Tool>
              {bars > 1 && left > 0 && <span className={styles.toolNote}>{formatBeats(leftInBar / 4)} left in this bar</span>}
            </div>
          </>
        )}
      </div>
      <QuestionFooter checked={checked} canCheck={left === 0} onCheck={check} onNext={onNext} isLast={isLast} />
    </>
  );
}
