import { NUMERALS, invert, midiToNote } from './earTraining/theory';

/** Preset chord sets, the learner's own pick, or a progression in a key */
export type ChordLevel = 'easy' | 'medium' | 'hard' | 'custom' | 'progression';

export const CHORD_LEVEL_LABELS: Record<ChordLevel, string> = {
  easy: 'C · F · G',
  medium: '+ Am · Dm · Em',
  hard: 'All keys',
  custom: 'Custom',
  progression: 'Progression',
};

/** Which note must be lowest: any, the root, or the 3rd / 5th for an inversion */
export type Voicing = 'any' | 'root' | '1st' | '2nd';

export const VOICING_LABELS: Record<Voicing, string> = {
  any: 'Any voicing',
  root: 'Root position',
  '1st': '1st inversion',
  '2nd': '2nd inversion',
};

export const VOICING_HINTS: Record<Voicing, string> = {
  any: 'Any inversion, any octave — just the right notes.',
  root: 'The root must be the lowest note.',
  '1st': 'The 3rd must be the lowest note.',
  '2nd': 'The 5th must be the lowest note.',
};

const VOICING_SHIFT: Record<Voicing, number> = { any: 0, root: 0, '1st': 1, '2nd': 2 };
const BASS_NAMES: Record<Voicing, string> = { any: '', root: 'root', '1st': '3rd', '2nd': '5th' };

export interface ChordType {
  id: string;
  name: string;
  /** Semitones above the root */
  tones: number[];
}

/** Chord types as written after the root, e.g. C, Cm, C7 */
export const CHORD_TYPES: ChordType[] = [
  { id: '', name: 'Major', tones: [0, 4, 7] },
  { id: 'm', name: 'Minor', tones: [0, 3, 7] },
  { id: 'dim', name: 'Diminished', tones: [0, 3, 6] },
  { id: 'aug', name: 'Augmented', tones: [0, 4, 8] },
  { id: 'sus2', name: 'Suspended 2nd', tones: [0, 2, 7] },
  { id: 'sus4', name: 'Suspended 4th', tones: [0, 5, 7] },
  { id: '7', name: 'Dominant 7th', tones: [0, 4, 7, 10] },
  { id: 'maj7', name: 'Major 7th', tones: [0, 4, 7, 11] },
  { id: 'm7', name: 'Minor 7th', tones: [0, 3, 7, 10] },
  { id: 'm7♭5', name: 'Half-diminished', tones: [0, 3, 6, 10] },
  { id: 'dim7', name: 'Diminished 7th', tones: [0, 3, 6, 9] },
  { id: '5', name: 'Power chord', tones: [0, 7] },
];

export const ROOT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export interface ChordCard {
  /** `root:type`, e.g. '9:m' for Am */
  id: string;
  symbol: string;
  /** Roman numeral when the chord comes from a progression */
  numeral?: string;
  /** Pitch classes of the chord, root first */
  pcs: number[];
  /** The voicing asked for, in the left hand's octave, for hints */
  notes: string[];
  /** Note names, e.g. 'C · E · G' */
  spelled: string;
  /** Pitch class that must be lowest, or null when any voicing counts */
  bass: number | null;
}

export const CHORDS_PER_ROUND = 8;
const LEFT_HAND_C = 48;

export function chordId(root: number, type: string): string {
  return `${root}:${type}`;
}

/** Whether a saved id still names a chord this version knows */
export function isChordId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const [root, type] = id.split(':');
  const r = Number(root);
  return Number.isInteger(r) && r >= 0 && r < 12 && CHORD_TYPES.some((t) => t.id === type);
}

export function chordSymbol(id: string): string {
  const [root, type] = id.split(':');
  return ROOT_NAMES[Number(root)] + type;
}

/** A playable card for a chord id, voiced as the rule asks */
export function chordCard(id: string, voicing: Voicing = 'any', numeral?: string): ChordCard {
  const [rootText, type] = id.split(':');
  const root = Number(rootText);
  const tones = (CHORD_TYPES.find((t) => t.id === type) ?? CHORD_TYPES[0]).tones;
  const pcs = tones.map((t) => (root + t) % 12);
  // A two-note power chord has no 2nd inversion; it falls back to root position
  const shift = VOICING_SHIFT[voicing] < tones.length ? VOICING_SHIFT[voicing] : 0;
  return {
    id,
    symbol: chordSymbol(id),
    numeral,
    pcs,
    notes: invert(tones, shift).map((t) => midiToNote(LEFT_HAND_C + root + t)),
    spelled: pcs.map((pc) => ROOT_NAMES[pc]).join(' · '),
    bass: voicing === 'any' ? null : pcs[shift],
  };
}

/** What the lowest note should be, e.g. 'E (the 3rd)' */
export function bassRule(card: ChordCard, voicing: Voicing): string | null {
  if (card.bass === null) return null;
  return `${ROOT_NAMES[card.bass]} (the ${BASS_NAMES[voicing]})`;
}

const ids = (symbols: [number, string][]) => symbols.map(([r, t]) => chordId(r, t));

const POOLS: Record<'easy' | 'medium' | 'hard', string[]> = {
  easy: ids([[0, ''], [5, ''], [7, '']]),
  medium: ids([[0, ''], [5, ''], [7, ''], [9, 'm'], [2, 'm'], [4, 'm']]),
  hard: ids([
    [0, ''], [5, ''], [7, ''], [9, 'm'], [2, 'm'], [4, 'm'], [2, ''], [9, ''], [4, ''],
    [10, ''], [3, ''], [7, 'm'], [0, 'm'], [11, 'm'],
  ]),
};

export interface ChordPreset {
  label: string;
  chords: string[];
}

const majorKey = (root: number) =>
  ids([[root, ''], [(root + 2) % 12, 'm'], [(root + 4) % 12, 'm'], [(root + 5) % 12, ''], [(root + 7) % 12, ''], [(root + 9) % 12, 'm']]);

/** Quick picks for the custom set */
export const CHORD_PRESETS: ChordPreset[] = [
  { label: 'Chords in C', chords: majorKey(0) },
  { label: 'Chords in G', chords: majorKey(7) },
  { label: 'Chords in F', chords: majorKey(5) },
  { label: 'All major', chords: ROOT_NAMES.map((_, r) => chordId(r, '')) },
  { label: 'All minor', chords: ROOT_NAMES.map((_, r) => chordId(r, 'm')) },
  { label: 'Sevenths in C', chords: ids([[0, 'maj7'], [2, 'm7'], [4, 'm7'], [5, 'maj7'], [7, '7'], [9, 'm7'], [11, 'm7♭5']]) },
  { label: 'Sus chords', chords: ids([[0, 'sus2'], [0, 'sus4'], [2, 'sus2'], [2, 'sus4'], [7, 'sus2'], [7, 'sus4']]) },
  { label: 'Power chords', chords: ids([[0, '5'], [2, '5'], [4, '5'], [5, '5'], [7, '5'], [9, '5']]) },
];

export const DEFAULT_CUSTOM_CHORDS = majorKey(0);

export interface ProgressionPreset {
  id: string;
  name: string;
  numerals: string[];
}

/** Progressions to practise changing chords in time */
export const PROGRESSION_PRESETS: ProgressionPreset[] = [
  { id: 'pop', name: 'Pop (I–V–vi–IV)', numerals: ['I', 'V', 'vi', 'IV'] },
  { id: '145', name: 'Rock (I–IV–V–I)', numerals: ['I', 'IV', 'V', 'I'] },
  { id: '50s', name: "50s (I–vi–IV–V)", numerals: ['I', 'vi', 'IV', 'V'] },
  { id: 'sad', name: 'Sad loop (vi–IV–I–V)', numerals: ['vi', 'IV', 'I', 'V'] },
  { id: 'jazz', name: 'Jazz (ii–V–I)', numerals: ['ii', 'V7', 'I'] },
  { id: 'turn', name: 'Turnaround (I–vi–ii–V)', numerals: ['I', 'vi', 'ii', 'V'] },
  { id: 'canon', name: 'Canon (I–V–vi–iii–IV–I–IV–V)', numerals: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'] },
  {
    id: 'blues',
    name: '12-bar blues',
    numerals: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
  },
];

/** The chord type a numeral's tones spell */
function typeOfTones(tones: number[]): string {
  return CHORD_TYPES.find((t) => t.tones.join() === tones.join())?.id ?? '';
}

/** One time through a progression in a key, as cards */
export function progressionCards(progressionId: string, key: number, voicing: Voicing): ChordCard[] {
  const preset = PROGRESSION_PRESETS.find((p) => p.id === progressionId) ?? PROGRESSION_PRESETS[0];
  return preset.numerals.map((n) => {
    const chord = NUMERALS[n];
    return chordCard(chordId((key + chord.degree) % 12, typeOfTones(chord.tones)), voicing, n);
  });
}

/** Everything that decides which chords come up */
export interface ChordSource {
  level: ChordLevel;
  custom: string[];
  progression: string;
  key: number;
  voicing: Voicing;
}

/** The chords a round draws from (in order, for a progression) */
export function chordPool(source: ChordSource): string[] {
  if (source.level === 'custom') return source.custom;
  if (source.level === 'progression') return [];
  return POOLS[source.level];
}

/**
 * The next `count` cards: a progression carries on from position `from`,
 * other sets are random and never repeat the chord just played
 */
export function dealChords(
  source: ChordSource,
  count: number,
  from = 0,
  previous?: string,
  rand: () => number = Math.random
): ChordCard[] {
  if (source.level === 'progression') {
    const loop = progressionCards(source.progression, source.key, source.voicing);
    return Array.from({ length: count }, (_, i) => loop[(from + i) % loop.length]);
  }
  const pool = chordPool(source);
  const cards: string[] = [];
  let last = previous;
  while (cards.length < count && pool.length) {
    const id = pool[Math.floor(rand() * pool.length)];
    // A one-chord set has to repeat
    if (id === last && pool.length > 1) continue;
    cards.push(id);
    last = id;
  }
  return cards.map((id) => chordCard(id, source.voicing));
}
