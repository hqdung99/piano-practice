import { useState } from 'react';
import { SKILLS, itemSound, skillOptions } from '../../utils/earTraining/skills';
import type { Labels, PracticeConfig, SkillId } from '../../utils/earTraining/skills';
import { reminderFor } from '../../utils/earTraining/reminders';
import type { SequencePlayer } from '../../hooks/useSequencePlayer';
import { TopBar } from './TopBar';
import { KeyStrip } from './KeyStrip';
import { rangeOf } from './keyRange';
import { RhythmGlyph } from './RhythmGlyph';
import { PlayIcon, SpeakerIcon } from './Icons';
import { listenContext } from './helpers';
import styles from './EarTrainer.module.css';

interface ListenViewProps {
  skill: SkillId;
  config: PracticeConfig;
  /** Answers to listen to */
  items: string[];
  labels: Labels;
  player: SequencePlayer;
  lightKeys: boolean;
  title: string;
  subtitle: string;
  startLabel: string;
  onStart: () => void;
  onBack: () => void;
}

export function ListenView({ skill, config, items, labels, player, lightKeys, title, subtitle, startLabel, onStart, onBack }: ListenViewProps) {
  const options = skillOptions(skill, labels).filter((o) => items.includes(o.id));
  const [ctx] = useState(() => listenContext(skill, config));
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);
  const range = rangeOf(options.flatMap((o) => itemSound(skill, o.id, ctx, config).map((e) => e.notes)));

  const play = (id: string) => {
    setLastPlayed(id);
    player.play(itemSound(skill, id, ctx, config));
  };

  return (
    <div className={styles.screen}>
      <TopBar title={SKILLS[skill].trainerTitle} skill={skill} onBack={onBack} />
      <div className={`${styles.content} ${styles.setupContent}`}>
        <div className={styles.listenHead}>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {lightKeys && skill !== 'rhythm' && <KeyStrip lit={player.sounding} low={range[0]} high={range[1]} />}
        <div className={styles.listenList}>
          {options.map((o) => {
            const reminder = reminderFor(skill, o.id, ctx.direction);
            return (
              <button
                key={o.id}
                className={`${styles.listenItem} ${lastPlayed === o.id && player.isPlaying ? styles.listenItemPlaying : ''}`}
                onClick={() => play(o.id)}
              >
                <span className={styles.listenPlay}>
                  <SpeakerIcon />
                </span>
                <span className={styles.listenName}>
                  {skill === 'rhythm' && <RhythmGlyph id={o.id} />}
                  {o.name}
                  {reminder && <small className={styles.listenHint}>{reminder}</small>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.stickyFooter}>
        <button className={styles.primaryBtn} onClick={onStart}>
          <PlayIcon size={20} />
          {startLabel}
        </button>
      </div>
    </div>
  );
}
