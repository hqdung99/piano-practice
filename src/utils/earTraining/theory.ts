import { ALL_NOTES } from '../noteMapping';

export type Notation = 'flat' | 'sharp' | 'solfege';

const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const SOLFEGE_NAMES = ['Do', 'Re♭', 'Re', 'Mi♭', 'Mi', 'Fa', 'Sol♭', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];

export const NOTATION_LABELS: Record<Notation, string> = {
  flat: 'Letter (♭)',
  sharp: 'Letter (♯)',
  solfege: 'Solfège (Do Re Mi)',
};

/** Name of a pitch class (0 = C) in the chosen notation */
export function pitchClassName(pc: number, notation: Notation): string {
  const names = notation === 'sharp' ? SHARP_NAMES : notation === 'solfege' ? SOLFEGE_NAMES : FLAT_NAMES;
  return names[((pc % 12) + 12) % 12];
}

export const PITCH_CLASSES = Array.from({ length: 12 }, (_, i) => i);
export const WHITE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];

const NOTE_OF_MIDI = new Map(ALL_NOTES.map((n) => [n.midi, n.note]));
const MIDI_OF_NOTE = new Map(ALL_NOTES.map((n) => [n.note, n.midi]));

/** 60 -> 'C4', in the sharp spelling the piano sampler expects */
export function midiToNote(midi: number): string {
  return NOTE_OF_MIDI.get(midi) ?? 'C4';
}

export function noteToMidi(note: string): number | undefined {
  return MIDI_OF_NOTE.get(note);
}

export type Octave = 'low' | 'medium' | 'high';

export const OCTAVE_LABELS: Record<Octave, string> = { low: 'Low', medium: 'Medium', high: 'High' };

/** MIDI number of the C each register starts from */
export const OCTAVE_BASE: Record<Octave, number> = { low: 48, medium: 60, high: 72 };

// ---------- Intervals ----------

export interface IntervalDef {
  id: string;
  name: string;
  semitones: number;
  /** Wider than an octave */
  compound?: boolean;
}

export const INTERVALS: IntervalDef[] = [
  { id: 'm2', name: 'Minor 2nd', semitones: 1 },
  { id: 'M2', name: 'Major 2nd', semitones: 2 },
  { id: 'm3', name: 'Minor 3rd', semitones: 3 },
  { id: 'M3', name: 'Major 3rd', semitones: 4 },
  { id: 'P4', name: 'Perfect 4th', semitones: 5 },
  { id: 'A4', name: 'Tritone', semitones: 6 },
  { id: 'P5', name: 'Perfect 5th', semitones: 7 },
  { id: 'm6', name: 'Minor 6th', semitones: 8 },
  { id: 'M6', name: 'Major 6th', semitones: 9 },
  { id: 'm7', name: 'Minor 7th', semitones: 10 },
  { id: 'M7', name: 'Major 7th', semitones: 11 },
  { id: 'P8', name: 'Octave', semitones: 12 },
  { id: 'm9', name: 'Minor 9th', semitones: 13, compound: true },
  { id: 'M9', name: 'Major 9th', semitones: 14, compound: true },
  { id: 'm10', name: 'Minor 10th', semitones: 15, compound: true },
  { id: 'M10', name: 'Major 10th', semitones: 16, compound: true },
  { id: 'P11', name: 'Perfect 11th', semitones: 17, compound: true },
  { id: 'P12', name: 'Perfect 12th', semitones: 19, compound: true },
  { id: 'm13', name: 'Minor 13th', semitones: 20, compound: true },
  { id: 'M13', name: 'Major 13th', semitones: 21, compound: true },
  { id: 'P15', name: 'Two octaves', semitones: 24, compound: true },
];

export const SIMPLE_INTERVAL_IDS = INTERVALS.filter((i) => !i.compound).map((i) => i.id);
export const COMPOUND_INTERVAL_IDS = INTERVALS.filter((i) => i.compound).map((i) => i.id);

export type Direction = 'asc' | 'desc' | 'mixed';

export const DIRECTION_LABELS: Record<Direction, string> = {
  asc: 'Ascending',
  desc: 'Descending',
  mixed: 'Mixed',
};

export const DIRECTION_HINTS: Record<Direction, string> = {
  asc: 'The lower note plays first, then the higher one.',
  desc: 'The higher note plays first, then the lower one.',
  mixed: 'Each question goes up or down at random.',
};

// ---------- Chords ----------

export interface ChordDef {
  id: string;
  name: string;
  /** Semitones above the root */
  tones: number[];
}

export const CHORDS: ChordDef[] = [
  { id: 'maj', name: 'Major', tones: [0, 4, 7] },
  { id: 'min', name: 'Minor', tones: [0, 3, 7] },
  { id: 'aug', name: 'Augmented', tones: [0, 4, 8] },
  { id: 'dim', name: 'Diminished', tones: [0, 3, 6] },
  { id: 'maj7', name: 'Major 7th', tones: [0, 4, 7, 11] },
  { id: 'min7', name: 'Minor 7th', tones: [0, 3, 7, 10] },
  { id: 'dom7', name: 'Dominant 7th', tones: [0, 4, 7, 10] },
  { id: 'hdim7', name: 'Half-diminished 7th', tones: [0, 3, 6, 10] },
  { id: 'dim7', name: 'Diminished 7th', tones: [0, 3, 6, 9] },
  { id: 'sus2', name: 'Suspended 2nd', tones: [0, 2, 7] },
  { id: 'sus4', name: 'Suspended 4th', tones: [0, 5, 7] },
  { id: '6', name: 'Major 6th', tones: [0, 4, 7, 9] },
  { id: 'm6', name: 'Minor 6th', tones: [0, 3, 7, 9] },
  { id: 'add9', name: 'Added 9th', tones: [0, 4, 7, 14] },
  { id: '9', name: 'Dominant 9th', tones: [0, 4, 7, 10, 14] },
  { id: 'maj9', name: 'Major 9th', tones: [0, 4, 7, 11, 14] },
  { id: 'm9', name: 'Minor 9th', tones: [0, 3, 7, 10, 14] },
];

export function chordDef(id: string): ChordDef {
  return CHORDS.find((c) => c.id === id) ?? CHORDS[0];
}

export const TRIAD_IDS = ['maj', 'min', 'aug', 'dim', 'sus2', 'sus4'];
export const SEVENTH_IDS = ['maj7', 'min7', 'dom7', 'hdim7', 'dim7'];

// ---------- Inversions ----------

export interface InversionDef {
  id: string;
  name: string;
  /** How many of the chord's lowest tones move up an octave */
  shift: number;
}

export const INVERSIONS: InversionDef[] = [
  { id: 'root', name: 'Root position', shift: 0 },
  { id: '1st', name: '1st inversion', shift: 1 },
  { id: '2nd', name: '2nd inversion', shift: 2 },
  { id: '3rd', name: '3rd inversion', shift: 3 },
];

/** Chord tones above the root, with the lowest `shift` tones raised an octave */
export function invert(tones: number[], shift: number): number[] {
  return tones.map((t, i) => (i < shift ? t + 12 : t)).sort((a, b) => a - b);
}

// ---------- Scales ----------

export interface ScaleDef {
  id: string;
  name: string;
  /** Semitones above the root, without the octave */
  steps: number[];
}

export const SCALES: ScaleDef[] = [
  { id: 'major', name: 'Major', steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'naturalMinor', name: 'Natural Minor', steps: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'harmonicMinor', name: 'Harmonic Minor', steps: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'melodicMinor', name: 'Melodic Minor', steps: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'dorian', name: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', name: 'Phrygian', steps: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', name: 'Lydian', steps: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', name: 'Mixolydian', steps: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'pentatonicMajor', name: 'Pentatonic Major', steps: [0, 2, 4, 7, 9] },
  { id: 'pentatonicMinor', name: 'Pentatonic Minor', steps: [0, 3, 5, 7, 10] },
  { id: 'blues', name: 'Blues', steps: [0, 3, 5, 6, 7, 10] },
  { id: 'locrian', name: 'Locrian', steps: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'wholeTone', name: 'Whole Tone', steps: [0, 2, 4, 6, 8, 10] },
  { id: 'chromatic', name: 'Chromatic', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

export const MAJOR_STEPS = SCALES[0].steps;
export const MINOR_STEPS = SCALES[1].steps;
export const HARMONIC_MINOR_STEPS = SCALES[2].steps;

// ---------- Progressions ----------

export interface ProgressionChord {
  /** Semitones of the chord root above the key */
  degree: number;
  tones: number[];
}

export interface ProgressionDef {
  id: string;
  name: string;
  chords: ProgressionChord[];
  /** Time per chord, when faster than usual */
  stepMs?: number;
}

const MAJ = [0, 4, 7];
const MIN = [0, 3, 7];
const DIM = [0, 3, 6];
const DOM7 = [0, 4, 7, 10];

/** Roman numeral -> chord inside the key; lower case is minor */
export const NUMERALS: Record<string, ProgressionChord> = {
  I: { degree: 0, tones: MAJ },
  ii: { degree: 2, tones: MIN },
  iii: { degree: 4, tones: MIN },
  IV: { degree: 5, tones: MAJ },
  V: { degree: 7, tones: MAJ },
  vi: { degree: 9, tones: MIN },
  'vii°': { degree: 11, tones: DIM },
  i: { degree: 0, tones: MIN },
  III: { degree: 3, tones: MAJ },
  iv: { degree: 5, tones: MIN },
  VI: { degree: 8, tones: MAJ },
  VII: { degree: 10, tones: MAJ },
  '♭VI': { degree: 8, tones: MAJ },
  '♭VII': { degree: 10, tones: MAJ },
  I7: { degree: 0, tones: DOM7 },
  IV7: { degree: 5, tones: DOM7 },
  V7: { degree: 7, tones: DOM7 },
  'V/V': { degree: 2, tones: DOM7 },
  'V/vi': { degree: 4, tones: DOM7 },
  'V/ii': { degree: 9, tones: DOM7 },
};

function progression(id: string, name: string, numerals = id.split('-'), stepMs?: number): ProgressionDef {
  return { id, name, chords: numerals.map((n) => NUMERALS[n]), stepMs };
}

const BLUES = ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'];

export const PROGRESSIONS: ProgressionDef[] = [
  progression('I-IV-V-I', 'The 1-4-5'),
  progression('I-V-vi-IV', 'Four-chord pop'),
  progression('I-vi-IV-V', '50s progression'),
  progression('I-iii-IV-V', 'Classic rock'),
  progression('vi-IV-I-V', 'Sad loop'),
  progression('i-VI-III-VII', 'Epic minor'),
  progression('i-iv-i-V', 'Minor cadence'),
  progression('ii-V-I', 'Jazz ii-V-I'),
  progression('I-IV-I-V', 'Back and forth'),
  progression('I-vi-ii-V', 'Turnaround'),
  progression('i-VII-VI-V', 'Andalusian cadence'),
  progression('I-♭VII-IV-I', 'Mixolydian rock'),
  progression('I-♭VI-♭VII-I', 'Borrowed ♭VI-♭VII'),
  progression('I-IV-iv-I', 'Minor iv'),
  progression('I-V/V-V-I', 'Secondary dominant'),
  progression('I-V/vi-vi-IV', 'Dominant of vi'),
  progression('I-V-vi-iii-IV-I-IV-V', 'Canon', undefined, 800),
  progression('12-bar blues', '12-bar blues', BLUES, 650),
];

export function progressionDef(id: string): ProgressionDef {
  return PROGRESSIONS.find((p) => p.id === id) ?? PROGRESSIONS[0];
}

// ---------- Cadences ----------

export interface CadenceDef {
  id: string;
  name: string;
  /** A short phrase that ends on the cadence */
  numerals: string[];
}

export const CADENCES: CadenceDef[] = [
  { id: 'authentic', name: 'Authentic (V → I)', numerals: ['I', 'IV', 'V7', 'I'] },
  { id: 'plagal', name: 'Plagal (IV → I)', numerals: ['I', 'V', 'IV', 'I'] },
  { id: 'half', name: 'Half (→ V)', numerals: ['I', 'vi', 'IV', 'V'] },
  { id: 'deceptive', name: 'Deceptive (V → vi)', numerals: ['I', 'IV', 'V7', 'vi'] },
];

// ---------- Diatonic chords ----------

export const DIATONIC_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

// ---------- Scale degrees ----------

export const DEGREE_NUMBERS = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
export const MOVABLE_DO = ['Do', 'Ra', 'Re', 'Me', 'Mi', 'Fa', 'Fi', 'Sol', 'Le', 'La', 'Te', 'Ti'];

export type DegreeLabels = 'numbers' | 'movable';

export const DEGREE_LABEL_NAMES: Record<DegreeLabels, string> = {
  numbers: 'Numbers (1 2 3)',
  movable: 'Movable Do (Do Re Mi)',
};

export function degreeName(semitones: number, labels: DegreeLabels): string {
  const i = ((semitones % 12) + 12) % 12;
  return labels === 'movable' ? MOVABLE_DO[i] : DEGREE_NUMBERS[i];
}

// ---------- Rhythm ----------

export interface RhythmDef {
  id: string;
  name: string;
  /** Lengths in 16th notes across one 4/4 bar; negative lengths are rests */
  steps: number[];
}

export const RHYTHMS: RhythmDef[] = [
  { id: 'w', name: 'Whole note', steps: [16] },
  { id: 'hh', name: 'Two halves', steps: [8, 8] },
  { id: 'qqqq', name: 'Four quarters', steps: [4, 4, 4, 4] },
  { id: 'hqq', name: 'Half, two quarters', steps: [8, 4, 4] },
  { id: 'qqh', name: 'Two quarters, half', steps: [4, 4, 8] },
  { id: 'qhq', name: 'Quarter, half, quarter', steps: [4, 8, 4] },
  { id: 'h.q', name: 'Dotted half, quarter', steps: [12, 4] },
  { id: 'qrqr', name: 'Quarters with rests', steps: [4, -4, 4, -4] },
  { id: 'eeqqq', name: 'Eighths first', steps: [2, 2, 4, 4, 4] },
  { id: 'qqeeq', name: 'Eighths on beat 3', steps: [4, 4, 2, 2, 4] },
  { id: 'qeeqee', name: 'Quarter, two eighths ×2', steps: [4, 2, 2, 4, 2, 2] },
  { id: 'e8', name: 'Eight eighths', steps: [2, 2, 2, 2, 2, 2, 2, 2] },
  { id: 'q.eh', name: 'Dotted quarter, eighth, half', steps: [6, 2, 8] },
  { id: 'q.eq.e', name: 'Dotted quarters', steps: [6, 2, 6, 2] },
  { id: 'eqeh', name: 'Syncopation', steps: [2, 4, 2, 8] },
  { id: 'ssssqqq', name: 'Sixteenths first', steps: [1, 1, 1, 1, 4, 4, 4] },
  { id: 'qssssqq', name: 'Sixteenths on beat 2', steps: [4, 1, 1, 1, 1, 4, 4] },
  { id: 'esseqq', name: 'Eighth, two sixteenths', steps: [2, 1, 1, 4, 4, 4] },
];

export function rhythmDef(id: string): RhythmDef {
  return RHYTHMS.find((r) => r.id === id) ?? RHYTHMS[0];
}

export type Voicing = 'root' | 'inversions';

export const VOICING_LABELS: Record<Voicing, string> = { root: 'Root position', inversions: 'Inversions' };

export const VOICING_HINTS: Record<Voicing, string> = {
  root: 'Every chord keeps its root as the lowest note, so the bass line follows the progression.',
  inversions: 'Chords move to the nearest inversion, the way a pianist would play them. The bass is harder to follow.',
};

/** Upper voices of the next chord, as close as possible to the previous one */
export function nearestVoicing(prev: number[], rootMidi: number, tones: number[]): number[] {
  const candidates: number[][] = [];
  for (let inv = 0; inv < tones.length; inv++) {
    const shifted = tones.map((t, i) => rootMidi + t + (i < inv ? 12 : 0)).sort((a, b) => a - b);
    for (const octaveShift of [-12, 0, 12]) candidates.push(shifted.map((m) => m + octaveShift));
  }
  const prevCenter = prev.reduce((s, m) => s + m, 0) / prev.length;
  const distance = (c: number[]) =>
    c.reduce((s, m, i) => s + Math.abs(m - (prev[i] ?? prevCenter)), 0);
  return candidates.reduce((best, c) => (distance(c) < distance(best) ? c : best));
}
