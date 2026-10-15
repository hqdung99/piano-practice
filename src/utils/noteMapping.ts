export interface NoteInfo {
  note: string;
  midi: number;
  isBlack: boolean;
  octave: number;
  keyboardShortcut?: string;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_NOTES = new Set(['C#', 'D#', 'F#', 'G#', 'A#']);

function buildAllNotes(): NoteInfo[] {
  const notes: NoteInfo[] = [];
  // Piano starts at A0 (MIDI 21) and ends at C8 (MIDI 108)
  for (let midi = 21; midi <= 108; midi++) {
    const noteIndex = (midi - 12) % 12;
    const octave = Math.floor((midi - 12) / 12);
    const noteName = NOTE_NAMES[noteIndex];
    notes.push({
      note: `${noteName}${octave}`,
      midi,
      isBlack: BLACK_NOTES.has(noteName),
      octave,
    });
  }
  return notes;
}

// Computer keyboard -> note mapping (two octaves around middle C)
const KEYBOARD_MAP: Record<string, string> = {
  // C4 - B4 white keys
  'a': 'C4',
  's': 'D4',
  'd': 'E4',
  'f': 'F4',
  'g': 'G4',
  'h': 'A4',
  'j': 'B4',
  // C5 - E5 white keys
  'k': 'C5',
  'l': 'D5',
  ';': 'E5',
  "'": 'F5',
  // C4 - B4 black keys
  'w': 'C#4',
  'e': 'D#4',
  't': 'F#4',
  'y': 'G#4',
  'u': 'A#4',
  // C5 - D#5 black keys
  'o': 'C#5',
  'p': 'D#5',
  // Lower octave C3 - B3
  'z': 'C3',
  'x': 'D3',
  'c': 'E3',
  'v': 'F3',
  'b': 'G3',
  'n': 'A3',
  'm': 'B3',
  // C3 - B3 black keys
  '1': 'C#3',
  '2': 'D#3',
  '4': 'F#3',
  '5': 'G#3',
  '6': 'A#3',
};

// Reverse map: note -> keyboard key
const NOTE_TO_KEY: Record<string, string> = {};
for (const [key, note] of Object.entries(KEYBOARD_MAP)) {
  NOTE_TO_KEY[note] = key;
}

export const ALL_NOTES: NoteInfo[] = buildAllNotes().map((n) => ({
  ...n,
  keyboardShortcut: NOTE_TO_KEY[n.note],
}));

export const WHITE_NOTES: NoteInfo[] = ALL_NOTES.filter((n) => !n.isBlack);
export const BLACK_NOTES_LIST: NoteInfo[] = ALL_NOTES.filter((n) => n.isBlack);

export { KEYBOARD_MAP, NOTE_TO_KEY };

export function getNoteFromKey(key: string): string | undefined {
  return KEYBOARD_MAP[key.toLowerCase()] ?? KEYBOARD_MAP[key];
}
