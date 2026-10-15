import { useCallback, useRef, useState } from 'react';

export interface RecordedEvent {
  note: string;
  type: 'down' | 'up';
  time: number;
  velocity: number;
}

export interface UseRecorderReturn {
  startRecording: () => void;
  stopRecording: () => void;
  playRecording: () => void;
  stopPlayback: () => void;
  recordNoteDown: (note: string, velocity: number) => void;
  recordNoteUp: (note: string) => void;
  isRecording: boolean;
  isPlaying: boolean;
  hasRecording: boolean;
}

export function useRecorder(
  onNoteDown: (note: string, velocity: number) => void,
  onNoteUp: (note: string) => void
): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);

  const eventsRef = useRef<RecordedEvent[]>([]);
  const startTimeRef = useRef(0);
  const playbackTimersRef = useRef<number[]>([]);

  const startRecording = useCallback(() => {
    eventsRef.current = [];
    startTimeRef.current = performance.now();
    setIsRecording(true);
    setHasRecording(false);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (eventsRef.current.length > 0) {
      setHasRecording(true);
    }
  }, []);

  const recordNoteDown = useCallback((note: string, velocity: number) => {
    if (!isRecording) return;
    eventsRef.current.push({
      note,
      type: 'down',
      time: performance.now() - startTimeRef.current,
      velocity,
    });
  }, [isRecording]);

  const recordNoteUp = useCallback((note: string) => {
    if (!isRecording) return;
    eventsRef.current.push({
      note,
      type: 'up',
      time: performance.now() - startTimeRef.current,
      velocity: 0,
    });
  }, [isRecording]);

  const stopPlayback = useCallback(() => {
    playbackTimersRef.current.forEach((id) => clearTimeout(id));
    playbackTimersRef.current = [];
    setIsPlaying(false);
  }, []);

  const playRecording = useCallback(() => {
    if (eventsRef.current.length === 0 || isPlaying) return;

    stopPlayback();
    setIsPlaying(true);

    const events = eventsRef.current;
    const timers: number[] = [];

    for (const event of events) {
      const timerId = window.setTimeout(() => {
        if (event.type === 'down') {
          onNoteDown(event.note, event.velocity);
        } else {
          onNoteUp(event.note);
        }
      }, event.time);
      timers.push(timerId);
    }

    const lastTime = events[events.length - 1].time;
    const endTimer = window.setTimeout(() => {
      setIsPlaying(false);
      playbackTimersRef.current = [];
    }, lastTime + 200);
    timers.push(endTimer);

    playbackTimersRef.current = timers;
  }, [isPlaying, onNoteDown, onNoteUp, stopPlayback]);

  return {
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
    recordNoteDown,
    recordNoteUp,
    isRecording,
    isPlaying,
    hasRecording,
  };
}
