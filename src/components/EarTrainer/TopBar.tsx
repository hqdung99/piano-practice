import type { ReactNode } from 'react';
import type { SkillId } from '../../utils/earTraining/skills';
import { SkillIcon } from './SkillIcon';
import styles from './EarTrainer.module.css';

interface TopBarProps {
  title: string;
  onBack: () => void;
  /** Shows the skill's icon before the title */
  skill?: SkillId;
  /** Progress bar with a "done / total" counter */
  progress?: { done: number; total: number };
  /** Replaces the counter next to the progress bar, e.g. a timer */
  progressLabel?: string;
  /** Shown under the title row instead of a progress bar */
  extra?: ReactNode;
  /** A button on the right, e.g. Finish */
  action?: ReactNode;
}

export function TopBar({ title, onBack, skill, progress, progressLabel, extra, action }: TopBarProps) {
  return (
    <div className={styles.topBar}>
      <div className={styles.topRow}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className={styles.topTitle}>
          {skill && (
            <span className={styles.topIcon}>
              <SkillIcon skill={skill} size={22} />
            </span>
          )}
          {title}
        </h2>
        {action ?? <span className={styles.backBtnSpacer} />}
      </div>
      {progress && (
        <div className={styles.progressRow}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.max(4, (progress.done / progress.total) * 100)}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {progressLabel ?? `${progress.done} / ${progress.total}`}
          </span>
        </div>
      )}
      {extra && <div className={styles.topExtra}>{extra}</div>}
    </div>
  );
}
