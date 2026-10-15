import type { CSSProperties } from 'react';
import { SKILLS, itemSound, optionName } from '../../utils/earTraining/skills';
import type { Labels } from '../../utils/earTraining/skills';
import { PASS_PERCENT, starsFor } from '../../utils/earTraining/lessons';
import { BADGES } from '../../utils/earTraining/progress';
import { longestStreak } from '../../hooks/useQuiz';
import type { QuizMode, QuizResult } from '../../hooks/useQuiz';
import type { SequencePlayer } from '../../hooks/useSequencePlayer';
import { TopBar } from './TopBar';
import { SpeakerIcon, StarIcon } from './Icons';
import { resultPercent } from './helpers';
import styles from './EarTrainer.module.css';

interface QuizResultsProps {
  results: QuizResult[];
  title: string;
  mode: QuizMode;
  /** Set for lessons, which pass or fail */
  isLesson: boolean;
  labels: Labels;
  player: SequencePlayer;
  /** Previous best for endless / speed runs */
  previousBest?: number;
  /** Badges earned during this round */
  badges: string[];
  /** Score needed to pass a placement test / lesson, when not the lesson default */
  passLabel?: string;
  onRetry: () => void;
  /** Starts a round of just the questions missed */
  onPracticeMisses?: () => void;
  onDone: () => void;
  doneLabel?: string;
}

export function QuizResults({
  results,
  title,
  mode,
  isLesson,
  labels,
  player,
  previousBest,
  badges,
  passLabel,
  onRetry,
  onPracticeMisses,
  onDone,
  doneLabel,
}: QuizResultsProps) {
  const correct = results.filter((r) => r.correct).length;
  const percent = resultPercent(results);
  const stars = starsFor(percent);
  const answered = results.filter((r) => r.picked !== null);
  const avgSec = answered.length ? answered.reduce((s, r) => s + r.ms, 0) / answered.length / 1000 : 0;
  const misses = results.filter((r) => !r.correct);
  const runBest = mode === 'speed' ? correct : longestStreak(results);
  const newBest = mode !== 'round' && runBest > (previousBest ?? 0) && runBest > 0;

  let headline = 'Nice work!';
  if (isLesson) headline = stars > 0 ? 'Lesson complete!' : 'Almost there';
  else if (mode === 'speed') headline = `${correct} right in a minute`;
  else if (mode === 'endless') headline = `Longest streak: ${runBest}`;
  else if (percent >= 90) headline = 'Excellent ear!';
  else if (percent < 60) headline = 'Keep practising';

  const earned = BADGES.filter((b) => badges.includes(b.id));

  return (
    <div className={styles.screen}>
      <TopBar title={title} onBack={onDone} />
      <div className={`${styles.content} ${styles.setupContent}`}>
        <div className={styles.resultHero}>
          <div className={styles.scoreRing} style={{ '--pct': `${percent * 3.6}deg` } as CSSProperties}>
            <span>{percent}%</span>
          </div>
          <h3>{headline}</h3>
          {newBest && <p className={styles.newBest}>🎉 New personal best! (was {previousBest ?? 0})</p>}
          {isLesson && (
            <>
              <div className={`${styles.stars} ${styles.starsLarge}`}>
                {[1, 2, 3].map((s) => (
                  <StarIcon key={s} filled={s <= stars} size={34} />
                ))}
              </div>
              {stars === 0 && (
                <p className={styles.helper}>{passLabel ?? `Score ${PASS_PERCENT}% or more to unlock the next lesson.`}</p>
              )}
            </>
          )}
        </div>

        {earned.length > 0 && (
          <div className={styles.badgeToast}>
            {earned.map((b) => (
              <div key={b.id} className={styles.badgeToastItem}>
                <span className={styles.badgeToastIcon}>{b.icon}</span>
                <span>
                  <strong>Badge earned: {b.title}</strong>
                  <span>{b.description}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.statRow}>
          <div className={styles.statBox}>
            <strong>
              {correct}/{results.length}
            </strong>
            <span>Correct</span>
          </div>
          <div className={styles.statBox}>
            <strong>{avgSec.toFixed(1)}s</strong>
            <span>Avg. answer</span>
          </div>
          <div className={styles.statBox}>
            <strong>{mode === 'round' ? results.length - answered.length : longestStreak(results)}</strong>
            <span>{mode === 'round' ? 'Timed out' : 'Best streak'}</span>
          </div>
        </div>

        {misses.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Review your misses</h4>
            <div className={styles.missList}>
              {misses.map((r, i) => {
                const { skill, ctx, config, answer } = r.question;
                return (
                  <div key={i} className={styles.missItem}>
                    <button className={styles.compareBtn} onClick={() => player.play(itemSound(skill, answer, ctx, config))}>
                      <SpeakerIcon size={16} /> {optionName(skill, answer, labels)}
                    </button>
                    <span className={styles.missVs}>you said</span>
                    {r.picked === null ? (
                      <span className={styles.missNone}>no answer</span>
                    ) : (
                      <button
                        className={`${styles.compareBtn} ${styles.compareYours}`}
                        onClick={() => player.play(itemSound(skill, r.picked!, ctx, config))}
                      >
                        <SpeakerIcon size={16} /> {optionName(skill, r.picked, labels)}
                      </button>
                    )}
                    {new Set(results.map((x) => x.question.skill)).size > 1 && (
                      <span className={styles.missSkill}>{SKILLS[skill].title}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <div className={styles.stickyFooter}>
        {onPracticeMisses && misses.length > 0 ? (
          <button className={styles.secondaryBtn} onClick={onPracticeMisses}>
            Practise misses
          </button>
        ) : (
          <button className={styles.secondaryBtn} onClick={onRetry}>
            Try again
          </button>
        )}
        <button className={styles.primaryBtn} onClick={onDone}>
          {doneLabel ?? (isLesson && stars > 0 ? 'Continue' : 'Done')}
        </button>
      </div>
    </div>
  );
}
