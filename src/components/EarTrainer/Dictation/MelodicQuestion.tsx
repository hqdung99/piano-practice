import { useEffect, useState } from 'react';
import { noteToMidi } from '../../../utils/earTraining/theory';
import { cadenceSound } from '../../../utils/earTraining/skills';
import { keyTonic, melodySound, spell, withCadence } from '../../../utils/earTraining/dictation';
import type { MelodicQuestion as Question, StaffNote } from '../../../utils/earTraining/dictation';
import { SpeakerIcon } from '../Icons';
import { MiniStaff } from './MiniStaff';
import { Card, ListenButton, PianoKeys, QuestionFooter, Tool, Verdict } from './parts';
import { INK, usePianoInput } from './shared';
import type { QuestionProps } from './shared';
import shell from '../EarTrainer.module.css';
import styles from './Dictation.module.css';

const PLACEHOLDER: StaffNote = { keys: ['B4'], duration: 'q' };

/** Hear a melody after the key's cadence and write it from the given first note */
export function MelodicQuestion({ question, module, onChecked, onNext, isLast }: QuestionProps<Question>) {
  const { key, notes } = question;
  const { play, isPlaying } = module.player;
  const [entered, setEntered] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const toWrite = notes.length - 1;

  useEffect(() => {
    play(withCadence(question.key, melodySound(question.notes)));
  }, [play, question]);

  const add = (note: string) => {
    const midi = noteToMidi(note);
    if (midi === undefined || checked) return;
    setEntered((e) => (e.length >= toWrite ? e : [...e, midi]));
  };
  usePianoInput(module, add);

  const yours = [notes[0], ...entered];
  const isRight = (i: number) => yours[i] === notes[i];
  const rightCount = entered.filter((m, i) => m === notes[i + 1]).length;
  const correct = rightCount === toWrite;

  const yourStaff: StaffNote[] = yours.map((m, i) => ({
    keys: [spell(m, key)],
    duration: 'q',
    color: i === 0 ? INK.given : checked ? (isRight(i) ? INK.good : INK.bad) : INK.entered,
  }));
  const answerStaff: StaffNote[] = notes.map((m) => ({ keys: [spell(m, key)], duration: 'q' }));

  const check = () => {
    setChecked(true);
    onChecked(correct);
  };

  return (
    <>
      <div className={`${shell.content} ${styles.questionContent}`}>
        <ListenButton playing={isPlaying} onClick={() => play(melodySound(notes))}>
          Replay melody
        </ListenButton>
        <p className={styles.instructions}>
          {checked
            ? 'Compare your melody with the answer.'
            : `Write the ${notes.length}-note melody in ${key} major. The first note is given.`}
        </p>

        <Card
          label={checked ? 'Yours' : `${entered.length} of ${toWrite} notes written`}
          tone={checked ? (correct ? 'good' : 'bad') : undefined}
        >
          <MiniStaff
            notes={yourStaff}
            pad={Array(notes.length - yours.length).fill(PLACEHOLDER)}
            keySignature={key}
            label={`Your melody: ${yours.map((m) => spell(m, key)).join(' ')}`}
          />
        </Card>

        {checked && !correct && (
          <Card label="Answer">
            <MiniStaff notes={answerStaff} keySignature={key} label={`Answer: ${answerStaff.map((n) => n.keys[0]).join(' ')}`} />
          </Card>
        )}

        {checked && (
          <Verdict correct={correct}>{correct ? 'Every note right!' : `${rightCount} of ${toWrite} notes right`}</Verdict>
        )}

        <div className={styles.tools}>
          {checked ? (
            <>
              <Tool onClick={() => play(melodySound(yours))}>
                <SpeakerIcon size={16} /> Hear yours
              </Tool>
              <Tool onClick={() => play(melodySound(notes))}>
                <SpeakerIcon size={16} /> Hear answer
              </Tool>
            </>
          ) : (
            <>
              <Tool onClick={() => setEntered((e) => e.slice(0, -1))} disabled={entered.length === 0}>
                Undo
              </Tool>
              <Tool onClick={() => setEntered([])} disabled={entered.length === 0}>
                Clear
              </Tool>
              <Tool onClick={() => play(melodySound(notes.slice(0, 1)))}>First note</Tool>
              <Tool onClick={() => play(cadenceSound(keyTonic(key)))}>Key</Tool>
            </>
          )}
        </div>

        {!checked && (
          <>
            <PianoKeys module={module} low={60} high={83} onNote={add} disabled={entered.length >= toWrite} />
            <p className={styles.hint}>Play the notes on your piano or tap the keys — the octave counts.</p>
          </>
        )}
      </div>
      <QuestionFooter
        checked={checked}
        canCheck={entered.length === toWrite}
        onCheck={check}
        onNext={onNext}
        isLast={isLast}
      />
    </>
  );
}
