import { useState } from 'react';
import {
  CHORD_SETS,
  INTERVAL_SETS,
  ROUND_LENGTH,
  bassLineQuestion,
  chordQuestion,
  exerciseDef,
  intervalQuestion,
  melodyLength,
  melodyQuestion,
  noteQuestion,
  progressionQuestion,
} from '../../../utils/earTraining/playback';
import type {
  ChordSet,
  EchoQuestion,
  IntervalDirection,
  IntervalSet,
  KeyChoice,
  PlayOptions,
  PlayResult,
} from '../../../utils/earTraining/playback';
import type { ModuleProps } from '../types';
import { EchoRun } from './EchoRun';
import { RunResults } from './RunResults';
import { SetupScreen } from './SetupScreen';
import { Section, Segmented } from './shared';
import { useEchoRun } from './useEchoRun';
import styles from '../EarTrainer.module.css';

export type EchoExerciseId = 'note' | 'interval' | 'chord' | 'melody' | 'bass' | 'progression';

interface EchoExerciseProps {
  exercise: EchoExerciseId;
  module: ModuleProps;
  options: PlayOptions;
  onOptions: (options: PlayOptions) => void;
  onBack: () => void;
}

const INTROS: Record<EchoExerciseId, string> = {
  note: 'You hear one note. Find it and play it back.',
  interval: 'You hear two notes. The first is shown on the keys; play the second.',
  chord: 'You hear a chord. Play every one of its notes, in any octave and any order — one at a time is fine.',
  melody: 'You hear a short tune; its first note is shown. Play the rest in order. Tunes start with 3 notes and grow as you get them right.',
  bass: 'You hear four chords. Play the lowest note of each, in order, in any octave.',
  progression: 'You hear the key, then a few chords. Play each chord in turn — any octave or inversion.',
};

const DIRECTION_LABELS: Record<IntervalDirection, string> = { up: 'Up', down: 'Down', mixed: 'Mixed' };

function questionMaker(exercise: EchoExerciseId, options: PlayOptions, notation: ModuleProps['labels']['notation']) {
  return (_: number, results: PlayResult[]): EchoQuestion => {
    switch (exercise) {
      case 'note':
        return noteQuestion(options.noteAnyOctave, notation);
      case 'interval':
        return intervalQuestion(options.intervalSet, options.direction, notation);
      case 'chord':
        return chordQuestion(options.chordSet, notation);
      case 'melody':
        return melodyQuestion(melodyLength(results.map((r) => r.correct)), options.melodyAnyOctave, notation);
      case 'bass':
        return bassLineQuestion(options.keyChoice, notation);
      case 'progression':
        return progressionQuestion(options.keyChoice, notation);
    }
  };
}

function Run({ exercise, module, options, onFinish }: { exercise: EchoExerciseId; module: ModuleProps; options: PlayOptions; onFinish: (r: PlayResult[]) => void }) {
  const [makeQuestion] = useState(() => questionMaker(exercise, options, module.labels.notation));
  const run = useEchoRun(module, { total: ROUND_LENGTH, makeQuestion, onFinish });
  return (
    <EchoRun run={run} title={exerciseDef(exercise).title} inputSource={module.inputSource} onBack={() => onFinish(run.results)} />
  );
}

/** Setup, a round of 8, then results */
export function EchoExercise({ exercise, module, options, onOptions, onBack }: EchoExerciseProps) {
  const [phase, setPhase] = useState<'setup' | 'run' | 'results'>('setup');
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<PlayResult[]>([]);
  const set = (patch: Partial<PlayOptions>) => onOptions({ ...options, ...patch });
  const title = exerciseDef(exercise).title;

  const start = () => {
    setRound((r) => r + 1);
    setPhase('run');
  };

  if (phase === 'run') {
    return (
      <Run
        key={round}
        exercise={exercise}
        module={module}
        options={options}
        onFinish={(r) => {
          module.player.stop();
          setResults(r);
          // Leaving before answering anything goes back to the setup
          setPhase(r.length ? 'results' : 'setup');
        }}
      />
    );
  }

  if (phase === 'results') {
    return (
      <RunResults title={title} results={results} player={module.player} onRetry={start} onDone={() => setPhase('setup')} />
    );
  }

  const octave = (value: boolean, onChange: (v: boolean) => void) => (
    <Section title="Octave">
      <Segmented<boolean> options={[false, true]} value={value} onChange={onChange} label={(v) => (v ? 'Any octave' : 'Exact octave')} />
      <p className={styles.helper}>
        {value ? 'The right letter anywhere on the keyboard counts.' : 'Play it exactly where you heard it.'}
      </p>
    </Section>
  );

  return (
    <SetupScreen exercise={exercise} intro={INTROS[exercise]} onStart={start} onBack={onBack}>
      {exercise === 'note' && octave(options.noteAnyOctave, (noteAnyOctave) => set({ noteAnyOctave }))}
      {exercise === 'melody' && octave(options.melodyAnyOctave, (melodyAnyOctave) => set({ melodyAnyOctave }))}

      {exercise === 'interval' && (
        <>
          <Section title="Intervals">
            <div className={styles.chipRow}>
              {(Object.keys(INTERVAL_SETS) as IntervalSet[]).map((id) => (
                <button
                  key={id}
                  className={`${styles.chip} ${options.intervalSet === id ? styles.chipActive : ''}`}
                  onClick={() => set({ intervalSet: id })}
                >
                  {INTERVAL_SETS[id].label}
                </button>
              ))}
            </div>
          </Section>
          <Section title="Direction">
            <Segmented<IntervalDirection>
              options={['up', 'down', 'mixed']}
              value={options.direction}
              onChange={(direction) => set({ direction })}
              label={(d) => DIRECTION_LABELS[d]}
            />
          </Section>
        </>
      )}

      {exercise === 'chord' && (
        <Section title="Chords">
          <div className={styles.chipRow}>
            {(Object.keys(CHORD_SETS) as ChordSet[]).map((id) => (
              <button
                key={id}
                className={`${styles.chip} ${options.chordSet === id ? styles.chipActive : ''}`}
                onClick={() => set({ chordSet: id })}
              >
                {CHORD_SETS[id].label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {(exercise === 'bass' || exercise === 'progression') && (
        <Section title="Key">
          <Segmented<KeyChoice>
            options={['c', 'any']}
            value={options.keyChoice}
            onChange={(keyChoice) => set({ keyChoice })}
            label={(k) => (k === 'c' ? 'C major' : 'Any major key')}
          />
        </Section>
      )}
    </SetupScreen>
  );
}
