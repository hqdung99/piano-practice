import { INTERVALS, MAJOR_STEPS, NUMERALS, chordDef, midiToNote, nearestVoicing, noteToMidi, pitchClassName, progressionDef } from './theory';
import type { Notation } from './theory';
import { cadenceSound } from './skills';
import type { PlayEvent } from './skills';
import type { ParsedSong, SegmentRef } from '../songPractice';

/**
 * "Play by ear": hear something, then play it back on the piano. Generators
 * and grading for every exercise; the screens live in components/EarTrainer/PlayBack.
 */

// ---------- Exercises ----------

export type ExerciseId = 'note' | 'interval' | 'chord' | 'melody' | 'bass' | 'progression' | 'sing' | 'response' | 'song';

export interface ExerciseDef {
  id: ExerciseId;
  title: string;
  blurb: string;
}

export const EXERCISE_GROUPS: { title: string; exercises: ExerciseDef[] }[] = [
  {
    title: 'Echo',
    exercises: [
      { id: 'note', title: 'Echo a note', blurb: 'Hear one note, find it on the piano' },
      { id: 'interval', title: 'Echo an interval', blurb: 'Hear two notes, play the second' },
      { id: 'chord', title: 'Play the chord', blurb: 'Find every note of a chord' },
      { id: 'melody', title: 'Melody echo', blurb: 'Play back a tune that grows as you improve' },
    ],
  },
  {
    title: 'Harmony',
    exercises: [
      { id: 'bass', title: 'Bass line', blurb: 'Play the roots under a progression' },
      { id: 'progression', title: 'Play the progression', blurb: 'Hear the chords, then play each one' },
    ],
  },
  {
    title: 'Voice & ideas',
    exercises: [
      { id: 'sing', title: 'Sing it back', blurb: 'Match a note with your voice' },
      { id: 'response', title: 'Call & response', blurb: 'Answer a phrase with one of your own' },
    ],
  },
  {
    title: 'Songs',
    exercises: [{ id: 'song', title: 'Songs by ear', blurb: 'Learn a tune phrase by phrase, then see the sheet' }],
  },
];

export function exerciseDef(id: ExerciseId): ExerciseDef {
  return EXERCISE_GROUPS.flatMap((g) => g.exercises).find((e) => e.id === id)!;
}

/** Questions per round, except songs (one per phrase) */
export const ROUND_LENGTH = 8;
export const RESPONSE_ROUND = 5;
/** Wrong notes on one step before it is shown and the run moves on */
export const MAX_STEP_MISTAKES = 3;

export type IntervalSet = 'steps' | 'thirds' | 'perfect' | 'all';
export type ChordSet = 'basic' | 'triads' | 'sevenths';
export type IntervalDirection = 'up' | 'down' | 'mixed';
export type KeyChoice = 'c' | 'any';
export type VoiceRange = 'low' | 'mid' | 'high';

export const INTERVAL_SETS: Record<IntervalSet, { label: string; ids: string[] }> = {
  steps: { label: 'Steps', ids: ['m2', 'M2'] },
  thirds: { label: 'Thirds', ids: ['m3', 'M3'] },
  perfect: { label: 'Perfect', ids: ['P4', 'P5', 'P8'] },
  all: { label: 'All', ids: ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'] },
};

export const CHORD_SETS: Record<ChordSet, { label: string; ids: string[] }> = {
  basic: { label: 'Major & minor', ids: ['maj', 'min'] },
  triads: { label: '+ dim & aug', ids: ['maj', 'min', 'dim', 'aug'] },
  sevenths: { label: '+ 7ths', ids: ['maj', 'min', 'dim', 'aug', 'maj7', 'min7', 'dom7'] },
};

export const VOICE_RANGES: Record<VoiceRange, { label: string; low: number; high: number }> = {
  low: { label: 'Low voice', low: 45, high: 57 },
  mid: { label: 'Middle', low: 50, high: 62 },
  high: { label: 'High voice', low: 57, high: 69 },
};

/** Every exercise's settings, kept while the trainer is open */
export interface PlayOptions {
  noteAnyOctave: boolean;
  melodyAnyOctave: boolean;
  songAnyOctave: boolean;
  intervalSet: IntervalSet;
  direction: IntervalDirection;
  chordSet: ChordSet;
  keyChoice: KeyChoice;
  voice: VoiceRange;
}

export const DEFAULT_PLAY_OPTIONS: PlayOptions = {
  noteAnyOctave: true,
  melodyAnyOctave: false,
  songAnyOctave: true,
  intervalSet: 'thirds',
  direction: 'up',
  chordSet: 'basic',
  keyChoice: 'c',
  voice: 'mid',
};

// ---------- Questions ----------

export interface EchoStep {
  /** Exact piano notes, as they sound; any-octave questions only compare pitch classes */
  notes: string[];
}

/** Something to hear and then play back, one step (note or chord) at a time */
export interface EchoQuestion {
  steps: EchoStep[];
  sound: PlayEvent[];
  /** Sets up the key: offered on a button, and played first when `contextFirst` */
  context?: PlayEvent[];
  contextFirst?: boolean;
  /** Notes handed to the player (named and lit) that don't need playing */
  given?: string[];
  anyOctave: boolean;
  /** One-line instruction */
  prompt: string;
  /** What the answer was, e.g. "D minor" */
  label: string;
  /** MIDI range of the on-screen keys */
  range?: [number, number];
}

/** How one finished question went */
export interface PlayResult {
  correct: boolean;
  mistakes: number;
  /** The answer had to be shown (or the user gave up) */
  shown: boolean;
  label: string;
  /** Replays the question on the results screen */
  sound: PlayEvent[];
}

export function scorePercent(results: { correct: boolean }[]): number {
  if (results.length === 0) return 0;
  return Math.round((results.filter((r) => r.correct).length / results.length) * 100);
}

/** What a played note is compared by: the exact key, or just its pitch class */
export function matchKey(note: string, anyOctave: boolean): string {
  if (!anyOctave) return note;
  const midi = noteToMidi(note);
  return midi === undefined ? note : String(midi % 12);
}

export function stepTargets(step: EchoStep, anyOctave: boolean): string[] {
  return [...new Set(step.notes.map((n) => matchKey(n, anyOctave)))];
}

/** 'C#4' or 61 -> "C♯4" in the chosen notation */
export function noteName(note: string | number, notation: Notation): string {
  const midi = typeof note === 'number' ? note : (noteToMidi(note) ?? 60);
  return `${pitchClassName(midi % 12, notation)}${Math.floor(midi / 12) - 1}`;
}

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function tone(midi: number, at: number, dur: number, vel?: number): PlayEvent {
  return { notes: [midiToNote(midi)], at, dur, vel };
}

/** A tonic in the middle of the keyboard, so the tune around it stays within reach */
function middleTonic(pc: number): number {
  return pc >= 7 ? 48 + pc : 60 + pc;
}

function majorKeyName(pc: number, notation: Notation): string {
  return `${pitchClassName(pc, notation)} major`;
}

function degreeMidi(tonic: number, degree: number): number {
  return tonic + MAJOR_STEPS[((degree % 7) + 7) % 7] + 12 * Math.floor(degree / 7);
}

export function noteQuestion(anyOctave: boolean, notation: Notation): EchoQuestion {
  const midi = randInt(55, 74);
  return {
    steps: [{ notes: [midiToNote(midi)] }],
    sound: [tone(midi, 0, 1300)],
    anyOctave,
    prompt: anyOctave ? 'Play the note you heard — any octave' : 'Play the note you heard, in the same octave',
    label: noteName(midi, notation),
    range: [48, 83],
  };
}

export function intervalQuestion(set: IntervalSet, direction: IntervalDirection, notation: Notation): EchoQuestion {
  const def = INTERVALS.find((i) => i.id === pick(INTERVAL_SETS[set].ids))!;
  const up = direction === 'up' || (direction === 'mixed' && Math.random() < 0.5);
  const first = up ? randInt(52, 76 - def.semitones) : randInt(52 + def.semitones, 76);
  const second = up ? first + def.semitones : first - def.semitones;
  return {
    steps: [{ notes: [midiToNote(second)] }],
    sound: [tone(first, 0, 850), tone(second, 850, 1200)],
    given: [midiToNote(first)],
    anyOctave: false,
    prompt: `Play the second note — the first was ${noteName(first, notation)}`,
    label: `${def.name} ${up ? 'up' : 'down'}`,
    range: [48, 83],
  };
}

export function chordQuestion(set: ChordSet, notation: Notation): EchoQuestion {
  const def = chordDef(pick(CHORD_SETS[set].ids));
  const root = randInt(52, 64);
  const midis = def.tones.map((t) => root + t);
  const rollAt = 1500;
  return {
    steps: [{ notes: midis.map(midiToNote) }],
    // Struck together, then rolled upwards so each note can be picked out
    sound: [
      { notes: midis.map(midiToNote), at: 0, dur: 1300 },
      ...midis.map((m, i) => tone(m, rollAt + i * 260, 260 * (midis.length - i) + 900)),
    ],
    anyOctave: true,
    prompt: 'Play every note of the chord — any octave, any order',
    label: `${pitchClassName(root % 12, notation)} ${def.name.toLowerCase()}`,
    range: [48, 83],
  };
}

export const MELODY_MIN = 3;
export const MELODY_MAX = 8;

/** Melody length after a run of results: +1 after two perfect in a row, −1 after a miss */
export function melodyLength(history: boolean[]): number {
  let length = MELODY_MIN;
  let streak = 0;
  for (const ok of history) {
    if (!ok) {
      length = Math.max(MELODY_MIN, length - 1);
      streak = 0;
    } else if (++streak === 2) {
      length = Math.min(MELODY_MAX, length + 1);
      streak = 0;
    }
  }
  return length;
}

const WALK_MOVES = [-1, -1, -1, 1, 1, 1, -2, 2, -3, 3];

/**
 * Scale degrees (0 = tonic, may go below 0 or past 7) that mostly step with
 * the odd small leap, starting on the tonic chord and ending on a degree in `endOn` (mod 7)
 */
export function randomWalk(length: number, low = -3, high = 7, endOn = [0, 2, 4]): number[] {
  const walk = [pick([0, 2, 4])];
  while (walk.length < length) {
    const at = walk[walk.length - 1];
    const last = walk.length === length - 1;
    const options = WALK_MOVES.map((m) => at + m).filter(
      (d) => d >= low && d <= high && (!last || endOn.includes(((d % 7) + 7) % 7))
    );
    // Every degree has an ending within a third, but fall back to standing still
    walk.push(options.length ? pick(options) : at);
  }
  return walk;
}

export function melodyQuestion(length: number, anyOctave: boolean, notation: Notation): EchoQuestion {
  const pc = randInt(0, 11);
  const tonic = middleTonic(pc);
  const midis = randomWalk(length).map((d) => degreeMidi(tonic, d));
  const step = 520;
  return {
    steps: midis.slice(1).map((m) => ({ notes: [midiToNote(m)] })),
    sound: midis.map((m, i) => tone(m, i * step, i === midis.length - 1 ? 900 : step - 40)),
    context: cadenceSound(tonic),
    given: [midiToNote(midis[0])],
    anyOctave,
    prompt: `Play the melody from ${noteName(midis[0], notation)}${anyOctave ? ' — any octave' : ''}`,
    label: `${length}-note tune in ${majorKeyName(pc, notation)}`,
  };
}

const BASS_LINES = ['I-IV-V-I', 'I-V-vi-IV', 'I-vi-IV-V', 'I-IV-I-V', 'I-V-IV-I', 'I-vi-V-I', 'I-IV-vi-V'];
const PLAYABLE_PROGRESSIONS = ['I-IV-V-I', 'I-V-vi-IV', 'I-vi-IV-V', 'ii-V-I', 'I-IV-I-V', 'vi-IV-I-V'];
const CHORD_STEP_MS = 1000;

interface Voiced {
  bass: number;
  upper: number[];
}

/** Root-position chords: the root low in the bass, upper voices moving smoothly */
function voiceChords(pc: number, numerals: string[]): Voiced[] {
  const tonic = middleTonic(pc);
  let upper: number[] = [];
  return numerals.map((n, i) => {
    const { degree, tones } = NUMERALS[n];
    upper = i === 0 ? tones.map((t) => tonic + degree + t) : nearestVoicing(upper, tonic + degree, tones);
    return { bass: 36 + ((pc + degree) % 12), upper };
  });
}

function chordEvents(voiced: Voiced[]): PlayEvent[] {
  return voiced.flatMap(({ bass, upper }, i) => {
    const dur = i === voiced.length - 1 ? 1700 : CHORD_STEP_MS - 50;
    const at = i * CHORD_STEP_MS;
    return [tone(bass, at, dur, 0.85), { notes: upper.map(midiToNote), at, dur, vel: 0.5 }];
  });
}

function keyPc(choice: KeyChoice): number {
  return choice === 'c' ? 0 : randInt(0, 11);
}

export function bassLineQuestion(choice: KeyChoice, notation: Notation): EchoQuestion {
  const pc = keyPc(choice);
  const numerals = pick(BASS_LINES).split('-');
  const voiced = voiceChords(pc, numerals);
  const key = majorKeyName(pc, notation);
  return {
    steps: voiced.map((v) => ({ notes: [midiToNote(v.bass)] })),
    sound: chordEvents(voiced),
    context: cadenceSound(middleTonic(pc)),
    anyOctave: true,
    prompt: `Play the bass notes in order — key of ${key}`,
    label: `${numerals.join('–')} in ${key}`,
    range: [36, 59],
  };
}

export function progressionQuestion(choice: KeyChoice, notation: Notation): EchoQuestion {
  const pc = keyPc(choice);
  const def = progressionDef(pick(PLAYABLE_PROGRESSIONS));
  const numerals = def.id.split('-');
  const voiced = voiceChords(pc, numerals);
  const key = majorKeyName(pc, notation);
  return {
    steps: voiced.map((v) => ({ notes: [v.bass, ...v.upper].map(midiToNote) })),
    sound: chordEvents(voiced),
    context: cadenceSound(middleTonic(pc)),
    contextFirst: true,
    anyOctave: true,
    prompt: `Play each chord in turn — key of ${key}`,
    label: `${numerals.join('–')} in ${key}`,
  };
}

// ---------- Sing it back ----------

/** Cents off the target that still count as in tune */
export const SING_TOLERANCE_CENTS = 35;
/** How long the right pitch must be held */
export const SING_HOLD_MS = 600;

export function singTarget(range: VoiceRange, previous?: number): number {
  const { low, high } = VOICE_RANGES[range];
  let midi = randInt(low, high);
  while (midi === previous) midi = randInt(low, high);
  return midi;
}

export function singSound(midi: number): PlayEvent[] {
  return [tone(midi, 0, 1500, 0.8)];
}

// ---------- Call & response ----------

export const RESPONSE_MIN_NOTES = 4;
export const RESPONSE_MAX_NOTES = 8;
/** Silence after which an answer is judged */
export const RESPONSE_SILENCE_MS = 1500;

/** Bar rhythms in eighth notes; endings close on a long note */
const BAR_RHYTHMS = [[2, 2, 2, 2], [2, 1, 1, 2, 2], [1, 1, 2, 1, 1, 2], [3, 1, 2, 2], [2, 2, 1, 1, 2]];
const END_RHYTHMS = [[2, 2, 4], [1, 1, 2, 4], [2, 1, 1, 4], [3, 1, 4]];
const EIGHTH_MS = 280;

export interface CallPhrase {
  /** Pitch class of the key */
  keyPc: number;
  keyName: string;
  sound: PlayEvent[];
}

/** A 1–2 bar question phrase over the tonic triad, left open on the 2nd or 5th */
export function callPhrase(notation: Notation): CallPhrase {
  const pc = randInt(0, 11);
  const tonic = middleTonic(pc);
  const rhythm = Math.random() < 0.6 ? [...pick(BAR_RHYTHMS), ...pick(END_RHYTHMS)] : pick(END_RHYTHMS);
  const degrees = randomWalk(rhythm.length, -1, 7, [1, 4]);
  const melody: PlayEvent[] = [];
  let t = 0;
  rhythm.forEach((len, i) => {
    melody.push(tone(degreeMidi(tonic, degrees[i]), t, len * EIGHTH_MS - 30, 0.8));
    t += len * EIGHTH_MS;
  });
  const triad = [0, 4, 7].map((s) => tonic - 12 + s);
  return {
    keyPc: pc,
    keyName: majorKeyName(pc, notation),
    sound: [{ notes: triad.map(midiToNote), at: 0, dur: t + 300, vel: 0.32 }, ...melody],
  };
}

export interface ResponseGrade {
  pass: boolean;
  /** Per played note: outside the key's scale */
  outOfKey: boolean[];
  inKeyPercent: number;
  /** The last note is the tonic, 3rd or 5th */
  endsHome: boolean;
}

/** Lenient: mostly in the key, and coming to rest on a note of the tonic chord */
export function gradeResponse(keyPc: number, midis: number[]): ResponseGrade {
  const rel = (m: number) => (((m - keyPc) % 12) + 12) % 12;
  const outOfKey = midis.map((m) => !MAJOR_STEPS.includes(rel(m)));
  const inKey = outOfKey.filter((o) => !o).length;
  const inKeyPercent = midis.length ? Math.round((inKey / midis.length) * 100) : 0;
  const endsHome = midis.length > 0 && [0, 4, 7].includes(rel(midis[midis.length - 1]));
  return { pass: inKeyPercent >= 80 && endsHome, outOfKey, inKeyPercent, endsHome };
}

// ---------- Songs ----------

export interface MelodyNote {
  midi: number;
  /** Start in 16th-note steps */
  time: number;
  steps: number;
  refs: SegmentRef[];
}

export interface Phrase {
  notes: MelodyNote[];
  firstBar: number;
  lastBar: number;
}

const PHRASE_BARS = 2;
const PHRASE_MIN_NOTES = 3;
const PHRASE_MAX_NOTES = 12;

/** The tune: the top note of each treble onset */
export function songMelody(song: ParsedSong): MelodyNote[] {
  return song.onsets
    .filter((o) => o.staff === 'treble')
    .flatMap((o) => {
      const midis = o.notes.map(noteToMidi).filter((m): m is number => m !== undefined);
      return midis.length ? [{ midi: Math.max(...midis), time: o.time, steps: o.steps, refs: o.refs }] : [];
    });
}

function groupByBars(notes: MelodyNote[], barSteps: number, bars: number): MelodyNote[][] {
  const groups = new Map<number, MelodyNote[]>();
  for (const n of notes) {
    const key = Math.floor(n.time / (barSteps * bars));
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }
  return [...groups.values()];
}

/** About two bars each; busy phrases split into single bars, tiny ones join the one before */
export function songPhrases(song: ParsedSong): Phrase[] {
  const barSteps = song.source.beats * 4;
  const groups = groupByBars(songMelody(song), barSteps, PHRASE_BARS).flatMap((g) =>
    g.length > PHRASE_MAX_NOTES ? groupByBars(g, barSteps, 1) : [g]
  );
  const merged: MelodyNote[][] = [];
  for (const g of groups) {
    const prev = merged[merged.length - 1];
    if (prev && (g.length < PHRASE_MIN_NOTES || prev.length < PHRASE_MIN_NOTES)) prev.push(...g);
    else merged.push([...g]);
  }
  return merged.map((notes) => ({
    notes,
    firstBar: Math.floor(notes[0].time / barSteps),
    lastBar: Math.floor(notes[notes.length - 1].time / barSteps),
  }));
}

export function phraseLabel(phrase: Phrase): string {
  return phrase.firstBar === phrase.lastBar
    ? `Bar ${phrase.firstBar + 1}`
    : `Bars ${phrase.firstBar + 1}–${phrase.lastBar + 1}`;
}

export function phraseQuestion(phrase: Phrase, bpm: number, anyOctave: boolean, range: [number, number]): EchoQuestion {
  const stepMs = 60000 / bpm / 4;
  const start = phrase.notes[0].time;
  return {
    steps: phrase.notes.map((n) => ({ notes: [midiToNote(n.midi)] })),
    sound: phrase.notes.map((n) => tone(n.midi, (n.time - start) * stepMs, Math.max(140, n.steps * stepMs - 40))),
    anyOctave,
    prompt: `Play the phrase back${anyOctave ? ' — any octave' : ''}`,
    label: phraseLabel(phrase),
    range,
  };
}
