import type { CSSProperties } from 'react';
import { TopBar } from '../TopBar';
import shell from '../EarTrainer.module.css';
import styles from './Dictation.module.css';

interface DictationResultsProps {
  title: string;
  results: boolean[];
  onRetry: () => void;
  onDone: () => void;
}

function bestStreak(results: boolean[]): number {
  let best = 0;
  let run = 0;
  for (const r of results) {
    run = r ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Score for a finished round */
export function DictationResults({ title, results, onRetry, onDone }: DictationResultsProps) {
  const correct = results.filter(Boolean).length;
  const percent = results.length ? Math.round((correct / results.length) * 100) : 0;
  let headline = 'Nice work!';
  if (percent === 100) headline = 'Perfect round!';
  else if (percent >= 80) headline = 'Great ear!';
  else if (percent < 50) headline = 'Keep practising';

  return (
    <div className={shell.screen}>
      <TopBar title={title} onBack={onDone} />
      <div className={`${shell.content} ${shell.setupContent}`}>
        <div className={shell.resultHero}>
          <div className={shell.scoreRing} style={{ '--pct': `${percent * 3.6}deg` } as CSSProperties}>
            <span>{percent}%</span>
          </div>
          <h3>{headline}</h3>
        </div>

        <div className={shell.statRow}>
          <div className={shell.statBox}>
            <strong>
              {correct}/{results.length}
            </strong>
            <span>Correct</span>
          </div>
          <div className={shell.statBox}>
            <strong>{results.length - correct}</strong>
            <span>Missed</span>
          </div>
          <div className={shell.statBox}>
            <strong>{bestStreak(results)}</strong>
            <span>Best streak</span>
          </div>
        </div>

        <section className={shell.section}>
          <h4 className={shell.sectionTitle}>Question by question</h4>
          <div className={styles.resultDots}>
            {results.map((r, i) => (
              <span key={i} className={r ? styles.dotGood : styles.dotBad} aria-label={`Question ${i + 1}: ${r ? 'right' : 'missed'}`}>
                {i + 1}
              </span>
            ))}
          </div>
        </section>
      </div>
      <div className={shell.stickyFooter}>
        <button className={shell.secondaryBtn} onClick={onRetry}>
          Try again
        </button>
        <button className={shell.primaryBtn} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
