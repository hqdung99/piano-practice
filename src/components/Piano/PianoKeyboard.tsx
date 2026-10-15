import { useEffect, useRef } from 'react';
import { ALL_NOTES, WHITE_NOTES } from '../../utils/noteMapping';
import type { NoteInfo } from '../../utils/noteMapping';
import { WHITE_KEY_WIDTH } from '../../utils/constants';
import { PianoKey } from './PianoKey';
import styles from './PianoKeyboard.module.css';

interface PianoKeyboardProps {
  activeNotes: Set<string>;
  detectedNote?: string | null;
  hintNotes?: ReadonlySet<string>;
  /** Finger numbers shown on the keys under the player's hands */
  fingerMarks?: ReadonlyMap<string, number>;
  showLabels: boolean;
  onNoteDown: (note: string) => void;
  onNoteUp: (note: string) => void;
}

/**
 * Returns the pixel left offset for a black key based on
 * the white key index before it.
 */
function getBlackKeyOffset(noteInfo: NoteInfo): number {
  const whiteIndex = WHITE_NOTES.findIndex(
    (wn) =>
      wn.octave === noteInfo.octave &&
      getWhiteKeyBefore(noteInfo.note) === wn.note
  );
  if (whiteIndex === -1) return 0;
  return whiteIndex * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH - 13;
}

function getWhiteKeyBefore(note: string): string {
  const map: Record<string, string> = {
    'C#': 'C',
    'D#': 'D',
    'F#': 'F',
    'G#': 'G',
    'A#': 'A',
  };
  const noteName = note.replace(/\d+$/, '');
  const octave = note.match(/\d+$/)?.[0] ?? '';
  return (map[noteName] ?? noteName) + octave;
}

export function PianoKeyboard({
  activeNotes,
  detectedNote,
  hintNotes,
  fingerMarks,
  showLabels,
  onNoteDown,
  onNoteUp,
}: PianoKeyboardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to middle C (C4) on mount
    if (scrollRef.current) {
      const c4Index = WHITE_NOTES.findIndex((n) => n.note === 'C4');
      const scrollTarget = c4Index * WHITE_KEY_WIDTH - scrollRef.current.clientWidth / 2 + WHITE_KEY_WIDTH * 4;
      scrollRef.current.scrollLeft = Math.max(0, scrollTarget);
    }
  }, []);

  const whiteNotes = ALL_NOTES.filter((n) => !n.isBlack);
  const blackNotes = ALL_NOTES.filter((n) => n.isBlack);
  const totalWidth = whiteNotes.length * WHITE_KEY_WIDTH;

  return (
    <div className={styles.scrollContainer} ref={scrollRef}>
      <div className={styles.keyboard} style={{ width: totalWidth }}>
        {whiteNotes.map((noteInfo) => (
          <PianoKey
            key={noteInfo.note}
            noteInfo={noteInfo}
            isActive={activeNotes.has(noteInfo.note)}
            isDetected={detectedNote === noteInfo.note}
            isHint={hintNotes?.has(noteInfo.note) ?? false}
            finger={fingerMarks?.get(noteInfo.note)}
            showLabels={showLabels}
            onNoteDown={onNoteDown}
            onNoteUp={onNoteUp}
          />
        ))}
        {blackNotes.map((noteInfo) => (
          <PianoKey
            key={noteInfo.note}
            noteInfo={noteInfo}
            isActive={activeNotes.has(noteInfo.note)}
            isDetected={detectedNote === noteInfo.note}
            isHint={hintNotes?.has(noteInfo.note) ?? false}
            finger={fingerMarks?.get(noteInfo.note)}
            showLabels={showLabels}
            onNoteDown={onNoteDown}
            onNoteUp={onNoteUp}
          />
        ))}
        {/* Position black keys absolutely */}
        <style>{blackNotes
          .map(
            (n) =>
              `.${styles.keyboard} [data-note="${n.note}"] { left: ${getBlackKeyOffset(n)}px; }`
          )
          .join('\n')}</style>
      </div>
    </div>
  );
}
