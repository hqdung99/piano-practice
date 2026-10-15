import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { CHORD_POOLS, DEFAULT_CUSTOM, EMPTY_MEMORY, PICKABLE_NOTES, emptyCustomStaves, generatePage, randomSeed } from '../utils/noteGame';
import type { CustomNotes, GameContent, GameLevel, GamePage, GameStaves, GameStep, HandsMemory } from '../utils/noteGame';
import { isChordId } from '../utils/chordGame';
import type { Staff } from '../utils/renderGrandStaff';
import { handKeys } from '../utils/fingering';
import { profileKey } from '../utils/profiles';

export type NoteResult = 'correct' | 'missed';
export type GameStatus = 'idle' | 'playing' | 'done';

// Wrong presses on one step before the answer is revealed
export const HINT_AFTER_MISTAKES = 2;
const WRONG_FLASH_MS = 600;

interface GameState {
  status: GameStatus;
  staves: GameStaves;
  level: GameLevel;
  /** Notes the learner picked for the custom level */
  custom: CustomNotes;
  /** Single notes or chords on the staff */
  content: GameContent;
  /** Chords picked for the custom level in chord mode, as chord ids */
  customChords: string[];
  /** Keep dealing new pages of notes until the player stops */
  endless: boolean;
  /** Endless, but the first wrong note ends the run */
  challenge: boolean;
  /** Streak the player is aiming for in a challenge */
  target: number;
  /** Longest challenge streak per staves and level, keyed by recordKey */
  records: Record<string, number>;
  /** The run just finished beat the saved record */
  newRecord: boolean;
  /** The challenge note that was missed, and what was played instead */
  failed: { wanted: string[]; played: string } | null;
  showFingering: boolean;
  steps: GameStep[];
  nextSeed: number;
  /** Where each hand is at the end of this page */
  memory: HandsMemory;
  index: number;
  /** Keys of the current step already pressed (hands together) */
  pressed: string[];
  /** Results for the steps on this page */
  results: NoteResult[];
  /** Wrong presses on the current step */
  attempts: number;
  /** Last wrong note pressed, shown briefly as feedback */
  wrongNote: string | null;
  startTime: number;
  endTime: number;
  streak: number;
  bestStreak: number;
  totalPlayed: number;
  totalCorrect: number;
}

type GameAction =
  | { type: 'start'; seed: number; time: number }
  | { type: 'press'; note: string; time: number; anyNote: boolean }
  | { type: 'clearWrong' }
  | { type: 'setStaves'; staves: GameStaves }
  | { type: 'setLevel'; level: GameLevel }
  | { type: 'setCustom'; staff: Staff; notes: string[] }
  | { type: 'toggleCustom'; staff: Staff; note: string }
  | { type: 'setContent'; content: GameContent }
  | { type: 'setCustomChords'; chords: string[] }
  | { type: 'setEndless'; endless: boolean }
  | { type: 'setChallenge' }
  | { type: 'setTarget'; target: number }
  | { type: 'toggleFingering' }
  | { type: 'configure'; staves: GameStaves; level: GameLevel }
  | { type: 'quit'; time: number };

const CUSTOM_KEY = 'piano.noteGameCustom';
const CHALLENGE_KEY = 'piano.noteGameChallenge';
const CHORDS_KEY = 'piano.noteGameChords';

export const TARGET_PRESETS = [10, 25, 50, 100];
const DEFAULT_TARGET = 25;
export const MAX_TARGET = 999;

/** Challenge records are kept per staves, level and content, since each is a different test */
export function recordKey(staves: GameStaves, level: GameLevel, content: GameContent): string {
  return content === 'notes' ? `${staves}:${level}` : `${staves}:${level}:${content}`;
}

interface ChordsData {
  content: GameContent;
  customChords: string[];
}

function loadChords(): ChordsData {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey(CHORDS_KEY)) ?? 'null') as Partial<ChordsData> | null;
    if (saved) {
      return {
        content: saved.content === 'chords' || saved.content === 'dyads' ? saved.content : 'notes',
        customChords: Array.isArray(saved.customChords) ? saved.customChords.filter(isChordId) : CHORD_POOLS.medium,
      };
    }
  } catch {
    // Storage can be blocked or hold old data
  }
  return { content: 'notes', customChords: CHORD_POOLS.medium };
}

/** A custom level needs something to deal on every staff in play */
function canStart(state: GameState): boolean {
  if (state.level !== 'custom') return true;
  if (state.content === 'chords') return state.customChords.length > 0;
  return emptyCustomStaves(state.staves, state.custom, state.content).length === 0;
}

interface ChallengeData {
  target: number;
  records: Record<string, number>;
}

function loadChallenge(): ChallengeData {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey(CHALLENGE_KEY)) ?? 'null') as Partial<ChallengeData> | null;
    if (saved) {
      const target = Number(saved.target);
      return {
        target: target >= 1 && target <= MAX_TARGET ? Math.round(target) : DEFAULT_TARGET,
        records: saved.records && typeof saved.records === 'object' ? saved.records : {},
      };
    }
  } catch {
    // Storage can be blocked or hold old data
  }
  return { target: DEFAULT_TARGET, records: {} };
}

/** The custom notes saved for this profile, keeping only notes that can still be picked */
function loadCustom(): CustomNotes {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey(CUSTOM_KEY)) ?? 'null') as Partial<CustomNotes> | null;
    if (saved) {
      const keep = (staff: Staff) =>
        Array.isArray(saved[staff]) ? saved[staff]!.filter((n) => PICKABLE_NOTES[staff].includes(n)) : DEFAULT_CUSTOM[staff];
      return { treble: keep('treble'), bass: keep('bass') };
    }
  } catch {
    // Storage can be blocked or hold old data
  }
  return DEFAULT_CUSTOM;
}

const initialState: GameState = {
  status: 'idle',
  staves: 'treble',
  level: 'easy',
  custom: DEFAULT_CUSTOM,
  content: 'notes',
  customChords: CHORD_POOLS.medium,
  challenge: false,
  target: DEFAULT_TARGET,
  records: {},
  newRecord: false,
  failed: null,
  endless: false,
  showFingering: true,
  steps: [],
  nextSeed: 0,
  memory: EMPTY_MEMORY,
  index: 0,
  pressed: [],
  results: [],
  attempts: 0,
  wrongNote: null,
  startTime: 0,
  endTime: 0,
  streak: 0,
  bestStreak: 0,
  totalPlayed: 0,
  totalCorrect: 0,
};

function withPage(state: GameState, page: GamePage): GameState {
  return {
    ...state,
    steps: page.steps,
    nextSeed: page.nextSeed,
    memory: page.memory,
    index: 0,
    pressed: [],
    results: [],
    attempts: 0,
    wrongNote: null,
  };
}

/** Ends the run; a challenge run also saves a new record */
function finish(state: GameState, time: number): GameState {
  const done: GameState = { ...state, status: 'done', endTime: time };
  if (!state.challenge) return done;
  const key = recordKey(state.staves, state.level, state.content);
  // Every note in a challenge run was right first time, so the run is the streak
  const run = state.totalCorrect;
  if (run <= (state.records[key] ?? 0)) return done;
  return { ...done, records: { ...state.records, [key]: run }, newRecord: true };
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      // Nothing to deal on a staff with no custom notes
      if (!canStart(state)) return state;
      return withPage(
        {
          ...state,
          status: 'playing',
          startTime: action.time,
          endTime: 0,
          streak: 0,
          bestStreak: 0,
          totalPlayed: 0,
          totalCorrect: 0,
          newRecord: false,
          failed: null,
        },
        generatePage(state.staves, state.level, action.seed, EMPTY_MEMORY, state.custom, state.content, state.customChords)
      );
    case 'press': {
      if (state.status !== 'playing') return state;
      const wanted = state.steps[state.index].notes.map((n) => n.note);
      if (!wanted.includes(action.note)) {
        const missed = { ...state, attempts: state.attempts + 1, wrongNote: action.note, streak: 0 };
        // One wrong note ends a challenge
        if (state.challenge) return finish({ ...missed, failed: { wanted, played: action.note } }, action.time);
        return missed;
      }
      const pressed = state.pressed.includes(action.note) ? state.pressed : [...state.pressed, action.note];
      // Hands together: wait for the other key too
      if (!action.anyNote && pressed.length < wanted.length) return { ...state, pressed };

      const firstTry = state.attempts === 0;
      const streak = firstTry ? state.streak + 1 : 0;
      const next: GameState = {
        ...state,
        index: state.index + 1,
        pressed: [],
        results: [...state.results, firstTry ? 'correct' : 'missed'],
        attempts: 0,
        wrongNote: null,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        totalPlayed: state.totalPlayed + 1,
        totalCorrect: state.totalCorrect + (firstTry ? 1 : 0),
      };
      if (next.index < state.steps.length) return next;
      if (!state.endless) return finish(next, action.time);
      // Deal the next page, carrying on from where the hands are now
      return withPage(next, generatePage(state.staves, state.level, state.nextSeed, state.memory, state.custom, state.content, state.customChords));
    }
    case 'clearWrong':
      return { ...state, wrongNote: null };
    case 'setStaves':
      return { ...state, staves: action.staves, status: 'idle' };
    case 'setLevel':
      return { ...state, level: action.level, status: 'idle' };
    case 'setCustom': {
      // Keep notes in keyboard order, so the picker and saved data stay tidy
      const notes = PICKABLE_NOTES[action.staff].filter((n) => action.notes.includes(n));
      return { ...state, custom: { ...state.custom, [action.staff]: notes }, status: 'idle' };
    }
    case 'toggleCustom': {
      const picked = state.custom[action.staff];
      const notes = picked.includes(action.note) ? picked.filter((n) => n !== action.note) : [...picked, action.note];
      return reducer(state, { type: 'setCustom', staff: action.staff, notes });
    }
    case 'setContent':
      return { ...state, content: action.content, status: 'idle' };
    case 'setCustomChords':
      return { ...state, customChords: [...new Set(action.chords)], status: 'idle' };
    case 'setEndless':
      return { ...state, endless: action.endless, challenge: false, status: 'idle' };
    case 'setChallenge':
      return { ...state, endless: true, challenge: true, status: 'idle' };
    case 'setTarget':
      return { ...state, target: Math.min(MAX_TARGET, Math.max(1, Math.round(action.target))) };
    case 'toggleFingering':
      return { ...state, showFingering: !state.showFingering };
    case 'configure':
      // A course lesson: one round of fixed settings
      return { ...state, staves: action.staves, level: action.level, content: 'notes', endless: false, challenge: false, status: 'idle' };
    case 'quit':
      // Stopping an endless run shows how it went; quitting a round just ends it
      if (state.endless && state.totalPlayed > 0) return finish(state, action.time);
      return { ...state, status: 'idle' };
  }
}

export function useNoteGame() {
  const [state, dispatch] = useReducer(reducer, initialState, (s) => ({ ...s, custom: loadCustom(), ...loadChallenge(), ...loadChords() }));

  useEffect(() => {
    try {
      const data: ChallengeData = { target: state.target, records: state.records };
      localStorage.setItem(profileKey(CHALLENGE_KEY), JSON.stringify(data));
    } catch {
      // Not remembering records is fine
    }
  }, [state.target, state.records]);

  useEffect(() => {
    try {
      localStorage.setItem(profileKey(CUSTOM_KEY), JSON.stringify(state.custom));
    } catch {
      // Not remembering the pick is fine
    }
  }, [state.custom]);

  useEffect(() => {
    try {
      const data: ChordsData = { content: state.content, customChords: state.customChords };
      localStorage.setItem(profileKey(CHORDS_KEY), JSON.stringify(data));
    } catch {
      // Not remembering the pick is fine
    }
  }, [state.content, state.customChords]);

  useEffect(() => {
    if (!state.wrongNote) return;
    const id = window.setTimeout(() => dispatch({ type: 'clearWrong' }), WRONG_FLASH_MS);
    return () => clearTimeout(id);
  }, [state.wrongNote, state.attempts]);

  const start = useCallback(() => {
    dispatch({ type: 'start', seed: randomSeed(), time: performance.now() });
  }, []);

  /**
   * `anyNote` completes a hands-together step with either of its keys, for
   * inputs like the microphone that only hear one note at a time
   */
  const press = useCallback((note: string, anyNote = false) => {
    dispatch({ type: 'press', note, time: performance.now(), anyNote });
  }, []);

  const setStaves = useCallback((staves: GameStaves) => dispatch({ type: 'setStaves', staves }), []);
  const setLevel = useCallback((level: GameLevel) => dispatch({ type: 'setLevel', level }), []);
  const setCustom = useCallback((staff: Staff, notes: string[]) => dispatch({ type: 'setCustom', staff, notes }), []);
  const toggleCustom = useCallback((staff: Staff, note: string) => dispatch({ type: 'toggleCustom', staff, note }), []);
  const setContent = useCallback((content: GameContent) => dispatch({ type: 'setContent', content }), []);
  const setCustomChords = useCallback((chords: string[]) => dispatch({ type: 'setCustomChords', chords }), []);
  const setEndless = useCallback((endless: boolean) => dispatch({ type: 'setEndless', endless }), []);
  const setChallenge = useCallback(() => dispatch({ type: 'setChallenge' }), []);
  const setTarget = useCallback((target: number) => dispatch({ type: 'setTarget', target }), []);
  const toggleFingering = useCallback(() => dispatch({ type: 'toggleFingering' }), []);
  const quit = useCallback(() => dispatch({ type: 'quit', time: performance.now() }), []);
  const configure = useCallback(
    (staves: GameStaves, level: GameLevel) => dispatch({ type: 'configure', staves, level }),
    []
  );

  const currentStep = state.status === 'playing' ? state.steps[state.index] : undefined;
  /** Best challenge streak for the current staves and level */
  const record = state.records[recordKey(state.staves, state.level, state.content)] ?? 0;
  const ready = canStart(state);

  const hintNotes = useMemo(() => {
    if (!currentStep || state.challenge || state.attempts < HINT_AFTER_MISTAKES) return [];
    return currentStep.notes.map((n) => n.note).filter((n) => !state.pressed.includes(n));
  }, [currentStep, state.challenge, state.attempts, state.pressed]);

  const hands = useMemo(
    () => (currentStep && state.showFingering ? currentStep.hands : []),
    [currentStep, state.showFingering]
  );

  // The keys under each hand, numbered by finger, without giving away which one to press
  const fingerMarks = useMemo(() => {
    if (hands.length === 0) return undefined;
    return new Map(hands.flatMap((h) => handKeys(h.hand, h.anchor).map((k) => [k.note, k.finger] as const)));
  }, [hands]);

  return {
    ...state,
    currentStep,
    record,
    ready,
    hintNotes,
    hands,
    fingerMarks,
    start,
    press,
    setStaves,
    setLevel,
    setCustom,
    toggleCustom,
    setContent,
    setCustomChords,
    setEndless,
    setChallenge,
    setTarget,
    toggleFingering,
    configure,
    quit,
  };
}

export type UseNoteGameReturn = ReturnType<typeof useNoteGame>;
