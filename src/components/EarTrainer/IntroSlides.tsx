import { useState } from 'react';
import { SKILLS, itemSound, optionName } from '../../utils/earTraining/skills';
import type { Labels, SkillId } from '../../utils/earTraining/skills';
import type { Lesson } from '../../utils/earTraining/lessons';
import type { SequencePlayer } from '../../hooks/useSequencePlayer';
import { TopBar } from './TopBar';
import { SkillIcon } from './SkillIcon';
import { SpeakerIcon } from './Icons';
import { KeyStrip } from './KeyStrip';
import { listenContext } from './helpers';
import styles from './EarTrainer.module.css';

interface IntroSlidesProps {
  skill: SkillId;
  lesson: Lesson;
  labels: Labels;
  lightKeys: boolean;
  player: SequencePlayer;
  onFinish: () => void;
  onBack: () => void;
}

export function IntroSlides({ skill, lesson, labels, lightKeys, player, onFinish, onBack }: IntroSlidesProps) {
  const slides = lesson.slides ?? [];
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const last = index === slides.length - 1;
  const config = SKILLS[skill].defaultConfig;
  const [ctx] = useState(() => listenContext(skill, config));

  return (
    <div className={styles.screen}>
      <TopBar title={SKILLS[skill].trainerTitle} skill={skill} onBack={onBack} progress={{ done: index + 1, total: slides.length }} />
      <div className={`${styles.content} ${styles.introContent}`}>
        <span className={`${styles.skillIcon} ${styles.skillIconHero}`}>
          <SkillIcon skill={skill} size={48} />
        </span>
        <h3 className={styles.introTitle}>{slide.title}</h3>
        <p className={styles.introBody}>{slide.body}</p>
        {slide.examples && (
          <div className={styles.introExamples}>
            {slide.examples.map((id) => (
              <button
                key={id}
                className={styles.exampleChip}
                onClick={() => player.play(itemSound(skill, id, ctx, config))}
              >
                <SpeakerIcon size={16} />
                {optionName(skill, id, labels)}
              </button>
            ))}
          </div>
        )}
        {lightKeys && slide.examples && skill !== 'rhythm' && <KeyStrip lit={player.sounding} low={36} high={83} />}
        <div className={styles.dots}>
          {slides.map((s, i) => (
            <span key={s.title} className={i === index ? styles.dotActive : ''} />
          ))}
        </div>
      </div>
      <div className={styles.stickyFooter}>
        {index > 0 && (
          <button className={styles.secondaryBtn} onClick={() => setIndex(index - 1)}>
            Back
          </button>
        )}
        <button className={styles.primaryBtn} onClick={() => (last ? onFinish() : setIndex(index + 1))}>
          {last ? 'Got it' : 'Next'}
        </button>
      </div>
    </div>
  );
}
