import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import * as Tone from 'tone';
import { SONGS } from '../utils/songs';
import { useSongLibrary } from '../utils/songLibrary';
import { buildSteps, fingerSong, isPracticed, parseSong } from '../utils/songPractice';
import type { FingeredEvent, Hands, PracticeStep } from '../utils/songPractice';
import type { Staff } from '../utils/renderGrandStaff';
import { handKeys, handOfStaff, isStretch, whiteSlot } from '../utils/fingering';
import type { HandFingering } from '../utils/fingering';

export type StepResult = 'correct' | 'missed';
export type PracticeStatus = 'idle' | 'playing' | 'done';
/** Wait for each step, or keep time with a metronome */
export type Pace = 'wait' | 'tempo';
/** One hand setting, or right hand, then left, then both */
export type HandsChoice = Hands | 'learn';

export const LEARN_PASSES: Hands[] = ['treble', 'bass', 'both'];
export const PASS_LABELS: Record<Hands, string> = { treble: 'Right hand', bass: 'Left hand', both: 'Both hands' };
export const TEMPOS = [50, 75, 100];

// Wrong presses on one step before its keys are lit up
const HINT_AFTER_MISTAKES = 2;
const WRONG_FLASH_MS = 600;
// In tempo mode, how far before / after its beat a step can be played and still count
const EARLY_MS = 200;
const LATE_MS = 300;
const TICK_MS = 30;
// Misses in a row before tempo mode stops and slows down
const STALL_AFTER_MISSES = 3;
const LOOP_PAUSE_MS = 1200;
const LISTEN_LEAD_MS = 300;

export interface PassResult {
  hands: Hands;
  accuracy: number;
  mistakes: number;
  ms: number;
}

/** Bars to practise, 0-based and inclusive */
export interface BarRange {
  from: number;
  to: number;
}

/** Where song time 0 falls, and how long a 16th note lasts */
export interface SongClock {
  beatZero: number;
  stepMs: number;
}

interface PracticeState {
  songId: string;
  choice: HandsChoice;
  /** Hands being practiced now; in the learn flow, the current pass */
  hands: Hands;
  pace: Pace;
  /** Percent of the song's tempo */
  tempo: number;
  metronome: boolean;
  autoSlow: boolean;
  showKeys: boolean;
  showFingering: boolean;
  playOtherHand: boolean;
  range: BarRange | null;
  loop: boolean;
  /** Rounds played in a row with Loop on */
  loopCount: number;
  status: PracticeStatus;
  steps: PracticeStep[];
  stepIndex: number;
  /** Keys of the current step already pressed */
  pressed: string[];
  results: StepResult[];
  /** Wrong presses on the current step */
  attempts: number;
  mistakes: number;
  wrongNote: string | null;
  startTime: number;
  endTime: number;
  /** Song time (16ths) where this round starts and ends */
  fromTime: number;
  toTime: number;
  /** Tempo mode timing */
  clock: SongClock;
  /** Tempo mode: still in the count-in */
  counting: boolean;
  /** Tempo mode: when the count-in ends */
  countUntil: number;
  /** Tempo mode: steps missed in a row */
  missRun: number;
  /** Tempo mode stopped after too many misses: waiting for the current step */
  stalled: boolean;
  /** Tempo mode picks up again from this step, after the stalled one was played */
  resumeFrom: number | null;
  /** The tempo was lowered during this round */
  slowed: boolean;
  /** Playing the passage back for the learner to hear */
  listening: SongClock | null;
  /** Finished passes of the learn flow */
  passes: PassResult[];
}

/** Fixed settings for a course lesson */
export interface PracticePreset {
  songId: string;
  choice: HandsChoice;
  pace: Pace;
  tempo: number;
  showKeys: boolean;
}

type PracticeAction =
  | {
      type: 'start';
      steps: PracticeStep[];
      hands: Hands;
      time: number;
      clock: SongClock;
      fromTime: number;
      toTime: number;
      newFlow: boolean;
      looped: boolean;
    }
  | { type: 'press'; note: string; time: number; anyChordNote: boolean }
  | { type: 'tick'; time: number }
  | { type: 'resumed'; clock: SongClock }
  | { type: 'listen'; clock: SongClock }
  | { type: 'listenEnd' }
  | { type: 'clearWrong' }
  | { type: 'setSong'; songId: string }
  | { type: 'setChoice'; choice: HandsChoice }
  | { type: 'setPace'; pace: Pace }
  | { type: 'setTempo'; tempo: number }
  | { type: 'setRange'; range: BarRange | null }
  | { type: 'toggleLoop' }
  | { type: 'toggleMetronome' }
  | { type: 'toggleAutoSlow' }
  | { type: 'toggleShowKeys' }
  | { type: 'toggleFingering' }
  | { type: 'togglePlayOtherHand' }
  | { type: 'configure'; preset: PracticePreset }
  | { type: 'stop' };

const initialState: PracticeState = {
  songId: SONGS[0].id,
  choice: 'treble',
  hands: 'treble',
  pace: 'wait',
  tempo: 75,
  metronome: true,
  autoSlow: true,
  showKeys: true,
  showFingering: true,
  playOtherHand: true,
  range: null,
  loop: false,
  loopCount: 0,
  status: 'idle',
  steps: [],
  stepIndex: 0,
  pressed: [],
  results: [],
  attempts: 0,
  mistakes: 0,
  wrongNote: null,
  startTime: 0,
  endTime: 0,
  fromTime: 0,
  toTime: 0,
  clock: { beatZero: 0, stepMs: 0 },
  counting: false,
  countUntil: 0,
  missRun: 0,
  stalled: false,
  resumeFrom: null,
  slowed: false,
  listening: null,
  passes: [],
};

function accuracyOf(results: StepResult[]): number {
  return results.length ? Math.round((results.filter((r) => r === 'correct').length / results.length) * 100) : 0;
}

function slowerTempo(tempo: number): number {
  return [...TEMPOS].reverse().find((t) => t < tempo) ?? TEMPOS[0];
}

/** Records the step as done and finishes the round after the last one */
function completeStep(state: PracticeState, result: StepResult, time: number): PracticeState {
  const stepIndex = state.stepIndex + 1;
  const results = [...state.results, result];
  const missRun = result === 'missed' ? state.missRun + 1 : 0;
  let next: PracticeState = { ...state, stepIndex, pressed: [], results, attempts: 0, wrongNote: null, missRun };
  if (stepIndex === state.steps.length) {
    const passes =
      state.choice === 'learn'
        ? [...state.passes, { hands: state.hands, accuracy: accuracyOf(results), mistakes: state.mistakes, ms: time - state.startTime }]
        : state.passes;
    return { ...next, status: 'done', endTime: time, passes, stalled: false, resumeFrom: null };
  }
  if (state.stalled) {
    // The stalled step is played: carry on in time from the next one
    next = { ...next, stalled: false, resumeFrom: stepIndex, missRun: 0 };
  } else if (state.pace === 'tempo' && state.autoSlow && missRun >= STALL_AFTER_MISSES) {
    next = { ...next, stalled: true, tempo: slowerTempo(state.tempo), slowed: true, missRun: 0, counting: false };
  }
  return next;
}

function targetTime(state: PracticeState, index: number): number {
  return state.clock.beatZero + state.steps[index].time * state.clock.stepMs;
}

/** Tempo mode is keeping time right now (not stalled or about to resume) */
function isTimed(state: PracticeState): boolean {
  return state.pace === 'tempo' && !state.stalled && state.resumeFrom === null;
}

/** Tempo mode: steps whose window has closed count as missed */
function skipLate(state: PracticeState, time: number): PracticeState {
  let s = state;
  while (s.status === 'playing' && isTimed(s) && time > targetTime(s, s.stepIndex) + LATE_MS) {
    s = completeStep(s, 'missed', time);
  }
  return s;
}

function reducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'start':
      return {
        ...state,
        status: 'playing',
        hands: action.hands,
        steps: action.steps,
        stepIndex: 0,
        pressed: [],
        results: [],
        attempts: 0,
        mistakes: 0,
        wrongNote: null,
        startTime: action.time,
        endTime: 0,
        fromTime: action.fromTime,
        toTime: action.toTime,
        clock: action.clock,
        counting: state.pace === 'tempo',
        countUntil: action.clock.beatZero + action.fromTime * action.clock.stepMs,
        missRun: 0,
        stalled: false,
        resumeFrom: null,
        slowed: false,
        listening: null,
        loopCount: action.looped ? state.loopCount + 1 : 1,
        passes: action.newFlow ? [] : state.passes,
      };
    case 'tick': {
      if (state.status !== 'playing' || !isTimed(state)) return state;
      const s = skipLate(state, action.time);
      const counting = isTimed(s) && action.time < s.countUntil;
      return counting === s.counting ? s : { ...s, counting };
    }
    case 'resumed':
      if (state.resumeFrom === null) return state;
      return {
        ...state,
        clock: action.clock,
        resumeFrom: null,
        counting: true,
        countUntil: action.clock.beatZero + state.steps[state.resumeFrom].time * action.clock.stepMs,
      };
    case 'press': {
      if (state.status !== 'playing' || state.resumeFrom !== null) return state;
      let s = state;
      if (isTimed(s)) {
        s = skipLate(s, action.time);
        if (s.status !== 'playing') return s;
        // Too early for this beat: the next step's note was played before its time
        if (isTimed(s) && action.time < targetTime(s, s.stepIndex) - EARLY_MS) {
          return { ...s, attempts: s.attempts + 1, mistakes: s.mistakes + 1, wrongNote: action.note };
        }
      }
      const step = s.steps[s.stepIndex];
      if (!step.notes.includes(action.note)) {
        return { ...s, attempts: s.attempts + 1, mistakes: s.mistakes + 1, wrongNote: action.note };
      }
      const pressed = s.pressed.includes(action.note) ? s.pressed : [...s.pressed, action.note];
      if (!action.anyChordNote && pressed.length < step.notes.length) return { ...s, pressed };
      return completeStep(s, s.attempts === 0 && !s.stalled ? 'correct' : 'missed', action.time);
    }
    case 'listen':
      return { ...state, status: 'idle', steps: [], listening: action.clock };
    case 'listenEnd':
      return { ...state, listening: null };
    case 'clearWrong':
      return { ...state, wrongNote: null };
    case 'setSong':
      return { ...state, songId: action.songId, status: 'idle', steps: [], passes: [], range: null, listening: null };
    case 'setChoice':
      return {
        ...state,
        choice: action.choice,
        hands: action.choice === 'learn' ? LEARN_PASSES[0] : action.choice,
        status: 'idle',
        steps: [],
        passes: [],
      };
    case 'setPace':
      return { ...state, pace: action.pace, status: 'idle', steps: [] };
    case 'setTempo':
      return { ...state, tempo: action.tempo };
    case 'setRange':
      return { ...state, range: action.range, status: 'idle', steps: [], passes: [] };
    case 'toggleLoop':
      return { ...state, loop: !state.loop };
    case 'toggleMetronome':
      return { ...state, metronome: !state.metronome };
    case 'toggleAutoSlow':
      return { ...state, autoSlow: !state.autoSlow };
    case 'toggleShowKeys':
      return { ...state, showKeys: !state.showKeys };
    case 'toggleFingering':
      return { ...state, showFingering: !state.showFingering };
    case 'togglePlayOtherHand':
      return { ...state, playOtherHand: !state.playOtherHand };
    case 'configure': {
      const { songId, choice, pace, tempo, showKeys } = action.preset;
      return {
        ...state,
        songId,
        choice,
        hands: choice === 'learn' ? LEARN_PASSES[0] : choice,
        pace,
        tempo,
        showKeys,
        range: null,
        loop: false,
        status: 'idle',
        steps: [],
        passes: [],
        listening: null,
      };
    }
    case 'stop':
      return { ...state, status: 'idle', steps: [], listening: null, stalled: false, resumeFrom: null };
  }
}

/** What one hand does at a moment: play the event starting now, or rest in its last position */
function handAt(timeline: FingeredEvent[], staff: Staff, time: number): HandFingering | null {
  if (timeline.length === 0) return null;
  let i = timeline.findIndex((e) => e.time > time) - 1;
  if (i === -2) i = timeline.length - 1;
  const hand = handOfStaff(staff);
  // Before the hand's first note it waits in that note's position
  if (i < 0) return { hand, fingers: [], anchor: timeline[0].anchor, moved: false, stretch: false };
  const event = timeline[i];
  if (event.time !== time) return { hand, fingers: [], anchor: event.anchor, moved: false, stretch: false };
  return {
    hand,
    fingers: event.fingers,
    anchor: event.anchor,
    moved: i > 0 && timeline[i - 1].anchor !== event.anchor,
    stretch: event.notes.some((n) => isStretch(event.anchor, whiteSlot(n))),
  };
}

/** A short click; the first beat of each bar is higher */
function useMetronomeClick() {
  const synthRef = useRef<Tone.Synth | null>(null);
  useEffect(
    () => () => {
      synthRef.current?.dispose();
    },
    []
  );
  return useCallback((accent: boolean) => {
    if (!synthRef.current) {
      synthRef.current = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
        volume: -14,
      }).toDestination();
    }
    synthRef.current.triggerAttackRelease(accent ? 'C6' : 'G5', 0.03);
  }, []);
}

interface UseSongPracticeOptions {
  /** Plays a note of the accompanying hand; it isn't counted as a press */
  playNote: (note: string) => void;
  releaseNote: (note: string) => void;
}

export function useSongPractice({ playNote, releaseNote }: UseSongPracticeOptions) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const library = useSongLibrary();
  const source = library.find((s) => s.id === state.songId) ?? SONGS[0];
  const song = useMemo(() => parseSong(source), [source]);
  const click = useMetronomeClick();

  const barSteps = song.source.beats * 4;
  const songEnd = song.measures.length * barSteps;
  const rangeFrom = state.range ? state.range.from * barSteps : 0;
  const rangeTo = state.range ? (state.range.to + 1) * barSteps : songEnd;

  const timersRef = useRef<number[]>([]);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const playOnsetAt = useCallback(
    (notes: string[], delay: number, length: number) => {
      timersRef.current.push(
        // Wrapped so forEach's index isn't passed on as an extra argument
        window.setTimeout(() => notes.forEach((n) => playNote(n)), delay),
        window.setTimeout(() => notes.forEach((n) => releaseNote(n)), delay + length)
      );
    },
    [playNote, releaseNote]
  );

  const stepMsAt = useCallback((tempo: number) => 60000 / (song.source.bpm * (tempo / 100)) / 4, [song]);

  /**
   * Plays song time [from, to) in time: metronome clicks (with a count-in that
   * fills `lead`) and the notes of the staves `plays` picks. Returns the clock.
   */
  const scheduleRun = useCallback(
    (opts: { from: number; to: number; stepMs: number; lead: number; metronome: boolean; plays: (staff: Staff) => boolean }) => {
      const { from, to, stepMs, lead, metronome, plays } = opts;
      const now = performance.now();
      const beatZero = now + lead - from * stepMs;
      const beatMs = stepMs * 4;
      const beats = song.source.beats;
      if (metronome) {
        for (let b = Math.ceil((from - lead / stepMs) / 4); b < Math.ceil(to / 4); b++) {
          const delay = beatZero + b * beatMs - now;
          if (delay < 0) continue;
          timersRef.current.push(window.setTimeout(() => click(((b % beats) + beats) % beats === 0), delay));
        }
      }
      for (const onset of song.onsets) {
        if (onset.time < from || onset.time >= to || !plays(onset.staff)) continue;
        playOnsetAt(onset.notes, beatZero + onset.time * stepMs - now, onset.steps * stepMs);
      }
      return { beatZero, stepMs };
    },
    [song, click, playOnsetAt]
  );

  useEffect(() => {
    if (!state.wrongNote) return;
    const id = window.setTimeout(() => dispatch({ type: 'clearWrong' }), WRONG_FLASH_MS);
    return () => clearTimeout(id);
  }, [state.wrongNote, state.attempts]);

  // Waiting mode: after each finished step, play the other hand up to the next step
  const { status, stepIndex, steps, hands, playOtherHand, pace, fromTime, toTime } = state;
  useEffect(() => {
    if (pace !== 'wait' || status === 'idle' || !playOtherHand || hands === 'both') return;
    if (status === 'done' && stepIndex === 0) return;
    const from = stepIndex === 0 ? fromTime : steps[stepIndex - 1].time;
    const to = status === 'done' ? toTime : steps[stepIndex].time;
    if (from >= to) return;
    const stepMs = 60000 / song.source.bpm / 4;
    for (const onset of song.onsets) {
      if (isPracticed(onset.staff, hands) || onset.time < from || onset.time >= to) continue;
      playOnsetAt(onset.notes, (onset.time - from) * stepMs, onset.steps * stepMs);
    }
  }, [pace, status, stepIndex, steps, hands, playOtherHand, song, playOnsetAt, fromTime, toTime]);

  // Tempo mode: move the beat along even when nothing is pressed
  useEffect(() => {
    if (pace !== 'tempo' || status !== 'playing') return;
    const id = window.setInterval(() => dispatch({ type: 'tick', time: performance.now() }), TICK_MS);
    return () => clearInterval(id);
  }, [pace, status]);

  // Too many misses: silence the beat and wait for the current step
  const { stalled, resumeFrom } = state;
  useEffect(() => {
    if (stalled) clearTimers();
  }, [stalled, clearTimers]);

  // The stalled step was played: count in again at the slower tempo and carry on
  const { tempo, metronome } = state;
  useEffect(() => {
    if (resumeFrom === null) return;
    clearTimers();
    const stepMs = stepMsAt(tempo);
    const clock = scheduleRun({
      from: steps[resumeFrom].time,
      to: toTime,
      stepMs,
      lead: song.source.beats * stepMs * 4,
      metronome,
      plays: (staff) => playOtherHand && hands !== 'both' && !isPracticed(staff, hands),
    });
    dispatch({ type: 'resumed', clock });
  }, [resumeFrom, steps, toTime, tempo, metronome, playOtherHand, hands, song, scheduleRun, stepMsAt, clearTimers]);

  const startPass = useCallback(
    (passHands: Hands, newFlow: boolean, looped = false) => {
      clearTimers();
      const now = performance.now();
      const stepMs = stepMsAt(state.tempo);
      const passSteps = buildSteps(song, passHands).filter((s) => s.time >= rangeFrom && s.time < rangeTo);
      if (passSteps.length === 0) return;
      const clock =
        state.pace === 'tempo'
          ? scheduleRun({
              from: rangeFrom,
              to: rangeTo,
              stepMs,
              // One bar of clicks to count in
              lead: song.source.beats * stepMs * 4,
              metronome: state.metronome,
              plays: (staff) => state.playOtherHand && passHands !== 'both' && !isPracticed(staff, passHands),
            })
          : { beatZero: now, stepMs };
      dispatch({
        type: 'start',
        steps: passSteps,
        hands: passHands,
        time: now,
        clock,
        fromTime: rangeFrom,
        toTime: rangeTo,
        newFlow,
        looped,
      });
    },
    [clearTimers, stepMsAt, song, rangeFrom, rangeTo, state.tempo, state.pace, state.metronome, state.playOtherHand, scheduleRun]
  );

  const start = useCallback(() => {
    startPass(state.choice === 'learn' ? LEARN_PASSES[0] : state.choice, true);
  }, [startPass, state.choice]);

  // Loop: go again from the top of the section after a short breather
  const { loop } = state;
  useEffect(() => {
    if (status !== 'done' || !loop) return;
    const id = window.setTimeout(() => startPass(hands, false, true), LOOP_PAUSE_MS);
    return () => clearTimeout(id);
  }, [status, loop, hands, startPass]);

  /** Learn flow: on to the next hand */
  const nextPass = useCallback(() => {
    const next = LEARN_PASSES[state.passes.length];
    if (next) startPass(next, false);
  }, [startPass, state.passes.length]);

  /** Plays the passage (both hands) so the learner can hear how it goes */
  const listen = useCallback(() => {
    clearTimers();
    const stepMs = stepMsAt(state.pace === 'tempo' ? state.tempo : 100);
    const clock = scheduleRun({
      from: rangeFrom,
      to: rangeTo,
      stepMs,
      lead: LISTEN_LEAD_MS,
      metronome: false,
      plays: () => true,
    });
    timersRef.current.push(
      window.setTimeout(() => dispatch({ type: 'listenEnd' }), LISTEN_LEAD_MS + (rangeTo - rangeFrom) * stepMs + 400)
    );
    dispatch({ type: 'listen', clock });
  }, [clearTimers, stepMsAt, state.pace, state.tempo, scheduleRun, rangeFrom, rangeTo]);

  const stop = useCallback(() => {
    clearTimers();
    dispatch({ type: 'stop' });
  }, [clearTimers]);

  /**
   * `anyChordNote` completes a chord step with any one of its notes, for inputs
   * like the microphone that only hear one note at a time
   */
  const press = useCallback((note: string, anyChordNote = false) => {
    dispatch({ type: 'press', note, time: performance.now(), anyChordNote });
  }, []);

  const withTimersCleared = useCallback(
    (action: PracticeAction) => {
      clearTimers();
      dispatch(action);
    },
    [clearTimers]
  );
  const setSong = useCallback((songId: string) => withTimersCleared({ type: 'setSong', songId }), [withTimersCleared]);
  const setChoice = useCallback(
    (choice: HandsChoice) => withTimersCleared({ type: 'setChoice', choice }),
    [withTimersCleared]
  );
  const setPace = useCallback((p: Pace) => withTimersCleared({ type: 'setPace', pace: p }), [withTimersCleared]);
  const setRange = useCallback(
    (range: BarRange | null) => withTimersCleared({ type: 'setRange', range }),
    [withTimersCleared]
  );
  const configure = useCallback(
    (preset: PracticePreset) => withTimersCleared({ type: 'configure', preset }),
    [withTimersCleared]
  );
  const setTempo = useCallback((t: number) => dispatch({ type: 'setTempo', tempo: t }), []);
  const toggleLoop = useCallback(() => dispatch({ type: 'toggleLoop' }), []);
  const toggleMetronome = useCallback(() => dispatch({ type: 'toggleMetronome' }), []);
  const toggleAutoSlow = useCallback(() => dispatch({ type: 'toggleAutoSlow' }), []);
  const toggleShowKeys = useCallback(() => dispatch({ type: 'toggleShowKeys' }), []);
  const toggleFingering = useCallback(() => dispatch({ type: 'toggleFingering' }), []);
  const togglePlayOtherHand = useCallback(() => dispatch({ type: 'togglePlayOtherHand' }), []);

  const currentStep = state.status === 'playing' ? state.steps[state.stepIndex] : undefined;
  const hintNotes = useMemo(() => {
    // A stalled round always lights the way
    if (!currentStep || (!state.showKeys && !state.stalled && state.attempts < HINT_AFTER_MISTAKES)) {
      return new Set<string>();
    }
    return new Set(currentStep.notes.filter((n) => !state.pressed.includes(n)));
  }, [currentStep, state.showKeys, state.stalled, state.attempts, state.pressed]);

  const fingering = useMemo(() => fingerSong(song), [song]);

  // Each practiced hand's finger(s) right now, right hand first
  const handFingering = useMemo(() => {
    if (!currentStep || !state.showFingering) return [];
    return (['treble', 'bass'] as const)
      .filter((staff) => isPracticed(staff, state.hands))
      .map((staff) => handAt(fingering.timeline[staff], staff, currentStep.time))
      .filter((h): h is HandFingering => h !== null);
  }, [currentStep, state.showFingering, state.hands, fingering]);

  const fingerMarks = useMemo(() => {
    if (handFingering.length === 0) return undefined;
    return new Map(handFingering.flatMap((h) => handKeys(h.hand, h.anchor).map((k) => [k.note, k.finger] as const)));
  }, [handFingering]);

  // The moving playhead follows the clock while playing in time or listening
  const playClock: SongClock | null =
    state.listening ?? (state.status === 'playing' && isTimed(state) ? state.clock : null);

  const accuracy = accuracyOf(state.results);
  const nextPassHands = state.choice === 'learn' ? LEARN_PASSES[state.passes.length] : undefined;

  return {
    ...state,
    song,
    fingering,
    handFingering,
    fingerMarks,
    currentStep,
    hintNotes,
    accuracy,
    nextPassHands,
    playClock,
    barCount: song.measures.length,
    start,
    nextPass,
    listen,
    stop,
    press,
    setSong,
    setChoice,
    setPace,
    setTempo,
    setRange,
    toggleLoop,
    toggleMetronome,
    toggleAutoSlow,
    toggleShowKeys,
    toggleFingering,
    togglePlayOtherHand,
    configure,
  };
}

export type UseSongPracticeReturn = ReturnType<typeof useSongPractice>;
