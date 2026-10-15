import { MIN_VOLUME_DB, MAX_VOLUME_DB } from '../../utils/constants';
import styles from './Controls.module.css';

interface VolumeSliderProps {
  value: number;
  onChange: (db: number) => void;
}

export function VolumeSlider({ value, onChange }: VolumeSliderProps) {
  return (
    <div className={styles.controlGroup}>
      <label className={styles.label}>
        <span className={styles.icon}>&#x1f50a;</span>
        Volume
      </label>
      <input
        type="range"
        className={styles.slider}
        min={MIN_VOLUME_DB}
        max={MAX_VOLUME_DB}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className={styles.value}>{value} dB</span>
    </div>
  );
}
