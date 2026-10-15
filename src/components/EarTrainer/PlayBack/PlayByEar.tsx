import { useState } from 'react';
import { DEFAULT_PLAY_OPTIONS, EXERCISE_GROUPS } from '../../../utils/earTraining/playback';
import type { ExerciseId, PlayOptions } from '../../../utils/earTraining/playback';
import type { ModuleProps } from '../types';
import { TopBar } from '../TopBar';
import { Chevron } from '../Icons';
import { CallResponse } from './CallResponse';
import { EchoExercise } from './EchoExercise';
import { SingBack } from './SingBack';
import { SongsByEar } from './SongsByEar';
import { ExerciseIcon } from './shared';
import styles from '../EarTrainer.module.css';
import css from './PlayBack.module.css';

/** "Play by ear": hear something, then play (or sing) it back */
export function PlayByEar(props: ModuleProps) {
  const [exercise, setExercise] = useState<ExerciseId | null>(null);
  const [options, setOptions] = useState<PlayOptions>(DEFAULT_PLAY_OPTIONS);
  const back = () => {
    props.player.stop();
    setExercise(null);
  };

  switch (exercise) {
    case 'sing':
      return <SingBack module={props} options={options} onOptions={setOptions} onBack={back} />;
    case 'response':
      return <CallResponse module={props} onBack={back} />;
    case 'song':
      return <SongsByEar module={props} options={options} onOptions={setOptions} onBack={back} />;
    case null:
      break;
    default:
      return <EchoExercise key={exercise} exercise={exercise} module={props} options={options} onOptions={setOptions} onBack={back} />;
  }

  return (
    <div className={styles.screen}>
      <TopBar title="Play by Ear" onBack={props.onBack} />
      <div className={`${styles.content} ${styles.setupContent}`}>
        <p className={css.introText}>Hear it, then play it. Use your piano, or tap the keys on screen.</p>
        {EXERCISE_GROUPS.map((group) => (
          <section key={group.title} className={css.menuGroup}>
            <h4 className={styles.sectionTitle}>{group.title}</h4>
            {group.exercises.map((e) => (
              <button key={e.id} className={`${styles.sheetOption} ${css.menuRow}`} onClick={() => setExercise(e.id)}>
                <span className={styles.sheetOptionIcon}>
                  <ExerciseIcon id={e.id} />
                </span>
                <span className={styles.sheetOptionText}>
                  <strong>{e.title}</strong>
                  <span>{e.blurb}</span>
                </span>
                <Chevron />
              </button>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
