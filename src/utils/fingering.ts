/**
 * Beginner piano fingering using five-finger positions: each hand rests over
 * five neighbouring white keys, one finger per key, and moves only when a note
 * falls outside them. Sharps are played by the finger of the white key they
 * are written on (F# by the F finger).
 *
 * Fingers are numbered the standard way for both hands: 1 thumb, 2 index,
 * 3 middle, 4 ring, 5 pinky.
 */

export type Hand = 'left' | 'right';

/** What one hand should do right now */
export interface HandFingering {
  hand: Hand;
  /** Fingers to play with now; empty while this hand rests */
  fingers: number[];
  anchor: number;
  /** The hand moves to a new position for this note */
  moved: boolean;
  /** The thumb or pinky reaches one key past the position */
  stretch: boolean;
}

export interface FingeredOnset {
  /** One finger per note, in the order the notes were given */
  fingers: number[];
  /** White-key slot under the hand's lowest finger (right: thumb, left: pinky) */
  anchor: number;
}

const LETTERS = 'CDEFGAB';
// The span of a hand position, in white keys above its lowest key
const SPAN = 4;
const SHIFT_COST = 10;
// Reaching one key past the position with the thumb or pinky, without moving the hand
const STRETCH_COST = 4;
const BLACK_THUMB_COST = 3;
const BLACK_PINKY_COST = 1;

/** Position on the run of white keys: 'C4' and 'C#4' -> 28, 'D4' -> 29 */
export function whiteSlot(note: string): number {
  const match = note.match(/^([A-G])#?(\d)$/);
  if (!match) throw new Error(`Bad note "${note}"`);
  return Number(match[2]) * 7 + LETTERS.indexOf(match[1]);
}

export function slotNote(slot: number): string {
  return `${LETTERS[((slot % 7) + 7) % 7]}${Math.floor(slot / 7)}`;
}

/** Where each hand starts: right thumb on middle C, left pinky on the C below */
export const HOME_ANCHOR: Record<Hand, number> = { right: whiteSlot('C4'), left: whiteSlot('C3') };

/** Finger for a key, including a thumb or pinky stretched one key past the position */
export function fingerAt(hand: Hand, anchor: number, slot: number): number {
  const offset = Math.min(SPAN, Math.max(0, slot - anchor));
  return hand === 'right' ? offset + 1 : 5 - offset;
}

/** Whether playing `slot` from this position needs a stretch */
export function isStretch(anchor: number, slot: number): boolean {
  return slot < anchor || slot > anchor + SPAN;
}

/** Fingers for a chord too wide for one position: outer fingers on the outer notes, the rest spread between */
function stretchedFingers(hand: Hand, slots: number[]): number[] {
  const lo = Math.min(...slots);
  const hi = Math.max(...slots);
  // Right-hand fingers for the inner notes, low to high, kept distinct and in order
  const inner = [...new Set(slots.filter((s) => s !== lo && s !== hi))].sort((a, b) => a - b);
  const innerFinger = new Map<number, number>();
  let prev = 1;
  inner.forEach((s, i) => {
    const ideal = Math.min(4, Math.max(2, 1 + Math.round(((s - lo) / (hi - lo)) * 4)));
    // Leave room for the inner notes still to come
    const finger = Math.min(4 - (inner.length - 1 - i), Math.max(prev + 1, ideal));
    innerFinger.set(s, finger);
    prev = finger;
  });
  return slots.map((s) => {
    if (s === lo) return hand === 'right' ? 1 : 5;
    if (s === hi) return hand === 'right' ? 5 : 1;
    const rightFinger = innerFinger.get(s)!;
    return hand === 'right' ? rightFinger : 6 - rightFinger;
  });
}

/**
 * A natural and its sharp share a white-key slot (D and D♯), so they'd get the same finger.
 * The higher one moves to the next finger up the keyboard; null when there's no finger left.
 */
function splitShared(notes: string[], slots: number[], fingers: number[], hand: Hand): number[] | null {
  const result = [...fingers];
  const step = hand === 'right' ? 1 : -1;
  for (let i = 0; i < notes.length; i++) {
    for (let j = 0; j < notes.length; j++) {
      if (i !== j && slots[i] === slots[j] && notes[j].includes('#') && !notes[i].includes('#')) {
        result[j] = fingers[i] + step;
        if (result[j] < 1 || result[j] > 5) return null;
      }
    }
  }
  return result;
}

interface Candidate {
  anchor: number;
  fingers: number[];
  cost: number;
}

function candidates(notes: string[], hand: Hand): Candidate[] {
  const slots = notes.map(whiteSlot);
  const lo = Math.min(...slots);
  const hi = Math.max(...slots);
  if (hi - lo > SPAN) return [{ anchor: lo, fingers: stretchedFingers(hand, slots), cost: 0 }];

  const result: Candidate[] = [];
  for (let anchor = hi - SPAN - 1; anchor <= lo + 1; anchor++) {
    if (lo < anchor - 1 || hi > anchor + SPAN + 1) continue;
    const fingers = splitShared(notes, slots, slots.map((s) => fingerAt(hand, anchor, s)), hand);
    // A stretched finger can't also play the key inside the position, and no finger plays two keys
    if (!fingers || new Set(fingers).size < notes.length) continue;
    // Stretches only reach white keys
    if (notes.some((n, i) => n.includes('#') && isStretch(anchor, slots[i]))) continue;
    const cost = notes.reduce((sum, note, i) => {
      let c = isStretch(anchor, slots[i]) ? STRETCH_COST : 0;
      // Thumbs (and to a lesser degree pinkies) are awkward on black keys
      if (note.includes('#')) c += fingers[i] === 1 ? BLACK_THUMB_COST : fingers[i] === 5 ? BLACK_PINKY_COST : 0;
      return sum + c;
    }, 0);
    result.push({ anchor, fingers, cost });
  }
  return result;
}

function moveCost(from: number, to: number): number {
  return from === to ? 0 : SHIFT_COST + Math.abs(to - from);
}

/**
 * Fingers a passage for one hand, moving the hand as few times (and as little)
 * as possible. Each entry is a note or chord played at one moment.
 * `startAnchor` continues from a position the hand is already in.
 */
export function fingerPassage(passage: string[][], hand: Hand, startAnchor?: number): FingeredOnset[] {
  if (passage.length === 0) return [];
  const layers = passage.map((notes) => candidates(notes, hand));

  // Cheapest total cost of ending each onset at each candidate, and where it came from
  const best: number[][] = [];
  const from: number[][] = [];
  layers.forEach((layer, i) => {
    best.push([]);
    from.push([]);
    layer.forEach((c, k) => {
      if (i === 0) {
        // With nowhere to come from, lean towards the home position
        const start = startAnchor === undefined
          ? Math.abs(c.anchor - HOME_ANCHOR[hand]) * 0.2
          : moveCost(startAnchor, c.anchor);
        best[0][k] = c.cost + start;
        from[0][k] = -1;
        return;
      }
      let bestCost = Infinity;
      let bestPrev = 0;
      layers[i - 1].forEach((p, j) => {
        const cost = best[i - 1][j] + moveCost(p.anchor, c.anchor);
        if (cost < bestCost) {
          bestCost = cost;
          bestPrev = j;
        }
      });
      best[i][k] = bestCost + c.cost;
      from[i][k] = bestPrev;
    });
  });

  const last = best.length - 1;
  let k = best[last].indexOf(Math.min(...best[last]));
  const result: FingeredOnset[] = new Array(passage.length);
  for (let i = last; i >= 0; i--) {
    const c = layers[i][k];
    result[i] = { fingers: c.fingers, anchor: c.anchor };
    k = from[i][k];
  }
  return result;
}

/** The five white keys under a hand position, with the finger resting on each */
export function handKeys(hand: Hand, anchor: number): { note: string; finger: number }[] {
  return Array.from({ length: SPAN + 1 }, (_, i) => ({
    note: slotNote(anchor + i),
    finger: fingerAt(hand, anchor, anchor + i),
  }));
}

export const FINGER_NAMES: Record<number, string> = {
  1: 'thumb',
  2: 'index',
  3: 'middle',
  4: 'ring',
  5: 'pinky',
};

export const HAND_NAMES: Record<Hand, string> = { right: 'Right hand', left: 'Left hand' };

/** Where the thumb sits: the lowest key for the right hand, the highest for the left */
export function thumbNote(hand: Hand, anchor: number): string {
  return slotNote(hand === 'right' ? anchor : anchor + SPAN);
}

/** The hand for a staff: right plays treble, left plays bass */
export function handOfStaff(staff: 'treble' | 'bass'): Hand {
  return staff === 'treble' ? 'right' : 'left';
}
