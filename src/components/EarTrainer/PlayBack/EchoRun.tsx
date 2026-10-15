import type { ReactNode } from 'react';
import { MAX_STEP_MISTAKES, stepTargets } from '../../../utils/earTraining/playback';
import type { InputSource } from '../../../hooks/useInputSource';
import { TopBar } from '../TopBar';
import { KeyStrip } from '../KeyStrip';
import { CheckIcon, SpeakerIcon } from '../Icons';
import { INPUT_NAMES } from './audio';
import { Dots, Pill, Stage } from './shared';
import type { DotState } from './shared';
import type { EchoRunState } from './useEchoRun';
import styles from '../EarTrainer.module.css';
import css from './PlayBack.module.css';

interface EchoRunProps {
  run: EchoRunState;
  title: string;
  inputSource: InputSource;
  onBack: () => void;
  /** Offers "Hint: first note" */
  allowHint?: boolean;
  /** More buttons beside "Show answer" */
  extra?: ReactNode;
}

function dotStates(run: EchoRunState): DotState[] {
  const { question, step, marks, status, found } = run;
  const targets = stepTargets(question.steps[0], question.anyOctave);
  // A lone chord: one dot per note to find
  if (question.steps.length === 1 && targets.length > 1) {
    if (status !== 'asking') return targets.map(() => (marks[0] === 'clean' ? 'good' : 'bad'));
    return targets.map((_, i) => (i < found.length ? 'good' : 'todo'));
  }
  return question.steps.map((_, i) => {
    if (i < marks.length) return marks[i] === 'clean' ? 'good' : 'bad';
    return i === step && status === 'asking' ? 'current' : 'todo';
  });
}

/** One question at a time: hear it, then play it on the piano or the keys below */
export function EchoRun({ run, title, inputSource, onBack, allowHint, extra }: EchoRunProps) {
  const { question, status, stepMistakes, mistakes, found, index, total } = run;
  const asking = status === 'asking';
  const chordStep = asking && stepTargets(question.steps[run.step], question.anyOctave).length > 1;
  const chordSize = chordStep ? stepTargets(question.steps[run.step], question.anyOctave).length : 0;

  return (
    <div className={styles.screen}>
      <TopBar title={title} onBack={onBack} progress={{ done: index + 1, total }} />
      <div className={`${styles.content} ${styles.quizContent}`}>
        <Stage playing={run.isPlaying} label="Replay" onClick={run.replay} />

        <p className={css.instruction}>{question.prompt}</p>
        <Dots states={dotStates(run)} />

        <p className={css.status}>
          {asking && stepMistakes > 0 && (
            <span className={css.statusBad}>
              Not that one — {MAX_STEP_MISTAKES - stepMistakes} {MAX_STEP_MISTAKES - stepMistakes === 1 ? 'try' : 'tries'} left
            </span>
          )}
          {asking && stepMistakes === 0 && chordStep && `${found.length} of ${chordSize} notes found`}
        </p>

        <div className={css.pills}>
          {question.context && (
            <Pill onClick={() => run.hearKey(question.context!)}>
              <SpeakerIcon size={16} /> Hear the key
            </Pill>
          )}
          {allowHint && asking && (
            <Pill onClick={run.hint} disabled={run.hinted}>
              Hint: first note
            </Pill>
          )}
          {asking && <Pill onClick={run.show}>Show answer</Pill>}
          {extra}
        </div>

        <div className={styles.feedback}>
          {status === 'solved' && (
            <p className={mistakes === 0 ? styles.feedbackCorrect : css.feedbackOkay}>
              {mistakes === 0 && <CheckIcon size={20} />}
              {mistakes === 0 ? 'Perfect!' : `Got it, with ${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'}`} —{' '}
              {question.label}
            </p>
          )}
          {status === 'shown' && (
            <div className={styles.feedbackWrong}>
              <p>
                It was <strong>{question.label}</strong>
              </p>
              <button className={styles.continueBtn} onClick={run.next}>
                {index + 1 >= total ? 'See results' : 'Next'}
              </button>
            </div>
          )}
        </div>

        <div className={css.keys}>
          <KeyStrip
            lit={run.lit}
            good={run.good}
            bad={run.bad}
            low={run.range[0]}
            high={run.range[1]}
            onPress={run.press}
            onRelease={run.release}
          />
        </div>
        <p className={styles.inputHint}>Play on your {INPUT_NAMES[inputSource]}, or tap the keys.</p>
      </div>
    </div>
  );
}
