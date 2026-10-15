import { useState } from 'react';
import { DEFAULT_SETTINGS, EXERCISES, exerciseDef, generateRound } from '../../../utils/earTraining/dictation';
import type { DictationQuestion, ExerciseId, Settings } from '../../../utils/earTraining/dictation';
import type { ModuleProps } from '../types';
import { TopBar } from '../TopBar';
import { Chevron } from '../Icons';
import { DictationResults } from './DictationResults';
import { DictationRun } from './DictationRun';
import { DictationSetup } from './DictationSetup';
import { ExerciseIcon } from './parts';
import shell from '../EarTrainer.module.css';
import styles from './Dictation.module.css';

type View =
  | { screen: 'menu' }
  | { screen: 'setup'; exercise: ExerciseId }
  | { screen: 'run'; exercise: ExerciseId; questions: DictationQuestion[]; round: number }
  | { screen: 'results'; exercise: ExerciseId; results: boolean[] };

/** "Hear it, then write it": melodic, rhythmic and two-voice dictation plus reading exercises */
export function Dictation(props: ModuleProps) {
  const [view, setView] = useState<View>({ screen: 'menu' });
  const [settings, setSettings] = useState<Record<ExerciseId, Settings>>(DEFAULT_SETTINGS);
  const [round, setRound] = useState(0);

  const start = (exercise: ExerciseId) => {
    setRound((r) => r + 1);
    setView({ screen: 'run', exercise, questions: generateRound(exercise, settings[exercise]), round: round + 1 });
  };

  if (view.screen === 'menu') {
    return (
      <div className={shell.screen}>
        <TopBar title="Dictation" onBack={props.onBack} />
        <div className={shell.content}>
          <p className={styles.menuIntro}>Hear it, then write it. Turning sound into notation is the fastest way to a reliable ear.</p>
          {EXERCISES.map((e) => (
            <button key={e.id} type="button" className={shell.sheetOption} onClick={() => setView({ screen: 'setup', exercise: e.id })}>
              <span className={shell.sheetOptionIcon}>
                <ExerciseIcon id={e.id} />
              </span>
              <span className={shell.sheetOptionText}>
                <strong>{e.title}</strong>
                <span>{e.tagline}</span>
              </span>
              <Chevron />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const def = exerciseDef(view.exercise);
  const toMenu = () => setView({ screen: 'menu' });

  if (view.screen === 'setup') {
    return (
      <DictationSetup
        exercise={def}
        settings={settings[def.id]}
        onChange={(s) => setSettings((all) => ({ ...all, [def.id]: s }))}
        onStart={() => start(def.id)}
        onBack={toMenu}
      />
    );
  }

  if (view.screen === 'run') {
    return (
      <DictationRun
        key={view.round}
        title={def.title}
        questions={view.questions}
        module={props}
        onFinish={(results) => setView({ screen: 'results', exercise: def.id, results })}
        onBack={() => setView({ screen: 'setup', exercise: def.id })}
      />
    );
  }

  return <DictationResults title={def.title} results={view.results} onRetry={() => start(def.id)} onDone={toMenu} />;
}
