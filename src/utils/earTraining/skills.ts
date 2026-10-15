import {
  CADENCES,
  CHORDS,
  DIATONIC_NUMERALS,
  INTERVALS,
  INVERSIONS,
  MAJOR_STEPS,
  MINOR_STEPS,
  NUMERALS,
  OCTAVE_BASE,
  PITCH_CLASSES,
  PROGRESSIONS,
  RHYTHMS,
  SCALES,
  chordDef,
  degreeName,
  invert,
  midiToNote,
  nearestVoicing,
  pitchClassName,
  progressionDef,
  rhythmDef,
} from './theory';
import type { DegreeLabels, Direction, Notation, Octave, ProgressionChord, Voicing } from './theory';

export type SkillId =
  | 'compare'
  | 'contour'
  | 'pitch'
  | 'intervals'
  | 'degrees'
  | 'tonic'
  | 'scales'
  | 'keys'
  | 'chords'
  | 'inversions'
  | 'functions'
  | 'bass'
  | 'cadences'
  | 'progressions'
  | 'rhythm'
  | 'dynamics'
  | 'articulation';

export type CategoryId = 'basics' | 'melody' | 'harmony' | 'rhythm';

export interface CategoryDef {
  id: CategoryId;
  title: string;
  subtitle: string;
  skills: SkillId[];
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'basics', title: 'Basics', subtitle: 'First steps for a new ear', skills: ['compare', 'contour', 'pitch'] },
  { id: 'melody', title: 'Melody', subtitle: 'Hear how notes relate', skills: ['intervals', 'degrees', 'tonic', 'scales'] },
  {
    id: 'harmony',
    title: 'Harmony',
    subtitle: 'Chords and how they move',
    skills: ['chords', 'inversions', 'keys', 'functions', 'bass', 'cadences', 'progressions'],
  },
  { id: 'rhythm', title: 'Rhythm & expression', subtitle: 'Time, touch and dynamics', skills: ['rhythm', 'dynamics', 'articulation'] },
];

export const SKILL_IDS: SkillId[] = CATEGORIES.flatMap((c) => c.skills);

/** How two-note intervals and chords are sounded: together, one after another, or either */
export type PlayStyle = 'melodic' | 'harmonic' | 'both';
/** What sets up the key before a question */
export type KeyContext = 'none' | 'cadence' | 'drone';
export type Difficulty = 'easy' | 'medium' | 'hard';
/** A preset octave, or a custom range of keys */
export type Register = Octave | 'custom';

export interface PracticeConfig {
  /** Answer ids in play */
  items: string[];
  octave: Register;
  /** Lowest and highest MIDI note for a custom register */
  rangeLow: number;
  rangeHigh: number;
  /** Seconds to answer each question; 0 means no limit */
  timeLimit: number;
  direction: Direction;
  /** Pitch class played before each pitch question, or none */
  reference: number | null;
  /** Fixed root pitch class / key, or random */
  root: number | null;
  voicing: Voicing;
  playStyle: PlayStyle;
  keyContext: KeyContext;
  /** Chord qualities the inversion trainer builds on */
  qualities: string[];
  difficulty: Difficulty;
  /** Beats per minute for rhythm questions */
  tempo: number;
  /** Replays allowed per question; -1 means unlimited */
  replays: number;
  /** Ask more about the answers you get wrong most */
  smart: boolean;
}

export const TIME_LIMITS = [0, 5, 15, 30];
export const REPLAY_LIMITS = [-1, 1, 0];
export const TEMPOS = [60, 80, 100, 120];

/** Fewest answers a practice round can ask about */
export const MIN_ITEMS = 2;

/** Setup options a skill offers beyond its answers */
export type SetupFeature =
  | 'register'
  | 'direction'
  | 'voicing'
  | 'playStyle'
  | 'keyContext'
  | 'qualities'
  | 'difficulty'
  | 'tempo'
  | 'reference'
  | 'root';

export interface SkillOption {
  id: string;
  /** Short label for answer buttons */
  label: string;
  /** Full name for lessons and results */
  name: string;
}

export interface SkillDef {
  id: SkillId;
  category: CategoryId;
  title: string;
  tagline: string;
  trainerTitle: string;
  color: string;
  colorSoft: string;
  questionCount: number;
  /** Columns of answer buttons in the quiz */
  columns: number;
  replayLabel: string;
  prompt: string;
  itemHeading: string;
  features: SetupFeature[];
  /** Label for the root / key picker */
  rootHeading?: string;
  /** Labels for the play style choice */
  playStyleLabels?: Record<PlayStyle, string>;
  /** Key contexts on offer; 'none' is left out where the key must be set up */
  keyContexts?: KeyContext[];
  defaultConfig: PracticeConfig;
}

const BASE_CONFIG: PracticeConfig = {
  items: [],
  octave: 'medium',
  rangeLow: 48,
  rangeHigh: 84,
  timeLimit: 15,
  direction: 'asc',
  reference: null,
  root: null,
  voicing: 'root',
  playStyle: 'melodic',
  keyContext: 'none',
  qualities: ['maj', 'min'],
  difficulty: 'easy',
  tempo: 80,
  replays: -1,
  smart: true,
};

const ALL_PCS = PITCH_CLASSES.map(String);
const DIATONIC_DEGREES = MAJOR_STEPS.map(String);

function skill(def: Omit<SkillDef, 'defaultConfig' | 'category'> & { config: Partial<PracticeConfig> }): Omit<SkillDef, 'category'> {
  const { config, ...rest } = def;
  return { ...rest, defaultConfig: { ...BASE_CONFIG, ...config } };
}

const SKILL_LIST: Omit<SkillDef, 'category'>[] = [
  skill({
    id: 'compare',
    title: 'Higher or Lower',
    tagline: 'Compare two notes',
    trainerTitle: 'Higher or Lower',
    color: '#22c55e',
    colorSoft: '#e3f9eb',
    questionCount: 15,
    columns: 3,
    replayLabel: 'Replay notes',
    prompt: 'Is the second note higher, lower or the same?',
    itemHeading: 'Answers',
    features: ['register', 'difficulty'],
    config: { items: ['higher', 'lower', 'same'] },
  }),
  skill({
    id: 'contour',
    title: 'Contour',
    tagline: 'The shape of a melody',
    trainerTitle: 'Melody Contour',
    color: '#0ea5e9',
    colorSoft: '#e0f4fd',
    questionCount: 12,
    columns: 2,
    replayLabel: 'Replay melody',
    prompt: 'Which way does the melody move?',
    itemHeading: 'Shapes',
    features: ['register', 'difficulty'],
    config: { items: ['up-up', 'down-down', 'up-down', 'down-up'] },
  }),
  skill({
    id: 'pitch',
    title: 'Pitch',
    tagline: 'Name a note',
    trainerTitle: 'Pitch Trainer',
    color: '#ff9500',
    colorSoft: '#fff3e0',
    questionCount: 20,
    columns: 4,
    replayLabel: 'Replay pitch',
    prompt: 'Which note is this?',
    itemHeading: 'Notes',
    features: ['register', 'reference'],
    config: { items: ['0', '2', '4', '5', '7', '9', '11'] },
  }),
  skill({
    id: 'intervals',
    title: 'Intervals',
    tagline: 'Note distance',
    trainerTitle: 'Interval Trainer',
    color: '#1aa7ec',
    colorSoft: '#e3f4fd',
    questionCount: 20,
    columns: 4,
    replayLabel: 'Replay interval',
    prompt: 'Which interval is this?',
    itemHeading: 'Intervals',
    features: ['playStyle', 'direction', 'register', 'keyContext'],
    playStyleLabels: { melodic: 'Melodic', harmonic: 'Harmonic', both: 'Mixed' },
    keyContexts: ['none', 'cadence', 'drone'],
    config: { items: ['P4', 'P5', 'P8'] },
  }),
  skill({
    id: 'degrees',
    title: 'Scale Degrees',
    tagline: 'Notes in a key',
    trainerTitle: 'Scale Degrees',
    color: '#6366f1',
    colorSoft: '#ebebfd',
    questionCount: 15,
    columns: 4,
    replayLabel: 'Replay note',
    prompt: 'Which degree of the key is this?',
    itemHeading: 'Degrees',
    features: ['keyContext', 'register', 'root', 'difficulty'],
    rootHeading: 'Key',
    keyContexts: ['cadence', 'drone'],
    config: { items: ['0', '4', '7'], keyContext: 'cadence' },
  }),
  skill({
    id: 'tonic',
    title: 'Find Home',
    tagline: 'Hear the tonic',
    trainerTitle: 'Find the Tonic',
    color: '#f43f5e',
    colorSoft: '#fde7eb',
    questionCount: 10,
    columns: 4,
    replayLabel: 'Replay melody',
    prompt: 'Which note is home?',
    itemHeading: 'Keys',
    features: ['difficulty', 'register'],
    config: { items: ALL_PCS, timeLimit: 0 },
  }),
  skill({
    id: 'scales',
    title: 'Scales',
    tagline: 'Find the key',
    trainerTitle: 'Scale Detection',
    color: '#e0a30c',
    colorSoft: '#fdf4dc',
    questionCount: 8,
    columns: 2,
    replayLabel: 'Replay scale',
    prompt: 'Which scale is this?',
    itemHeading: 'Scales',
    features: ['direction', 'register', 'root'],
    rootHeading: 'Scale root',
    config: { items: ['major', 'naturalMinor'] },
  }),
  skill({
    id: 'keys',
    title: 'Major or Minor',
    tagline: 'The mood of a tune',
    trainerTitle: 'Major or Minor',
    color: '#ec4899',
    colorSoft: '#fce7f3',
    questionCount: 10,
    columns: 2,
    replayLabel: 'Replay tune',
    prompt: 'Is this tune in a major or a minor key?',
    itemHeading: 'Keys',
    features: ['difficulty', 'register', 'root'],
    rootHeading: 'Key',
    config: { items: ['major', 'minor'] },
  }),
  skill({
    id: 'chords',
    title: 'Chords',
    tagline: 'Identify quality',
    trainerTitle: 'Chord Recognition',
    color: '#a352f0',
    colorSoft: '#f3e9fd',
    questionCount: 10,
    columns: 3,
    replayLabel: 'Replay chord',
    prompt: 'Which chord is this?',
    itemHeading: 'Chord qualities',
    features: ['playStyle', 'register', 'root'],
    rootHeading: 'Chord root',
    playStyleLabels: { harmonic: 'Block', melodic: 'Arpeggio', both: 'Mixed' },
    config: { items: ['maj', 'min'], playStyle: 'harmonic' },
  }),
  skill({
    id: 'inversions',
    title: 'Inversions',
    tagline: "What's in the bass",
    trainerTitle: 'Chord Inversions',
    color: '#8b5cf6',
    colorSoft: '#efe9fe',
    questionCount: 10,
    columns: 2,
    replayLabel: 'Replay chord',
    prompt: 'Which inversion is this?',
    itemHeading: 'Inversions',
    features: ['qualities', 'playStyle', 'register', 'root'],
    rootHeading: 'Chord root',
    playStyleLabels: { harmonic: 'Block', melodic: 'Arpeggio', both: 'Mixed' },
    config: { items: ['root', '1st', '2nd'], playStyle: 'harmonic' },
  }),
  skill({
    id: 'functions',
    title: 'Chord Functions',
    tagline: 'Chords in a key',
    trainerTitle: 'Chord Functions',
    color: '#0891b2',
    colorSoft: '#dff3f8',
    questionCount: 12,
    columns: 4,
    replayLabel: 'Replay chord',
    prompt: 'Which chord of the key is this?',
    itemHeading: 'Chords',
    features: ['keyContext', 'register', 'root'],
    rootHeading: 'Key',
    keyContexts: ['cadence', 'drone'],
    config: { items: ['I', 'IV', 'V'], keyContext: 'cadence' },
  }),
  skill({
    id: 'bass',
    title: 'Bass Notes',
    tagline: 'Follow the low end',
    trainerTitle: 'Bass Notes',
    color: '#b45309',
    colorSoft: '#fbeedd',
    questionCount: 12,
    columns: 4,
    replayLabel: 'Replay',
    prompt: 'Which degree is in the bass?',
    itemHeading: 'Bass degrees',
    features: ['keyContext', 'root'],
    rootHeading: 'Key',
    keyContexts: ['cadence', 'drone'],
    config: { items: ['0', '5', '7'], keyContext: 'cadence' },
  }),
  skill({
    id: 'cadences',
    title: 'Cadences',
    tagline: 'How phrases end',
    trainerTitle: 'Cadences',
    color: '#0d9488',
    colorSoft: '#ddf4f1',
    questionCount: 8,
    columns: 2,
    replayLabel: 'Replay phrase',
    prompt: 'Which cadence ends the phrase?',
    itemHeading: 'Cadences',
    features: ['voicing', 'register', 'root'],
    rootHeading: 'Key',
    config: { items: ['authentic', 'half'] },
  }),
  skill({
    id: 'progressions',
    title: 'Progressions',
    tagline: 'Song patterns by ear',
    trainerTitle: 'Chord Progressions',
    color: '#14b8a6',
    colorSoft: '#dff6f2',
    questionCount: 8,
    columns: 3,
    replayLabel: 'Replay progression',
    prompt: 'Which progression is this?',
    itemHeading: 'Progressions',
    features: ['voicing', 'register', 'root'],
    rootHeading: 'Key',
    config: { items: ['I-IV-V-I', 'I-V-vi-IV'] },
  }),
  skill({
    id: 'rhythm',
    title: 'Rhythm',
    tagline: 'Hear the beat',
    trainerTitle: 'Rhythm Recognition',
    color: '#ef4444',
    colorSoft: '#fde8e8',
    questionCount: 10,
    columns: 2,
    replayLabel: 'Replay rhythm',
    prompt: 'Which rhythm did you hear?',
    itemHeading: 'Rhythms',
    features: ['tempo'],
    config: { items: ['qqqq', 'hh', 'hqq'], timeLimit: 0 },
  }),
  skill({
    id: 'dynamics',
    title: 'Dynamics',
    tagline: 'Loud and soft',
    trainerTitle: 'Dynamics',
    color: '#f97316',
    colorSoft: '#feeddf',
    questionCount: 10,
    columns: 2,
    replayLabel: 'Replay phrase',
    prompt: 'How is the phrase played?',
    itemHeading: 'Dynamics',
    features: ['difficulty'],
    config: { items: ['loud', 'soft'], timeLimit: 0 },
  }),
  skill({
    id: 'articulation',
    title: 'Touch',
    tagline: 'Legato, staccato, accents',
    trainerTitle: 'Articulation',
    color: '#84cc16',
    colorSoft: '#eef8dc',
    questionCount: 10,
    columns: 3,
    replayLabel: 'Replay phrase',
    prompt: 'How are the notes played?',
    itemHeading: 'Touch',
    features: [],
    config: { items: ['legato', 'staccato'], timeLimit: 0 },
  }),
];

export const SKILLS = Object.fromEntries(
  SKILL_LIST.map((s) => [s.id, { ...s, category: CATEGORIES.find((c) => c.skills.includes(s.id))!.id }])
) as Record<SkillId, SkillDef>;

/** How answers are labelled, from the trainer settings */
export interface Labels {
  notation: Notation;
  degrees: DegreeLabels;
}

export const DEFAULT_LABELS: Labels = { notation: 'flat', degrees: 'numbers' };

const CONTOUR_ARROWS: Record<string, string> = {
  'up-up': '↗ ↗',
  'down-down': '↘ ↘',
  'up-down': '↗ ↘',
  'down-up': '↘ ↗',
};

const SIMPLE_OPTIONS: Partial<Record<SkillId, SkillOption[]>> = {
  compare: [
    { id: 'higher', label: 'Higher ↑', name: 'Higher' },
    { id: 'lower', label: 'Lower ↓', name: 'Lower' },
    { id: 'same', label: 'Same =', name: 'Same' },
  ],
  contour: Object.entries(CONTOUR_ARROWS).map(([id, arrows]) => ({
    id,
    label: arrows,
    name: id
      .split('-')
      .map((d) => (d === 'up' ? 'Up' : 'Down'))
      .join(', then '),
  })),
  keys: [
    { id: 'major', label: 'Major', name: 'Major key' },
    { id: 'minor', label: 'Minor', name: 'Minor key' },
  ],
  dynamics: [
    { id: 'loud', label: 'Loud (f)', name: 'Loud — forte' },
    { id: 'soft', label: 'Soft (p)', name: 'Soft — piano' },
    { id: 'cresc', label: 'Getting louder', name: 'Crescendo' },
    { id: 'dim', label: 'Getting softer', name: 'Diminuendo' },
  ],
  articulation: [
    { id: 'legato', label: 'Legato', name: 'Legato — smooth and connected' },
    { id: 'staccato', label: 'Staccato', name: 'Staccato — short and detached' },
    { id: 'accent', label: 'Accented', name: 'Accented — strong first beats' },
  ],
};

/** Every answer a skill can ask about, in display order */
export function skillOptions(skill: SkillId, labels: Labels): SkillOption[] {
  const simple = SIMPLE_OPTIONS[skill];
  if (simple) return simple;
  switch (skill) {
    case 'pitch':
    case 'tonic':
      return PITCH_CLASSES.map((pc) => {
        const label = pitchClassName(pc, labels.notation);
        return { id: String(pc), label, name: skill === 'tonic' ? `${label} is home` : label };
      });
    case 'intervals':
      return INTERVALS.map((i) => ({ id: i.id, label: i.id, name: `${i.name} (${i.id})` }));
    case 'degrees':
      return PITCH_CLASSES.map((pc) => {
        const label = degreeName(pc, labels.degrees);
        return { id: String(pc), label, name: `Degree ${label}` };
      });
    case 'bass':
      return DIATONIC_DEGREES.map((d) => {
        const label = degreeName(Number(d), labels.degrees);
        return { id: d, label, name: `${label} in the bass` };
      });
    case 'chords':
      return CHORDS.map((c) => ({ id: c.id, label: c.id, name: c.name }));
    case 'inversions':
      return INVERSIONS.map((i) => ({ id: i.id, label: i.name, name: i.name }));
    case 'scales':
      return SCALES.map((s) => ({ id: s.id, label: s.name, name: s.name }));
    case 'functions':
      return DIATONIC_NUMERALS.map((n) => ({ id: n, label: n, name: `${n} chord` }));
    case 'cadences':
      return CADENCES.map((c) => ({ id: c.id, label: c.name.split(' (')[0], name: c.name }));
    case 'progressions':
      return PROGRESSIONS.map((p) => ({ id: p.id, label: p.id, name: p.id === p.name ? p.name : `${p.id} · ${p.name}` }));
    case 'rhythm':
      return RHYTHMS.map((r) => ({ id: r.id, label: r.name, name: r.name }));
    default:
      return [];
  }
}

export function optionName(skill: SkillId, id: string, labels: Labels): string {
  return skillOptions(skill, labels).find((o) => o.id === id)?.name ?? id;
}

/** Skills whose answers can be played on the piano */
export function acceptsPiano(skill: SkillId): boolean {
  return skill === 'pitch' || skill === 'tonic' || skill === 'degrees' || skill === 'bass';
}

// ---------- Sound ----------

/** Notes to sound together, starting `at` ms after the sequence starts */
export interface PlayEvent {
  notes: string[];
  at: number;
  dur: number;
  /** 0..1; the player's default when left out */
  vel?: number;
}

/** What stays the same when comparing a pick with the answer */
export interface SoundContext {
  /** Pitch: the C below the note. Intervals: the lower note. Others: the root / key */
  rootMidi: number;
  direction: 'asc' | 'desc';
  /** Notes together or one after another */
  style: 'melodic' | 'harmonic';
  /** Random material that must sound the same on every replay (melodies, gaps…) */
  notes?: number[];
  /** A chord quality or numeral chosen for the question */
  pick?: string;
}

export interface Question {
  skill: SkillId;
  config: PracticeConfig;
  answer: string;
  ctx: SoundContext;
}

const PROGRESSION_STEP_MS = 1100;
const SCALE_STEP_MS = 300;
const MELODY_STEP_MS = 450;
const ARPEGGIO_STEP_MS = 260;

/** Keeps a note on the piano's 88 keys by moving it whole octaves */
function onPiano(midi: number): number {
  let m = midi;
  while (m < 21) m += 12;
  while (m > 108) m -= 12;
  return m;
}

function notes(midis: number[]): string[] {
  return midis.map((m) => midiToNote(onPiano(m)));
}

function note(midi: number, at: number, dur: number, vel?: number): PlayEvent {
  return { notes: [midiToNote(onPiano(midi))], at, dur, vel };
}

/** A chord sounded as a block, or rolled up and then held */
function chordEvents(midis: number[], style: 'melodic' | 'harmonic', holdMs = 1800): PlayEvent[] {
  if (style === 'harmonic') return [{ notes: notes(midis), at: 0, dur: holdMs }];
  const rolled = midis.map((m, i) => note(m, i * ARPEGGIO_STEP_MS, ARPEGGIO_STEP_MS * (midis.length - i) + holdMs - 400));
  return rolled;
}

/** Chords one after another, voiced in root position (with bass) or close to each other */
function chordSequence(rootMidi: number, chords: ProgressionChord[], voicing: Voicing, stepMs = PROGRESSION_STEP_MS): PlayEvent[] {
  let upper: number[] = [];
  return chords.map((chord, i) => {
    // Keep chord roots within the octave above the key so the bass doesn't wander
    const root = rootMidi + (chord.degree % 12);
    if (voicing === 'inversions') {
      upper = i === 0 ? chord.tones.map((t) => root + t) : nearestVoicing(upper, root, chord.tones);
    } else {
      upper = chord.tones.map((t) => root + t);
    }
    const voices = voicing === 'root' ? [root - 12, ...upper] : upper;
    const last = i === chords.length - 1;
    return { notes: notes(voices), at: i * stepMs, dur: last ? 1800 : stepMs - 50 };
  });
}

/** A diatonic chord close to the tonic, with its root in the bass */
function keyChord(tonic: number, numeral: string, withBass = true): number[] {
  const chord = NUMERALS[numeral];
  const root = tonic + chord.degree;
  const upper = chord.tones.map((t) => root + t);
  return withBass ? [root - 12, ...upper] : upper;
}

const CONTOUR_STEPS: Record<Difficulty, [number, number]> = { easy: [4, 7], medium: [2, 4], hard: [1, 2] };
const COMPARE_GAPS: Record<Difficulty, [number, number]> = { easy: [5, 12], medium: [2, 4], hard: [1, 1] };

function dynamicsVelocities(item: string, count: number, difficulty: Difficulty): number[] {
  const [soft, loud] = difficulty === 'hard' ? [0.42, 0.72] : difficulty === 'medium' ? [0.32, 0.82] : [0.22, 0.95];
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    if (item === 'loud') return loud;
    if (item === 'soft') return soft;
    if (item === 'cresc') return soft + (loud - soft) * t;
    return loud - (loud - soft) * t;
  });
}

/** How one answer sounds in the given context */
export function itemSound(skill: SkillId, item: string, ctx: SoundContext, config: PracticeConfig): PlayEvent[] {
  switch (skill) {
    case 'compare': {
      const [first, gap] = ctx.notes ?? [ctx.rootMidi, 4];
      const second = item === 'higher' ? first + gap : item === 'lower' ? first - gap : first;
      return [note(first, 0, 850), note(second, 900, 1100)];
    }
    case 'contour': {
      const [start, a, b] = ctx.notes ?? [ctx.rootMidi, 4, 4];
      const [d1, d2] = item.split('-').map((d) => (d === 'up' ? 1 : -1));
      const midis = [start, start + d1 * a, start + d1 * a + d2 * b];
      return midis.map((m, i) => note(m, i * 650, i === 2 ? 1100 : 620));
    }
    case 'pitch':
      return [note(ctx.rootMidi + Number(item), 0, 1200)];
    case 'intervals': {
      const semis = INTERVALS.find((i) => i.id === item)!.semitones;
      const pair = [ctx.rootMidi, ctx.rootMidi + semis];
      if (ctx.style === 'harmonic') return [{ notes: notes(pair), at: 0, dur: 1600 }];
      if (ctx.direction === 'desc') pair.reverse();
      return [note(pair[0], 0, 850), note(pair[1], 850, 1200)];
    }
    case 'degrees': {
      const octave = ctx.notes?.[0] ?? 0;
      return [note(ctx.rootMidi + Number(item) + octave, 0, 1400)];
    }
    case 'tonic': {
      // The tune, then the candidate home note held after it, to hear whether it settles
      const melody = tonicTune(ctx);
      const end = melody.length * MELODY_STEP_MS;
      return [...melody, note(ctx.rootMidi - (ctx.rootMidi % 12) + Number(item), end + 200, 1600)];
    }
    case 'keys': {
      const steps = item === 'major' ? MAJOR_STEPS : MINOR_STEPS;
      const degreeMidi = (d: number) => ctx.rootMidi + steps[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
      const tune = (ctx.notes ?? []).map((d, i) => note(degreeMidi(d), i * MELODY_STEP_MS, MELODY_STEP_MS - 20));
      if (config.difficulty === 'hard') return tune;
      const triad = [0, 2, 4].map((d) => degreeMidi(d) - 12);
      const end = tune.length * MELODY_STEP_MS;
      return [
        { notes: notes(triad), at: 0, dur: end, vel: 0.45 },
        ...tune,
        { notes: notes([triad[0] - 12, ...triad]), at: end, dur: 1600, vel: 0.55 },
      ];
    }
    case 'chords': {
      const tones = CHORDS.find((c) => c.id === item)!.tones;
      return chordEvents(tones.map((t) => ctx.rootMidi + t), ctx.style);
    }
    case 'inversions': {
      const inversion = INVERSIONS.find((i) => i.id === item)!;
      const tones = chordDef(ctx.pick ?? 'maj').tones;
      // A triad has no 3rd inversion; it falls back to its root position
      const shift = inversion.shift < tones.length ? inversion.shift : 0;
      return chordEvents(invert(tones, shift).map((t) => ctx.rootMidi + t), ctx.style);
    }
    case 'scales': {
      const ascending = [...SCALES.find((s) => s.id === item)!.steps, 12];
      const steps = ctx.direction === 'desc' ? [...ascending].reverse() : ascending;
      return steps.map((s, i) => note(ctx.rootMidi + s, i * SCALE_STEP_MS, i === steps.length - 1 ? 900 : SCALE_STEP_MS));
    }
    case 'functions':
      return [{ notes: notes(keyChord(ctx.rootMidi, item)), at: 0, dur: 1800 }];
    case 'bass': {
      const upper = keyChord(ctx.rootMidi, ctx.pick ?? 'I', false);
      return [{ notes: notes([ctx.rootMidi - 12 + Number(item), ...upper]), at: 0, dur: 2000 }];
    }
    case 'cadences': {
      const cadence = CADENCES.find((c) => c.id === item)!;
      return chordSequence(ctx.rootMidi, cadence.numerals.map((n) => NUMERALS[n]), config.voicing, 900);
    }
    case 'progressions': {
      const def = progressionDef(item);
      return chordSequence(ctx.rootMidi, def.chords, config.voicing, def.stepMs);
    }
    case 'rhythm': {
      const sixteenth = 60000 / config.tempo / 4;
      const beat = sixteenth * 4;
      const clicks = [0, 1, 2, 3].map((i) => note(96, i * beat, 80, i === 0 ? 0.6 : 0.4));
      const events: PlayEvent[] = [...clicks];
      let t = 4 * beat;
      for (const step of rhythmDef(item).steps) {
        const len = Math.abs(step) * sixteenth;
        if (step > 0) events.push(note(72, t, Math.max(90, len - 40), 0.8));
        t += len;
      }
      return events;
    }
    case 'dynamics': {
      const tune = ctx.notes ?? [0, 2, 4, 5, 7, 5, 4, 2];
      const vels = dynamicsVelocities(item, tune.length, config.difficulty);
      return tune.map((s, i) => note(ctx.rootMidi + s, i * 380, 360, vels[i]));
    }
    case 'articulation': {
      const tune = ctx.notes ?? [0, 2, 4, 5, 7, 5, 4, 2];
      const step = 420;
      return tune.map((s, i) => {
        if (item === 'staccato') return note(ctx.rootMidi + s, i * step, 110, 0.7);
        if (item === 'accent') return note(ctx.rootMidi + s, i * step, step - 30, i % 4 === 0 ? 0.98 : 0.38);
        return note(ctx.rootMidi + s, i * step, step + 80, 0.6);
      });
    }
  }
}

function tonicTune(ctx: SoundContext): PlayEvent[] {
  return (ctx.notes ?? []).map((m, i) => note(m, i * MELODY_STEP_MS, MELODY_STEP_MS - 20));
}

/** What the replay button plays: the question without its key context (and without giving the answer away) */
export function replaySound(q: Question): PlayEvent[] {
  return q.skill === 'tonic' ? tonicTune(q.ctx) : itemSound(q.skill, q.answer, q.ctx, q.config);
}

/** The reference note played before a pitch question */
export function referenceSound(config: PracticeConfig): PlayEvent[] {
  if (config.reference === null) return [];
  const base = config.octave === 'custom' ? 60 : OCTAVE_BASE[config.octave];
  return [note(base + config.reference, 0, 1000)];
}

const CADENCE_STEP_MS = 520;

/** I-IV-V-I in the question's key, to set up home before the question */
export function cadenceSound(tonic: number): PlayEvent[] {
  return chordSequence(tonic, ['I', 'IV', 'V', 'I'].map((n) => NUMERALS[n]), 'inversions', CADENCE_STEP_MS).map((e, i) => ({
    ...e,
    dur: i === 3 ? 900 : CADENCE_STEP_MS - 30,
    vel: 0.55,
  }));
}

const CONTEXT_GAP_MS = 700;
const REFERENCE_GAP_MS = 1300;

export function soundLength(events: PlayEvent[]): number {
  return events.reduce((end, e) => Math.max(end, e.at + e.dur), 0);
}

function shift(events: PlayEvent[], ms: number): PlayEvent[] {
  return events.map((e) => ({ ...e, at: e.at + ms }));
}

/** Everything a question plays: any reference or key context, then the question itself */
export function questionSound(q: Question): PlayEvent[] {
  const { skill, config, ctx } = q;
  const sound = replaySound(q);
  if (skill === 'pitch' && config.reference !== null) {
    return [...referenceSound(config), ...shift(sound, REFERENCE_GAP_MS)];
  }
  const context = SKILLS[skill].keyContexts ? config.keyContext : 'none';
  // Intervals take the key of their lower note
  const tonic = ctx.rootMidi;
  if (context === 'cadence') {
    const cadence = cadenceSound(tonic);
    return [...cadence, ...shift(sound, soundLength(cadence) + CONTEXT_GAP_MS)];
  }
  if (context === 'drone') {
    const length = soundLength(sound) + 600;
    const drone: PlayEvent = { notes: notes([tonic - 24, tonic - 17]), at: 0, dur: length + 800, vel: 0.35 };
    return [drone, ...shift(sound, 800)];
  }
  return sound;
}

/** After a scale-degree answer, the note walks home so its pull is heard */
export function resolutionSound(q: Question): PlayEvent[] {
  if (q.skill !== 'degrees') return [];
  const degree = Number(q.answer);
  const octave = q.ctx.notes?.[0] ?? 0;
  const tonic = q.ctx.rootMidi + octave;
  const path: number[] = [degree];
  if (degree !== 0) {
    // Chromatic notes first slide to their diatonic neighbour, then step home through the scale
    const up = degree >= 7;
    let d = degree;
    if (!MAJOR_STEPS.includes(d)) path.push((d = up ? d + 1 : d - 1));
    const scale = [...MAJOR_STEPS, 12];
    let i = scale.indexOf(d);
    while (d !== 0 && d !== 12) {
      i += up ? 1 : -1;
      d = scale[i];
      path.push(d);
    }
  }
  return path.map((d, i) => note(tonic + d, i * 380, i === path.length - 1 ? 1000 : 360, 0.6));
}

// ---------- Questions ----------

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/** Lowest MIDI note and how far above it the sound may reach */
function spanOf(skill: SkillId, answer: string, config: PracticeConfig): number {
  switch (skill) {
    case 'intervals':
      return INTERVALS.find((i) => i.id === answer)?.semitones ?? 12;
    case 'chords':
    case 'inversions':
      return 16;
    case 'compare':
    case 'contour':
      return 14;
    case 'bass':
      return 12;
    default:
      return config.octave === 'custom' ? 12 : 0;
  }
}

/** A root note for the question: from the preset octave, or anywhere in the custom range that fits */
function pickRoot(skill: SkillId, answer: string, config: PracticeConfig): number {
  const fixed = SKILLS[skill].features.includes('root') ? config.root : null;
  if (config.octave !== 'custom') return OCTAVE_BASE[config.octave] + (fixed ?? pick(PITCH_CLASSES));
  const span = spanOf(skill, answer, config);
  // Bass notes sit an octave under the root
  const low = skill === 'bass' || skill === 'functions' ? config.rangeLow + 12 : config.rangeLow;
  const options: number[] = [];
  for (let m = low; m <= Math.max(low, config.rangeHigh - span); m++) {
    if (fixed === null || m % 12 === fixed) options.push(m);
  }
  return options.length ? pick(options) : low;
}

/** A short tune in a key, as scale degrees (0 = tonic, 7 = the octave) */
function randomTune(length: number, end: 'tonic' | 'stable' | 'any'): number[] {
  const tune = [pick([0, 2, 4])];
  while (tune.length < length - 1) {
    const last = tune[tune.length - 1];
    const step = pick([-2, -1, -1, 1, 1, 2, 3, -3]);
    tune.push(Math.max(-3, Math.min(9, last + step)));
  }
  const last = end === 'tonic' ? pick([0, 7]) : end === 'stable' ? pick([2, 4, 7]) : pick([1, 2, 3, 4, 5, 6]);
  tune.push(last);
  return tune;
}

/** Random material for one question, fixed so replays and comparisons sound alike */
export function makeContext(skill: SkillId, answer: string, config: PracticeConfig): SoundContext {
  const direction = config.direction === 'mixed' ? pick(['asc', 'desc'] as const) : config.direction === 'desc' ? 'desc' : 'asc';
  const style = config.playStyle === 'both' ? pick(['melodic', 'harmonic'] as const) : config.playStyle;
  const ctx: SoundContext = { rootMidi: pickRoot(skill, answer, config), direction, style };

  switch (skill) {
    case 'pitch': {
      if (config.octave === 'custom') {
        // Any key in the range with the answer's pitch class
        const pc = Number(answer);
        const options: number[] = [];
        for (let m = config.rangeLow; m <= config.rangeHigh; m++) if (m % 12 === pc) options.push(m);
        const midi = options.length ? pick(options) : 60 + pc;
        ctx.rootMidi = midi - pc;
      } else {
        ctx.rootMidi = OCTAVE_BASE[config.octave];
      }
      break;
    }
    case 'compare': {
      const [lo, hi] = COMPARE_GAPS[config.difficulty];
      ctx.notes = [ctx.rootMidi + randInt(-2, 2), randInt(lo, hi)];
      break;
    }
    case 'contour': {
      const [lo, hi] = CONTOUR_STEPS[config.difficulty];
      ctx.notes = [ctx.rootMidi + 4, randInt(lo, hi), randInt(lo, hi)];
      break;
    }
    case 'degrees':
      // Harder rounds also ask in the octave above
      ctx.notes = [config.difficulty === 'hard' ? pick([0, 12]) : 0];
      break;
    case 'tonic': {
      const tonicPc = Number(answer);
      const base = config.octave === 'custom' ? 60 : OCTAVE_BASE[config.octave];
      ctx.rootMidi = base + tonicPc;
      ctx.pick = answer;
      const end = config.difficulty === 'easy' ? 'tonic' : config.difficulty === 'medium' ? 'stable' : 'any';
      const steps = config.difficulty === 'hard' && Math.random() < 0.5 ? MINOR_STEPS : MAJOR_STEPS;
      ctx.notes = randomTune(8, end).map((d) => ctx.rootMidi + steps[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7));
      break;
    }
    case 'keys':
      ctx.notes = randomTune(8, config.difficulty === 'easy' ? 'tonic' : 'any');
      break;
    case 'inversions': {
      const inversion = INVERSIONS.find((i) => i.id === answer)!;
      const qualities = config.qualities.length ? config.qualities : ['maj'];
      const fits = qualities.filter((q) => chordDef(q).tones.length > inversion.shift);
      ctx.pick = fits.length ? pick(fits) : 'dom7';
      break;
    }
    case 'bass': {
      // Any diatonic chord with the bass degree in it
      const degree = Number(answer);
      const chords = DIATONIC_NUMERALS.filter((n) => {
        const c = NUMERALS[n];
        return c.tones.some((t) => (c.degree + t) % 12 === degree);
      });
      ctx.pick = pick(chords);
      break;
    }
    case 'dynamics':
    case 'articulation': {
      const tune = randomTune(8, 'tonic');
      ctx.notes = tune.map((d) => MAJOR_STEPS[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7));
      break;
    }
  }
  return ctx;
}

export function makeQuestion(skill: SkillId, config: PracticeConfig, answer: string): Question {
  return { skill, config, answer, ctx: makeContext(skill, answer, config) };
}

/** Answers weighted by how often they're missed, when smart review is on */
export type Weights = Record<string, number>;

function pickAnswer(items: string[], weights?: Weights, avoid?: string): string {
  const pool = items.length > 1 && avoid ? items.filter((i) => i !== avoid) : items;
  if (!weights) return pick(pool);
  const total = pool.reduce((s, i) => s + (weights[i] ?? 1), 0);
  let r = Math.random() * total;
  for (const i of pool) {
    r -= weights[i] ?? 1;
    if (r <= 0) return i;
  }
  return pool[pool.length - 1];
}

/** One more question, never repeating the answer just asked */
export function nextQuestion(skill: SkillId, config: PracticeConfig, previous?: Question, weights?: Weights): Question {
  const answer = pickAnswer(config.items, config.smart ? weights : undefined, previous?.answer);
  return makeQuestion(skill, config, answer);
}

/** Questions for one round, never asking the same answer twice in a row */
export function generateQuestions(skill: SkillId, config: PracticeConfig, count: number, weights?: Weights): Question[] {
  const questions: Question[] = [];
  while (questions.length < count) questions.push(nextQuestion(skill, config, questions[questions.length - 1], weights));
  return questions;
}

/** Answer id for a note played on the piano, or null when the skill can't take it */
export function pianoAnswer(q: Question, midi: number): string | null {
  switch (q.skill) {
    case 'pitch':
    case 'tonic':
      return String(midi % 12);
    case 'degrees':
    case 'bass':
      return String((((midi - q.ctx.rootMidi) % 12) + 12) % 12);
    default:
      return null;
  }
}

/** The prompt above the answers; some skills give a starting point */
export function promptFor(q: Question, labels: Labels): string {
  if (q.skill === 'tonic' && q.ctx.notes?.length) {
    return `It starts on ${pitchClassName(q.ctx.notes[0] % 12, labels.notation)}. Which note is home?`;
  }
  if ((q.skill === 'degrees' || q.skill === 'functions' || q.skill === 'bass') && q.config.root !== null) {
    return `${SKILLS[q.skill].prompt} (key of ${pitchClassName(q.config.root, labels.notation)})`;
  }
  return SKILLS[q.skill].prompt;
}

// ---------- Pitch presets ----------

export interface PitchPreset {
  id: string;
  name: string;
  items: string[];
}

/** Scales in C that fill in the notes for pitch practice */
export const PITCH_PRESETS: PitchPreset[] = [
  'major',
  'naturalMinor',
  'melodicMinor',
  'harmonicMinor',
  'pentatonicMajor',
  'pentatonicMinor',
].map((id) => {
  const scale = SCALES.find((s) => s.id === id)!;
  return { id, name: scale.name, items: scale.steps.map(String) };
});

PITCH_PRESETS.push({ id: 'chromatic', name: 'Chromatic', items: PITCH_CLASSES.map(String) });

export function matchPitchPreset(items: string[]): string {
  const sorted = [...items].sort((a, b) => Number(a) - Number(b)).join(',');
  return PITCH_PRESETS.find((p) => p.items.join(',') === sorted)?.id ?? 'custom';
}
