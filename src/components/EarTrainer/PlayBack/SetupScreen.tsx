import type { ReactNode } from 'react';
import { exerciseDef } from '../../../utils/earTraining/playback';
import type { ExerciseId } from '../../../utils/earTraining/playback';
import { TopBar } from '../TopBar';
import { PlayIcon } from '../Icons';
import { ExerciseIcon } from './shared';
import styles from '../EarTrainer.module.css';
import css from './PlayBack.module.css';

interface SetupScreenProps {
  exercise: ExerciseId;
  /** How the exercise works, in a sentence or two */
  intro: string;
  startLabel?: string;
  startDisabled?: boolean;
  onStart: () => void;
  onBack: () => void;
  children?: ReactNode;
}

export function SetupScreen({ exercise, intro, startLabel = 'Start', startDisabled, onStart, onBack, children }: SetupScreenProps) {
  const def = exerciseDef(exercise);
  return (
    <div className={styles.screen}>
      <TopBar title={def.title} onBack={onBack} />
      <div className={`${styles.content} ${styles.setupContent}`}>
        <div className={css.intro}>
          <span className={css.introIcon}>
            <ExerciseIcon id={exercise} size={30} />
          </span>
          <p>{intro}</p>
        </div>
        {children}
      </div>
      <div className={styles.stickyFooter}>
        <button className={styles.primaryBtn} onClick={onStart} disabled={startDisabled}>
          <PlayIcon size={20} />
          {startLabel}
        </button>
      </div>
    </div>
  );
}
