import type { ExerciseDef, Settings } from '../../../utils/earTraining/dictation';
import { ROUND_LENGTH } from '../../../utils/earTraining/dictation';
import { TopBar } from '../TopBar';
import { PlayIcon } from '../Icons';
import { ExerciseIcon } from './parts';
import shell from '../EarTrainer.module.css';
import styles from './Dictation.module.css';

interface DictationSetupProps {
  exercise: ExerciseDef;
  settings: Settings;
  onChange: (settings: Settings) => void;
  onStart: () => void;
  onBack: () => void;
}

/** How the exercise works, and its few options */
export function DictationSetup({ exercise, settings, onChange, onStart, onBack }: DictationSetupProps) {
  return (
    <div className={shell.screen}>
      <TopBar title={exercise.title} onBack={onBack} />
      <div className={`${shell.content} ${shell.setupContent}`}>
        <div className={styles.howTo}>
          <span className={styles.howToIcon}>
            <ExerciseIcon id={exercise.id} size={28} />
          </span>
          <p>{exercise.howTo}</p>
        </div>

        {exercise.options.map((option) => {
          const value = settings[option.id];
          return (
            <section key={option.id} className={shell.section}>
              <span className={shell.sectionTitle}>{option.label}</span>
              <div className={shell.segmented}>
                {option.choices.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={value === c.id ? shell.segActive : ''}
                    aria-pressed={value === c.id}
                    onClick={() => onChange({ ...settings, [option.id]: c.id })}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {option.hints?.[value] && <p className={shell.helper}>{option.hints[value]}</p>}
            </section>
          );
        })}

        <p className={shell.helper}>{ROUND_LENGTH} questions per round.</p>
      </div>
      <div className={shell.stickyFooter}>
        <button className={shell.primaryBtn} onClick={onStart}>
          <PlayIcon size={20} /> Start
        </button>
      </div>
    </div>
  );
}
