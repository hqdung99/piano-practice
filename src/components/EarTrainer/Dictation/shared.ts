import { useEffect, useRef } from 'react';
import type { ModuleProps } from '../types';

/** Note colours for the staff (VexFlow draws with plain colours, not CSS variables) */
export const INK = {
  given: '#94a3b8',
  entered: '#1e293b',
  good: '#16a34a',
  bad: '#e5484d',
};

export const NO_KEYS: ReadonlySet<string> = new Set();

/** What every exercise's question screen gets */
export interface QuestionProps<Q> {
  question: Q;
  module: ModuleProps;
  /** Reports the result; call once, when the answer is checked */
  onChecked: (correct: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}

/**
 * Sends notes played on the piano to `handler` while mounted.
 * With `whilePlaying` false, notes played during playback are ignored (they'd be echoes of the question).
 */
export function usePianoInput(module: ModuleProps, handler: (note: string) => void, whilePlaying = false) {
  const { registerPianoInput, player } = module;
  const handlerRef = useRef(handler);
  const playingRef = useRef(player.isPlaying);
  useEffect(() => {
    handlerRef.current = handler;
    playingRef.current = player.isPlaying;
  });
  useEffect(() => {
    registerPianoInput((note) => {
      if (whilePlaying || !playingRef.current) handlerRef.current(note);
    });
    return () => registerPianoInput(null);
  }, [registerPianoInput, whilePlaying]);
}
