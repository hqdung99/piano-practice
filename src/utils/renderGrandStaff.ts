import {
  Accidental,
  Annotation,
  Beam,
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StaveTie,
  Voice,
} from 'vexflow/bravura';
import type { Measure, Segment } from './sheetMusic';

export type Staff = 'treble' | 'bass';

export interface GrandStaffOptions {
  /** Beats per measure, in quarter notes */
  beats: number;
  /** Key signature name understood by VexFlow, e.g. 'C' or 'G' */
  keySignature?: string;
  /** Color for a segment, or undefined to keep the default ink */
  colorOf?: (staff: Staff, measureIndex: number, segmentIndex: number) => string | undefined;
  /** Finger numbers for a segment's notes (in the order of its keys), or undefined for none */
  fingersOf?: (staff: Staff, measureIndex: number, segmentIndex: number) => number[] | undefined;
  /** Chord symbol written above a measure */
  chordOf?: (measureIndex: number) => string | undefined;
}

export interface GrandStaffLayout {
  /** Row each measure was placed on */
  rowOf: number[];
  rowHeight: number;
  topY: number;
  /** Where each segment's notehead sits, keyed `staff:measure:segment` */
  positions: Map<string, { x: number; row: number }>;
  /** Horizontal extent of every row's music */
  rowStartX: number;
  rowEndX: number;
}

const PADDING_X = 10;
const TOP_Y = 10;
const STAVE_GAP = 90;
const ROW_HEIGHT = 210;
// Room under the last row for finger numbers below low bass notes
const BOTTOM_PAD = 30;
const MIN_MEASURE_WIDTH = 200;
// Extra room for the brace, clef and (first row) time signature
const ROW_HEADER_WIDTH = 60;
const TIME_SIG_WIDTH = 30;
const KEY_SIG_ACCIDENTAL_WIDTH = 12;
const KEY_SIG_ACCIDENTALS: Record<string, number> = { C: 0, G: 1, F: 1, D: 2, Bb: 2 };

const REST_KEY = { treble: 'b/4', bass: 'd/3' } as const;
// Whole rests hang from the 4th line rather than sitting on the middle one
const WHOLE_REST_KEY = { treble: 'd/5', bass: 'f/3' } as const;

interface RenderedSegment {
  note: StaveNote;
  segment: Segment;
  row: number;
}

/**
 * Finger numbers stacked like printed fingering: right hand above the staff,
 * left hand below, with the number nearest the staff belonging to the nearest note
 */
function addFingering(note: StaveNote, clef: Staff, keys: string[], fingers: number[], color?: string) {
  const order = keys.map((_, k) => k);
  // Keys are in written order; sort them low to high by their position on the staff
  order.sort((a, b) => note.getKeyProps()[a].line - note.getKeyProps()[b].line);
  if (clef === 'bass') order.reverse();
  for (const k of order) {
    const annotation = new Annotation(String(fingers[k]))
      .setFont('Inter, Arial, sans-serif', 12, 'bold')
      .setVerticalJustification(clef === 'treble' ? Annotation.VerticalJustify.TOP : Annotation.VerticalJustify.BOTTOM);
    if (color) annotation.setStyle({ fillStyle: color, strokeStyle: color });
    note.addModifier(annotation, 0);
  }
}

function buildStaveNotes(
  segments: Segment[],
  clef: Staff,
  colorOf: (segmentIndex: number) => string | undefined,
  fingersOf: (segmentIndex: number) => number[] | undefined
): StaveNote[] {
  return segments.map((s, i) => {
    const isRest = s.keys.length === 0;
    const note = new StaveNote({
      clef,
      keys: isRest ? [(s.duration === 'w' ? WHOLE_REST_KEY : REST_KEY)[clef]] : s.keys,
      duration: isRest ? `${s.duration}r` : s.duration,
      dots: s.dots,
      autoStem: true,
      alignCenter: s.fullMeasure,
    });
    if (s.dots > 0) Dot.buildAndAttach([note], { all: true });
    const color = colorOf(i);
    if (color) note.setStyle({ fillStyle: color, strokeStyle: color });
    const fingers = isRest ? undefined : fingersOf(i);
    if (fingers) addFingering(note, clef, s.keys, fingers, color);
    return note;
  });
}

function drawTies(rendered: RenderedSegment[], ctx: ReturnType<Renderer['getContext']>) {
  for (let i = 0; i < rendered.length - 1; i++) {
    const { note, segment, row } = rendered[i];
    if (!segment.tie) continue;
    const next = rendered[i + 1];
    const indexes = segment.keys.map((_, k) => k);
    if (next.row === row) {
      new StaveTie({
        firstNote: note,
        lastNote: next.note,
        firstIndexes: indexes,
        lastIndexes: indexes,
      }).setContext(ctx).draw();
    } else {
      // Tie crosses a line break: draw half a tie on each side
      new StaveTie({ firstNote: note, firstIndexes: indexes, lastIndexes: indexes })
        .setContext(ctx)
        .draw();
      new StaveTie({ lastNote: next.note, firstIndexes: indexes, lastIndexes: indexes })
        .setContext(ctx)
        .draw();
    }
  }
}

/** Draws measures on a wrapping grand staff (treble + bass) into `container` */
export function renderGrandStaff(
  container: HTMLDivElement,
  measures: Measure[],
  width: number,
  { beats, keySignature = 'C', colorOf, fingersOf, chordOf }: GrandStaffOptions
): GrandStaffLayout {
  container.innerHTML = '';

  const keySigWidth = (KEY_SIG_ACCIDENTALS[keySignature] ?? 0) * KEY_SIG_ACCIDENTAL_WIDTH;
  const usable = width - PADDING_X * 2;
  const perRow = Math.max(
    1,
    Math.floor((usable - ROW_HEADER_WIDTH - keySigWidth) / MIN_MEASURE_WIDTH)
  );
  const rows = Math.ceil(measures.length / perRow);

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, rows * ROW_HEIGHT + TOP_Y + BOTTOM_PAD);
  const ctx = renderer.getContext();

  const trebleRendered: RenderedSegment[] = [];
  const bassRendered: RenderedSegment[] = [];
  const rowOf: number[] = [];
  const positions = new Map<string, { x: number; row: number }>();

  measures.forEach((measure, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    rowOf.push(row);
    const header = ROW_HEADER_WIDTH + keySigWidth + (row === 0 ? TIME_SIG_WIDTH : 0);
    const bodyWidth = (usable - header) / perRow;
    const x = PADDING_X + (col === 0 ? 0 : header + col * bodyWidth);
    const staveWidth = bodyWidth + (col === 0 ? header : 0);
    const y = TOP_Y + row * ROW_HEIGHT;

    const treble = new Stave(x, y, staveWidth);
    const bass = new Stave(x, y + STAVE_GAP, staveWidth);
    if (col === 0) {
      treble.addClef('treble').addKeySignature(keySignature);
      bass.addClef('bass').addKeySignature(keySignature);
      if (row === 0) {
        treble.addTimeSignature(`${beats}/4`);
        bass.addTimeSignature(`${beats}/4`);
      }
    }
    // Keep beats vertically aligned across both staves
    const noteStartX = Math.max(treble.getNoteStartX(), bass.getNoteStartX());
    treble.setNoteStartX(noteStartX);
    bass.setNoteStartX(noteStartX);
    treble.setContext(ctx).draw();
    bass.setContext(ctx).draw();

    if (col === 0) {
      new StaveConnector(treble, bass).setType('brace').setContext(ctx).draw();
      new StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw();
    }
    new StaveConnector(treble, bass).setType('singleRight').setContext(ctx).draw();

    const trebleNotes = buildStaveNotes(
      measure.treble,
      'treble',
      (k) => colorOf?.('treble', i, k),
      (k) => fingersOf?.('treble', i, k)
    );
    const bassNotes = buildStaveNotes(
      measure.bass,
      'bass',
      (k) => colorOf?.('bass', i, k),
      (k) => fingersOf?.('bass', i, k)
    );
    const trebleVoice = new Voice({ numBeats: beats, beatValue: 4 })
      .setMode(Voice.Mode.SOFT)
      .addTickables(trebleNotes);
    const bassVoice = new Voice({ numBeats: beats, beatValue: 4 })
      .setMode(Voice.Mode.SOFT)
      .addTickables(bassNotes);

    Accidental.applyAccidentals([trebleVoice], keySignature);
    Accidental.applyAccidentals([bassVoice], keySignature);
    const beams = [...Beam.generateBeams(trebleNotes), ...Beam.generateBeams(bassNotes)];

    trebleVoice.setStave(treble);
    bassVoice.setStave(bass);
    new Formatter()
      .joinVoices([trebleVoice])
      .joinVoices([bassVoice])
      .format([trebleVoice, bassVoice], treble.getNoteEndX() - noteStartX - 10);

    trebleVoice.draw(ctx, treble);
    bassVoice.draw(ctx, bass);
    beams.forEach((b) => b.setContext(ctx).draw());

    const chord = chordOf?.(i);
    if (chord && chord !== '-') {
      // Above any fingering numbers on the treble staff
      ctx.save();
      ctx.setFont('Inter, Arial, sans-serif', 15, 'bold');
      ctx.setFillStyle('#7a3fb0');
      ctx.fillText(chord, trebleNotes[0].getAbsoluteX() - 4, treble.getYForLine(0) - 28);
      ctx.restore();
    }

    measure.treble.forEach((segment, k) => {
      trebleRendered.push({ note: trebleNotes[k], segment, row });
      positions.set(`treble:${i}:${k}`, { x: trebleNotes[k].getAbsoluteX(), row });
    });
    measure.bass.forEach((segment, k) => {
      bassRendered.push({ note: bassNotes[k], segment, row });
      positions.set(`bass:${i}:${k}`, { x: bassNotes[k].getAbsoluteX(), row });
    });
  });

  drawTies(trebleRendered, ctx);
  drawTies(bassRendered, ctx);

  return {
    rowOf,
    rowHeight: ROW_HEIGHT,
    topY: TOP_Y,
    positions,
    rowStartX: PADDING_X + ROW_HEADER_WIDTH + keySigWidth,
    rowEndX: width - PADDING_X,
  };
}
