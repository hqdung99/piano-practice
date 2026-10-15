import { ALL_NOTES } from './noteMapping';
import { HOME_ANCHOR, fingerPassage, handOfStaff, isStretch, whiteSlot } from './fingering';
import type { FingeredOnset, HandFingering } from './fingering';
import type { Staff } from './renderGrandStaff';
import { CHORD_TYPES, chordId } from './chordGame';
import { invert, midiToNote } from './earTraining/theory';

/** A preset range of notes, or the learner's own pick */
export type GameLevel = 'easy' | 'medium' | 'hard' | 'custom';

/** Notes picked for the custom level, per staff */
export type CustomNotes = Record<Staff, string[]>;

/** Single notes, two notes at once (an interval), or chords stacked on the staff */
export type GameContent = 'notes' | 'dyads' | 'chords';

export const CONTENT_LABELS: Record<GameContent, string> = { notes: '1 note', dyads: '2 notes', chords: 'Chords' };

export const NOTES_PER_ROUND = 8;

interface LevelRange {
  low: string;
  high: string;
  sharps: boolean;
}

const LEVELS: Record<Staff, Record<Exclude<GameLevel, 'custom'>, LevelRange>> = {
  treble: {
    easy: { low: 'C4', high: 'G4', sharps: false },
    medium: { low: 'C4', high: 'A5', sharps: false },
    hard: { low: 'A3', high: 'C6', sharps: true },
  },
  bass: {
    easy: { low: 'C3', high: 'G3', sharps: false },
    medium: { low: 'E2', high: 'C4', sharps: false },
    hard: { low: 'C2', high: 'E4', sharps: true },
  },
};

export const LEVEL_LABELS: Record<GameLevel, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  custom: 'Custom',
};

function notesIn({ low, high, sharps }: LevelRange): string[] {
  const lowMidi = ALL_NOTES.find((n) => n.note === low)!.midi;
  const highMidi = ALL_NOTES.find((n) => n.note === high)!.midi;
  return ALL_NOTES.filter(
    (n) => n.midi >= lowMidi && n.midi <= highMidi && (sharps || !n.isBlack)
  ).map((n) => n.note);
}

/** Every note the custom level can pick from on each staff: the hard range */
export const PICKABLE_NOTES: CustomNotes = {
  treble: notesIn(LEVELS.treble.hard),
  bass: notesIn(LEVELS.bass.hard),
};

/** Custom notes start as the medium level */
export const DEFAULT_CUSTOM: CustomNotes = {
  treble: notesIn(LEVELS.treble.medium),
  bass: notesIn(LEVELS.bass.medium),
};

export interface NotePreset {
  label: string;
  notes: string[];
}

const whites = (staff: Staff) => PICKABLE_NOTES[staff].filter((n) => !n.includes('#'));

/** Quick picks for the custom level */
export const NOTE_PRESETS: Record<Staff, NotePreset[]> = {
  treble: [
    { label: 'Middle C position', notes: ['C4', 'D4', 'E4', 'F4', 'G4'] },
    { label: 'Lines (E G B D F)', notes: ['E4', 'G4', 'B4', 'D5', 'F5'] },
    { label: 'Spaces (F A C E)', notes: ['F4', 'A4', 'C5', 'E5'] },
    { label: 'Ledger lines', notes: ['A3', 'B3', 'C4', 'A5', 'B5', 'C6'] },
    { label: 'All white keys', notes: whites('treble') },
    { label: 'Sharps', notes: PICKABLE_NOTES.treble.filter((n) => n.includes('#')) },
  ],
  bass: [
    { label: 'C position', notes: ['C3', 'D3', 'E3', 'F3', 'G3'] },
    { label: 'Lines (G B D F A)', notes: ['G2', 'B2', 'D3', 'F3', 'A3'] },
    { label: 'Spaces (A C E G)', notes: ['A2', 'C3', 'E3', 'G3'] },
    { label: 'Ledger lines', notes: ['C2', 'D2', 'E2', 'C4', 'D4', 'E4'] },
    { label: 'All white keys', notes: whites('bass') },
    { label: 'Sharps', notes: PICKABLE_NOTES.bass.filter((n) => n.includes('#')) },
  ],
};

function notePool(clef: Staff, level: GameLevel, custom: CustomNotes): string[] {
  return level === 'custom' ? custom[clef] : notesIn(LEVELS[clef][level]);
}

/** Staves the custom level can't play yet: no notes picked, or (for two notes at once) no pair to stack */
export function emptyCustomStaves(staves: GameStaves, custom: CustomNotes, content: GameContent = 'notes'): Staff[] {
  return stavesOf(staves).filter((staff) =>
    content === 'dyads' ? !canStackDyads(custom[staff]) : custom[staff].length === 0
  );
}

/** Small seeded random generator, so a page of notes can be made inside a reducer */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}

/**
 * Which staves the game reads from: one staff, both staves with each note on
 * either one (switching hands), or both staves at once (hands together)
 */
export type GameStaves = Staff | 'both' | 'together';

export const STAVES_LABELS: Record<GameStaves, string> = {
  treble: 'Treble',
  bass: 'Bass',
  both: 'Both',
  together: 'Together',
};

export const STAVES_HINTS: Record<GameStaves, string> = {
  treble: 'Right hand, treble staff.',
  bass: 'Left hand, bass staff.',
  both: 'Notes jump between the staves: treble with the right hand, bass with the left.',
  together: 'Every step has a treble and a bass note: press them at the same time.',
};

export function stavesOf(staves: GameStaves): Staff[] {
  return staves === 'both' || staves === 'together' ? ['treble', 'bass'] : [staves];
}

export function isGrandStaff(staves: GameStaves): boolean {
  return staves === 'both' || staves === 'together';
}

export interface GameNote {
  staff: Staff;
  note: string;
  finger: number;
  /** Written with a flat rather than a sharp */
  flat?: boolean;
}

export interface GameStep {
  notes: GameNote[];
  /** What each hand in the game does at this step, right hand first */
  hands: HandFingering[];
}

/** Where a hand ended up, so the next page carries on from there */
export interface HandMemory {
  anchor: number | null;
  /** Last note (or chord, joined with '+') this hand played */
  lastNote: string | null;
}

export interface HandsMemory {
  treble: HandMemory;
  bass: HandMemory;
  /** Staves of the last two steps, newest last */
  recent: Staff[];
}

export const EMPTY_MEMORY: HandsMemory = {
  treble: { anchor: null, lastNote: null },
  bass: { anchor: null, lastNote: null },
  recent: [],
};

export interface GamePage {
  steps: GameStep[];
  /** Seed for the page after this one */
  nextSeed: number;
  memory: HandsMemory;
}

// ---------- Two notes at once ----------

/** Gaps (in semitones) each level stacks: thirds to octaves first, then seconds, then anything */
const DYAD_GAPS: Record<GameLevel, number[]> = {
  easy: [3, 4, 5, 7, 12],
  medium: [2, 3, 4, 5, 7, 8, 9, 12],
  hard: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  custom: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

/** Every pair of notes from the staff's pool with a gap the level reads */
function dyadsFrom(pool: string[], level: GameLevel): string[][] {
  const midi = new Map(ALL_NOTES.map((n) => [n.note, n.midi]));
  const pairs: string[][] = [];
  for (const low of pool) {
    for (const high of pool) {
      const gap = midi.get(high)! - midi.get(low)!;
      if (DYAD_GAPS[level].includes(gap)) pairs.push([low, high]);
    }
  }
  return pairs;
}

/** Whether a custom pick has two notes far enough apart to stack */
export function canStackDyads(pool: string[]): boolean {
  return dyadsFrom(pool, 'custom').length > 0;
}

// ---------- Chords ----------

const ids = (list: [number, string][]) => list.map(([r, t]) => chordId(r, t));

/** Chords each level reads, as chord ids (`root:type`) */
export const CHORD_POOLS: Record<Exclude<GameLevel, 'custom'>, string[]> = {
  easy: ids([[0, ''], [5, ''], [7, '']]),
  medium: ids([[0, ''], [5, ''], [7, ''], [9, 'm'], [2, 'm'], [4, 'm']]),
  hard: ids([
    [0, ''], [5, ''], [7, ''], [9, 'm'], [2, 'm'], [4, 'm'], [2, ''], [9, ''], [4, ''], [11, 'm'], [6, 'm'],
    [7, '7'], [2, '7'], [0, 'maj7'], [9, 'm7'], [11, 'dim'],
  ]),
};

/** Easy chords stay in root position; harder ones come in any inversion */
function inversionsAllowed(level: GameLevel): boolean {
  return level !== 'easy';
}

/** Where a staff's chords may sit, and the lowest note they lean towards */
const CHORD_RANGES: Record<Staff, { low: number; high: number; home: number }> = {
  treble: { low: 60, high: 81, home: 60 },
  bass: { low: 41, high: 64, home: 48 },
};

const FLAT_MAJOR_ROOTS = new Set([1, 3, 5, 8, 10]);
const FLAT_MINOR_ROOTS = new Set([0, 3, 5, 7, 10]);
const MINOR_TYPES = new Set(['m', 'm7', 'dim', 'm7♭5', 'dim7']);

/** Chords from flat keys are written with flats, e.g. B♭ rather than A♯ */
function prefersFlats(root: number, type: string): boolean {
  return (MINOR_TYPES.has(type) ? FLAT_MINOR_ROOTS : FLAT_MAJOR_ROOTS).has(root);
}

interface PlacedChord {
  /** Piano note names, low to high */
  notes: string[];
  flat: boolean;
}

/** Every way to place a chord on a staff: each allowed inversion, at each octave that fits */
function placements(id: string, staff: Staff, inversions: boolean): PlacedChord[] {
  const [rootText, type] = id.split(':');
  const root = Number(rootText);
  const tones = (CHORD_TYPES.find((t) => t.id === type) ?? CHORD_TYPES[0]).tones;
  const { low, high, home } = CHORD_RANGES[staff];
  const flat = prefersFlats(root, type);
  const result: PlacedChord[] = [];
  const shifts = inversions ? tones.map((_, i) => i) : [0];
  for (const shift of shifts) {
    const shape = invert(tones, shift);
    // Step through the Cs, so `base + root` lands on the chord's root
    for (let base = Math.floor((low - 12) / 12) * 12; base <= high; base += 12) {
      const midis = shape.map((t) => base + root + t);
      // Stay within the staff's range and near where that hand usually plays
      if (midis[0] < low || midis[midis.length - 1] > high || Math.abs(midis[0] - home) > 9) continue;
      result.push({ notes: midis.map(midiToNote), flat });
    }
  }
  return result;
}

/** A random voicing on a staff of one of `ids`, never the same voicing as the last one */
function pickChord(ids: string[], staff: Staff, level: GameLevel, last: string | null, rand: () => number): PlacedChord {
  const options = ids.flatMap((id) => placements(id, staff, inversionsAllowed(level)));
  const fresh = options.filter((o) => o.notes.join('+') !== last);
  const from = fresh.length ? fresh : options;
  return from[Math.floor(rand() * from.length)] ?? { notes: ['C4', 'E4', 'G4'], flat: false };
}

/**
 * One page of random notes. A staff never repeats its last note (even across
 * pages), and each hand is fingered to carry on from where it was.
 */
export function generatePage(
  staves: GameStaves,
  level: GameLevel,
  seed: number,
  memory: HandsMemory = EMPTY_MEMORY,
  custom: CustomNotes = DEFAULT_CUSTOM,
  content: GameContent = 'notes',
  customChords: string[] = CHORD_POOLS.medium
): GamePage {
  const rand = mulberry32(seed);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const used = stavesOf(staves);
  const pools = { treble: notePool('treble', level, custom), bass: notePool('bass', level, custom) };
  const chordPool = level === 'custom' ? customChords : CHORD_POOLS[level];
  const last = { treble: memory.treble.lastNote, bass: memory.bass.lastNote };

  const raw: { staff: Staff; notes: string[]; flat: boolean }[][] = [];
  let lastChord: string | null = null;
  for (let i = 0; i < NOTES_PER_ROUND; i++) {
    // Hands together play the same chord, each hand in its own voicing
    let shared: string[] = chordPool;
    if (content === 'chords' && staves === 'together') {
      const fresh = chordPool.filter((id) => id !== lastChord);
      lastChord = pick(fresh.length ? fresh : chordPool);
      shared = [lastChord];
    }
    let staffs = staves === 'both' ? [pick(used)] : used;
    // Switching hands is the point, so neither staff gets more than two in a row
    const recent = [...memory.recent, ...raw.map((step) => step[0].staff)].slice(-2);
    if (staves === 'both' && recent.length === 2 && recent[0] === recent[1] && staffs[0] === recent[0]) {
      staffs = [recent[0] === 'treble' ? 'bass' : 'treble'];
    }
    raw.push(
      staffs.map((staff) => {
        if (content === 'dyads') {
          const pairs = dyadsFrom(pools[staff], level);
          const fresh = pairs.filter((p) => p.join('+') !== last[staff]);
          const pair = pick(fresh.length ? fresh : pairs) ?? [pools[staff][0]];
          last[staff] = pair.join('+');
          return { staff, notes: pair, flat: false };
        }
        if (content === 'chords') {
          const chord = pickChord(shared, staff, level, last[staff], rand);
          last[staff] = chord.notes.join('+');
          return { staff, notes: chord.notes, flat: chord.flat };
        }
        let note = pick(pools[staff]);
        // A one-note custom pick has to repeat
        while (note === last[staff] && pools[staff].length > 1) note = pick(pools[staff]);
        last[staff] = note;
        return { staff, notes: [note], flat: false };
      })
    );
  }

  // Finger each hand's own notes as one passage
  const fingered = new Map<string, FingeredOnset>();
  for (const staff of used) {
    const at = raw.flatMap((step, i) => step.filter((n) => n.staff === staff).map(() => i));
    const passage = fingerPassage(
      at.map((i) => raw[i].find((n) => n.staff === staff)!.notes),
      handOfStaff(staff),
      memory[staff].anchor ?? undefined
    );
    at.forEach((i, k) => fingered.set(`${staff}:${i}`, passage[k]));
  }

  const anchors: Record<Staff, number | null> = { treble: memory.treble.anchor, bass: memory.bass.anchor };
  const steps: GameStep[] = raw.map((step, i) => {
    const hands = used.map((staff): HandFingering => {
      const hand = handOfStaff(staff);
      const here = fingered.get(`${staff}:${i}`);
      if (!here) {
        // A resting hand waits where it was, or where its next note will be
        const upcoming = raw.findIndex((s, j) => j > i && s.some((n) => n.staff === staff));
        const anchor = anchors[staff] ?? fingered.get(`${staff}:${upcoming}`)?.anchor ?? HOME_ANCHOR[hand];
        return { hand, fingers: [], anchor, moved: false, stretch: false };
      }
      const notes = step.find((n) => n.staff === staff)!.notes;
      const before = anchors[staff];
      anchors[staff] = here.anchor;
      return {
        hand,
        fingers: here.fingers,
        anchor: here.anchor,
        moved: before !== null && before !== here.anchor,
        stretch: notes.some((n) => isStretch(here.anchor, whiteSlot(n))),
      };
    });
    // A chord is one note per key, each with its own finger
    const notes = step.flatMap((n) =>
      n.notes.map((note, k) => ({ staff: n.staff, note, flat: n.flat, finger: fingered.get(`${n.staff}:${i}`)!.fingers[k] }))
    );
    return { notes, hands };
  });

  return {
    steps,
    nextSeed: Math.floor(rand() * 2 ** 32),
    memory: {
      treble: { anchor: anchors.treble, lastNote: last.treble },
      bass: { anchor: anchors.bass, lastNote: last.bass },
      recent: raw.slice(-2).map((step) => step[0].staff),
    },
  };
}

const FLAT_OF: Record<string, string> = { 'C#': 'db', 'D#': 'eb', 'F#': 'gb', 'G#': 'ab', 'A#': 'bb' };

/** 'C#4' -> 'c#/4', or 'db/4' when written with a flat */
export function toVexKey(note: string, flat = false): string {
  const match = note.match(/^([A-G]#?)(\d)$/)!;
  const name = flat && FLAT_OF[match[1]] ? FLAT_OF[match[1]] : match[1].toLowerCase();
  return `${name}/${match[2]}`;
}
