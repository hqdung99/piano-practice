import { useCallback, useEffect, useRef } from 'react';
import type { PlayEvent } from '../../../utils/earTraining/skills';
import type { ModuleProps } from '../types';
import type { InputSource } from '../../../hooks/useInputSource';

export const INPUT_NAMES: Record<InputSource, string> = {
  keyboard: 'computer keyboard',
  midi: 'MIDI piano',
  mic: 'piano (microphone)',
};

/** The mic still hears a note's ring for a moment after it is released */
const MIC_TAIL_MS = 350;
/** An on-screen key sounds through the speakers, so the mic would report it again */
const MIC_ECHO_MS = 700;

/**
 * Plays question audio and decides whether piano input counts: the mic would
 * hear the app's own sound, while a hand-played key simply cuts it short
 */
export function useGuardedAudio({ player, inputSource }: Pick<ModuleProps, 'player' | 'inputSource'>) {
  const quietUntil = useRef(0);
  const micRef = useRef(inputSource === 'mic');
  const { play, stop } = player;

  useEffect(() => {
    micRef.current = inputSource === 'mic';
  }, [inputSource]);

  const playGuarded = useCallback(
    (events: PlayEvent[]) => {
      const ms = play(events);
      quietUntil.current = performance.now() + ms + (micRef.current ? MIC_TAIL_MS : 0);
      return ms;
    },
    [play]
  );

  /** Whether a note from the piano counts right now */
  const accept = useCallback(() => {
    if (performance.now() >= quietUntil.current) return true;
    if (micRef.current) return false;
    stop();
    quietUntil.current = 0;
    return true;
  }, [stop]);

  /** An on-screen key press: always counts, and keeps the mic from counting it twice */
  const pressed = useCallback(() => {
    if (performance.now() < quietUntil.current) stop();
    quietUntil.current = micRef.current ? performance.now() + MIC_ECHO_MS : 0;
  }, [stop]);

  return { play: playGuarded, accept, pressed };
}

/** Hands the trainer a piano-input handler while mounted; the latest `handler` is always used */
export function usePianoInput(register: ModuleProps['registerPianoInput'], handler: (note: string) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    register((note) => ref.current(note));
    return () => register(null);
  }, [register]);
}
