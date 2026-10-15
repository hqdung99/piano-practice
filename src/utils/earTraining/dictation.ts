import { cadenceSound, soundLength } from './skills';
import type { Labels, PlayEvent } from './skills';
import { MAJOR_STEPS, RHYTHMS, midiToNote, pitchClassName } from './theory';

// ---------- Notation ----------

export type Duration = 'w' | 'h' | 'q' | '8' | '16';

/** One note, chord or rest to draw on a MiniStaff */
export interface StaffNote {
  /** Piano names like 'C#4' or 'Bb4'; the spelling picks the accidental */
  keys: string[];
  duration: Duration;
  dots?: number;
  rest?: boolean;
  color?: string;
  /** Draws a barline after this note */
  barAfter?: boolean;
}

// ---------- Keys ----------

export type KeyId = 'C' | 'G' | 'F';
export const KEY_IDS: KeyId[] = ['C', 'G', 'F'];

interface KeyDef {
  /** MIDI note of the tonic that melodies centre on */
  tonic: number;
  /** How each pitch class (0 = C) is spelled in this key */
  names: string[];
}

const KEYS: Record<KeyId, KeyDef> = {
  C: { tonic: 60, names: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] },
  G: { tonic: 67, names: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'] },
  F: { tonic: 65, names: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] },
};

export function keyTonic(key: KeyId): number {
  return KEYS[key].tonic;
}

/** 70 in F -> 'Bb4': the piano name spelled the way the key would write it */
export function spell(midi: number, key: KeyId): string {
  return `${KEYS[key].names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Note name for display ('B♭', or 'Ti' in solfège), without the octave */
export function displayName(midi: number, key: KeyId, labels: Labels): string {
  if (labels.notation === 'solfege') return pitchClassName(midi % 12, 'solfege');
  return KEYS[key].names[midi % 12].replace('#', '♯').replace('b', '♭');
}

export function staffNotes(midis: number[], key: KeyId, duration: Duration = 'q', color?: string): StaffNote[] {
  return midis.map((m) => ({ keys: [spell(m, key)], duration, color }));
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 'random' picks one of the keys */
function resolveKey(choice: string): KeyId {
  return (KEY_IDS as string[]).includes(choice) ? (choice as KeyId) : pick(KEY_IDS);
}

// ---------- Melodies ----------

/** Melodies stay on the treble staff, between middle C and G5 */
const MELODY_LOW = 60;
const MELODY_HIGH = 79;
/** Mostly steps, some skips, the odd leap */
const MOVES = [-1, -1, -1, 1, 1, 1, -2, 2, -2, 2, -3, 3, -4, 4];

/** MIDI note of a major-scale degree index (0 = tonic, 7 = octave, -1 = leading tone below) */
function degreeMidi(tonic: number, degree: number): number {
  return tonic + 12 * Math.floor(degree / 7) + MAJOR_STEPS[((degree % 7) + 7) % 7];
}

const inRange = (tonic: number, degree: number) => {
  const m = degreeMidi(tonic, degree);
  return m >= MELODY_LOW && m <= MELODY_HIGH;
};

/** Scale degrees of a melody that starts on 1, 3 or 5, moves mostly by step and ends on 1 */
function melodyDegrees(tonic: number, length: number, maxLeap = 4): number[] {
  const moves = MOVES.filter((m) => Math.abs(m) <= maxLeap);
  for (let attempt = 0; attempt < 100; attempt++) {
    const degrees = [pick([0, 2, 4])];
    while (degrees.length < length - 1) {
      const prev = degrees[degrees.length - 1];
      const move = pick(moves);
      const next = inRange(tonic, prev + move) ? prev + move : prev - move;
      if (inRange(tonic, next)) degrees.push(next);
    }
    const prev = degrees[degrees.length - 1];
    const last = Math.abs(prev) <= Math.abs(prev - 7) ? 0 : 7;
    // Approach home by a step or small skip, and don't just sit on it
    if (Math.abs(prev - last) > 3 || prev === last) continue;
    degrees.push(last);
    return degrees;
  }
  return [0, 1, 2, 1, 0, -1, 1, 0].slice(0, length - 1).concat(0);
}

/** Bends up to two inner notes a semitone off the scale, as chromatic passing or neighbour notes */
function addChromatics(midis: number[], tonic: number): number[] {
  const scale = new Set(MAJOR_STEPS.map((s) => (tonic + s) % 12));
  const out = [...midis];
  let added = 0;
  for (let i = 1; i < out.length - 1 && added < 2; i++) {
    if (Math.random() > 0.35) continue;
    const toward = out[i + 1] > out[i] ? 1 : -1;
    for (const shift of [toward, -toward]) {
      const m = out[i] + shift;
      if (!scale.has(m % 12) && m !== out[i - 1] && m !== out[i + 1] && m >= MELODY_LOW - 1 && m <= MELODY_HIGH + 1) {
        out[i] = m;
        added++;
        break;
      }
    }
  }
  return out;
}

export function generateMelody(key: KeyId, length: number, chromatic = false, maxLeap = 4): number[] {
  const tonic = keyTonic(key);
  const midis = melodyDegrees(tonic, length, maxLeap).map((d) => degreeMidi(tonic, d));
  return chromatic ? addChromatics(midis, tonic) : midis;
}

/** The melody plus `count - 1` look-alikes, each with `changes` notes moved (never the first) */
function lookAlikes(key: KeyId, length: number, count: number, changes: number): number[][] {
  const tonic = keyTonic(key);
  const base = melodyDegrees(tonic, length, 3);
  const seen = new Set([base.join()]);
  const out = [base];
  for (let attempt = 0; out.length < count && attempt < 200; attempt++) {
    const variant = [...base];
    const spots = shuffle(base.map((_, i) => i).slice(1)).slice(0, changes);
    for (const i of spots) variant[i] += pick(changes === 1 ? [-1, 1] : [-2, -1, 1, 2]);
    if (!variant.every((d) => inRange(tonic, d)) || seen.has(variant.join())) continue;
    seen.add(variant.join());
    out.push(variant);
  }
  return out.map((degrees) => degrees.map((d) => degreeMidi(tonic, d)));
}

export const MELODY_STEP_MS = 650;
const CADENCE_GAP_MS = 700;

export function melodySound(midis: number[], stepMs = MELODY_STEP_MS, from = 0): PlayEvent[] {
  return midis.map((m, i) => ({ notes: [midiToNote(m)], at: from + i * stepMs, dur: stepMs - 40 }));
}

/** I-IV-V-I in the key, then the sound */
export function withCadence(key: KeyId, events: PlayEvent[]): PlayEvent[] {
  const cadence = cadenceSound(keyTonic(key));
  const offset = soundLength(cadence) + CADENCE_GAP_MS;
  return [...cadence, ...events.map((e) => ({ ...e, at: e.at + offset }))];
}

// ---------- Two voices ----------

interface HarmonyChord {
  /** Semitones of the root above the tonic */
  root: number;
  tones: number[];
}

const I: HarmonyChord = { root: 0, tones: [0, 4, 7] };
const IV: HarmonyChord = { root: 5, tones: [0, 4, 7] };
const V: HarmonyChord = { root: 7, tones: [0, 4, 7] };
const VI: HarmonyChord = { root: 9, tones: [0, 3, 7] };

const SOPRANO_LOW = 62;
const SOPRANO_HIGH = 77;
/** The bass sits in the octave from C3 */
const BASS_LOW = 48;

export interface TwoVoices {
  soprano: number[];
  bass: number[];
}

/** I – (IV|V|vi) – (IV|V) – I roots in the bass, with a smooth line of chord tones on top */
export function generateTwoVoices(key: KeyId): TwoVoices {
  const tonicPc = keyTonic(key) % 12;
  const second = pick([IV, V, VI]);
  const third = pick([IV, V].filter((c) => c !== second));
  const chords = [I, second, third, I];
  const bass = chords.map((c) => BASS_LOW + ((tonicPc + c.root) % 12));
  const soprano: number[] = [];
  chords.forEach((c, i) => {
    const options: number[] = [];
    for (let m = SOPRANO_LOW; m <= SOPRANO_HIGH; m++) {
      if (c.tones.some((t) => (tonicPc + c.root + t) % 12 === m % 12)) options.push(m);
    }
    const prev = soprano[i - 1];
    if (prev === undefined) {
      soprano.push(pick(options.filter((m) => m >= 64 && m <= 74)));
      return;
    }
    // The last chord resolves to the tonic or its third, whichever is nearest
    const pool = i === chords.length - 1 ? options.filter((m) => [0, 4].includes((m - tonicPc + 12) % 12)) : options;
    const near = pool.filter((m) => m !== prev && Math.abs(m - prev) <= 4);
    soprano.push(near.length ? pick(near) : pool.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a)));
  });
  return { soprano, bass };
}

export const HALF_NOTE_MS = 1100;

export function twoVoiceSound(soprano: number[], bass: number[]): PlayEvent[] {
  return Array.from({ length: Math.max(soprano.length, bass.length) }, (_, i) => ({
    notes: [soprano[i], bass[i]].filter((m) => m !== undefined).map(midiToNote),
    at: i * HALF_NOTE_MS,
    dur: HALF_NOTE_MS - 60,
  }));
}

// ---------- Rhythm ----------

export type Level = 'easy' | 'medium' | 'hard';

export const BAR_STEPS = 16;

/** Extra one-bar patterns, with rests in new places */
const EXTRA_RHYTHMS: number[][] = [
  [4, -4, 8],
  [-4, 4, 4, 4],
  [8, 4, -4],
  [-2, 2, 4, 4, 4],
  [4, -2, 2, 4, 4],
  [2, 2, 2, 2, 8],
  [6, 2, 4, -4],
  [4, 4, 1, 1, 2, 4],
];

const LEVEL_STEPS: Record<Level, Set<number>> = {
  easy: new Set([16, 12, 8, 4, -4]),
  medium: new Set([16, 12, 8, 6, 4, 2, -4, -2]),
  hard: new Set([16, 12, 8, 6, 4, 2, 1, -4, -2]),
};

function rhythmPool(level: Level): number[][] {
  return [...RHYTHMS.map((r) => r.steps), ...EXTRA_RHYTHMS].filter((steps) => steps.every((s) => LEVEL_STEPS[level].has(s)));
}

/** One bar at easy and medium; two bars at hard, at least one with sixteenths */
export function generateRhythm(level: Level): number[] {
  if (level !== 'hard') return [...pick(rhythmPool(level))];
  const busy = rhythmPool('hard').filter((s) => s.includes(1));
  const bars = shuffle([pick(busy), pick(rhythmPool('medium').filter((s) => s.length > 1))]);
  return bars.flat();
}

export const LEVEL_TEMPO: Record<Level, number> = { easy: 80, medium: 90, hard: 90 };

/** The buttons for building a rhythm, in 16th-note steps; negative steps are rests */
export const RHYTHM_PIECES: { steps: number; label: string; level: Level }[] = [
  { steps: 16, label: 'Whole', level: 'easy' },
  { steps: 12, label: 'Dotted half', level: 'easy' },
  { steps: 8, label: 'Half', level: 'easy' },
  { steps: 6, label: 'Dotted quarter', level: 'medium' },
  { steps: 4, label: 'Quarter', level: 'easy' },
  { steps: 2, label: 'Eighth', level: 'medium' },
  { steps: 1, label: 'Sixteenth', level: 'hard' },
  { steps: -4, label: 'Quarter rest', level: 'easy' },
  { steps: -2, label: 'Eighth rest', level: 'medium' },
];

const LEVEL_ORDER: Level[] = ['easy', 'medium', 'hard'];

export function piecesFor(level: Level) {
  return RHYTHM_PIECES.filter((p) => LEVEL_ORDER.indexOf(p.level) <= LEVEL_ORDER.indexOf(level));
}

/** 16th-note lengths with a written note value of their own */
const STEP_VALUES: Record<number, [Duration, number]> = {
  16: ['w', 0],
  12: ['h', 1],
  8: ['h', 0],
  6: ['q', 1],
  4: ['q', 0],
  3: ['8', 1],
  2: ['8', 0],
  1: ['16', 0],
};

/** Splits a length into written values, largest first */
function splitSteps(length: number): number[] {
  const parts: number[] = [];
  let left = length;
  while (left > 0) {
    const part = [16, 12, 8, 6, 4, 3, 2, 1].find((v) => v <= left)!;
    parts.push(part);
    left -= part;
  }
  return parts;
}

/** Rhythm steps as staff notes on one pitch, with barlines between bars */
export function rhythmStaffNotes(steps: number[], colors?: (string | undefined)[], from = 0): StaffNote[] {
  const out: StaffNote[] = [];
  let pos = from;
  steps.forEach((step, i) => {
    for (const part of splitSteps(Math.abs(step))) {
      const [duration, dots] = STEP_VALUES[part];
      pos += part;
      out.push({ keys: ['B4'], duration, dots, rest: step < 0, color: colors?.[i], barAfter: pos % BAR_STEPS === 0 });
    }
  });
  return out;
}

/** Fills the rest of the bars with pieces that respect bar lines, for placeholder spacing */
export function remainingPieces(used: number, total: number): number[] {
  const out: number[] = [];
  let pos = used;
  while (pos < total) {
    const toBar = BAR_STEPS - (pos % BAR_STEPS);
    out.push(toBar);
    pos += toBar;
  }
  return out;
}

const CLICK_NOTE = 'C7';
const RHYTHM_NOTE = 'C5';

export const beatMs = (bpm: number) => 60000 / bpm;

/** Four count-in clicks, then the rhythm on one note; `clicks` keeps a soft beat going underneath */
export function rhythmSound(steps: number[], bpm: number, { notes = true, clicks = false } = {}): PlayEvent[] {
  const beat = beatMs(bpm);
  const sixteenth = beat / 4;
  const events: PlayEvent[] = [0, 1, 2, 3].map((i) => ({ notes: [CLICK_NOTE], at: i * beat, dur: 80, vel: i === 0 ? 0.6 : 0.4 }));
  const total = steps.reduce((s, x) => s + Math.abs(x), 0);
  if (clicks) {
    for (let b = 0; b < total / 4; b++) events.push({ notes: [CLICK_NOTE], at: (4 + b) * beat, dur: 60, vel: 0.22 });
  }
  if (notes) {
    let t = 4 * beat;
    for (const step of steps) {
      const len = Math.abs(step) * sixteenth;
      if (step > 0) events.push({ notes: [RHYTHM_NOTE], at: t, dur: Math.max(90, len - 40), vel: 0.8 });
      t += len;
    }
  }
  return events;
}

/** When each note starts, in ms after the count-in */
export function onsets(steps: number[], bpm: number): number[] {
  const sixteenth = beatMs(bpm) / 4;
  const out: number[] = [];
  let pos = 0;
  for (const step of steps) {
    if (step > 0) out.push(pos * sixteenth);
    pos += Math.abs(step);
  }
  return out;
}

export interface TapGrade {
  /** Per written note: how far off its tap was in ms (+ = late), or null when missed */
  offsets: (number | null)[];
  /** Every tap, in ms after the count-in */
  taps: number[];
  /** Taps that matched no note */
  extras: number[];
  correct: boolean;
}

/** Pairs each written onset with the nearest unused tap inside the tolerance */
export function gradeTaps(expected: number[], taps: number[], tolerance: number): TapGrade {
  const used = new Set<number>();
  const offsets = expected.map((t) => {
    let best = -1;
    taps.forEach((tap, i) => {
      if (used.has(i) || Math.abs(tap - t) > tolerance) return;
      if (best < 0 || Math.abs(tap - t) < Math.abs(taps[best] - t)) best = i;
    });
    if (best < 0) return null;
    used.add(best);
    return taps[best] - t;
  });
  const extras = taps.filter((_, i) => !used.has(i));
  return { offsets, taps, extras, correct: offsets.every((o) => o !== null) && extras.length === 0 };
}

/** 2.5 -> '2½' */
export function formatBeats(beats: number): string {
  const whole = Math.floor(beats);
  const frac = ['', '¼', '½', '¾'][Math.round((beats - whole) * 4) % 4];
  return whole === 0 && frac ? frac : `${whole}${frac}`;
}

// ---------- Exercises ----------

export type ExerciseId = 'melodic' | 'rhythm' | 'tap' | 'twoVoice' | 'match' | 'audiation';

export interface SetupOption {
  id: string;
  label: string;
  choices: { id: string; label: string }[];
  /** Explains the chosen value */
  hints?: Record<string, string>;
}

export interface ExerciseDef {
  id: ExerciseId;
  title: string;
  tagline: string;
  /** How a question works, shown on the setup screen */
  howTo: string;
  options: SetupOption[];
}

export type Settings = Record<string, string>;

export const ROUND_LENGTH = 6;

const KEY_OPTION: SetupOption = {
  id: 'key',
  label: 'Key',
  choices: [
    { id: 'C', label: 'C' },
    { id: 'G', label: 'G' },
    { id: 'F', label: 'F' },
    { id: 'random', label: 'Mix' },
  ],
};

const LEVEL_CHOICES = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

export const EXERCISES: ExerciseDef[] = [
  {
    id: 'melodic',
    title: 'Melodic dictation',
    tagline: 'Hear a melody, write it down',
    howTo:
      'You hear the key (I–IV–V–I), then a short melody. The first note is written for you — play the rest on your piano or the keys on screen, then check.',
    options: [
      KEY_OPTION,
      { id: 'length', label: 'Notes', choices: ['4', '6', '8'].map((n) => ({ id: n, label: n })) },
      {
        id: 'notes',
        label: 'Notes from',
        choices: [
          { id: 'diatonic', label: 'The scale' },
          { id: 'chromatic', label: 'Chromatic' },
        ],
        hints: {
          diatonic: 'Every note belongs to the major scale.',
          chromatic: 'One or two notes may step outside the scale (♯ or ♭).',
        },
      },
    ],
  },
  {
    id: 'rhythm',
    title: 'Rhythm dictation',
    tagline: 'Hear a rhythm, build it from note values',
    howTo:
      'After four clicks you hear a rhythm on one note. Rebuild it with the note and rest buttons until the bar is full, then check.',
    options: [
      {
        id: 'level',
        label: 'Level',
        choices: LEVEL_CHOICES,
        hints: {
          easy: 'Whole, half and quarter notes, and quarter rests.',
          medium: 'Adds eighths, dotted quarters and eighth rests.',
          hard: 'Two bars, with sixteenths.',
        },
      },
    ],
  },
  {
    id: 'tap',
    title: 'Tap the rhythm',
    tagline: 'Read a rhythm and tap it in time',
    howTo:
      'Read the rhythm, press Start and tap each note after the four count-in clicks — on the pad, with Space or any piano key.',
    options: [
      {
        id: 'level',
        label: 'Rhythms',
        choices: LEVEL_CHOICES,
        hints: {
          easy: 'Whole, half and quarter notes, with a soft click to keep time.',
          medium: 'Adds eighths and dotted rhythms, with a soft click.',
          hard: 'Two bars with sixteenths, and no click after the count-in.',
        },
      },
      {
        id: 'timing',
        label: 'Timing',
        choices: [
          { id: '130', label: 'Relaxed' },
          { id: '90', label: 'Normal' },
          { id: '60', label: 'Strict' },
        ],
        hints: {
          '130': 'Taps within 130 ms of the note count.',
          '90': 'Taps within 90 ms of the note count.',
          '60': 'Taps within 60 ms of the note count.',
        },
      },
    ],
  },
  {
    id: 'twoVoice',
    title: 'Two-voice dictation',
    tagline: 'Write a top line and a bass line together',
    howTo:
      'Four chords play as half notes. The first note of each voice is given — write the top voice, then the bass. Notes below middle C go to the bass automatically.',
    options: [KEY_OPTION],
  },
  {
    id: 'match',
    title: 'Notation match',
    tagline: 'Which of three melodies did you hear?',
    howTo: 'Three melodies look almost the same. Listen, follow along on the staves and pick the one that played.',
    options: [
      KEY_OPTION,
      {
        id: 'level',
        label: 'Difference',
        choices: [
          { id: 'easy', label: 'Two notes' },
          { id: 'hard', label: 'One note' },
        ],
        hints: {
          easy: 'The melodies differ in two notes, sometimes by a skip.',
          hard: 'The melodies differ in a single note, by one step.',
        },
      },
    ],
  },
  {
    id: 'audiation',
    title: 'Sight-singing check',
    tagline: 'Hear the written melody in your head first',
    howTo:
      'Read the melody and imagine it — or sing it — from its first note. Then play it and be honest: did you hear it right?',
    options: [KEY_OPTION, { id: 'length', label: 'Notes', choices: ['4', '5', '6'].map((n) => ({ id: n, label: n })) }],
  },
];

export function exerciseDef(id: ExerciseId): ExerciseDef {
  return EXERCISES.find((e) => e.id === id)!;
}

export const DEFAULT_SETTINGS: Record<ExerciseId, Settings> = {
  melodic: { key: 'C', length: '4', notes: 'diatonic' },
  rhythm: { level: 'easy' },
  tap: { level: 'easy', timing: '90' },
  twoVoice: { key: 'C' },
  match: { key: 'C', level: 'easy' },
  audiation: { key: 'C', length: '4' },
};

// ---------- Questions ----------

export interface MelodicQuestion {
  kind: 'melodic';
  key: KeyId;
  notes: number[];
}

export interface RhythmQuestion {
  kind: 'rhythm';
  steps: number[];
  bars: number;
  bpm: number;
  level: Level;
}

export interface TapQuestion {
  kind: 'tap';
  steps: number[];
  bpm: number;
  /** ± ms a tap may be off */
  tolerance: number;
  /** Keeps a soft click going after the count-in */
  clicks: boolean;
}

export interface TwoVoiceQuestion extends TwoVoices {
  kind: 'twoVoice';
  key: KeyId;
}

export interface MatchQuestion {
  kind: 'match';
  key: KeyId;
  options: number[][];
  answer: number;
}

export interface AudiationQuestion {
  kind: 'audiation';
  key: KeyId;
  notes: number[];
}

export type DictationQuestion =
  | MelodicQuestion
  | RhythmQuestion
  | TapQuestion
  | TwoVoiceQuestion
  | MatchQuestion
  | AudiationQuestion;

function makeQuestion(exercise: ExerciseId, s: Settings): DictationQuestion {
  const key = resolveKey(s.key);
  const level = (s.level ?? 'easy') as Level;
  switch (exercise) {
    case 'melodic':
      return { kind: 'melodic', key, notes: generateMelody(key, Number(s.length), s.notes === 'chromatic') };
    case 'rhythm': {
      const steps = generateRhythm(level);
      return { kind: 'rhythm', steps, bars: level === 'hard' ? 2 : 1, bpm: LEVEL_TEMPO[level], level };
    }
    case 'tap':
      return {
        kind: 'tap',
        steps: generateRhythm(level),
        bpm: level === 'easy' ? 80 : 72,
        tolerance: Number(s.timing) || 90,
        clicks: level !== 'hard',
      };
    case 'twoVoice':
      return { kind: 'twoVoice', key, ...generateTwoVoices(key) };
    case 'match': {
      const options = lookAlikes(key, 4 + Math.round(Math.random()), 3, level === 'hard' ? 1 : 2);
      const shuffled = shuffle(options.map((_, i) => i));
      return { kind: 'match', key, options: shuffled.map((i) => options[i]), answer: shuffled.indexOf(0) };
    }
    case 'audiation': {
      const length = Number(s.length);
      return { kind: 'audiation', key, notes: generateMelody(key, length, false, length <= 4 ? 2 : 4) };
    }
  }
}

/** A round of questions, without repeats where possible */
export function generateRound(exercise: ExerciseId, settings: Settings, count = ROUND_LENGTH): DictationQuestion[] {
  const seen = new Set<string>();
  const out: DictationQuestion[] = [];
  for (let attempt = 0; out.length < count; attempt++) {
    const q = makeQuestion(exercise, settings);
    const id = JSON.stringify(q);
    if (seen.has(id) && attempt < count * 10) continue;
    seen.add(id);
    out.push(q);
  }
  return out;
}
