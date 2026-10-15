import { CHORD_PRESETS, CHORD_TYPES, ROOT_NAMES, chordId, chordSymbol } from '../../utils/chordGame';
import styles from './ChordPicker.module.css';

interface ChordPickerProps {
  selected: string[];
  onChange: (chords: string[]) => void;
}

/** Short column headings for the chord types */
const TYPE_LABELS: Record<string, string> = { '': 'maj', 'm7♭5': 'ø7', dim7: '°7' };

/** A root × type grid: tap cells, a whole row or a whole column to choose the chords to practise */
export function ChordPicker({ selected, onChange }: ChordPickerProps) {
  const chosen = new Set(selected);
  const toggle = (id: string) => onChange(chosen.has(id) ? selected.filter((c) => c !== id) : [...selected, id]);
  // A row or column turns off if it's all on, otherwise it fills in
  const toggleMany = (ids: string[]) =>
    onChange(ids.every((id) => chosen.has(id)) ? selected.filter((c) => !ids.includes(c)) : [...new Set([...selected, ...ids])]);
  const samePick = (list: string[]) => list.length === selected.length && list.every((c) => chosen.has(c));

  return (
    <div className={styles.picker}>
      <div className={styles.head}>
        <span className={styles.title}>Chords to practise</span>
        <span className={selected.length ? styles.count : styles.countEmpty}>
          {selected.length ? `${selected.length} picked` : 'Pick at least one chord'}
        </span>
      </div>
      <div className={styles.presets}>
        {CHORD_PRESETS.map((p) => (
          <button
            key={p.label}
            className={`${styles.preset} ${samePick(p.chords) ? styles.presetOn : ''}`}
            onClick={() => onChange(p.chords)}
          >
            {p.label}
          </button>
        ))}
        <button className={styles.preset} onClick={() => onChange([])} disabled={!selected.length}>
          Clear
        </button>
      </div>

      <div className={styles.gridWrap}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th />
              {CHORD_TYPES.map((t) => (
                <th key={t.id}>
                  <button
                    className={styles.axis}
                    onClick={() => toggleMany(ROOT_NAMES.map((_, r) => chordId(r, t.id)))}
                    title={`All ${t.name.toLowerCase()} chords`}
                  >
                    {TYPE_LABELS[t.id] ?? t.id}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROOT_NAMES.map((name, r) => (
              <tr key={name}>
                <th>
                  <button
                    className={styles.axis}
                    onClick={() => toggleMany(CHORD_TYPES.map((t) => chordId(r, t.id)))}
                    title={`Every chord on ${name}`}
                  >
                    {name}
                  </button>
                </th>
                {CHORD_TYPES.map((t) => {
                  const id = chordId(r, t.id);
                  return (
                    <td key={t.id}>
                      <button
                        className={`${styles.cell} ${chosen.has(id) ? styles.cellOn : ''}`}
                        onClick={() => toggle(id)}
                        aria-pressed={chosen.has(id)}
                        aria-label={chordSymbol(id)}
                        title={`${chordSymbol(id)} · ${t.name}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected.length > 0 && (
        <div className={styles.chosen}>
          {selected.map((id) => (
            <button key={id} className={styles.chip} onClick={() => toggle(id)} title="Remove">
              {chordSymbol(id)} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
