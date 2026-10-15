import { useMemo } from 'react';
import { midiToNote } from '../../utils/earTraining/theory';
import styles from './KeyStrip.module.css';

const BLACK = new Set([1, 3, 6, 8, 10]);

interface KeyStripProps {
  /** Keys lit as sounding (piano note names like 'C#4') */
  lit: ReadonlySet<string>;
  /** Keys marked as right / wrong, e.g. after an answer */
  good?: ReadonlySet<string>;
  bad?: ReadonlySet<string>;
  /** Lowest and highest MIDI notes to draw; widened to whole octaves */
  low?: number;
  high?: number;
  /** Makes keys pressable */
  onPress?: (note: string) => void;
  onRelease?: (note: string) => void;
  /** Shows the C of each octave */
  labelCs?: boolean;
}

/** A small keyboard that lights up notes: for listening, feedback and on-screen answers */
export function KeyStrip({ lit, good, bad, low = 48, high = 84, onPress, onRelease, labelCs = true }: KeyStripProps) {
  const from = low - (low % 12);
  const to = high + (11 - (high % 12));
  const keys = useMemo(() => {
    const list: number[] = [];
    for (let m = from; m <= to; m++) list.push(m);
    return list;
  }, [from, to]);
  const whites = keys.filter((m) => !BLACK.has(m % 12));
  const whiteWidth = 100 / whites.length;

  const state = (note: string) =>
    good?.has(note) ? styles.good : bad?.has(note) ? styles.bad : lit.has(note) ? styles.lit : '';

  const handlers = (note: string) =>
    onPress
      ? {
          onPointerDown: () => onPress(note),
          onPointerUp: () => onRelease?.(note),
          onPointerLeave: (e: React.PointerEvent) => {
            if (e.buttons) onRelease?.(note);
          },
        }
      : {};

  return (
    <div className={`${styles.strip} ${onPress ? styles.interactive : ''}`} aria-hidden={!onPress}>
      {whites.map((m) => {
        const note = midiToNote(m);
        return (
          <button
            key={m}
            type="button"
            tabIndex={onPress ? 0 : -1}
            className={`${styles.white} ${state(note)}`}
            aria-label={note}
            {...handlers(note)}
          >
            {labelCs && m % 12 === 0 && <span className={styles.label}>{note}</span>}
          </button>
        );
      })}
      {keys
        .filter((m) => BLACK.has(m % 12))
        .map((m) => {
          const note = midiToNote(m);
          // A black key sits over the line after the white key below it
          const whiteBelow = whites.indexOf(m - 1);
          return (
            <button
              key={m}
              type="button"
              tabIndex={onPress ? 0 : -1}
              className={`${styles.black} ${state(note)}`}
              style={{ left: `${(whiteBelow + 1) * whiteWidth - whiteWidth * 0.3}%`, width: `${whiteWidth * 0.6}%` }}
              aria-label={note}
              {...handlers(note)}
            />
          );
        })}
    </div>
  );
}
