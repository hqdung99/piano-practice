import type { ReactNode } from 'react';
import type { ExerciseId } from '../../../utils/earTraining/dictation';
import type { ModuleProps } from '../types';
import { KeyStrip } from '../KeyStrip';
import { CheckIcon, PlayIcon } from '../Icons';
import { NO_KEYS } from './shared';
import shell from '../EarTrainer.module.css';
import styles from './Dictation.module.css';

/** A small pill button for tools such as Undo or Replay */
export function Tool({
  onClick,
  disabled,
  children,
  active,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`${styles.tool} ${active ? styles.toolActive : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** The main listen / replay button at the top of a question */
export function ListenButton({ playing, onClick, children }: { playing: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`${styles.listen} ${playing ? styles.listenPlaying : ''}`} onClick={onClick}>
      <span className={styles.listenIcon}>
        <PlayIcon size={18} />
      </span>
      <span>{playing ? 'Playing…' : children}</span>
    </button>
  );
}

/** Right / wrong message shown after checking */
export function Verdict({ correct, children }: { correct: boolean; children?: ReactNode }) {
  return (
    <div className={`${styles.verdict} ${correct ? styles.verdictGood : styles.verdictBad}`} role="status">
      {correct && <CheckIcon size={20} />}
      <span>{children ?? (correct ? 'Correct!' : 'Not quite')}</span>
    </div>
  );
}

/** Check before answering, Next (or See results) after */
export function QuestionFooter({
  checked,
  canCheck,
  onCheck,
  onNext,
  isLast,
  checkLabel = 'Check',
  children,
}: {
  checked: boolean;
  canCheck: boolean;
  onCheck: () => void;
  onNext: () => void;
  isLast: boolean;
  checkLabel?: string;
  /** Extra buttons shown before Check */
  children?: ReactNode;
}) {
  return (
    <div className={shell.stickyFooter}>
      {checked ? (
        <button className={shell.primaryBtn} onClick={onNext}>
          {isLast ? 'See results' : 'Next'}
        </button>
      ) : (
        <>
          {children}
          <button className={shell.primaryBtn} onClick={onCheck} disabled={!canCheck}>
            {checkLabel}
          </button>
        </>
      )}
    </div>
  );
}

/** On-screen keys that sound and send their note to `onNote`; never lit, since lighting the question would give it away */
export function PianoKeys({
  module,
  low,
  high,
  onNote,
  disabled,
}: {
  module: ModuleProps;
  low: number;
  high: number;
  onNote: (note: string) => void;
  disabled?: boolean;
}) {
  const { playNote, releaseNote } = module;
  return (
    <KeyStrip
      lit={NO_KEYS}
      low={low}
      high={high}
      onPress={
        disabled
          ? undefined
          : (note) => {
              playNote(note);
              onNote(note);
            }
      }
      onRelease={releaseNote}
    />
  );
}

/** A labelled white card, e.g. around a staff */
export function Card({ label, children, tone }: { label?: ReactNode; children: ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className={`${styles.card} ${tone === 'good' ? styles.cardGood : tone === 'bad' ? styles.cardBad : ''}`}>
      {label && <div className={styles.cardLabel}>{label}</div>}
      {children}
    </div>
  );
}

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Small pictures for the exercise menu */
export function ExerciseIcon({ id, size = 26 }: { id: ExerciseId; size?: number }) {
  const head = (cx: number, cy: number) => <ellipse cx={cx} cy={cy} rx="3.2" ry="2.4" transform={`rotate(-20 ${cx} ${cy})`} fill="currentColor" />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...STROKE}>
      {id === 'melodic' && (
        <>
          {head(6, 17)}
          {head(17, 13)}
          <path d="M9 16.5V6l11-3v10" />
        </>
      )}
      {id === 'rhythm' && (
        <>
          {head(5, 18)}
          {head(12, 18)}
          {head(19, 18)}
          <path d="M8 17.5V6h7v11.5M22 17.5V6M15 6h7M8 9h7" />
        </>
      )}
      {id === 'tap' && (
        <>
          <path d="M9 11V5.5a1.8 1.8 0 0 1 3.6 0V11" />
          <path d="M12.6 10.5V9a1.8 1.8 0 0 1 3.6 0v2a1.8 1.8 0 0 1 3.6 0v4.5a6.5 6.5 0 0 1-6.5 6.5h-1a6 6 0 0 1-4.6-2.2L4.5 16a1.8 1.8 0 0 1 2.8-2.3L9 15.5" />
        </>
      )}
      {id === 'twoVoice' && (
        <>
          <path d="M3 5h18M3 9h18M3 15h18M3 19h18" strokeWidth={1.3} />
          {head(8, 7)}
          {head(16, 9)}
          {head(8, 17)}
          {head(16, 15)}
        </>
      )}
      {id === 'match' && (
        <>
          <rect x="3" y="3.5" width="18" height="4.5" rx="1.5" />
          <rect x="3" y="10" width="18" height="4.5" rx="1.5" fill="currentColor" />
          <rect x="3" y="16.5" width="18" height="4.5" rx="1.5" />
        </>
      )}
      {id === 'audiation' && (
        <>
          <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
        </>
      )}
    </svg>
  );
}
