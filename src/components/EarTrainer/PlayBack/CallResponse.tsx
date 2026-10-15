import { useEffect, useReducer, useRef, useState } from 'react';
import {
  RESPONSE_MAX_NOTES,
  RESPONSE_MIN_NOTES,
  RESPONSE_ROUND,
  RESPONSE_SILENCE_MS,
  callPhrase,
  exerciseDef,
  gradeResponse,
  noteName,
} from '../../../utils/earTraining/playback';
import type { CallPhrase, PlayResult, ResponseGrade } from '../../../utils/earTraining/playback';
import type { PlayEvent } from '../../../utils/earTraining/skills';
import { noteToMidi, pitchClassName } from '../../../utils/earTraining/theory';
import type { Notation } from '../../../utils/earTraining/theory';
import type { ModuleProps } from '../types';
import { TopBar } from '../TopBar';
import { KeyStrip } from '../KeyStrip';
import { CheckIcon, SpeakerIcon } from '../Icons';
import { INPUT_NAMES, useGuardedAudio, usePianoInput } from './audio';
import { RunResults } from './RunResults';
import { SetupScreen } from './SetupScreen';
import { Pill, Stage } from './shared';
import styles from '../EarTrainer.module.css';
import css from './PlayBack.module.css';

const ANSWER_GAP_MS = 900;

interface Played {
  note: string;
  midi: number;
  at: number;
}

interface State {
  index: number;
  call: CallPhrase;
  notes: Played[];
  grade: ResponseGrade | null;
  results: PlayResult[];
}

type Action =
  | { type: 'note'; note: string; at: number }
  | { type: 'grade' }
  | { type: 'clear' }
  | { type: 'next'; call: CallPhrase };

function graded(state: State): State {
  const grade = gradeResponse(state.call.keyPc, state.notes.map((n) => n.midi));
  const result: PlayResult = {
    correct: grade.pass,
    mistakes: grade.outOfKey.filter(Boolean).length,
    shown: false,
    label: `Call in ${state.call.keyName}`,
    sound: state.call.sound,
  };
  return { ...state, grade, results: [...state.results, result] };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'note': {
      const midi = noteToMidi(action.note);
      if (state.grade || midi === undefined) return state;
      const next = { ...state, notes: [...state.notes, { note: action.note, midi, at: action.at }] };
      return next.notes.length >= RESPONSE_MAX_NOTES ? graded(next) : next;
    }
    case 'grade':
      return state.grade || state.notes.length < RESPONSE_MIN_NOTES ? state : graded(state);
    case 'clear':
      return state.grade ? state : { ...state, notes: [] };
    case 'next':
      return { ...state, index: state.index + 1, call: action.call, notes: [], grade: null };
  }
}

/** The answer as it was played, timing and all */
function answerSound(notes: Played[]): PlayEvent[] {
  const start = notes[0]?.at ?? 0;
  return notes.map((n) => ({ notes: [n.note], at: n.at - start, dur: 450 }));
}

function verdict(grade: ResponseGrade, keyPc: number, notation: Notation): string {
  const home = [0, 4, 7].map((s) => pitchClassName(keyPc + s, notation)).join(', ');
  if (grade.pass) return 'That answers it — in the key, and it comes to rest.';
  if (grade.inKeyPercent < 80) return `Only ${grade.inKeyPercent}% of your notes were in the key. Stay on the scale's notes.`;
  return `Nearly — end on a note of the home chord (${home}) so it sounds finished.`;
}

function ResponseRun({ module, onFinish }: { module: ModuleProps; onFinish: (r: PlayResult[]) => void }) {
  const { player, labels, lightKeys, playNote, releaseNote, onRecord } = module;
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    index: 0,
    call: callPhrase(labels.notation),
    notes: [],
    grade: null,
    results: [],
  }));
  const audio = useGuardedAudio(module);
  const { play } = audio;
  const { call, notes, grade, index, results } = state;

  useEffect(() => {
    play(call.sound);
  }, [call, play]);

  // A pause after enough notes means the answer is finished
  useEffect(() => {
    if (grade || notes.length < RESPONSE_MIN_NOTES) return;
    const id = window.setTimeout(() => dispatch({ type: 'grade' }), RESPONSE_SILENCE_MS);
    return () => clearTimeout(id);
  }, [notes.length, grade]);

  const recordRef = useRef(onRecord);
  const recorded = useRef(0);
  useEffect(() => {
    recordRef.current = onRecord;
  }, [onRecord]);
  useEffect(() => {
    if (results.length <= recorded.current) return;
    recorded.current = results.length;
    recordRef.current('play', results[results.length - 1].correct);
  }, [results]);

  usePianoInput(module.registerPianoInput, (note) => {
    if (audio.accept()) dispatch({ type: 'note', note, at: performance.now() });
  });

  const press = (note: string) => {
    playNote(note);
    audio.pressed();
    dispatch({ type: 'note', note, at: performance.now() });
  };

  const next = () => {
    if (index + 1 >= RESPONSE_ROUND) onFinish(results);
    else dispatch({ type: 'next', call: callPhrase(labels.notation) });
  };

  const hearBoth = () => {
    const callLength = call.sound.reduce((end, e) => Math.max(end, e.at + e.dur), 0);
    play([...call.sound, ...answerSound(notes).map((e) => ({ ...e, at: e.at + callLength + ANSWER_GAP_MS }))]);
  };

  const good = new Set<string>();
  const bad = new Set<string>();
  if (grade) notes.forEach((n, i) => (grade.outOfKey[i] ? bad : good).add(n.note));
  const lit = new Set<string>(lightKeys ? player.sounding : []);

  return (
    <div className={styles.screen}>
      <TopBar title={exerciseDef('response').title} onBack={() => onFinish(results)} progress={{ done: index + 1, total: RESPONSE_ROUND }} />
      <div className={`${styles.content} ${styles.quizContent}`}>
        <Stage playing={player.isPlaying} label="Hear the call" onClick={() => play(call.sound)} />
        <p className={css.instruction}>
          Answer in {call.keyName} with {RESPONSE_MIN_NOTES}–{RESPONSE_MAX_NOTES} notes
        </p>

        <div className={css.played}>
          {notes.length === 0 && <span className={css.playedEmpty}>Your answer appears here</span>}
          {notes.map((n, i) => (
            <span key={i} className={grade?.outOfKey[i] ? css.playedBad : grade ? css.playedGood : css.playedNote}>
              {noteName(n.midi, labels.notation)}
            </span>
          ))}
        </div>

        <div className={css.pills}>
          {!grade && (
            <>
              <Pill onClick={() => dispatch({ type: 'clear' })} disabled={notes.length === 0}>
                Start over
              </Pill>
              <Pill onClick={() => dispatch({ type: 'grade' })} disabled={notes.length < RESPONSE_MIN_NOTES}>
                Done
              </Pill>
            </>
          )}
          {grade && (
            <>
              <Pill onClick={() => play(answerSound(notes))}>
                <SpeakerIcon size={16} /> Your answer
              </Pill>
              <Pill onClick={hearBoth}>
                <SpeakerIcon size={16} /> Call + answer
              </Pill>
            </>
          )}
        </div>

        <div className={styles.feedback}>
          {grade && (
            <div className={grade.pass ? undefined : styles.feedbackWrong}>
              <p className={grade.pass ? styles.feedbackCorrect : undefined}>
                {grade.pass && <CheckIcon size={20} />}
                {verdict(grade, call.keyPc, labels.notation)}
              </p>
              <button className={styles.continueBtn} onClick={next}>
                {index + 1 >= RESPONSE_ROUND ? 'See results' : 'Next call'}
              </button>
            </div>
          )}
        </div>

        <div className={css.keys}>
          <KeyStrip lit={lit} good={good} bad={bad} low={48} high={83} onPress={press} onRelease={releaseNote} />
        </div>
        <p className={styles.inputHint}>
          Play on your {INPUT_NAMES[module.inputSource]}, or tap the keys. A short pause ends your answer.
        </p>
      </div>
    </div>
  );
}

export function CallResponse({ module, onBack }: { module: ModuleProps; onBack: () => void }) {
  const [phase, setPhase] = useState<'setup' | 'run' | 'results'>('setup');
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<PlayResult[]>([]);
  const start = () => {
    setRound((r) => r + 1);
    setPhase('run');
  };

  if (phase === 'run') {
    return (
      <ResponseRun
        key={round}
        module={module}
        onFinish={(r) => {
          module.player.stop();
          setResults(r);
          setPhase(r.length ? 'results' : 'setup');
        }}
      />
    );
  }
  if (phase === 'results') {
    return (
      <RunResults
        title={exerciseDef('response').title}
        results={results}
        player={module.player}
        unit="answers"
        mistakesLabel="Out-of-key notes"
        onRetry={start}
        onDone={() => setPhase('setup')}
      />
    );
  }
  return (
    <SetupScreen
      exercise="response"
      intro={`The piano plays a short question phrase. Answer it with ${RESPONSE_MIN_NOTES}–${RESPONSE_MAX_NOTES} notes of your own: stay in the key and land on a note of the home chord. There's no single right answer.`}
      onStart={start}
      onBack={onBack}
    />
  );
}
