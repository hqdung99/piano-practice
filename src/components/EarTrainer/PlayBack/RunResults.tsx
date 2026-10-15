import type { CSSProperties, ReactNode } from 'react';
import { scorePercent } from '../../../utils/earTraining/playback';
import type { PlayResult } from '../../../utils/earTraining/playback';
import type { SequencePlayer } from '../../../hooks/useSequencePlayer';
import { TopBar } from '../TopBar';
import { SpeakerIcon } from '../Icons';
import styles from '../EarTrainer.module.css';

interface RunResultsProps {
  title: string;
  results: PlayResult[];
  player: SequencePlayer;
  /** What counts as one question, e.g. "phrases" */
  unit?: string;
  /** The stat boxes' names; a null `mistakesLabel` leaves that box out */
  mistakesLabel?: string | null;
  shownLabel?: string;
  onRetry: () => void;
  onDone: () => void;
  /** Extra content under the stats, such as the song's sheet */
  children?: ReactNode;
}

export function RunResults({
  title,
  results,
  player,
  unit,
  mistakesLabel = 'Wrong notes',
  shownLabel = 'Answers shown',
  onRetry,
  onDone,
  children,
}: RunResultsProps) {
  const correct = results.filter((r) => r.correct).length;
  const percent = scorePercent(results);
  const mistakes = results.reduce((s, r) => s + r.mistakes, 0);
  const misses = results.filter((r) => !r.correct);

  let headline = 'Nice work!';
  if (results.length === 0) headline = 'Nothing played yet';
  else if (percent >= 90) headline = 'Excellent ear!';
  else if (percent < 60) headline = 'Keep practising';

  return (
    <div className={styles.screen}>
      <TopBar title={title} onBack={onDone} />
      <div className={`${styles.content} ${styles.setupContent}`}>
        <div className={styles.resultHero}>
          <div className={styles.scoreRing} style={{ '--pct': `${percent * 3.6}deg` } as CSSProperties}>
            <span>{percent}%</span>
          </div>
          <h3>{headline}</h3>
          {unit && results.length > 0 && (
            <p className={styles.helper}>
              {correct} of {results.length} {unit} right first time
            </p>
          )}
        </div>

        <div className={styles.statRow} style={mistakesLabel === null ? { gridTemplateColumns: 'repeat(2, 1fr)' } : undefined}>
          <div className={styles.statBox}>
            <strong>
              {correct}/{results.length}
            </strong>
            <span>Correct</span>
          </div>
          {mistakesLabel !== null && (
            <div className={styles.statBox}>
              <strong>{mistakes}</strong>
              <span>{mistakesLabel}</span>
            </div>
          )}
          <div className={styles.statBox}>
            <strong>{results.filter((r) => r.shown).length}</strong>
            <span>{shownLabel}</span>
          </div>
        </div>

        {children}

        {misses.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Hear them again</h4>
            <div className={styles.missList}>
              {misses.map((r, i) => (
                <div key={i} className={styles.missItem}>
                  <button className={styles.compareBtn} onClick={() => player.play(r.sound)}>
                    <SpeakerIcon size={16} /> {r.label}
                  </button>
                  <span className={styles.missVs}>
                    {r.shown
                      ? shownLabel.toLowerCase()
                      : r.mistakes
                        ? `${r.mistakes} wrong ${r.mistakes === 1 ? 'note' : 'notes'}`
                        : 'not quite'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <div className={styles.stickyFooter}>
        <button className={styles.secondaryBtn} onClick={onRetry}>
          Try again
        </button>
        <button className={styles.primaryBtn} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
