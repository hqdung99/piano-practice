import { useEffect, useState } from 'react';
import { noteToMidi } from '../../../utils/earTraining/theory';
import { spell, twoVoiceSound, withCadence } from '../../../utils/earTraining/dictation';
import type { KeyId, StaffNote, TwoVoiceQuestion as Question } from '../../../utils/earTraining/dictation';
import { SpeakerIcon } from '../Icons';
import { MiniStaff } from './MiniStaff';
import { Card, ListenButton, PianoKeys, QuestionFooter, Tool, Verdict } from './parts';
import { INK, usePianoInput } from './shared';
import type { QuestionProps } from './shared';
import shell from '../EarTrainer.module.css';
import styles from './Dictation.module.css';

type Part = 'top' | 'bass';

/** Notes from middle C up go to the voice being written; anything lower is bass */
const MIDDLE_C = 60;
const SLOTS = 4;

/** Half notes, two to a bar */
function halfNotes(midis: number[], key: KeyId, color: (i: number) => string | undefined): StaffNote[] {
  return midis.map((m, i) => ({ keys: [spell(m, key)], duration: 'h', color: color(i), barAfter: i === 1 }));
}

function placeholders(from: number): StaffNote[] {
  return Array.from({ length: SLOTS - from }, (_, k) => ({ keys: ['B4'], duration: 'h', barAfter: from + k === 1 }));
}

/** Hear four chords and write both the top voice and the bass line */
export function TwoVoiceQuestion({ question, module, onChecked, onNext, isLast }: QuestionProps<Question>) {
  const { key, soprano, bass } = question;
  const { play, isPlaying } = module.player;
  const [top, setTop] = useState<number[]>([]);
  const [low, setLow] = useState<number[]>([]);
  const [part, setPart] = useState<Part>('top');
  const [checked, setChecked] = useState(false);
  const toWrite = SLOTS - 1;

  useEffect(() => {
    play(withCadence(question.key, twoVoiceSound(question.soprano, question.bass)));
  }, [play, question]);

  const add = (note: string) => {
    const midi = noteToMidi(note);
    if (midi === undefined || checked) return;
    const target: Part = midi < MIDDLE_C ? 'bass' : part;
    const append = (list: number[]) => (list.length >= toWrite ? list : [...list, midi]);
    if (target === 'bass') {
      setLow(append);
      setPart('bass');
    } else {
      setTop(append);
      // Move on to the bass once the top line is written
      if (top.length + 1 >= toWrite && low.length < toWrite) setPart('bass');
    }
  };
  usePianoInput(module, add);

  const yourTop = [soprano[0], ...top];
  const yourBass = [bass[0], ...low];
  const topRight = top.filter((m, i) => m === soprano[i + 1]).length;
  const bassRight = low.filter((m, i) => m === bass[i + 1]).length;
  const correct = topRight === toWrite && bassRight === toWrite;
  const done = top.length === toWrite && low.length === toWrite;

  const colorFor = (yours: number[], answer: number[]) => (i: number) =>
    i === 0 ? INK.given : checked ? (yours[i] === answer[i] ? INK.good : INK.bad) : INK.entered;

  const check = () => {
    setChecked(true);
    onChecked(correct);
  };

  const editing = part === 'top' ? top : low;
  const setEditing = part === 'top' ? setTop : setLow;

  return (
    <>
      <div className={`${shell.content} ${styles.questionContent}`}>
        <ListenButton playing={isPlaying} onClick={() => play(twoVoiceSound(soprano, bass))}>
          Replay both voices
        </ListenButton>
        <p className={styles.instructions}>
          {checked
            ? 'Compare both voices with the answer.'
            : `Four chords in ${key} major. Write the top voice, then the bass — the first note of each is given.`}
        </p>

        {!checked && (
          <div className={shell.segmented} role="tablist" aria-label="Voice to write">
            {(['top', 'bass'] as Part[]).map((p) => (
              <button key={p} type="button" className={part === p ? shell.segActive : ''} onClick={() => setPart(p)}>
                {p === 'top' ? 'Top voice' : 'Bass voice'} {(p === 'top' ? top : low).length}/{toWrite}
              </button>
            ))}
          </div>
        )}

        <Card label={checked ? 'Yours' : 'Writing'} tone={checked ? (correct ? 'good' : 'bad') : undefined}>
          <MiniStaff
            notes={halfNotes(yourTop, key, colorFor(yourTop, soprano))}
            bass={halfNotes(yourBass, key, colorFor(yourBass, bass))}
            pad={placeholders(yourTop.length)}
            bassPad={placeholders(yourBass.length)}
            keySignature={key}
            timeSignature="4/4"
            label="Your two voices"
          />
        </Card>

        {checked && !correct && (
          <Card label="Answer">
            <MiniStaff
              notes={halfNotes(soprano, key, () => undefined)}
              bass={halfNotes(bass, key, () => undefined)}
              keySignature={key}
              timeSignature="4/4"
              label="The answer"
            />
          </Card>
        )}

        {checked && (
          <Verdict correct={correct}>
            {correct ? 'Both voices right!' : `Top ${topRight}/${toWrite} · Bass ${bassRight}/${toWrite}`}
          </Verdict>
        )}

        <div className={styles.tools}>
          {checked ? (
            <>
              <Tool onClick={() => play(twoVoiceSound(yourTop, yourBass))}>
                <SpeakerIcon size={16} /> Hear yours
              </Tool>
              <Tool onClick={() => play(twoVoiceSound(soprano, bass))}>
                <SpeakerIcon size={16} /> Hear answer
              </Tool>
            </>
          ) : (
            <>
              <Tool onClick={() => setEditing(editing.slice(0, -1))} disabled={editing.length === 0}>
                Undo
              </Tool>
              <Tool onClick={() => setEditing([])} disabled={editing.length === 0}>
                Clear
              </Tool>
              <Tool onClick={() => play(twoVoiceSound(soprano, []))}>Top only</Tool>
              <Tool onClick={() => play(twoVoiceSound([], bass))}>Bass only</Tool>
            </>
          )}
        </div>

        {!checked && (
          <>
            <PianoKeys module={module} low={48} high={79} onNote={add} />
            <p className={styles.hint}>Notes below middle C go to the bass. The octave counts.</p>
          </>
        )}
      </div>
      <QuestionFooter checked={checked} canCheck={done} onCheck={check} onNext={onNext} isLast={isLast} />
    </>
  );
}
