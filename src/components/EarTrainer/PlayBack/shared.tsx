import type { ReactNode } from 'react';
import type { ExerciseId } from '../../../utils/earTraining/playback';
import styles from '../EarTrainer.module.css';
import css from './PlayBack.module.css';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>{title}</h4>
      {children}
    </section>
  );
}

export function Segmented<T extends string | number | boolean>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: (v: T) => string;
}) {
  return (
    <div className={styles.segmented}>
      {options.map((o) => (
        <button key={String(o)} className={o === value ? styles.segActive : ''} onClick={() => onChange(o)}>
          {label(o)}
        </button>
      ))}
    </div>
  );
}

/** A sine wave twice as wide as the view, so sliding it by one period loops seamlessly */
function wavePath(amplitude: number, period: number, phase: number): string {
  const points: string[] = [];
  for (let x = 0; x <= 800; x += 8) {
    const y = 30 + amplitude * Math.sin(((x + phase) / period) * Math.PI * 2);
    points.push(`${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`);
  }
  return points.join(' ');
}

const WAVES = [
  { d: wavePath(12, 400, 0), main: true },
  { d: wavePath(8, 200, 60), main: false },
  { d: wavePath(6, 400, 150), main: false },
];

/** The big replay button: a moving wave while sound plays */
export function Stage({ playing, label, onClick }: { playing: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`${styles.stage} ${css.stage}`} onClick={onClick} aria-label={label}>
      {playing ? (
        <svg className={styles.wave} viewBox="0 0 400 60" preserveAspectRatio="none">
          {WAVES.map((w, i) => (
            <path
              key={i}
              d={w.d}
              className={w.main ? styles.waveMain : styles.waveSoft}
              style={{ animationDuration: `${1.6 + i * 0.5}s` }}
            />
          ))}
        </svg>
      ) : (
        <span className={styles.stageLine}>
          <span>{label}</span>
        </span>
      )}
    </button>
  );
}

export type DotState = 'todo' | 'current' | 'good' | 'bad';

export function Dots({ states }: { states: DotState[] }) {
  return (
    <div className={css.dots} aria-hidden>
      {states.map((s, i) => (
        <span key={i} className={css[s]} />
      ))}
    </div>
  );
}

/** A small rounded pill button for secondary actions */
export function Pill({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button className={css.pill} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const ICON_PATHS: Record<ExerciseId, ReactNode> = {
  note: (
    <>
      <ellipse cx="9" cy="17" rx="3.5" ry="2.6" fill="currentColor" />
      <path d="M12.5 17V4l5 3" />
    </>
  ),
  interval: (
    <>
      <ellipse cx="6" cy="18" rx="3" ry="2.2" fill="currentColor" />
      <ellipse cx="17" cy="8" rx="3" ry="2.2" fill="currentColor" />
      <path d="M9 15l5-4" strokeDasharray="2 2.5" />
    </>
  ),
  chord: (
    <>
      <ellipse cx="9" cy="19" rx="3" ry="2.1" fill="currentColor" />
      <ellipse cx="9" cy="13" rx="3" ry="2.1" fill="currentColor" />
      <ellipse cx="9" cy="7" rx="3" ry="2.1" fill="currentColor" />
      <path d="M12 19V3" />
    </>
  ),
  melody: <path d="M3 16c2.5 0 2.5-6 5-6s2.5 8 5 8 2.5-12 5-12 1.5 4 3 4" />,
  bass: (
    <>
      <path d="M4 20h16M7 20v-5M12 20v-8M17 20v-11" strokeWidth={3} />
    </>
  ),
  progression: (
    <>
      <rect x="3" y="12" width="4.5" height="8" rx="1.2" />
      <rect x="9.75" y="8" width="4.5" height="12" rx="1.2" />
      <rect x="16.5" y="4" width="4.5" height="16" rx="1.2" />
    </>
  ),
  sing: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </>
  ),
  response: (
    <>
      <path d="M3 5h11v7H8l-3 3v-3H3z" />
      <path d="M17 9h4v7h-2v3l-3-3h-5v-2" />
    </>
  ),
  song: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
};

export function ExerciseIcon({ id, size = 24 }: { id: ExerciseId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...STROKE}>
      {ICON_PATHS[id]}
    </svg>
  );
}
