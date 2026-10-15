/**
 * Turns a MIDI file or an uncompressed MusicXML file into a practice song.
 * Notes are snapped to a 16th-note grid; each hand's part is simplified to one
 * line of notes and chords, and long files are cut to the first bars.
 */
import { midiToNote } from './earTraining/theory';
import type { Staff } from './renderGrandStaff';
import type { SongSource } from './songs';

interface TimedNote {
  midi: number;
  /** In quarter notes */
  start: number;
  dur: number;
  staff?: Staff;
}

interface ImportedScore {
  title: string;
  notes: TimedNote[];
  /** Beats per bar, in quarter notes */
  beats: number;
  bpm: number;
}

export const MAX_IMPORT_BARS = 64;
const MIDDLE_C = 60;

// ---------- MIDI ----------

class Reader {
  pos = 0;
  private view: DataView;
  constructor(view: DataView) {
    this.view = view;
  }
  get done() {
    return this.pos >= this.view.byteLength;
  }
  u8() {
    return this.view.getUint8(this.pos++);
  }
  u16() {
    const v = this.view.getUint16(this.pos);
    this.pos += 2;
    return v;
  }
  u32() {
    const v = this.view.getUint32(this.pos);
    this.pos += 4;
    return v;
  }
  text(length: number) {
    let s = '';
    for (let i = 0; i < length; i++) s += String.fromCharCode(this.u8());
    return s;
  }
  varLen() {
    let value = 0;
    for (let i = 0; i < 4; i++) {
      const b = this.u8();
      value = (value << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return value;
  }
}

function parseMidi(buffer: ArrayBuffer, fallbackTitle: string): ImportedScore {
  const r = new Reader(new DataView(buffer));
  if (r.text(4) !== 'MThd') throw new Error('Not a MIDI file');
  const headerLength = r.u32();
  r.u16(); // format
  const trackCount = r.u16();
  const division = r.u16();
  r.pos = 8 + headerLength;
  if (division & 0x8000) throw new Error('This MIDI file uses SMPTE timing, which isn’t supported');

  let usPerQuarter = 500000;
  let tempoSet = false;
  let beats = 4;
  let title = '';
  const tracks: TimedNote[][] = [];

  for (let t = 0; t < trackCount && !r.done; t++) {
    if (r.text(4) !== 'MTrk') throw new Error('Damaged MIDI file');
    const length = r.u32();
    const end = r.pos + length;
    const notes: TimedNote[] = [];
    const open = new Map<number, number[]>();
    let tick = 0;
    let status = 0;
    const noteOff = (key: number) => {
      const starts = open.get(key);
      const start = starts?.shift();
      if (start === undefined) return;
      const channel = key >> 8;
      // Channel 10 is drums
      if (channel !== 9) notes.push({ midi: key & 0xff, start: start / division, dur: (tick - start) / division });
    };
    while (r.pos < end) {
      tick += r.varLen();
      let byte = r.u8();
      if (byte === 0xff) {
        const type = r.u8();
        const length = r.varLen();
        const at = r.pos;
        if (type === 0x51 && !tempoSet) {
          usPerQuarter = (r.u8() << 16) | (r.u8() << 8) | r.u8();
          tempoSet = true;
        } else if (type === 0x58) {
          const num = r.u8();
          const den = 2 ** r.u8();
          const q = (num * 4) / den;
          if (Number.isInteger(q) && q >= 2 && q <= 6) beats = q;
        } else if (type === 0x03 && !title) {
          title = r.text(length).trim();
        }
        r.pos = at + length;
        continue;
      }
      if (byte === 0xf0 || byte === 0xf7) {
        r.pos += r.varLen();
        continue;
      }
      if (byte & 0x80) status = byte;
      else r.pos--; // running status
      byte = status;
      const kind = byte & 0xf0;
      const channel = byte & 0x0f;
      if (kind === 0x90 || kind === 0x80) {
        const note = r.u8();
        const velocity = r.u8();
        const key = (channel << 8) | note;
        if (kind === 0x90 && velocity > 0) {
          open.set(key, [...(open.get(key) ?? []), tick]);
        } else {
          noteOff(key);
        }
      } else if (kind === 0xc0 || kind === 0xd0) {
        r.pos += 1;
      } else {
        r.pos += 2;
      }
    }
    r.pos = end;
    tracks.push(notes);
  }

  const withNotes = tracks.filter((n) => n.length > 0);
  // Two parts: the lower one is the left hand
  if (withNotes.length === 2) {
    const avg = (n: TimedNote[]) => n.reduce((s, x) => s + x.midi, 0) / n.length;
    const [low, high] = avg(withNotes[0]) < avg(withNotes[1]) ? withNotes : [withNotes[1], withNotes[0]];
    low.forEach((n) => (n.staff = 'bass'));
    high.forEach((n) => (n.staff = 'treble'));
  }
  return {
    title: title || fallbackTitle,
    notes: withNotes.flat(),
    beats,
    bpm: Math.round(60000000 / usPerQuarter),
  };
}

// ---------- MusicXML ----------

const STEP_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function parseMusicXml(text: string, fallbackTitle: string): ImportedScore {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Not a readable MusicXML file');
  const part = doc.querySelector('score-partwise > part');
  if (!part) {
    throw new Error(
      doc.querySelector('score-timewise') ? 'Timewise MusicXML isn’t supported' : 'No music found in this file'
    );
  }
  const title =
    doc.querySelector('work > work-title')?.textContent?.trim() ||
    doc.querySelector('movement-title')?.textContent?.trim() ||
    fallbackTitle;

  let divisions = 1;
  let beats = 0;
  let bpm = 0;
  let measureStart = 0;
  const notes: TimedNote[] = [];

  for (const measure of part.querySelectorAll(':scope > measure')) {
    let cursor = 0;
    let furthest = 0;
    let lastStart = 0;
    for (const el of measure.children) {
      const num = (sel: string) => Number(el.querySelector(sel)?.textContent ?? 0);
      if (el.tagName === 'attributes') {
        if (el.querySelector('divisions')) divisions = num('divisions');
        if (!beats && el.querySelector('time > beats')) {
          const q = (num('time > beats') * 4) / num('time > beat-type');
          beats = Number.isInteger(q) && q >= 2 && q <= 6 ? q : 4;
        }
      } else if (el.tagName === 'direction' || el.tagName === 'sound') {
        const tempo = (el.tagName === 'sound' ? el : el.querySelector('sound'))?.getAttribute('tempo');
        if (tempo && !bpm) bpm = Number(tempo);
      } else if (el.tagName === 'backup') {
        cursor -= num('duration');
      } else if (el.tagName === 'forward') {
        cursor += num('duration');
      } else if (el.tagName === 'note') {
        if (el.querySelector('grace')) continue;
        const duration = num('duration');
        const isChord = !!el.querySelector('chord');
        const start = isChord ? lastStart : cursor;
        if (!isChord) {
          lastStart = cursor;
          cursor += duration;
        }
        furthest = Math.max(furthest, cursor);
        const pitch = el.querySelector('pitch');
        if (!pitch) continue;
        const midi =
          (num('pitch > octave') + 1) * 12 + STEP_INDEX[pitch.querySelector('step')?.textContent ?? 'C'] + num('pitch > alter');
        const at = (measureStart + start) / divisions;
        const dur = duration / divisions;
        const staff: Staff | undefined = el.querySelector('staff') ? (num('staff') >= 2 ? 'bass' : 'treble') : undefined;
        // A tied-on note lengthens the note it continues
        if (el.querySelector('tie[type="stop"]')) {
          const prev = notes.findLast((n) => n.midi === midi && Math.abs(n.start + n.dur - at) < 1e-6);
          if (prev) {
            prev.dur += dur;
            continue;
          }
        }
        notes.push({ midi, start: at, dur, staff });
      }
    }
    measureStart += furthest || (beats || 4) * divisions;
  }
  return { title, notes, beats: beats || 4, bpm: bpm || 100 };
}

// ---------- Score -> practice song ----------

// Largest first, so each gap is written with the fewest notes
const PIECES: [number, string][] = [
  [16, 'w'],
  [12, 'h.'],
  [8, 'h'],
  [6, 'q.'],
  [4, 'q'],
  [3, '8.'],
  [2, '8'],
  [1, '16'],
];

/** Splits a span into note values, never across a bar line */
function spans(from: number, to: number, barSteps: number): number[] {
  const parts: number[] = [];
  let t = from;
  while (t < to) {
    const barEnd = (Math.floor(t / barSteps) + 1) * barSteps;
    let left = Math.min(to, barEnd) - t;
    while (left > 0) {
      const [steps] = PIECES.find(([s]) => s <= left)!;
      parts.push(steps);
      left -= steps;
      t += steps;
    }
  }
  return parts;
}

interface Event {
  start: number;
  end: number;
  notes: number[];
}

/** One staff's notes as one line: chords for notes struck together, each held until the next */
function staffLine(notes: TimedNote[], limit: number): Event[] {
  const byStart = new Map<number, TimedNote[]>();
  for (const n of notes) {
    const start = Math.round(n.start * 4);
    if (start >= limit || n.midi < 21 || n.midi > 108) continue;
    byStart.set(start, [...(byStart.get(start) ?? []), n]);
  }
  const starts = [...byStart.keys()].sort((a, b) => a - b);
  return starts.map((start, i) => {
    const group = byStart.get(start)!;
    const end = Math.max(...group.map((n) => Math.round((n.start + n.dur) * 4)), start + 1);
    const next = starts[i + 1] ?? limit;
    return { start, end: Math.min(end, next, limit), notes: [...new Set(group.map((n) => n.midi))].sort((a, b) => a - b) };
  });
}

function writeLine(events: Event[], totalSteps: number, barSteps: number): string {
  const bars: string[][] = Array.from({ length: totalSteps / barSteps }, () => []);
  const put = (from: number, to: number, pitch: string | null) => {
    let t = from;
    const parts = spans(from, to, barSteps);
    parts.forEach((steps, i) => {
      const [, value] = PIECES.find(([s]) => s === steps)!;
      const tie = pitch && i < parts.length - 1 ? '~' : '';
      bars[Math.floor(t / barSteps)].push(`${pitch ?? 'r'}:${value}${tie}`);
      t += steps;
    });
  };
  let t = 0;
  for (const e of events) {
    if (e.start > t) put(t, e.start, null);
    put(e.start, e.end, e.notes.map(midiToNote).join('+'));
    t = e.end;
  }
  if (t < totalSteps) put(t, totalSteps, null);
  return bars.map((b) => b.join(' ')).join(' | ');
}

function toSong(score: ImportedScore, fileName: string): SongSource {
  if (score.notes.length === 0) throw new Error('No notes found in this file');
  const barSteps = score.beats * 4;
  const lastEnd = Math.max(...score.notes.map((n) => Math.round((n.start + n.dur) * 4)));
  const bars = Math.min(MAX_IMPORT_BARS, Math.max(1, Math.ceil(lastEnd / barSteps)));
  const totalSteps = bars * barSteps;
  const staffOf = (n: TimedNote): Staff => n.staff ?? (n.midi < MIDDLE_C ? 'bass' : 'treble');
  const treble = staffLine(score.notes.filter((n) => staffOf(n) === 'treble'), totalSteps);
  const bass = staffLine(score.notes.filter((n) => staffOf(n) === 'bass'), totalSteps);
  return {
    id: `imp-${Date.now().toString(36)}`,
    title: score.title,
    composer: 'Imported',
    category: 'imported',
    description: `From ${fileName}${Math.ceil(lastEnd / barSteps) > MAX_IMPORT_BARS ? ` (first ${MAX_IMPORT_BARS} bars)` : ''}`,
    bpm: Math.min(180, Math.max(40, score.bpm)),
    beats: score.beats,
    // Notes are spelled with sharps, so accidentals are written out in C
    keySignature: 'C',
    treble: writeLine(treble, totalSteps, barSteps),
    bass: writeLine(bass, totalSteps, barSteps),
  };
}

/** Reads a .mid / .midi / .musicxml / .xml file into a practice song */
export async function importSongFile(file: File): Promise<SongSource> {
  const name = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'mxl') throw new Error('Compressed MusicXML (.mxl) isn’t supported — export it as .musicxml');
  const score =
    ext === 'mid' || ext === 'midi'
      ? parseMidi(await file.arrayBuffer(), name)
      : parseMusicXml(await file.text(), name);
  return toSong(score, file.name);
}
