import { NOTE_PRESETS, PICKABLE_NOTES } from '../../utils/noteGame';
import type { Staff } from '../../utils/renderGrandStaff';
import styles from './NotePicker.module.css';

interface NotePickerProps {
  staff: Staff;
  selected: string[];
  /** Replaces the whole pick, e.g. from a preset */
  onChange: (notes: string[]) => void;
  onToggle: (note: string) => void;
}

const STAFF_NAMES: Record<Staff, string> = { treble: 'Treble notes', bass: 'Bass notes' };

/** A keyboard over a staff's range: tap keys to choose which notes the game asks for */
export function NotePicker({ staff, selected, onChange, onToggle }: NotePickerProps) {
  const notes = PICKABLE_NOTES[staff];
  const whites = notes.filter((n) => !n.includes('#'));
  const chosen = new Set(selected);
  const samePick = (list: string[]) => list.length === selected.length && list.every((n) => chosen.has(n));

  return (
    <div className={styles.picker}>
      <div className={styles.head}>
        <span className={styles.title}>{STAFF_NAMES[staff]}</span>
        <span className={selected.length ? styles.count : styles.countEmpty}>
          {selected.length ? `${selected.length} picked` : 'Pick at least one note'}
        </span>
      </div>
      <div className={styles.presets}>
        {NOTE_PRESETS[staff].map((p) => (
          <button
            key={p.label}
            className={`${styles.preset} ${samePick(p.notes) ? styles.presetOn : ''}`}
            onClick={() => onChange(p.notes)}
          >
            {p.label}
          </button>
        ))}
        <button className={styles.preset} onClick={() => onChange([])} disabled={!selected.length}>
          Clear
        </button>
      </div>
      <div className={styles.keys} role="group" aria-label={STAFF_NAMES[staff]}>
        {whites.map((note) => (
          <button
            key={note}
            className={`${styles.white} ${chosen.has(note) ? styles.on : ''}`}
            onClick={() => onToggle(note)}
            aria-pressed={chosen.has(note)}
            aria-label={note}
          >
            <span>{note}</span>
          </button>
        ))}
        {notes
          .filter((n) => n.includes('#'))
          .map((note) => {
            // A black key sits on the line after the white key below it
            const below = whites.indexOf(note.replace('#', ''));
            return (
              <button
                key={note}
                className={`${styles.black} ${chosen.has(note) ? styles.on : ''}`}
                style={{ left: `calc(${((below + 1) / whites.length) * 100}% - ${100 / whites.length / 3}%)`, width: `${(100 / whites.length) * 0.66}%` }}
                onClick={() => onToggle(note)}
                aria-pressed={chosen.has(note)}
                aria-label={note}
                title={note}
              />
            );
          })}
      </div>
    </div>
  );
}
