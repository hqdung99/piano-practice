import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accidental,
  Barline,
  BarNote,
  Beam,
  Dot,
  Formatter,
  Fraction,
  GhostNote,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Voice,
} from 'vexflow/bravura';
import type { Note } from 'vexflow/bravura';
import type { StaffNote } from '../../../utils/earTraining/dictation';
import styles from './Dictation.module.css';

type Clef = 'treble' | 'bass';

interface StaffSpec {
  notes: StaffNote[];
  bass?: StaffNote[];
  pad: StaffNote[];
  bassPad: StaffNote[];
  clef: Clef;
  keySignature: string;
  timeSignature?: string;
  rhythm: boolean;
}

/** Drawn a little larger than VexFlow's default 10px line spacing, except on narrow screens */
const scaleFor = (width: number) => (width < 420 ? 1 : 1.2);
const STAVE_X = 4;
const GRAND_GAP = 90;
const HEIGHT = { single: 118, rhythm: 92, grand: 212 };
const WHOLE_REST = { treble: 'd/5', bass: 'f/3' };
const REST = { treble: 'b/4', bass: 'd/3' };

/** 'C#4' -> 'c#/4', 'Bb4' -> 'bb/4' */
function vexKey(note: string): string {
  const m = note.match(/^([A-G])([#b]?)(-?\d)$/);
  return m ? `${m[1].toLowerCase()}${m[2]}/${m[3]}` : 'b/4';
}

function buildNotes(notes: StaffNote[], clef: Clef, rhythm: boolean): StaveNote[] {
  return notes.map((n) => {
    const keys = n.rest ? [(n.duration === 'w' ? WHOLE_REST : REST)[clef]] : rhythm ? ['b/4'] : n.keys.map(vexKey);
    const note = new StaveNote({
      clef,
      keys,
      duration: n.rest ? `${n.duration}r` : n.duration,
      dots: n.dots,
      ...(rhythm ? { stemDirection: 1 } : { autoStem: true }),
    });
    if (n.dots) Dot.buildAndAttach([note], { all: true });
    if (n.color) note.setStyle({ fillStyle: n.color, strokeStyle: n.color });
    return note;
  });
}

/** Notes, invisible placeholders and barlines in playing order */
function tickables(staveNotes: StaveNote[], source: StaffNote[], pad: StaffNote[]): Note[] {
  const out: Note[] = [];
  staveNotes.forEach((n, i) => {
    out.push(n);
    if (source[i].barAfter && (i < source.length - 1 || pad.length)) out.push(new BarNote());
  });
  pad.forEach((p, i) => {
    out.push(new GhostNote({ duration: p.duration, dots: p.dots }));
    if (p.barAfter && i < pad.length - 1) out.push(new BarNote());
  });
  return out;
}

function makeVoice(notes: Note[]): Voice {
  return new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT).addTickables(notes);
}

/** Beams eighths and sixteenths by the beat; a beam takes its notes' colour when they share one */
function beams(notes: StaveNote[], source: StaffNote[], rhythm: boolean): Beam[] {
  const list = Beam.generateBeams(notes, { groups: [new Fraction(1, 4)], ...(rhythm ? { stemDirection: 1 } : {}) });
  for (const beam of list) {
    const colors = new Set(beam.getNotes().map((n) => source[notes.indexOf(n as StaveNote)]?.color));
    const [color] = colors;
    if (colors.size === 1 && color) beam.setStyle({ fillStyle: color, strokeStyle: color });
  }
  return list;
}

function draw(el: HTMLDivElement, width: number, spec: StaffSpec) {
  el.innerHTML = '';
  const { notes, bass, pad, bassPad, clef, keySignature, timeSignature, rhythm } = spec;
  const grand = bass !== undefined;
  const height = grand ? HEIGHT.grand : rhythm ? HEIGHT.rhythm : HEIGHT.single;
  const renderer = new Renderer(el, Renderer.Backends.SVG);
  const scale = scaleFor(width);
  renderer.resize(width, height * scale);
  const ctx = renderer.getContext();
  ctx.scale(scale, scale);
  const w = width / scale - STAVE_X * 2;

  const top = new Stave(STAVE_X, rhythm ? -14 : 0, w);
  const staves = [top];
  if (rhythm) {
    // A single line, percussion style
    top.setConfigForLines([0, 1, 2, 3, 4].map((i) => ({ visible: i === 2 })));
    top.addClef('percussion');
  } else {
    top.addClef(grand ? 'treble' : clef).addKeySignature(keySignature);
  }
  if (grand) staves.push(new Stave(STAVE_X, GRAND_GAP, w).addClef('bass').addKeySignature(keySignature));
  for (const s of staves) {
    if (timeSignature) s.addTimeSignature(timeSignature);
    s.setEndBarType(timeSignature ? Barline.type.END : Barline.type.NONE);
  }
  const startX = Math.max(...staves.map((s) => s.getNoteStartX()));
  staves.forEach((s) => s.setNoteStartX(startX).setContext(ctx).draw());
  if (grand) {
    new StaveConnector(staves[0], staves[1]).setType('brace').setContext(ctx).draw();
    new StaveConnector(staves[0], staves[1]).setType('singleLeft').setContext(ctx).draw();
  }

  const parts: { stave: Stave; clef: Clef; source: StaffNote[]; ghosts: StaffNote[] }[] = [
    { stave: top, clef: grand ? 'treble' : clef, source: notes, ghosts: pad },
  ];
  if (grand) parts.push({ stave: staves[1], clef: 'bass', source: bass, ghosts: bassPad });
  const voices = parts.map(({ stave, clef: c, source, ghosts }) => {
    const staveNotes = buildNotes(source, c, rhythm);
    const voice = makeVoice(tickables(staveNotes, source, ghosts));
    if (!rhythm) Accidental.applyAccidentals([voice], keySignature);
    return { voice, stave, beams: beams(staveNotes, source, rhythm) };
  });
  if (voices.every((v) => v.voice.getTickables().length === 0)) return;

  const formatter = new Formatter();
  voices.forEach((v) => formatter.joinVoices([v.voice]));
  formatter.format(
    voices.map((v) => v.voice),
    top.getNoteEndX() - startX - 14
  );
  for (const v of voices) {
    v.voice.draw(ctx, v.stave);
    v.beams.forEach((b) => b.setContext(ctx).draw());
  }
}

interface MiniStaffProps {
  notes: StaffNote[];
  /** Notes for a bass staff under `notes`, making a grand staff */
  bass?: StaffNote[];
  /** Invisible notes after `notes` that keep room for notes still to be written */
  pad?: StaffNote[];
  bassPad?: StaffNote[];
  clef?: Clef;
  /** VexFlow key name such as 'G' or 'F' */
  keySignature?: string;
  /** e.g. '4/4'; also closes the staff with a final barline */
  timeSignature?: string;
  /** Percussion-style single line with every note on it */
  rhythm?: boolean;
  /** What the staff shows, for screen readers */
  label?: string;
  className?: string;
}

const NONE: StaffNote[] = [];

/** A small staff drawn with VexFlow that fills its container's width */
export function MiniStaff({
  notes,
  bass,
  pad = NONE,
  bassPad = NONE,
  clef = 'treble',
  keySignature = 'C',
  timeSignature,
  rhythm = false,
  label,
  className,
}: MiniStaffProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // Redraw only when what's drawn changes, not on every parent render
  const key = JSON.stringify({ notes, bass, pad, bassPad, clef, keySignature, timeSignature, rhythm });
  const spec = useMemo(() => JSON.parse(key) as StaffSpec, [key]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || width < 40) return;
    try {
      draw(el, width, spec);
    } catch (err) {
      // A bad note shouldn't take the screen down; leave the staff empty instead
      console.warn('MiniStaff failed to draw', err);
      el.innerHTML = '';
    }
    return () => {
      el.innerHTML = '';
    };
  }, [width, spec]);

  const height = (bass ? HEIGHT.grand : rhythm ? HEIGHT.rhythm : HEIGHT.single) * scaleFor(width);
  return (
    <div
      ref={ref}
      className={`${styles.staff} ${className ?? ''}`}
      style={{ height }}
      role="img"
      aria-label={label ?? 'Music staff'}
    />
  );
}

interface RhythmStaffProps {
  notes: StaffNote[];
  pad?: StaffNote[];
  timeSignature?: string;
  label?: string;
  className?: string;
}

/** MiniStaff for rhythms: one line, no pitches */
export function RhythmStaff({ timeSignature = '4/4', ...rest }: RhythmStaffProps) {
  return <MiniStaff {...rest} rhythm timeSignature={timeSignature} />;
}
