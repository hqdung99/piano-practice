/**
 * Converts timed piano notes into quantized measures for a grand staff.
 * Time is measured in 16th-note steps; measures are 4/4.
 */

export interface SheetNote {
  note: string;
  /** ms since the first note was written */
  start: number;
  /** ms since the first note was written, null while the key is still held */
  end: number | null;
}

export interface Segment {
  /** VexFlow keys like 'c#/4'; empty for a rest */
  keys: string[];
  duration: string;
  dots: number;
  /** Tied to the next segment on the same staff */
  tie: boolean;
  /** A rest filling the whole measure */
  fullMeasure: boolean;
}

export interface Measure {
  treble: Segment[];
  bass: Segment[];
}

export const STEPS_PER_MEASURE = 16;

/** Quantize grid, in 16th-note steps */
export const GRIDS = [
  { label: '1/4', steps: 4 },
  { label: '1/8', steps: 2 },
  { label: '1/16', steps: 1 },
] as const;
export type GridSteps = (typeof GRIDS)[number]['steps'];
const MIDDLE_C_MIDI = 60;
const NOTE_INDEX: Record<string, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

// Largest first, so greedy decomposition picks the fewest notes
const DURATIONS: { steps: number; duration: string; dots: number }[] = [
  { steps: 16, duration: 'w', dots: 0 },
  { steps: 12, duration: 'h', dots: 1 },
  { steps: 8, duration: 'h', dots: 0 },
  { steps: 6, duration: 'q', dots: 1 },
  { steps: 4, duration: 'q', dots: 0 },
  { steps: 3, duration: '8', dots: 1 },
  { steps: 2, duration: '8', dots: 0 },
  { steps: 1, duration: '16', dots: 0 },
];

interface ParsedNote {
  midi: number;
  key: string;
}

function parseNote(note: string): ParsedNote | null {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return null;
  const [, name, octave] = match;
  return {
    midi: (Number(octave) + 1) * 12 + NOTE_INDEX[name],
    key: `${name.toLowerCase()}/${octave}`,
  };
}

interface TimelineEvent {
  start: number;
  end: number;
  keys: string[];
}

interface QuantizedNote {
  start: number;
  end: number;
  key: string;
  midi: number;
}

/**
 * Collapses a staff's notes into a single voice: notes starting on the same
 * step form a chord, and a chord is cut short when the next one begins.
 */
function buildTimeline(notes: QuantizedNote[]): TimelineEvent[] {
  const byStart = new Map<number, QuantizedNote[]>();
  for (const n of notes) {
    const group = byStart.get(n.start) ?? [];
    group.push(n);
    byStart.set(n.start, group);
  }

  const starts = [...byStart.keys()].sort((a, b) => a - b);
  return starts.map((start, i) => {
    const group = byStart.get(start)!.sort((a, b) => a.midi - b.midi);
    const keys = [...new Set(group.map((n) => n.key))];
    let end = Math.max(...group.map((n) => n.end));
    if (i + 1 < starts.length) end = Math.min(end, starts[i + 1]);
    return { start, end, keys };
  });
}

function splitIntoMeasures(timeline: TimelineEvent[], totalSteps: number): Segment[][] {
  // Fill gaps with rests so the timeline covers [0, totalSteps)
  const filled: TimelineEvent[] = [];
  let cursor = 0;
  for (const ev of timeline) {
    if (ev.start > cursor) filled.push({ start: cursor, end: ev.start, keys: [] });
    filled.push(ev);
    cursor = ev.end;
  }
  if (cursor < totalSteps) filled.push({ start: cursor, end: totalSteps, keys: [] });

  const measures: Segment[][] = Array.from(
    { length: totalSteps / STEPS_PER_MEASURE },
    () => []
  );

  for (const ev of filled) {
    let pos = ev.start;
    while (pos < ev.end) {
      const measureIndex = Math.floor(pos / STEPS_PER_MEASURE);
      const barline = (measureIndex + 1) * STEPS_PER_MEASURE;
      const pieceEnd = Math.min(ev.end, barline);
      let remaining = pieceEnd - pos;
      while (remaining > 0) {
        const d = DURATIONS.find((x) => x.steps <= remaining)!;
        remaining -= d.steps;
        pos += d.steps;
        measures[measureIndex].push({
          keys: ev.keys,
          duration: d.duration,
          dots: d.dots,
          tie: ev.keys.length > 0 && pos < ev.end,
          fullMeasure: ev.keys.length === 0 && d.steps === STEPS_PER_MEASURE,
        });
      }
    }
  }
  return measures;
}

export function buildMeasures(notes: SheetNote[], bpm: number, grid: GridSteps): Measure[] {
  const gridMs = (60000 / bpm / 4) * grid;
  const treble: QuantizedNote[] = [];
  const bass: QuantizedNote[] = [];
  let lastStep = 0;

  for (const n of notes) {
    const parsed = parseNote(n.note);
    if (!parsed) continue;
    const start = Math.round(n.start / gridMs) * grid;
    // Held keys show as the shortest note until released
    const end = Math.max(start + grid, Math.round((n.end ?? n.start) / gridMs) * grid);
    lastStep = Math.max(lastStep, end);
    const q = { start, end, key: parsed.key, midi: parsed.midi };
    (parsed.midi >= MIDDLE_C_MIDI ? treble : bass).push(q);
  }

  const totalSteps = Math.max(1, Math.ceil(lastStep / STEPS_PER_MEASURE)) * STEPS_PER_MEASURE;
  const trebleMeasures = splitIntoMeasures(buildTimeline(treble), totalSteps);
  const bassMeasures = splitIntoMeasures(buildTimeline(bass), totalSteps);

  return trebleMeasures.map((t, i) => ({ treble: t, bass: bassMeasures[i] }));
}
