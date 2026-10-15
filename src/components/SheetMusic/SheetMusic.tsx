import { useEffect, useMemo, useRef, useState } from 'react';
import { buildMeasures, GRIDS } from '../../utils/sheetMusic';
import type { GridSteps, SheetNote } from '../../utils/sheetMusic';
import { renderGrandStaff } from '../../utils/renderGrandStaff';
import styles from './SheetMusic.module.css';

interface SheetMusicProps {
  notes: SheetNote[];
  isWriting: boolean;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  grid: GridSteps;
  onGridChange: (grid: GridSteps) => void;
  onToggleWriting: () => void;
  onClear: () => void;
}

const MIN_BPM = 40;
const MAX_BPM = 200;

export function SheetMusic({
  notes,
  isWriting,
  bpm,
  onBpmChange,
  grid,
  onGridChange,
  onToggleWriting,
  onClear,
}: SheetMusicProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);

  const measures = useMemo(() => buildMeasures(notes, bpm, grid), [notes, bpm, grid]);

  useEffect(() => {
    document.fonts.load('30px Bravura').then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!scoreRef.current || !fontsReady || width === 0) return;
    renderGrandStaff(scoreRef.current, measures, width, { beats: 4 });
    // Follow the newest notes
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [measures, width, fontsReady]);

  const handleBpmChange = (value: string) => {
    const n = Number(value);
    if (Number.isFinite(n)) onBpmChange(Math.min(MAX_BPM, Math.max(MIN_BPM, n)));
  };

  return (
    <div className={styles.sheet}>
      <div className={styles.header}>
        <span className={styles.label}>Sheet Music</span>
        <div className={styles.actions}>
          <label className={styles.field}>
            <span>BPM</span>
            <input
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpm}
              onChange={(e) => handleBpmChange(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Grid</span>
            <select
              value={grid}
              onChange={(e) => onGridChange(Number(e.target.value) as GridSteps)}
            >
              {GRIDS.map((g) => (
                <option key={g.steps} value={g.steps}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className={`${styles.btn} ${isWriting ? styles.writing : ''}`}
            onClick={onToggleWriting}
          >
            <span className={styles.dot} />
            {isWriting ? 'Writing' : 'Paused'}
          </button>
          <button className={styles.btn} onClick={onClear} disabled={notes.length === 0}>
            Clear
          </button>
        </div>
      </div>

      <div className={styles.paper} ref={scrollRef}>
        <div ref={scoreRef} />
        {notes.length === 0 && (
          <p className={styles.hint}>
            {isWriting ? 'Play the piano — notes will be written here' : 'Writing is paused'}
          </p>
        )}
      </div>
    </div>
  );
}
