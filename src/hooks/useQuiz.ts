import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Question } from '../utils/earTraining/skills';

export type QuizPhase = 'asking' | 'feedback' | 'done';

/** A fixed round, questions until you stop, or as many as you can in a minute */
export type QuizMode = 'round' | 'endless' | 'speed';

export const SPEED_SECONDS = 60;

export interface QuizResult {
  question: Question;
  /** null when time ran out */
  picked: string | null;
  correct: boolean;
  ms: number;
}

interface QuizState {
  mode: QuizMode;
  questions: Question[];
  index: number;
  phase: QuizPhase;
  picked: string | null;
  results: QuizResult[];
  /** When the question started playing; answer times count from here */
  shownAt: number;
  /** When the question finished playing; the countdown starts then */
  startedAt: number;
  limitMs: number;
  remainingMs: number;
  /** Speed mode: when the whole run ends, set when the first question is asked */
  deadline: number;
  /** Speed mode: time left in the run */
  runRemainingMs: number;
  /** Replays used on the current question */
  replays: number;
}

type QuizAction =
  | { type: 'asked'; shownAt: number; startedAt: number }
  | { type: 'tick'; time: number }
  | { type: 'answer'; id: string; time: number }
  | { type: 'replayed' }
  | { type: 'next'; extra?: Question }
  | { type: 'end' };

function finish(state: QuizState, picked: string | null, time: number): QuizState {
  const question = state.questions[state.index];
  const result: QuizResult = {
    question,
    picked,
    correct: picked === question.answer,
    ms: Math.max(0, time - state.shownAt),
  };
  return { ...state, phase: 'feedback', picked, results: [...state.results, result] };
}

function reducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'asked': {
      if (state.phase !== 'asking') return state;
      const deadline =
        state.mode === 'speed' && state.deadline === 0 ? action.shownAt + SPEED_SECONDS * 1000 : state.deadline;
      return { ...state, shownAt: action.shownAt, startedAt: action.startedAt, remainingMs: state.limitMs, deadline };
    }
    case 'tick': {
      if (state.mode === 'speed') {
        if (state.deadline === 0 || state.phase === 'done') return state;
        const runRemainingMs = state.deadline - action.time;
        return runRemainingMs <= 0 ? { ...state, phase: 'done', runRemainingMs: 0 } : { ...state, runRemainingMs };
      }
      if (state.phase !== 'asking' || state.limitMs === 0) return state;
      // The clock waits while the question is still playing
      const remainingMs = Math.min(state.limitMs, state.startedAt + state.limitMs - action.time);
      return remainingMs <= 0 ? finish(state, null, action.time) : { ...state, remainingMs };
    }
    case 'answer':
      return state.phase === 'asking' ? finish(state, action.id, action.time) : state;
    case 'replayed':
      return { ...state, replays: state.replays + 1 };
    case 'next': {
      if (state.phase !== 'feedback') return state;
      const questions = action.extra ? [...state.questions, action.extra] : state.questions;
      const index = state.index + 1;
      if (index >= questions.length) return { ...state, phase: 'done' };
      return { ...state, questions, index, phase: 'asking', picked: null, remainingMs: state.limitMs, replays: 0 };
    }
    case 'end':
      return { ...state, phase: 'done' };
  }
}

interface UseQuizOptions {
  mode?: QuizMode;
  /** Seconds per question; 0 means no limit (ignored in speed mode) */
  timeLimitSec: number;
  /** Makes the next question in endless and speed modes */
  generate?: (previous: Question) => Question;
}

export function useQuiz(questions: Question[], { mode = 'round', timeLimitSec, generate }: UseQuizOptions) {
  const limitMs = mode === 'speed' ? 0 : timeLimitSec * 1000;
  const [state, dispatch] = useReducer(reducer, null, () => ({
    mode,
    questions,
    index: 0,
    phase: 'asking' as QuizPhase,
    picked: null,
    results: [],
    shownAt: 0,
    startedAt: 0,
    limitMs,
    remainingMs: limitMs,
    deadline: 0,
    runRemainingMs: SPEED_SECONDS * 1000,
    replays: 0,
  }));
  const generateRef = useRef(generate);
  const stateRef = useRef(state);
  useEffect(() => {
    generateRef.current = generate;
    stateRef.current = state;
  });

  /** The question started playing and lasts `soundMs` */
  const asked = useCallback((soundMs: number) => {
    const now = performance.now();
    dispatch({ type: 'asked', shownAt: now, startedAt: now + soundMs });
  }, []);
  const tick = useCallback(() => dispatch({ type: 'tick', time: performance.now() }), []);
  const answer = useCallback((id: string) => dispatch({ type: 'answer', id, time: performance.now() }), []);
  const replayed = useCallback(() => dispatch({ type: 'replayed' }), []);
  const end = useCallback(() => dispatch({ type: 'end' }), []);
  const next = useCallback(() => {
    const s = stateRef.current;
    const atEnd = s.index + 1 >= s.questions.length;
    // Endless and speed runs deal one more question whenever they reach the end
    const extra =
      atEnd && s.mode !== 'round' && generateRef.current ? generateRef.current(s.questions[s.index]) : undefined;
    dispatch({ type: 'next', extra });
  }, []);

  const question = state.questions[state.index];
  const lastResult = state.phase === 'feedback' ? state.results[state.results.length - 1] : null;

  let streak = 0;
  for (let i = state.results.length - 1; i >= 0 && state.results[i].correct; i--) streak++;

  return { ...state, question, lastResult, streak, asked, tick, answer, replayed, next, end };
}

/** Longest run of right answers in a row */
export function longestStreak(results: QuizResult[]): number {
  let best = 0;
  let run = 0;
  for (const r of results) {
    run = r.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
