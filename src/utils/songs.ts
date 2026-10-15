/**
 * Built-in practice songs. All melodies are public domain; the left-hand
 * parts are simple original accompaniments.
 *
 * Notation, per hand: bars separated by '|', tokens by spaces.
 *   NOTE[+NOTE...]:DUR   e.g. C4:q, C3+E3+G3:h, F#4:8
 *   r:DUR                rest
 * DUR is w, h, q, 8 or 16, optionally followed by '.' (dotted) and/or '~'
 * (tied to the next note).
 *
 * Optional written fingering, per hand: one token per note or chord that is
 * struck (tied-on notes don't count), with one digit per note in the order the
 * notes are written, e.g. '1 2 3 1' or '531' for C3+E3+G3. Hands without it are
 * fingered automatically.
 *
 * Optional chord symbols: one per bar, separated by '|', '-' for none.
 */

export interface SongSource {
  id: string;
  title: string;
  composer: string;
  bpm: number;
  beats: number;
  keySignature: string;
  treble: string;
  bass: string;
  /** Exercises, chord studies and imported songs are listed apart from songs */
  category?: 'song' | 'exercise' | 'chords' | 'imported';
  /** Chord symbols, one per bar */
  chords?: string;
  /** What the exercise trains */
  description?: string;
  fingers?: { treble?: string; bass?: string };
}

export const SONGS: SongSource[] = [
  {
    id: 'mary',
    title: 'Mary Had a Little Lamb',
    composer: 'Traditional',
    bpm: 100,
    beats: 4,
    keySignature: 'C',
    treble: `
      E4:q D4:q C4:q D4:q | E4:q E4:q E4:h | D4:q D4:q D4:h | E4:q G4:q G4:h |
      E4:q D4:q C4:q D4:q | E4:q E4:q E4:q E4:q | D4:q D4:q E4:q D4:q | C4:w`,
    bass: `
      C3:w | C3:w | G3:w | C3:w |
      C3:w | C3:w | G3:w | C3:w`,
  },
  {
    id: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    composer: 'Traditional',
    bpm: 100,
    beats: 4,
    keySignature: 'C',
    treble: `
      C4:q C4:q G4:q G4:q | A4:q A4:q G4:h | F4:q F4:q E4:q E4:q | D4:q D4:q C4:h |
      G4:q G4:q F4:q F4:q | E4:q E4:q D4:h | G4:q G4:q F4:q F4:q | E4:q E4:q D4:h |
      C4:q C4:q G4:q G4:q | A4:q A4:q G4:h | F4:q F4:q E4:q E4:q | D4:q D4:q C4:h`,
    bass: `
      C3:w | F3:h C3:h | F3:h C3:h | G3:h C3:h |
      C3:h G3:h | C3:h G3:h | C3:h G3:h | C3:h G3:h |
      C3:w | F3:h C3:h | F3:h C3:h | G3:h C3:h`,
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    composer: 'Ludwig van Beethoven',
    bpm: 96,
    beats: 4,
    keySignature: 'C',
    treble: `
      E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | E4:q. D4:8 D4:h |
      E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | D4:q. C4:8 C4:h |
      D4:q D4:q E4:q C4:q | D4:q E4:8 F4:8 E4:q C4:q | D4:q E4:8 F4:8 E4:q D4:q | C4:q D4:q G3:h |
      E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | D4:q. C4:8 C4:h`,
    bass: `
      C3:w | G3:w | C3:w | C3:h G3:h |
      C3:w | G3:w | C3:w | G3:h C3:h |
      G3:h C3:h | G3:h C3:h | G3:h C3:h | C3:h G3:h |
      C3:w | G3:w | C3:w | G3:h C3:h`,
  },
  {
    id: 'minuet-in-g',
    title: 'Minuet in G',
    composer: 'Christian Petzold',
    bpm: 110,
    beats: 3,
    keySignature: 'G',
    treble: `
      D5:q G4:8 A4:8 B4:8 C5:8 | D5:q G4:q G4:q | E5:q C5:8 D5:8 E5:8 F#5:8 | G5:q G4:q G4:q |
      C5:q D5:8 C5:8 B4:8 A4:8 | B4:q C5:8 B4:8 A4:8 G4:8 | F#4:q G4:8 A4:8 B4:8 G4:8 | A4:h. |
      D5:q G4:8 A4:8 B4:8 C5:8 | D5:q G4:q G4:q | E5:q C5:8 D5:8 E5:8 F#5:8 | G5:q G4:q G4:q |
      C5:q D5:8 C5:8 B4:8 A4:8 | B4:q C5:8 B4:8 A4:8 G4:8 | A4:q B4:8 A4:8 G4:8 F#4:8 | G4:h.`,
    bass: `
      G3:h A3:q | B3:h. | C4:h. | B3:h. |
      A3:h. | G3:h. | D3:h. | D3:h F#3:q |
      G3:h A3:q | B3:h. | C4:h. | B3:h. |
      A3:h. | G3:h. | D3:h. | G3:h.`,
  },
  // ---------- Hand coordination exercises ----------
  {
    id: 'ex-five-parallel',
    title: 'Five-finger pattern · parallel',
    composer: 'Exercise',
    category: 'exercise',
    description: 'Both hands in C position move the same way. The fingers differ: right thumb with left pinky.',
    bpm: 90,
    beats: 4,
    keySignature: 'C',
    treble: `
      C4:q D4:q E4:q F4:q | G4:q F4:q E4:q D4:q | C4:q D4:q E4:q F4:q | G4:q F4:q E4:q D4:q | C4:w`,
    bass: `
      C3:q D3:q E3:q F3:q | G3:q F3:q E3:q D3:q | C3:q D3:q E3:q F3:q | G3:q F3:q E3:q D3:q | C3:w`,
  },
  {
    id: 'ex-five-contrary',
    title: 'Five-finger pattern · contrary motion',
    composer: 'Exercise',
    category: 'exercise',
    description: 'Both thumbs start on C and the hands move apart: the same finger number plays in each hand.',
    bpm: 90,
    beats: 4,
    keySignature: 'C',
    treble: `
      C4:q D4:q E4:q F4:q | G4:q F4:q E4:q D4:q | C4:q D4:q E4:q F4:q | G4:q F4:q E4:q D4:q | C4:w`,
    bass: `
      C3:q B2:q A2:q G2:q | F2:q G2:q A2:q B2:q | C3:q B2:q A2:q G2:q | F2:q G2:q A2:q B2:q | C3:w`,
  },
  {
    id: 'ex-scale-parallel',
    title: 'C major scale · parallel',
    composer: 'Exercise',
    category: 'exercise',
    description: 'One octave up and down. Right thumb passes under after E; left 3rd finger crosses over after G.',
    bpm: 80,
    beats: 4,
    keySignature: 'C',
    treble: `
      C4:q D4:q E4:q F4:q | G4:q A4:q B4:q C5:q | B4:q A4:q G4:q F4:q | E4:q D4:q C4:h`,
    bass: `
      C3:q D3:q E3:q F3:q | G3:q A3:q B3:q C4:q | B3:q A3:q G3:q F3:q | E3:q D3:q C3:h`,
    fingers: {
      treble: '1 2 3 1 2 3 4 5 4 3 2 1 3 2 1',
      bass: '5 4 3 2 1 3 2 1 2 3 1 2 3 4 5',
    },
  },
  {
    id: 'ex-scale-contrary',
    title: 'C major scale · contrary motion',
    composer: 'Exercise',
    category: 'exercise',
    description: 'Hands start on C and move apart. Both thumbs pass under at the same moment, a good first scale hands together.',
    bpm: 80,
    beats: 4,
    keySignature: 'C',
    treble: `
      C4:q D4:q E4:q F4:q | G4:q A4:q B4:q C5:q | B4:q A4:q G4:q F4:q | E4:q D4:q C4:h`,
    bass: `
      C3:q B2:q A2:q G2:q | F2:q E2:q D2:q C2:q | D2:q E2:q F2:q G2:q | A2:q B2:q C3:h`,
    fingers: {
      treble: '1 2 3 1 2 3 4 5 4 3 2 1 3 2 1',
      bass: '1 2 3 1 2 3 4 5 4 3 2 1 3 2 1',
    },
  },
  {
    id: 'ex-mary-chords',
    title: 'Melody + block chords',
    composer: 'Exercise · Mary Had a Little Lamb',
    category: 'exercise',
    description: 'Right hand plays the tune while the left holds C and G chords. The left hand moves down one key for G.',
    bpm: 90,
    beats: 4,
    keySignature: 'C',
    treble: `
      E4:q D4:q C4:q D4:q | E4:q E4:q E4:h | D4:q D4:q D4:h | E4:q G4:q G4:h |
      E4:q D4:q C4:q D4:q | E4:q E4:q E4:q E4:q | D4:q D4:q E4:q D4:q | C4:w`,
    bass: `
      C3+E3+G3:w | C3+E3+G3:w | B2+D3+G3:w | C3+E3+G3:w |
      C3+E3+G3:w | C3+E3+G3:w | B2+D3+G3:w | C3+E3+G3:w`,
    fingers: { bass: '531 531 531 531 531 531 531 531' },
  },
  {
    id: 'ex-ode-broken',
    title: 'Melody + broken chords',
    composer: 'Exercise · Ode to Joy',
    category: 'exercise',
    description: 'The left hand plays chord notes one at a time, on every beat, under the melody: true hand independence.',
    bpm: 80,
    beats: 4,
    keySignature: 'C',
    treble: `
      E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | E4:q. D4:8 D4:h |
      E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | D4:q. C4:8 C4:h`,
    bass: `
      C3:q G3:q E3:q G3:q | B2:q G3:q D3:q G3:q | C3:q G3:q E3:q G3:q | B2:q G3:q D3:q G3:q |
      C3:q G3:q E3:q G3:q | B2:q G3:q D3:q G3:q | C3:q G3:q E3:q G3:q | B2:q G3:q C3:h`,
  },
  // ---------- Chord studies (Chords track) ----------
  {
    id: 'ch-cfg',
    title: 'C, F and G chords',
    composer: 'Chord study',
    category: 'chords',
    description: 'The three chords of countless songs, left hand in root position. Lift and move the whole hand.',
    bpm: 70,
    beats: 4,
    keySignature: 'C',
    chords: 'C | F | G | C | F | C | G | C',
    treble: `r:w | r:w | r:w | r:w | r:w | r:w | r:w | r:w`,
    bass: `
      C3+E3+G3:w | F3+A3+C4:w | G3+B3+D4:w | C3+E3+G3:w |
      F3+A3+C4:w | C3+E3+G3:w | G3+B3+D4:w | C3+E3+G3:w`,
    fingers: { bass: '531 531 531 531 531 531 531 531' },
  },
  {
    id: 'ch-inversions',
    title: 'Close chords (inversions)',
    composer: 'Chord study',
    category: 'chords',
    description: 'The same C, F and G, played as inversions so the hand barely moves: F/C and G/B.',
    bpm: 70,
    beats: 4,
    keySignature: 'C',
    chords: 'C | F/C | G/B | C | F/C | C | G/B | C',
    treble: `r:w | r:w | r:w | r:w | r:w | r:w | r:w | r:w`,
    bass: `
      C3+E3+G3:w | C3+F3+A3:w | B2+D3+G3:w | C3+E3+G3:w |
      C3+F3+A3:w | C3+E3+G3:w | B2+D3+G3:w | C3+E3+G3:w`,
    fingers: { bass: '531 521 531 531 521 531 531 531' },
  },
  {
    id: 'ch-pop-four',
    title: 'Four-chord pop (I–V–vi–IV)',
    composer: 'Chord study',
    category: 'chords',
    description: 'The progression behind hundreds of hits, with a simple right-hand tune on top.',
    bpm: 80,
    beats: 4,
    keySignature: 'C',
    chords: 'C | G/B | Am | F/A | C | G/B | F/A | C',
    treble: `
      E4:q E4:q G4:h | D4:q D4:q G4:h | C4:q C4:q E4:h | F4:q E4:q F4:h |
      E4:q G4:q G4:h | D4:q G4:q D4:h | C4:q F4:q A4:h | G4:q E4:q C4:h`,
    bass: `
      C3+E3+G3:w | B2+D3+G3:w | A2+C3+E3:w | A2+C3+F3:w |
      C3+E3+G3:w | B2+D3+G3:w | A2+C3+F3:w | C3+E3+G3:w`,
    fingers: { bass: '531 531 531 521 531 531 521 531' },
  },
  {
    id: 'ch-rhythm',
    title: 'Pulse the chords',
    composer: 'Chord study',
    category: 'chords',
    description: 'Chords on every beat, the way a band keeps time. Keep the beat steady through the changes.',
    bpm: 80,
    beats: 4,
    keySignature: 'C',
    chords: 'C | Am | F/A | G/B | C | Am | G/B | C',
    treble: `r:w | r:w | r:w | r:w | r:w | r:w | r:w | r:w`,
    bass: `
      C3+E3+G3:q C3+E3+G3:q C3+E3+G3:q C3+E3+G3:q | A2+C3+E3:q A2+C3+E3:q A2+C3+E3:q A2+C3+E3:q |
      A2+C3+F3:q A2+C3+F3:q A2+C3+F3:q A2+C3+F3:q | B2+D3+G3:q B2+D3+G3:q B2+D3+G3:q B2+D3+G3:q |
      C3+E3+G3:q C3+E3+G3:q C3+E3+G3:q C3+E3+G3:q | A2+C3+E3:q A2+C3+E3:q A2+C3+E3:q A2+C3+E3:q |
      B2+D3+G3:q B2+D3+G3:q B2+D3+G3:q B2+D3+G3:q | C3+E3+G3:w`,
    fingers: { bass: '531 531 531 531 531 531 531 531 521 521 521 521 531 531 531 531 531 531 531 531 531 531 531 531 531 531 531 531 531' },
  },
  {
    id: 'ch-broken',
    title: 'Broken chords',
    composer: 'Chord study',
    category: 'chords',
    description: 'Root, fifth, third, fifth: the chord one note at a time, a classic left-hand accompaniment.',
    bpm: 80,
    beats: 4,
    keySignature: 'C',
    chords: 'C | Am | F | G | C | Am | G | C',
    treble: `r:w | r:w | r:w | r:w | r:w | r:w | r:w | r:w`,
    bass: `
      C3:q G3:q E3:q G3:q | A2:q E3:q C3:q E3:q | F2:q C3:q A2:q C3:q | G2:q D3:q B2:q D3:q |
      C3:q G3:q E3:q G3:q | A2:q E3:q C3:q E3:q | G2:q D3:q B2:q D3:q | C3:w`,
  },
  {
    id: 'ch-arpeggio',
    title: 'Arpeggios',
    composer: 'Chord study',
    category: 'chords',
    description: 'The right hand rolls each chord up to the octave and back while the left holds the root.',
    bpm: 70,
    beats: 4,
    keySignature: 'C',
    chords: 'C | Am | F | G | C | Am | G | C',
    treble: `
      C4:8 E4:8 G4:8 C5:8 G4:8 E4:8 C4:8 E4:8 | A3:8 C4:8 E4:8 A4:8 E4:8 C4:8 A3:8 C4:8 |
      F4:8 A4:8 C5:8 F5:8 C5:8 A4:8 F4:8 A4:8 | G3:8 B3:8 D4:8 G4:8 D4:8 B3:8 G3:8 B3:8 |
      C4:8 E4:8 G4:8 C5:8 G4:8 E4:8 C4:8 E4:8 | A3:8 C4:8 E4:8 A4:8 E4:8 C4:8 A3:8 C4:8 |
      G3:8 B3:8 D4:8 G4:8 D4:8 B3:8 G3:8 B3:8 | C4:8 E4:8 G4:8 C5:8 C5:h`,
    bass: `C3:w | A2:w | F2:w | G2:w | C3:w | A2:w | G2:w | C3:w`,
    fingers: { treble: '1 2 3 5 3 2 1 2 1 2 3 5 3 2 1 2 1 2 3 5 3 2 1 2 1 2 3 5 3 2 1 2 1 2 3 5 3 2 1 2 1 2 3 5 3 2 1 2 1 2 3 5 3 2 1 2 1 2 3 5 5' },
  },
];
