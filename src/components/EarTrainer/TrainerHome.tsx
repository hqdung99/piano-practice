import { useState } from 'react';
import { CATEGORIES, SKILLS, optionName } from '../../utils/earTraining/skills';
import type { Labels, SkillId } from '../../utils/earTraining/skills';
import { dayKey, dayStreak, levelOf, topConfusions } from '../../utils/earTraining/progress';
import type { ProgressData } from '../../utils/earTraining/progress';
import { SkillIcon } from './SkillIcon';
import { BookIcon, ChartIcon, Chevron, GearIcon, PenIcon, PianoIcon, PlayIcon, ShuffleIcon, TargetIcon } from './Icons';
import { masteredPercent, skillStyle } from './helpers';
import styles from './EarTrainer.module.css';

interface TrainerHomeProps {
  data: ProgressData;
  labels: Labels;
  onLearn: (skill: SkillId) => void;
  onPractice: (skill: SkillId) => void;
  onDailyMix: () => void;
  onSmartReview: () => void;
  onDrill: (skill: SkillId, a: string, b: string) => void;
  onPlayByEar: () => void;
  onDictation: () => void;
  onStats: () => void;
  onSettings: () => void;
  onClose: () => void;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TrainerHome({
  data,
  labels,
  onLearn,
  onPractice,
  onDailyMix,
  onSmartReview,
  onDrill,
  onPlayByEar,
  onDictation,
  onStats,
  onSettings,
  onClose,
}: TrainerHomeProps) {
  const [sheetSkill, setSheetSkill] = useState<SkillId | null>(null);
  const [hello] = useState(greeting);
  const { level, into, needed } = levelOf(data.xp);
  const streak = dayStreak(data.days);
  const today = data.days[dayKey()];
  const confusion = topConfusions(data.confusions, 1)[0];
  const hasStats = Object.keys(data.items).length > 0;
  const mixDoneToday = (data.counters[`dailyMix:${dayKey()}`] ?? 0) > 0;

  return (
    <div className={styles.screen}>
      <div className={styles.homeHeader}>
        <div>
          <p className={styles.greeting}>{hello}</p>
          <h1 className={styles.homeTitle}>Ready to train?</h1>
        </div>
        <div className={styles.homeActions}>
          <button className={styles.iconBtn} onClick={onStats} aria-label="Stats">
            <ChartIcon />
          </button>
          <button className={styles.iconBtn} onClick={onSettings} aria-label="Settings">
            <GearIcon />
          </button>
          <button className={styles.closeBtn} onClick={onClose}>
            Back to piano
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <button className={styles.summary} onClick={onStats}>
          <span className={styles.summaryLevel}>
            <strong>Lv {level}</strong>
            <span className={styles.xpTrack}>
              <span style={{ width: `${(into / needed) * 100}%` }} />
            </span>
            <small>
              {into}/{needed} XP
            </small>
          </span>
          <span className={styles.summaryStat}>
            <strong>🔥 {streak}</strong>
            <small>day streak</small>
          </span>
          <span className={styles.summaryStat}>
            <strong>{today?.answered ?? 0}</strong>
            <small>today</small>
          </span>
        </button>

        <div className={styles.divider}>
          <span>Today</span>
        </div>
        <div className={styles.todayList}>
          <button className={`${styles.sheetOption} ${styles.sheetOptionPrimary}`} onClick={onDailyMix}>
            <span className={styles.sheetOptionIcon}>
              <ShuffleIcon />
            </span>
            <span className={styles.sheetOptionText}>
              <strong>Daily mix {mixDoneToday && '✓'}</strong>
              <span>15 questions across the skills you’re learning</span>
            </span>
            <Chevron />
          </button>
          {hasStats && (
            <button className={styles.sheetOption} onClick={onSmartReview}>
              <span className={styles.sheetOptionIcon}>
                <TargetIcon />
              </span>
              <span className={styles.sheetOptionText}>
                <strong>Smart review</strong>
                <span>Your weakest answers, from every skill</span>
              </span>
              <Chevron />
            </button>
          )}
          {confusion && (
            <button
              className={styles.sheetOption}
              style={skillStyle(confusion.skill)}
              onClick={() => onDrill(confusion.skill, confusion.answer, confusion.picked)}
            >
              <span className={styles.sheetOptionIcon}>
                <SkillIcon skill={confusion.skill} size={22} />
              </span>
              <span className={styles.sheetOptionText}>
                <strong>
                  Drill: {optionName(confusion.skill, confusion.answer, labels)} vs{' '}
                  {optionName(confusion.skill, confusion.picked, labels)}
                </strong>
                <span>
                  Mixed up {confusion.count}× in {SKILLS[confusion.skill].title}
                </span>
              </span>
              <Chevron />
            </button>
          )}
        </div>

        <div className={styles.divider}>
          <span>Hear it, then…</span>
        </div>
        <div className={styles.modeGrid}>
          <button className={styles.modeCard} onClick={onPlayByEar}>
            <span className={styles.modeIcon}>
              <PianoIcon />
            </span>
            <strong>Play by ear</strong>
            <span>Play back notes, chords, melodies and songs</span>
          </button>
          <button className={`${styles.modeCard} ${styles.modeCardAlt}`} onClick={onDictation}>
            <span className={styles.modeIcon}>
              <PenIcon />
            </span>
            <strong>Dictation</strong>
            <span>Write melodies and rhythms on the staff</span>
          </button>
        </div>

        {CATEGORIES.map((category) => (
          <section key={category.id}>
            <div className={styles.divider}>
              <span>{category.title}</span>
            </div>
            <div className={styles.skillGrid}>
              {category.skills.map((id) => {
                const skill = SKILLS[id];
                const mastered = masteredPercent(id, data.stars);
                return (
                  <button key={id} className={styles.skillCard} style={skillStyle(id)} onClick={() => setSheetSkill(id)}>
                    <span className={styles.skillIcon}>
                      <SkillIcon skill={id} />
                    </span>
                    <span className={styles.skillTitle}>{skill.title}</span>
                    <span className={styles.skillTagline}>{skill.tagline}</span>
                    {mastered > 0 && <span className={styles.skillMastered}>{mastered}% mastered</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {sheetSkill && (
        <div className={styles.sheetBackdrop} onClick={() => setSheetSkill(null)}>
          <div className={styles.sheet} style={skillStyle(sheetSkill)} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHead}>
              <span className={`${styles.skillIcon} ${styles.skillIconLarge}`}>
                <SkillIcon skill={sheetSkill} size={34} />
              </span>
              <div>
                <h3 className={styles.sheetTitle}>{SKILLS[sheetSkill].trainerTitle}</h3>
                <p className={styles.sheetSub}>How would you like to train?</p>
              </div>
            </div>
            <div className={styles.divider}>
              <span>{masteredPercent(sheetSkill, data.stars)}% mastered</span>
            </div>
            <button className={styles.sheetOption} onClick={() => onLearn(sheetSkill)}>
              <span className={styles.sheetOptionIcon}>
                <BookIcon />
              </span>
              <span className={styles.sheetOptionText}>
                <strong>Learn</strong>
                <span>Guided lessons, step by step</span>
              </span>
              <Chevron />
            </button>
            <button className={`${styles.sheetOption} ${styles.sheetOptionPrimary}`} onClick={() => onPractice(sheetSkill)}>
              <span className={styles.sheetOptionIcon}>
                <PlayIcon />
              </span>
              <span className={styles.sheetOptionText}>
                <strong>Practice</strong>
                <span>Rounds, endless streaks or a speed run</span>
              </span>
              <Chevron />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
