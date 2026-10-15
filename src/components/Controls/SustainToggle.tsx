import styles from './Controls.module.css';

interface SustainToggleProps {
  active: boolean;
  onToggle: () => void;
}

export function SustainToggle({ active, onToggle }: SustainToggleProps) {
  return (
    <div className={styles.controlGroup}>
      <label className={styles.label}>Sustain</label>
      <button
        className={`${styles.toggleBtn} ${active ? styles.toggleActive : ''}`}
        onClick={onToggle}
        title="Toggle sustain pedal (Space)"
      >
        {active ? 'ON' : 'OFF'}
      </button>
      <span className={styles.hint}>Space</span>
    </div>
  );
}
