import { useCallback, useEffect, useRef, useState } from 'react';
import { soundLength } from '../utils/earTraining/skills';
import type { PlayEvent } from '../utils/earTraining/skills';

const VELOCITY = 0.75;

export interface PlaybackOptions {
  /** 1 is normal; 1.5 plays half again as fast */
  speed: number;
  /** Multiplies how long each note is held */
  lengthFactor: number;
}

interface UseSequencePlayerProps {
  playNote: (note: string, velocity?: number) => void;
  releaseNote: (note: string) => void;
  options?: PlaybackOptions;
}

const NORMAL: PlaybackOptions = { speed: 1, lengthFactor: 1 };

/** Stretches a sequence for the playback speed and note length settings */
export function scaleEvents(events: PlayEvent[], { speed, lengthFactor }: PlaybackOptions): PlayEvent[] {
  if (speed === 1 && lengthFactor === 1) return events;
  return events.map((e) => ({ ...e, at: e.at / speed, dur: Math.max(60, (e.dur * lengthFactor) / speed) }));
}

/** Plays timed notes and chords on the piano; starting a new sequence cuts off the last one */
export function useSequencePlayer({ playNote, releaseNote, options = NORMAL }: UseSequencePlayerProps) {
  const timersRef = useRef<number[]>([]);
  const soundingRef = useRef(new Map<string, number>());
  const [isPlaying, setIsPlaying] = useState(false);
  /** Keys sounding right now, for lighting up a keyboard */
  const [sounding, setSounding] = useState<ReadonlySet<string>>(new Set());
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const publish = useCallback(() => setSounding(new Set(soundingRef.current.keys())), []);

  const stop = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    soundingRef.current.forEach((_, note) => releaseNote(note));
    soundingRef.current.clear();
    setSounding(new Set());
    setIsPlaying(false);
  }, [releaseNote]);

  /** Plays the events; returns how long they last in ms after scaling */
  const play = useCallback(
    (raw: PlayEvent[]): number => {
      stop();
      if (raw.length === 0) return 0;
      const events = scaleEvents(raw, optionsRef.current);
      setIsPlaying(true);
      const schedule = (fn: () => void, ms: number) => timersRef.current.push(window.setTimeout(fn, ms));
      for (const event of events) {
        schedule(() => {
          for (const note of event.notes) {
            playNote(note, event.vel ?? VELOCITY);
            // Count overlapping holds so a re-struck key isn't cut off early
            soundingRef.current.set(note, (soundingRef.current.get(note) ?? 0) + 1);
          }
          publish();
        }, event.at);
        schedule(() => {
          for (const note of event.notes) {
            const holds = (soundingRef.current.get(note) ?? 1) - 1;
            if (holds > 0) {
              soundingRef.current.set(note, holds);
            } else {
              releaseNote(note);
              soundingRef.current.delete(note);
            }
          }
          publish();
        }, event.at + event.dur);
      }
      const length = soundLength(events);
      schedule(() => setIsPlaying(false), length);
      return length;
    },
    [stop, playNote, releaseNote, publish]
  );

  useEffect(() => stop, [stop]);

  return { play, stop, isPlaying, sounding };
}

export type SequencePlayer = ReturnType<typeof useSequencePlayer>;
