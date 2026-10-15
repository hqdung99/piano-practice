import { useState } from 'react';
import { SKILLS, SKILL_IDS, skillOptions } from '../../../utils/earTraining/skills';
import type { Labels, SkillId } from '../../../utils/earTraining/skills';
import { BADGES, bestDayStreak, dayStreak, levelOf, topConfusions } from '../../../utils/earTraining/progress';
import type { ProgressData } from '../../../utils/earTraining/progress';
import { LockIcon } from '../Icons';
import { TopBar } from '../TopBar';
import { skillStyle } from '../helpers';
import { ActivityChart } from './ActivityChart';
import { SkillStats } from './SkillStats';
import styles from '../EarTrainer.module.css';
import s from './Stats.module.css';

interface StatsViewProps {
  data: ProgressData;
  labels: Labels;
  /** Start a drill round on two answers that get mixed up */
  onDrill: (skill: SkillId, a: string, b: string) => void;
  onBack: () => void;
}

type Tab = 'overview' | 'skills' | 'badges';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'skills', label: 'Skills' },
  { id: 'badges', label: 'Badges' },
];

/** The skill with the most answers, to open the Skills tab on */
function busiestSkill(data: ProgressData): SkillId {
  const seen = (skill: SkillId) =>
    Object.entries(data.items).reduce((n, [key, stat]) => (key.startsWith(`${skill}:`) ? n + stat.seen : n), 0);
  return SKILL_IDS.reduce((best, id) => (seen(id) > seen(best) ? id : best), SKILL_IDS[0]);
}

/** A stored YYYY-MM-DD as a short local date */
function formatDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Top mix-ups with both directions of a pair (m3→M3, M3→m3) folded into one row, worst first */
function mergedMixups(confusions: Record<string, number>, limit = 6) {
  const pairs = new Map<string, ReturnType<typeof topConfusions>[number]>();
  for (const c of topConfusions(confusions, Infinity)) {
    const key = `${c.skill}:${[c.answer, c.picked].sort().join('|')}`;
    const seen = pairs.get(key);
    pairs.set(key, seen ? { ...seen, count: seen.count + c.count } : c);
  }
  return [...pairs.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function Overview({ data, labels, onDrill }: Omit<StatsViewProps, 'onBack'>) {
  const { level, into, needed } = levelOf(data.xp);
  const items = Object.values(data.items);
  const answered = items.reduce((n, i) => n + i.seen, 0);
  const correct = items.reduce((n, i) => n + i.correct, 0);
  const mixups = mergedMixups(data.confusions);
  const label = (skill: SkillId, id: string) => skillOptions(skill, labels).find((o) => o.id === id)?.label ?? id;

  return (
    <>
      <div className={s.levelCard}>
        <div className={s.levelBadge}>
          <span>Level</span>
          <strong>{level}</strong>
        </div>
        <div className={s.levelText}>
          <strong>{data.xp.toLocaleString()} XP</strong>
          <span
            className={s.xpTrack}
            role="progressbar"
            aria-label={`XP toward level ${level + 1}`}
            aria-valuemin={0}
            aria-valuemax={needed}
            aria-valuenow={into}
          >
            <span style={{ width: `${(into / needed) * 100}%` }} />
          </span>
          <span>
            {into} / {needed} XP · {needed - into} to level {level + 1}
          </span>
        </div>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statBox}>
          <strong>
            <span className={s.flame} aria-hidden="true">🔥</span> {dayStreak(data.days)}
          </strong>
          <span>Day streak</span>
        </div>
        <div className={styles.statBox}>
          <strong>{bestDayStreak(data.days)}</strong>
          <span>Best streak</span>
        </div>
        <div className={styles.statBox}>
          <strong>{answered ? `${Math.round((correct / answered) * 100)}%` : '–'}</strong>
          <span>Accuracy</span>
        </div>
        <div className={styles.statBox}>
          <strong>{answered.toLocaleString()}</strong>
          <span>Answered</span>
        </div>
        <div className={styles.statBox}>
          <strong>{(data.counters.play ?? 0).toLocaleString()}</strong>
          <span>Play-backs</span>
        </div>
        <div className={styles.statBox}>
          <strong>{(data.counters.dictation ?? 0).toLocaleString()}</strong>
          <span>Dictations</span>
        </div>
      </div>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Last 30 days</h4>
        <ActivityChart days={data.days} />
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Your mix-ups</h4>
        {mixups.length === 0 ? (
          <p className={s.empty}>
            <span aria-hidden="true">👂</span>
            No mix-ups yet. Answers you confuse more than once will show up here, ready to drill.
          </p>
        ) : (
          <ul className={s.mixups}>
            {mixups.map((m) => (
              <li key={`${m.skill}:${m.answer}>${m.picked}`} style={skillStyle(m.skill)}>
                <span className={s.swatch} aria-hidden="true" />
                <span className={s.mixupText}>
                  <strong>
                    {label(m.skill, m.answer)} ↔ {label(m.skill, m.picked)}
                  </strong>
                  <span>
                    {SKILLS[m.skill].title} · {m.count}×
                  </span>
                </span>
                <button className={s.drillBtn} onClick={() => onDrill(m.skill, m.answer, m.picked)}>
                  Drill
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Badges({ data }: { data: ProgressData }) {
  const earned = BADGES.filter((b) => data.badges[b.id]).length;
  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>
        {earned} of {BADGES.length} earned
      </h4>
      <ul className={s.badges}>
        {BADGES.map((b) => {
          const day = data.badges[b.id];
          return (
            <li key={b.id} className={day ? '' : s.locked} title={b.description}>
              <span className={s.badgeIcon} aria-hidden="true">
                <span className={s.emoji}>{b.icon}</span>
                {!day && (
                  <span className={s.badgeLock}>
                    <LockIcon size={12} />
                  </span>
                )}
              </span>
              <strong>{b.title}</strong>
              <span>{day ? `Earned ${formatDay(day)}` : b.description}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Progress at a glance: level, streaks, activity, mix-ups, per-skill mastery and badges */
export function StatsView({ data, labels, onDrill, onBack }: StatsViewProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [skill, setSkill] = useState<SkillId>(() => busiestSkill(data));

  return (
    <div className={styles.screen}>
      <TopBar title="Your progress" onBack={onBack} />
      <div className={`${styles.content} ${styles.setupContent}`}>
        <div className={`${styles.segmented} ${s.tabs}`} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === tab}
              className={t.id === tab ? styles.segActive : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'overview' && <Overview data={data} labels={labels} onDrill={onDrill} />}
        {tab === 'skills' && <SkillStats data={data} labels={labels} skill={skill} onSkill={setSkill} />}
        {tab === 'badges' && <Badges data={data} />}
      </div>
    </div>
  );
}
