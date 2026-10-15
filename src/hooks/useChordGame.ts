import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { CHORDS_PER_ROUND, DEFAULT_CUSTOM_CHORDS, dealChords, isChordId } from '../utils/chordGame';
import type { ChordCard, ChordLevel, ChordSource, Voicing } from '../utils/chordGame';
import { noteToMidi } from '../utils/earTraining/theory';
import { profileKey } from '../utils/profiles';

export type ChordResult = 'correct' | 'missed';
export type ChordGameStatus = 'idle' | 'playing' | 'done';
/** A round of 8, chords until you stop, or until the first mistake */
export type ChordLength = 'round' | 'endless' | 'challenge';

const HINT_AFTER_MISTAKES = 2;
const WRONG_FLASH_MS = 600;
/** Cards dealt ahead in endless runs, so the strip can show what's coming */
const DEAL_AHEAD = 8;

export const TARGET_PRESETS = [10, 25, 50, 100];
export const MAX_TARGET = 999;
const DEFAULT_TARGET = 25;

/** Why the last attempt failed: a note not in the chord, or the wrong note at the bottom */
export interface ChordMistake {
  kind: 'note' | 'bass';
  note: string;
}

interface ChordGameState extends ChordSource {
  status: ChordGameStatus;
  length: ChordLength;
  showNotes: boolean;
  cards: ChordCard[];
  index: number;
  /** Notes of the current chord already played */
  pressed: string[];
  results: ChordResult[];
  attempts: number;
  mistake: ChordMistake | null;
  /** Shown briefly after a mistake */
  wrongNote: string | null;
  startTime: number;
  endTime: number;
  totalPlayed: number;
  totalCorrect: number;
  streak: number;
  bestStreak: number;
  target: number;
  /** Longest challenge run per chord set and voicing, keyed by recordKey */
  records: Record<string, number>;
  newRecord: boolean;
  /** The chord a challenge ended on */
  failedCard: ChordCard | null;
}

type ChordGameAction =
  | { type: 'start'; time: number }
  | { type: 'press'; note: string; time: number; anyNote: boolean }
  | { type: 'clearWrong' }
  | { type: 'set'; patch: Partial<Pick<ChordGameState, 'level' | 'custom' | 'progression' | 'key' | 'voicing' | 'length'>> }
  | { type: 'setTarget'; target: number }
  | { type: 'configure'; level: ChordLevel }
  | { type: 'toggleNotes' }
  | { type: 'quit'; time: number };

const STORAGE_KEY = 'piano.chordPractice';

/** Challenge records are kept per chord set and voicing rule */
export function recordKey(source: ChordSource): string {
  const set = source.level === 'progression' ? `progression:${source.progression}` : source.level;
  return `${set}:${source.voicing}`;
}

const initialState: ChordGameState = {
  status: 'idle',
  level: 'easy',
  custom: DEFAULT_CUSTOM_CHORDS,
  progression: 'pop',
  key: 0,
  voicing: 'any',
  length: 'round',
  showNotes: false,
  cards: [],
  index: 0,
  pressed: [],
  results: [],
  attempts: 0,
  mistake: null,
  wrongNote: null,
  startTime: 0,
  endTime: 0,
  totalPlayed: 0,
  totalCorrect: 0,
  streak: 0,
  bestStreak: 0,
  target: DEFAULT_TARGET,
  records: {},
  newRecord: false,
  failedCard: null,
};

type Saved = Pick<ChordGameState, 'level' | 'custom' | 'progression' | 'key' | 'voicing' | 'length' | 'target' | 'records'>;

/** Practice settings and records saved for this profile */
function load(state: ChordGameState): ChordGameState {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey(STORAGE_KEY)) ?? 'null') as Partial<Saved> | null;
    if (saved) {
      return {
        ...state,
        ...saved,
        custom: Array.isArray(saved.custom) ? saved.custom.filter(isChordId) : state.custom,
        records: saved.records && typeof saved.records === 'object' ? saved.records : {},
      };
    }
  } catch {
    // Storage can be blocked or hold old data
  }
  return state;
}

function canStart(state: ChordGameState): boolean {
  return state.level !== 'custom' || state.custom.length > 0;
}

/** Ends the run; a challenge run also saves a new record */
function finish(state: ChordGameState, time: number): ChordGameState {
  const done: ChordGameState = { ...state, status: 'done', endTime: time };
  if (state.length !== 'challenge') return done;
  const key = recordKey(state);
  // Every chord in a challenge run was right first time, so the run is the streak
  if (state.totalCorrect <= (state.records[key] ?? 0)) return done;
  return { ...done, records: { ...state.records, [key]: state.totalCorrect }, newRecord: true };
}

function reducer(state: ChordGameState, action: ChordGameAction): ChordGameState {
  switch (action.type) {
    case 'start': {
      if (!canStart(state)) return state;
      const count = state.length === 'round' ? CHORDS_PER_ROUND : DEAL_AHEAD;
      return {
        ...state,
        status: 'playing',
        cards: dealChords(state, count),
        index: 0,
        pressed: [],
        results: [],
        attempts: 0,
        mistake: null,
        wrongNote: null,
        startTime: action.time,
        endTime: 0,
        totalPlayed: 0,
        totalCorrect: 0,
        streak: 0,
        bestStreak: 0,
        newRecord: false,
        failedCard: null,
      };
    }
    case 'press': {
      if (state.status !== 'playing') return state;
      const midi = noteToMidi(action.note);
      if (midi === undefined) return state;
      const card = state.cards[state.index];
      const miss = (mistake: ChordMistake): ChordGameState => {
        const missed = { ...state, attempts: state.attempts + 1, mistake, wrongNote: action.note, pressed: [], streak: 0 };
        return state.length === 'challenge' ? finish({ ...missed, failedCard: card }, action.time) : missed;
      };
      if (!card.pcs.includes(midi % 12)) return miss({ kind: 'note', note: action.note });

      const pressed = state.pressed.includes(action.note) ? state.pressed : [...state.pressed, action.note];
      const pcs = new Set(pressed.map((n) => noteToMidi(n)! % 12));
      // Any octave counts: every letter of the chord is the chord
      if (!action.anyNote && pcs.size < card.pcs.length) return { ...state, pressed };
      // The voicing rule: the lowest note held must be the right chord tone.
      // A one-note input (the microphone) can't tell inversions apart, so it isn't checked.
      if (!action.anyNote && card.bass !== null) {
        const lowest = pressed.reduce((lo, n) => (noteToMidi(n)! < noteToMidi(lo)! ? n : lo));
        if (noteToMidi(lowest)! % 12 !== card.bass) return miss({ kind: 'bass', note: lowest });
      }

      const correct = state.attempts === 0;
      const streak = correct ? state.streak + 1 : 0;
      const next: ChordGameState = {
        ...state,
        index: state.index + 1,
        pressed: [],
        attempts: 0,
        mistake: null,
        wrongNote: null,
        results: [...state.results, correct ? 'correct' : 'missed'],
        totalPlayed: state.totalPlayed + 1,
        totalCorrect: state.totalCorrect + (correct ? 1 : 0),
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
      };
      if (state.length === 'round') return next.index === state.cards.length ? finish(next, action.time) : next;
      // Endless runs keep a page of chords dealt ahead
      if (next.index + DEAL_AHEAD / 2 < next.cards.length) return next;
      const more = dealChords(state, DEAL_AHEAD, next.cards.length, next.cards[next.cards.length - 1]?.id);
      return { ...next, cards: [...next.cards, ...more] };
    }
    case 'clearWrong':
      return { ...state, wrongNote: null };
    case 'set': {
      const next = { ...state, ...action.patch, status: 'idle' as const };
      if (action.patch.custom) next.custom = [...new Set(action.patch.custom)];
      return next;
    }
    case 'setTarget':
      return { ...state, target: Math.min(MAX_TARGET, Math.max(1, Math.round(action.target))) };
    case 'configure':
      // A course lesson: one round of a preset level, any voicing
      return { ...state, level: action.level, voicing: 'any', length: 'round', status: 'idle' };
    case 'toggleNotes':
      return { ...state, showNotes: !state.showNotes };
    case 'quit':
      // Stopping an endless run shows how it went; quitting a round just ends it
      if (state.length !== 'round' && state.totalPlayed > 0) return finish(state, action.time);
      return { ...state, status: 'idle' };
  }
}

/**
 * Read a chord symbol, play the chord: the chord-symbol counterpart of the Note Game.
 * With `persist` off (course lessons), settings and records aren't loaded or saved.
 */
export function useChordGame({ persist = true }: { persist?: boolean } = {}) {
  const [state, dispatch] = useReducer(reducer, initialState, (s) => (persist ? load(s) : s));

  useEffect(() => {
    if (!persist) return;
    const { level, custom, progression, key, voicing, length, target, records } = state;
    const saved: Saved = { level, custom, progression, key, voicing, length, target, records };
    try {
      localStorage.setItem(profileKey(STORAGE_KEY), JSON.stringify(saved));
    } catch {
      // Not remembering settings is fine
    }
  }, [persist, state]);

  useEffect(() => {
    if (!state.wrongNote) return;
    const id = window.setTimeout(() => dispatch({ type: 'clearWrong' }), WRONG_FLASH_MS);
    return () => clearTimeout(id);
  }, [state.wrongNote, state.attempts]);

  const start = useCallback(() => dispatch({ type: 'start', time: performance.now() }), []);
  /**
   * `anyNote` completes a chord with any one of its notes, for inputs like the
   * microphone that only hear one note at a time
   */
  const press = useCallback((note: string, anyNote = false) => {
    dispatch({ type: 'press', note, time: performance.now(), anyNote });
  }, []);
  const setLevel = useCallback((level: ChordLevel) => dispatch({ type: 'set', patch: { level } }), []);
  const setCustom = useCallback((custom: string[]) => dispatch({ type: 'set', patch: { custom } }), []);
  const setProgression = useCallback((progression: string) => dispatch({ type: 'set', patch: { progression } }), []);
  const setKey = useCallback((key: number) => dispatch({ type: 'set', patch: { key } }), []);
  const setVoicing = useCallback((voicing: Voicing) => dispatch({ type: 'set', patch: { voicing } }), []);
  const setLength = useCallback((length: ChordLength) => dispatch({ type: 'set', patch: { length } }), []);
  const setTarget = useCallback((target: number) => dispatch({ type: 'setTarget', target }), []);
  const configure = useCallback((level: ChordLevel) => dispatch({ type: 'configure', level }), []);
  const toggleNotes = useCallback(() => dispatch({ type: 'toggleNotes' }), []);
  const quit = useCallback(() => dispatch({ type: 'quit', time: performance.now() }), []);

  const card = state.status === 'playing' ? state.cards[state.index] : undefined;
  const challenge = state.length === 'challenge';
  const showHint = !!card && (state.showNotes || (!challenge && state.attempts >= HINT_AFTER_MISTAKES));
  const hintNotes = useMemo(
    () => (card && !challenge && state.attempts >= HINT_AFTER_MISTAKES ? card.notes : []),
    [card, challenge, state.attempts]
  );
  const record = state.records[recordKey(state)] ?? 0;
  const ready = canStart(state);

  return {
    ...state,
    card,
    record,
    ready,
    showHint,
    hintNotes,
    start,
    press,
    setLevel,
    setCustom,
    setProgression,
    setKey,
    setVoicing,
    setLength,
    setTarget,
    configure,
    toggleNotes,
    quit,
  };
}

export type UseChordGameReturn = ReturnType<typeof useChordGame>;
