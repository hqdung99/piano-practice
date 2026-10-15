/** Theory 101: short slide lessons on reading music, with sound examples */

export interface TheoryExample {
  label: string;
  /** Notes in order; '+' joins notes played together, e.g. 'C4+E4+G4' */
  notes: string[];
  /** Length of each note in ms */
  ms?: number[];
}

export interface TheorySlide {
  title: string;
  body: string;
  examples?: TheoryExample[];
}

export interface TheoryLesson {
  id: string;
  title: string;
  subtitle: string;
  slides: TheorySlide[];
}

const Q = 500;

export const THEORY_LESSONS: TheoryLesson[] = [
  {
    id: 't-keyboard',
    title: 'The keyboard',
    subtitle: 'White keys, black keys and octaves.',
    slides: [
      {
        title: 'Groups of two and three',
        body: 'Black keys come in groups of two and three. They are your map: every white key can be found from them.',
      },
      {
        title: 'Finding C',
        body: 'C is the white key just left of each group of two black keys. The C nearest the middle of the piano is middle C (C4).',
        examples: [{ label: 'Middle C', notes: ['C4'] }],
      },
      {
        title: 'The musical alphabet',
        body: 'White keys are named A B C D E F G, then the letters start again. From one C to the next is an octave: same name, higher sound.',
        examples: [
          { label: 'C D E F G A B C', notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'] },
          { label: 'Octave C4 → C5', notes: ['C4', 'C5'] },
        ],
      },
    ],
  },
  {
    id: 't-staff',
    title: 'The staff and clefs',
    subtitle: 'Where notes are written.',
    slides: [
      {
        title: 'Five lines',
        body: 'Music is written on a staff of five lines. Notes sit on lines or in the spaces between them; higher on the staff means higher in pitch.',
      },
      {
        title: 'Treble clef',
        body: 'The treble clef (𝄞) curls around the second line, which is G above middle C. The right hand usually reads this staff.',
        examples: [{ label: 'G4', notes: ['G4'] }],
      },
      {
        title: 'Bass clef',
        body: 'The bass clef (𝄢) has two dots around the fourth line, which is F below middle C. The left hand usually reads this staff.',
        examples: [{ label: 'F3', notes: ['F3'] }],
      },
      {
        title: 'The grand staff',
        body: 'Piano music joins both staves with a brace. Middle C sits on its own short line (a ledger line) between them.',
        examples: [{ label: 'F3 → middle C → G4', notes: ['F3', 'C4', 'G4'] }],
      },
    ],
  },
  {
    id: 't-reading',
    title: 'Reading notes',
    subtitle: 'Shortcuts for the lines and spaces.',
    slides: [
      {
        title: 'Treble staff',
        body: 'Lines, bottom to top: E G B D F — "Every Good Boy Does Fine". Spaces spell FACE.',
        examples: [
          { label: 'Lines E G B D F', notes: ['E4', 'G4', 'B4', 'D5', 'F5'] },
          { label: 'Spaces F A C E', notes: ['F4', 'A4', 'C5', 'E5'] },
        ],
      },
      {
        title: 'Bass staff',
        body: 'Lines, bottom to top: G B D F A — "Good Boys Do Fine Always". Spaces: A C E G — "All Cows Eat Grass".',
        examples: [
          { label: 'Lines G B D F A', notes: ['G2', 'B2', 'D3', 'F3', 'A3'] },
          { label: 'Spaces A C E G', notes: ['A2', 'C3', 'E3', 'G3'] },
        ],
      },
      {
        title: 'Steps and skips',
        body: 'Line to the next space is a step (next key). Line to the next line is a skip (one key missed). Reading the shape of a melody is faster than naming every note.',
        examples: [
          { label: 'Steps C D E F G', notes: ['C4', 'D4', 'E4', 'F4', 'G4'] },
          { label: 'Skips C E G', notes: ['C4', 'E4', 'G4'] },
        ],
      },
    ],
  },
  {
    id: 't-rhythm',
    title: 'Rhythm',
    subtitle: 'How long each note lasts.',
    slides: [
      {
        title: 'Note values',
        body: 'A whole note lasts 4 beats, a half note 2, a quarter note 1, and an eighth note half a beat. A dot adds half the value again: a dotted half lasts 3 beats.',
        examples: [
          { label: 'Whole · half · quarter · eighths', notes: ['C4', 'C4', 'C4', 'C4', 'C4'], ms: [4 * Q, 2 * Q, Q, Q / 2, Q / 2] },
        ],
      },
      {
        title: 'Rests',
        body: 'Rests are silences with the same values as notes. Keep counting through them.',
      },
      {
        title: 'Time signatures',
        body: 'The two numbers at the start tell you the beats in each bar: 4/4 is four quarter-note beats, 3/4 is three (a waltz). Bar lines split the music into these groups.',
        examples: [
          { label: '4/4: ONE two three four', notes: ['C4+E4', 'E4', 'E4', 'E4'], ms: [Q, Q, Q, Q] },
          { label: '3/4: ONE two three', notes: ['C4+E4', 'E4', 'E4'], ms: [Q, Q, Q] },
        ],
      },
    ],
  },
  {
    id: 't-accidentals',
    title: 'Sharps, flats and steps',
    subtitle: 'The black keys and half steps.',
    slides: [
      {
        title: 'Half and whole steps',
        body: 'A half step is from one key to the very next, black or white. A whole step is two half steps. E–F and B–C are half steps with no black key between.',
        examples: [
          { label: 'Half step C → C♯', notes: ['C4', 'C#4'] },
          { label: 'Whole step C → D', notes: ['C4', 'D4'] },
        ],
      },
      {
        title: 'Sharps and flats',
        body: 'A sharp (♯) raises a note by a half step, a flat (♭) lowers it. The same black key has two names: C♯ is D♭.',
        examples: [{ label: 'F → F♯ → G', notes: ['F4', 'F#4', 'G4'] }],
      },
      {
        title: 'Key signatures',
        body: 'Sharps or flats written right after the clef apply to the whole piece. Minuet in G has one sharp, so every F is played as F♯.',
        examples: [{ label: 'G major scale', notes: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'] }],
      },
    ],
  },
  {
    id: 't-chords',
    title: 'Intervals and chords',
    subtitle: 'Building chords from thirds.',
    slides: [
      {
        title: 'Intervals',
        body: 'An interval is the distance between two notes, counted by letter names: C to E is a 3rd (C D E), C to G a 5th.',
        examples: [
          { label: '3rd C–E', notes: ['C4', 'E4'] },
          { label: '5th C–G', notes: ['C4', 'G4'] },
        ],
      },
      {
        title: 'Triads',
        body: 'A triad stacks two 3rds: root, 3rd and 5th. C–E–G is the C chord. On the staff its notes sit on three lines or three spaces in a row.',
        examples: [{ label: 'C chord', notes: ['C4+E4+G4'], ms: [1500] }],
      },
      {
        title: 'Major and minor',
        body: 'Major chords sound bright: 4 half steps then 3 (C–E–G). Minor chords sound darker: 3 then 4 (A–C–E). A chord symbol like Am means A minor.',
        examples: [
          { label: 'C major', notes: ['C4+E4+G4'], ms: [1500] },
          { label: 'A minor', notes: ['A3+C4+E4'], ms: [1500] },
        ],
      },
      {
        title: 'Inversions',
        body: 'The same notes in a different order are an inversion: E–G–C and G–C–E are still C. Inversions let your hand move less between chords. A slash chord like G/B means G with B in the bass.',
        examples: [{ label: 'C, then its inversions', notes: ['C4+E4+G4', 'E4+G4+C5', 'G4+C5+E5'], ms: [900, 900, 1200] }],
      },
    ],
  },
  {
    id: 't-fingering',
    title: 'Fingering',
    subtitle: 'Numbers for your fingers.',
    slides: [
      {
        title: 'Finger numbers',
        body: 'Both hands number their fingers the same way: 1 thumb, 2 index, 3 middle, 4 ring, 5 pinky. Numbers above or below notes tell you which finger to use.',
      },
      {
        title: 'Five-finger positions',
        body: 'Rest one finger on each of five neighbouring keys. In C position the right thumb is on middle C; the left pinky is on the C below.',
        examples: [{ label: 'Right hand C position', notes: ['C4', 'D4', 'E4', 'F4', 'G4'] }],
      },
      {
        title: 'Passing the thumb',
        body: 'Scales need more than five notes: the thumb tucks under the hand to start a new position (right hand C D E, thumb under to F).',
        examples: [{ label: 'C major scale', notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'] }],
      },
    ],
  },
];
