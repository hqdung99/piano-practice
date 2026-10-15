import { useCallback, useEffect, useReducer, useRef } from 'react';
import { MAX_STEP_MISTAKES, matchKey, stepTargets } from '../../../utils/earTraining/playback';
import type { EchoQuestion, PlayResult } from '../../../utils/earTraining/playback';
import type { PlayEvent } from '../../../utils/earTraining/skills';
import type { ModuleProps } from '../types';
import { rangeOf } from '../keyRange';
import { useGuardedAudio, usePianoInput } from './audio';

/** How a step ended: right first time, right after mistakes, or shown */
export type StepMark = 'clean' | 'missed' | 'revealed';

const ADVANCE_MS = 1000;
const CONTEXT_GAP_MS = 700;
const FLASH_MS = 450;
const REVEAL_FLASH_MS = 1500;

interface Flash {
  note: string;
  good: boolean;
  until: number;
}

interface RunState {
  index: number;
  question: EchoQuestion;
  step: number;
  /** Targets of the current step found so far, and the keys that found them */
  found: string[];
  pressed: string[];
  stepMistakes: number;
  mistakes: number;
  marks: StepMark[];
  /** 'solved' by the player, or finished with the answer 'shown' */
  status: 'asking' | 'solved' | 'shown';
  hinted: boolean;
  flashes: Flash[];
  /** Answer audio to play: one revealed step, or the whole question */
  reveal: { notes: string[] } | { whole: true } | null;
  /** Keys light up with the sound: only once an answer is out, so they never give it away */
  lightSound: boolean;
  results: PlayResult[];
}

type Action =
  | { type: 'note'; note: string; at: number }
  | { type: 'expire'; at: number }
  | { type: 'show' }
  | { type: 'hint' }
  | { type: 'replay' }
  | { type: 'next'; question: EchoQuestion };

function fresh(index: number, question: EchoQuestion, results: PlayResult[]): RunState {
  return {
    index,
    question,
    step: 0,
    found: [],
    pressed: [],
    stepMistakes: 0,
    mistakes: 0,
    marks: [],
    status: 'asking',
    hinted: false,
    flashes: [],
    reveal: null,
    lightSound: false,
    results,
  };
}

function finishQuestion(state: RunState, status: 'solved' | 'shown'): RunState {
  const { question, marks, mistakes } = state;
  const result: PlayResult = {
    correct: marks.every((m) => m === 'clean'),
    mistakes,
    shown: marks.includes('revealed'),
    label: question.label,
    sound: question.sound,
  };
  return { ...state, status, lightSound: true, results: [...state.results, result] };
}

/** Moves past the current step, finishing the question after the last one */
function completeStep(state: RunState, mark: StepMark): RunState {
  const marks = [...state.marks, mark];
  const next = { ...state, marks, step: state.step + 1, found: [], pressed: [], stepMistakes: 0 };
  if (next.step < state.question.steps.length) return next;
  return finishQuestion(next, mark === 'revealed' ? 'shown' : 'solved');
}

function judgeNote(state: RunState, note: string, at: number): RunState {
  const { question } = state;
  const step = question.steps[state.step];
  const key = matchKey(note, question.anyOctave);
  const targets = stepTargets(step, question.anyOctave);
  const flash = (notes: string[], good: boolean, ms = FLASH_MS) => [
    ...state.flashes.filter((f) => !notes.includes(f.note)),
    ...notes.map((n) => ({ note: n, good, until: at + ms })),
  ];

  if (targets.includes(key)) {
    if (state.found.includes(key)) return { ...state, flashes: flash([note], true) };
    const found = [...state.found, key];
    const pressed = [...state.pressed, note];
    if (found.length < targets.length) return { ...state, found, pressed, flashes: flash([note], true) };
    return completeStep({ ...state, flashes: flash(pressed, true) }, state.stepMistakes > 0 ? 'missed' : 'clean');
  }

  // Starting from the given note is natural, not a mistake
  const given = (question.given ?? []).map((n) => matchKey(n, question.anyOctave));
  if (state.step === 0 && state.found.length === 0 && given.includes(key)) return state;

  const stepMistakes = state.stepMistakes + 1;
  const missed = { ...state, stepMistakes, mistakes: state.mistakes + 1, flashes: flash([note], false) };
  if (stepMistakes < MAX_STEP_MISTAKES) return missed;
  return completeStep(
    { ...missed, flashes: flash(step.notes, true, REVEAL_FLASH_MS), reveal: { notes: step.notes }, lightSound: true },
    'revealed'
  );
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case 'note':
      return state.status === 'asking' ? judgeNote(state, action.note, action.at) : state;
    case 'expire':
      return { ...state, flashes: state.flashes.filter((f) => f.until > action.at) };
    case 'show': {
      if (state.status !== 'asking') return state;
      const left = state.question.steps.length - state.step;
      const shown = { ...state, marks: [...state.marks, ...Array<StepMark>(left).fill('revealed')], reveal: { whole: true as const } };
      return finishQuestion(shown, 'shown');
    }
    case 'hint':
      return { ...state, hinted: true };
    case 'replay':
      return state.status === 'asking' ? { ...state, lightSound: false } : state;
    case 'next':
      return fresh(state.index + 1, action.question, state.results);
  }
}

interface EchoRunOptions {
  total: number;
  /** Builds question `index`, knowing how the earlier ones went */
  makeQuestion: (index: number, results: PlayResult[]) => EchoQuestion;
  onFinish: (results: PlayResult[]) => void;
}

/** Runs a round of hear-it-then-play-it questions, judging piano input step by step */
export function useEchoRun(props: ModuleProps, { total, makeQuestion, onFinish }: EchoRunOptions) {
  const { player, playNote, releaseNote, lightKeys, onRecord } = props;
  const [state, dispatch] = useReducer(reducer, undefined, () => fresh(0, makeQuestion(0, []), []));
  const audio = useGuardedAudio(props);
  const { play } = audio;
  const { question, status, reveal } = state;

  const callbacks = useRef({ onRecord, onFinish, makeQuestion });
  useEffect(() => {
    callbacks.current = { onRecord, onFinish, makeQuestion };
  }, [onRecord, onFinish, makeQuestion]);

  // Each new question plays by itself, after the key when it sets one up
  useEffect(() => {
    const { sound, context, contextFirst } = question;
    if (contextFirst && context) {
      const lead = context.reduce((end, e) => Math.max(end, e.at + e.dur), 0) + CONTEXT_GAP_MS;
      play([...context, ...sound.map((e) => ({ ...e, at: e.at + lead }))]);
    } else {
      play(sound);
    }
  }, [question, play]);

  useEffect(() => {
    if (!reveal) return;
    play('whole' in reveal ? question.sound : [{ notes: reveal.notes, at: 0, dur: 1100 }]);
  }, [reveal, question, play]);

  const recorded = useRef(0);
  useEffect(() => {
    const { results } = state;
    if (results.length <= recorded.current) return;
    recorded.current = results.length;
    callbacks.current.onRecord('play', results[results.length - 1].correct);
  }, [state]);

  useEffect(() => {
    if (state.flashes.length === 0) return;
    const soonest = Math.min(...state.flashes.map((f) => f.until));
    const id = window.setTimeout(() => dispatch({ type: 'expire', at: performance.now() }), Math.max(0, soonest - performance.now()));
    return () => clearTimeout(id);
  }, [state.flashes]);

  const finish = useCallback(() => callbacks.current.onFinish(state.results), [state.results]);

  const next = useCallback(() => {
    if (state.index + 1 >= total) finish();
    else dispatch({ type: 'next', question: callbacks.current.makeQuestion(state.index + 1, state.results) });
  }, [state.index, state.results, total, finish]);

  // Solved questions move on by themselves; shown answers wait so they can be studied
  useEffect(() => {
    if (status !== 'solved') return;
    const id = window.setTimeout(next, ADVANCE_MS);
    return () => clearTimeout(id);
  }, [status, next]);

  useEffect(() => {
    if (status === 'asking') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, next]);

  usePianoInput(props.registerPianoInput, (note) => {
    if (audio.accept()) dispatch({ type: 'note', note, at: performance.now() });
  });

  const press = (note: string) => {
    playNote(note);
    audio.pressed();
    dispatch({ type: 'note', note, at: performance.now() });
  };

  const replay = () => {
    dispatch({ type: 'replay' });
    play(question.sound);
  };

  const hearKey = (events: PlayEvent[]) => play(events);

  const hint = () => {
    dispatch({ type: 'hint' });
    const first = question.steps[0].notes;
    play([{ notes: first, at: 0, dur: 1000 }]);
  };

  const given = [...(question.given ?? []), ...(state.hinted ? question.steps[0].notes : [])];
  const lit = new Set(given);
  if (lightKeys && state.lightSound) player.sounding.forEach((n) => lit.add(n));
  const good = new Set([...state.pressed, ...state.flashes.filter((f) => f.good).map((f) => f.note)]);
  // Once the whole answer is out, it stays on the keys to study
  if (status === 'shown' && !player.isPlaying) question.steps.slice(state.marks.indexOf('revealed')).forEach((s) => s.notes.forEach((n) => good.add(n)));
  const bad = new Set(state.flashes.filter((f) => !f.good).map((f) => f.note));
  const range = question.range ?? rangeOf([...question.steps.map((s) => s.notes), given]);

  return {
    ...state,
    total,
    given,
    lit,
    good,
    bad,
    range,
    isPlaying: player.isPlaying,
    press,
    release: releaseNote,
    replay,
    hearKey,
    hint,
    show: () => dispatch({ type: 'show' }),
    next,
    finish,
  };
}

export type EchoRunState = ReturnType<typeof useEchoRun>;
