import { SKILLS } from '../../utils/earTraining/skills';
import type { SkillId } from '../../utils/earTraining/skills';
import { LESSONS } from '../../utils/earTraining/lessons';
import type { Lesson } from '../../utils/earTraining/lessons';
import { TopBar } from './TopBar';
import { CheckIcon, Chevron, FlagIcon, LockIcon, PlayIcon, StarIcon, TargetIcon } from './Icons';
import styles from './EarTrainer.module.css';

interface LessonPathProps {
  skill: SkillId;
  stars: Record<string, number>;
  /** Whether the placement test has been taken */
  placed: boolean;
  onOpen: (lesson: Lesson) => void;
  onPlacement: () => void;
  onBack: () => void;
}

export function LessonPath({ skill, stars, placed, onOpen, onPlacement, onBack }: LessonPathProps) {
  const lessons = LESSONS[skill];
  const done = lessons.filter((l) => (stars[l.id] ?? 0) > 0).length;
  // The first lesson not yet passed is the one to do next; everything after it stays locked
  const currentIndex = lessons.findIndex((l) => !(stars[l.id] > 0));
  let number = 0;

  return (
    <div className={styles.screen}>
      <TopBar
        title={SKILLS[skill].trainerTitle}
        skill={skill}
        onBack={onBack}
        progress={{ done, total: lessons.length }}
      />
      <div className={styles.content}>
        {!placed && currentIndex > -1 && currentIndex < 3 && lessons.some((l) => l.kind === 'checkpoint') && (
          <button className={styles.refresher} onClick={onPlacement}>
            <span className={styles.refresherIcon}>
              <TargetIcon />
            </span>
            <span className={styles.sheetOptionText}>
              <strong>Know some of this already?</strong>
              <span>Take a placement test and skip ahead</span>
            </span>
            <Chevron />
          </button>
        )}
        <ol className={styles.path}>
          {lessons.map((lesson, i) => {
            const lessonStars = stars[lesson.id] ?? 0;
            const completed = lessonStars > 0;
            const current = i === currentIndex;
            const locked = !completed && !current;
            const isCheckpoint = lesson.kind === 'checkpoint';
            if (lesson.kind === 'lesson') number++;
            const title = lesson.kind === 'lesson' ? `${number}. ${lesson.title}` : lesson.title;

            const nodeClass = completed
              ? styles.nodeDone
              : current
                ? styles.nodeCurrent
                : isCheckpoint
                  ? styles.nodeCheckpoint
                  : styles.nodeLocked;

            return (
              <li key={lesson.id} className={styles.pathItem}>
                <span className={`${styles.pathNode} ${nodeClass}`}>
                  {completed ? (
                    <CheckIcon />
                  ) : current ? (
                    <PlayIcon />
                  ) : isCheckpoint ? (
                    <FlagIcon />
                  ) : (
                    <LockIcon />
                  )}
                </span>
                <button
                  className={[
                    styles.lessonCard,
                    isCheckpoint ? styles.lessonCheckpoint : '',
                    current ? styles.lessonCurrent : '',
                    locked ? styles.lessonLocked : '',
                  ].join(' ')}
                  disabled={locked}
                  onClick={() => onOpen(lesson)}
                >
                  <span className={styles.lessonText}>
                    {isCheckpoint && <span className={styles.badge}>Checkpoint</span>}
                    <strong>{title}</strong>
                    <span>{lesson.subtitle}</span>
                  </span>
                  {completed ? (
                    <span className={styles.stars}>
                      {[1, 2, 3].map((s) => (
                        <StarIcon key={s} filled={s <= lessonStars} size={20} />
                      ))}
                    </span>
                  ) : current ? (
                    <span className={styles.startPill}>{i === 0 ? 'Start' : 'Go'}</span>
                  ) : locked ? (
                    <span className={styles.lockSmall}>
                      <LockIcon size={20} />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
        {currentIndex === -1 && (
          <p className={styles.pathDone}>
            Every lesson complete! Replay any lesson to raise its stars, or keep sharp in Practice.
          </p>
        )}
      </div>
    </div>
  );
}
