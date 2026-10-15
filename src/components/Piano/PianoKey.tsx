import { memo } from 'react';
import type { NoteInfo } from '../../utils/noteMapping';
import styles from './PianoKey.module.css';

interface PianoKeyProps {
  noteInfo: NoteInfo;
  isActive: boolean;
  isDetected: boolean;
  isHint: boolean;
  /** Finger that rests on this key in the current hand position */
  finger?: number;
  showLabels: boolean;
  onNoteDown: (note: string) => void;
  onNoteUp: (note: string) => void;
}

export const PianoKey = memo(function PianoKey({
  noteInfo,
  isActive,
  isDetected,
  isHint,
  finger,
  showLabels,
  onNoteDown,
  onNoteUp,
}: PianoKeyProps) {
  const { note, isBlack, keyboardShortcut } = noteInfo;

  const classNames = [
    styles.key,
    isBlack ? styles.black : styles.white,
    isActive ? styles.active : '',
    isDetected ? styles.detected : '',
    isHint ? styles.hint : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      data-note={note}
      onMouseDown={(e) => {
        e.preventDefault();
        onNoteDown(note);
      }}
      onMouseUp={() => onNoteUp(note)}
      onMouseLeave={() => {
        if (isActive) onNoteUp(note);
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        onNoteDown(note);
      }}
      onTouchEnd={() => onNoteUp(note)}
    >
      {finger !== undefined && <span className={styles.finger}>{finger}</span>}
      {showLabels && (
        <div className={styles.labels}>
          {keyboardShortcut && (
            <span className={styles.shortcut}>{keyboardShortcut.toUpperCase()}</span>
          )}
          <span className={styles.noteName}>{note}</span>
        </div>
      )}
    </div>
  );
});
