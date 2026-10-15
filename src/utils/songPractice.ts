import type { Segment } from './sheetMusic';
import type { Staff } from './renderGrandStaff';
import { toVexKey } from './noteGame';
import type { SongSource } from './songs';
import { fingerPassage, handOfStaff, whiteSlot } from './fingering';
import type { FingeredOnset, Hand } from './fingering';

export type Hands = Staff | 'both';

export interface SongSegment extends Segment {
  /** Piano note names like 'F#4'; empty for a rest */
  notes: string[];
  /** Start time in 16th-note steps from the beginning of the song */
  start: number;
  steps: number;
}

export interface SongMeasure {
  treble: SongSegment[];
  bass: SongSegment[];
}

export interface SegmentRef {
  staff: Staff;
  measure: number;
  segment: number;
}

/** A note or chord that starts on one staff, with any notes tied onto it */
export interface Onset {
  staff: Staff;
  time: number;
  notes: string[];
  /** Total length including tied notes, in 16th-note steps */
  steps: number;
  refs: SegmentRef[];
}

/** One stop in practice: every key that must be pressed at this moment */
export interface PracticeStep {
  time: number;
  notes: string[];
  refs: SegmentRef[];
}

export interface ParsedSong {
  source: SongSource;
  measures: SongMeasure[];
  onsets: Onset[];
}

const DURATION_STEPS: Record<string, number> = { w: 16, h: 8, q: 4, '8': 2, '16': 1 };

function parseHand(text: string, beats: number, songId: string, staff: Staff): SongSegment[][] {
  const measureSteps = beats * 4;
  let time = 0;
  return text
    .split('|')
    .map((bar) => bar.trim())
    .filter(Boolean)
    .map((bar, barIndex) => {
      const segments = bar.split(/\s+/).map((token): SongSegment => {
        const match = token.match(/^([^:]+):(w|h|q|8|16)(\.?)(~?)$/);
        if (!match) throw new Error(`${songId} ${staff} bar ${barIndex + 1}: bad token "${token}"`);
        const [, pitch, duration, dot, tie] = match;
        const notes = pitch === 'r' ? [] : pitch.split('+');
        const dots = dot ? 1 : 0;
        const steps = DURATION_STEPS[duration] * (dots ? 1.5 : 1);
        const segment: SongSegment = {
          notes,
          keys: notes.map((n) => toVexKey(n)),
          duration,
          dots,
          tie: tie === '~' && notes.length > 0,
          fullMeasure: notes.length === 0 && steps === measureSteps,
          start: time,
          steps,
        };
        time += steps;
        return segment;
      });
      const total = segments.reduce((sum, s) => sum + s.steps, 0);
      if (total !== measureSteps) {
        console.warn(`${songId} ${staff} bar ${barIndex + 1}: ${total} steps, expected ${measureSteps}`);
      }
      return segments;
    });
}

function collectOnsets(measures: SongMeasure[], staff: Staff): Onset[] {
  const onsets: Onset[] = [];
  let tiedFrom: Onset | null = null;
  measures.forEach((measure, m) => {
    measure[staff].forEach((seg, s) => {
      const ref = { staff, measure: m, segment: s };
      if (seg.notes.length === 0) {
        tiedFrom = null;
        return;
      }
      if (tiedFrom) {
        tiedFrom.steps += seg.steps;
        tiedFrom.refs.push(ref);
      } else {
        onsets.push({ staff, time: seg.start, notes: seg.notes, steps: seg.steps, refs: [ref] });
      }
      tiedFrom = seg.tie ? onsets[onsets.length - 1] : null;
    });
  });
  return onsets;
}

export function parseSong(source: SongSource): ParsedSong {
  const treble = parseHand(source.treble, source.beats, source.id, 'treble');
  const bass = parseHand(source.bass, source.beats, source.id, 'bass');
  const measures = treble.map((t, i) => ({ treble: t, bass: bass[i] ?? [] }));
  const onsets = [...collectOnsets(measures, 'treble'), ...collectOnsets(measures, 'bass')].sort(
    (a, b) => a.time - b.time
  );
  return { source, measures, onsets };
}

export function isPracticed(staff: Staff, hands: Hands): boolean {
  return hands === 'both' || hands === staff;
}

/** Groups the practiced hands' onsets into steps the player must press together */
export function buildSteps(song: ParsedSong, hands: Hands): PracticeStep[] {
  const steps: PracticeStep[] = [];
  for (const onset of song.onsets) {
    if (!isPracticed(onset.staff, hands)) continue;
    const last = steps[steps.length - 1];
    if (last && last.time === onset.time) {
      last.notes = [...new Set([...last.notes, ...onset.notes])];
      last.refs.push(...onset.refs);
    } else {
      steps.push({ time: onset.time, notes: [...onset.notes], refs: [...onset.refs] });
    }
  }
  return steps;
}

/** Onsets of the hand that is not being practiced, within [from, to) */
export function accompanimentBetween(
  song: ParsedSong,
  hands: Hands,
  from: number,
  to: number
): Onset[] {
  return song.onsets.filter(
    (o) => !isPracticed(o.staff, hands) && o.time >= from && o.time < to
  );
}

export interface FingeredEvent {
  time: number;
  notes: string[];
  fingers: number[];
  anchor: number;
}

export interface SongFingering {
  /** Fingers for the notes of each segment that starts a note, keyed `staff:measure:segment` */
  bySegment: Map<string, number[]>;
  /** Each staff's notes in time order, with their hand positions */
  timeline: Record<Staff, FingeredEvent[]>;
}

export function segmentKey(ref: SegmentRef): string {
  return `${ref.staff}:${ref.measure}:${ref.segment}`;
}

/**
 * Turns written fingering into hand positions: the position is wherever the
 * lowest note's finger puts the hand, so a thumb passing under shows as a move
 */
function writtenFingering(onsets: Onset[], hand: Hand, text: string, label: string): FingeredOnset[] | null {
  const tokens = text.trim().split(/\s+/);
  const valid =
    tokens.length === onsets.length &&
    tokens.every((t, i) => /^[1-5]+$/.test(t) && t.length === onsets[i].notes.length);
  if (!valid) {
    console.warn(`${label}: written fingering doesn't match the notes; fingering automatically`);
    return null;
  }
  return onsets.map((onset, i) => {
    const fingers = [...tokens[i]].map(Number);
    const slots = onset.notes.map(whiteSlot);
    const low = slots.indexOf(Math.min(...slots));
    const finger = fingers[low];
    const anchor = hand === 'right' ? slots[low] - (finger - 1) : slots[low] - (5 - finger);
    return { fingers, anchor };
  });
}

/** Fingering for the whole song: right hand on the treble part, left hand on the bass */
export function fingerSong(song: ParsedSong): SongFingering {
  const bySegment = new Map<string, number[]>();
  const timeline = { treble: [], bass: [] } as Record<Staff, FingeredEvent[]>;
  for (const staff of ['treble', 'bass'] as const) {
    const onsets = song.onsets.filter((o) => o.staff === staff);
    const hand = handOfStaff(staff);
    const written = song.source.fingers?.[staff];
    const fingered =
      (written && writtenFingering(onsets, hand, written, `${song.source.id} ${staff}`)) ||
      fingerPassage(onsets.map((o) => o.notes), hand);
    onsets.forEach((onset, i) => {
      const { fingers, anchor } = fingered[i];
      // Tied-on notes keep sounding, so only the first notehead gets numbers
      bySegment.set(segmentKey(onset.refs[0]), fingers);
      timeline[staff].push({ time: onset.time, notes: onset.notes, fingers, anchor });
    });
  }
  return { bySegment, timeline };
}
