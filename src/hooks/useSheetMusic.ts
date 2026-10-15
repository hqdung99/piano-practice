import { useCallback, useRef, useState } from 'react';
import type { GridSteps, SheetNote } from '../utils/sheetMusic';

export interface UseSheetMusicReturn {
  notes: SheetNote[];
  isWriting: boolean;
  bpm: number;
  setBpm: (bpm: number) => void;
  grid: GridSteps;
  setGrid: (grid: GridSteps) => void;
  noteDown: (note: string) => void;
  noteUp: (note: string) => void;
  toggleWriting: () => void;
  clear: () => void;
}

export const DEFAULT_BPM = 90;

export function useSheetMusic(): UseSheetMusicReturn {
  const [notes, setNotes] = useState<SheetNote[]>([]);
  const [isWriting, setIsWriting] = useState(true);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [grid, setGrid] = useState<GridSteps>(2);

  // Refs keep noteDown/noteUp stable so the piano callbacks don't re-bind
  const isWritingRef = useRef(true);
  // performance.now() of the first note; time on the sheet starts there
  const originRef = useRef<number | null>(null);
  const notesRef = useRef<SheetNote[]>([]);

  const commit = useCallback((next: SheetNote[]) => {
    notesRef.current = next;
    setNotes(next);
  }, []);

  const noteDown = useCallback((note: string) => {
    if (!isWritingRef.current) return;
    const now = performance.now();
    if (originRef.current === null) originRef.current = now;
    const start = now - originRef.current;
    commit([...notesRef.current, { note, start, end: null }]);
  }, [commit]);

  const noteUp = useCallback((note: string) => {
    if (originRef.current === null) return;
    const end = performance.now() - originRef.current;
    const prev = notesRef.current;
    const index = prev.findLastIndex((n) => n.note === note && n.end === null);
    if (index === -1) return;
    const next = [...prev];
    next[index] = { ...next[index], end };
    commit(next);
  }, [commit]);

  const toggleWriting = useCallback(() => {
    isWritingRef.current = !isWritingRef.current;
    setIsWriting(isWritingRef.current);
    // Resuming continues from the end of the sheet instead of leaving a long gap
    const prev = notesRef.current;
    if (isWritingRef.current && prev.length > 0) {
      const lastEnd = Math.max(...prev.map((n) => n.end ?? n.start));
      originRef.current = performance.now() - lastEnd;
    }
  }, []);

  const clear = useCallback(() => {
    originRef.current = null;
    commit([]);
  }, [commit]);

  return { notes, isWriting, bpm, setBpm, grid, setGrid, noteDown, noteUp, toggleWriting, clear };
}
