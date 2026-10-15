import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { SKILLS, SKILL_IDS, skillOptions } from '../../../utils/earTraining/skills';
import type { Labels, SkillId, SkillOption } from '../../../utils/earTraining/skills';
import { LESSONS } from '../../../utils/earTraining/lessons';
import { MAX_BOX, confusionKey, itemKey, lessonsPassed } from '../../../utils/earTraining/progress';
import type { ProgressData } from '../../../utils/earTraining/progress';
import { skillStyle } from '../helpers';
import styles from '../EarTrainer.module.css';
import s from './Stats.module.css';

interface SkillStatsProps {
  data: ProgressData;
  labels: Labels;
  skill: SkillId;
  onSkill: (skill: SkillId) => void;
}

/** Answers the player has met in a skill, in display order; unknown ids from old data go last */
function answersWithData(data: ProgressData, skill: SkillId, options: SkillOption[]): SkillOption[] {
  const ids = new Set<string>();
  for (const [key, stat] of Object.entries(data.items)) {
    if (stat.seen > 0 && key.startsWith(`${skill}:`)) ids.add(key.slice(skill.length + 1));
  }
  for (const key of Object.keys(data.confusions)) {
    if (!key.startsWith(`${skill}:`)) continue;
    const [answer, picked] = key.slice(skill.length + 1).split('>');
    ids.add(answer);
    ids.add(picked);
  }
  const known = options.filter((o) => ids.has(o.id));
  const extra = [...ids].filter((id) => !options.some((o) => o.id === id)).map((id) => ({ id, label: id, name: id }));
  return [...known, ...extra];
}

/** Fill for a matrix cell: blue for right answers, orange for mix-ups, darker = more */
function cellStyle(count: number, max: number, right: boolean): CSSProperties | undefined {
  if (!count) return undefined;
  const t = Math.round(18 + 67 * (count / max));
  const hue = right ? 'var(--stats-right)' : 'var(--stats-mixup)';
  return {
    background: `color-mix(in srgb, ${hue} ${t}%, var(--card))`,
    color: right && t >= 60 ? '#fff' : 'var(--ink)',
  };
}

/** Per-skill progress: lessons, bests, how well each answer is known and what gets mixed up */
export function SkillStats({ data, labels, skill, onSkill }: SkillStatsProps) {
  const chipRow = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);
  const def = SKILLS[skill];
  const options = skillOptions(skill, labels);
  const passed = lessonsPassed(skill, data.stars);
  const total = LESSONS[skill].length;
  const streak = data.bests[`streak:${skill}`];
  const speed = data.bests[`speed:${skill}`];
  const met = answersWithData(data, skill, options);
  const count = (a: string, p: string) =>
    a === p ? (data.items[itemKey(skill, a)]?.correct ?? 0) : (data.confusions[confusionKey(skill, a, p)] ?? 0);
  const cells = met.flatMap((a) => met.map((p) => ({ right: a.id === p.id, n: count(a.id, p.id) })));
  const maxRight = Math.max(1, ...cells.filter((c) => c.right).map((c) => c.n));
  const maxMix = Math.max(1, ...cells.filter((c) => !c.right).map((c) => c.n));

  // Keep the chosen skill's chip in view
  useEffect(() => {
    const row = chipRow.current;
    const chip = row?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!row || !chip) return;
    const left = chip.offsetLeft - row.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    row.scrollTo({ left, behavior: firstScroll.current ? 'auto' : 'smooth' });
    firstScroll.current = false;
  }, [skill]);

  return (
    <>
      <div className={styles.chipRow} role="tablist" aria-label="Skill" ref={chipRow}>
        {SKILL_IDS.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={id === skill}
            className={`${styles.chip} ${s.skillChip} ${id === skill ? styles.chipActive : ''}`}
            style={skillStyle(id)}
            onClick={() => onSkill(id)}
          >
            <span className={s.swatch} aria-hidden="true" />
            {SKILLS[id].title}
          </button>
        ))}
      </div>

      <div style={skillStyle(skill)} className={s.skillBody}>
        <div className={s.totals}>
          <div className={styles.statBox}>
            <strong>
              {passed}
              <small>/{total}</small>
            </strong>
            <span>Lessons passed</span>
          </div>
          <div className={styles.statBox}>
            <strong>{streak ?? '–'}</strong>
            <span>Best endless</span>
          </div>
          <div className={styles.statBox}>
            <strong>{speed ?? '–'}</strong>
            <span>Best speed</span>
          </div>
        </div>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{def.itemHeading || 'Answers'}</h4>
          <ul className={s.mastery}>
            {options.map((o) => {
              const stat = data.items[itemKey(skill, o.id)];
              const seen = stat?.seen ?? 0;
              const box = stat?.box ?? 0;
              return (
                <li key={o.id} className={seen ? '' : s.unseen} title={o.name}>
                  <span className={s.masteryLabel}>{o.label}</span>
                  <span
                    className={s.meter}
                    role="meter"
                    aria-label={`${o.name} mastery`}
                    aria-valuemin={0}
                    aria-valuemax={MAX_BOX}
                    aria-valuenow={box}
                  >
                    <span style={{ width: `${(box / MAX_BOX) * 100}%` }} />
                  </span>
                  <span className={s.masteryNums}>
                    {seen ? (
                      <>
                        <strong>{Math.round(((stat?.correct ?? 0) / seen) * 100)}%</strong> · {seen}×
                      </>
                    ) : (
                      'New'
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>What gets mixed up</h4>
          {met.length < 2 ? (
            <p className={s.empty}>Answer a few more {def.title.toLowerCase()} questions to see which ones you confuse.</p>
          ) : (
            <div className={s.card}>
              <div className={s.matrixScroll}>
                <table className={s.matrix}>
                  <caption className={s.srOnly}>
                    Rows are what was played, columns are what you picked. The diagonal counts right answers.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className={s.corner}>
                        Played ↓ Picked →
                      </th>
                      {met.map((p) => (
                        <th key={p.id} scope="col" title={p.name}>
                          {p.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {met.map((a) => (
                      <tr key={a.id}>
                        <th scope="row" title={a.name}>
                          {a.label}
                        </th>
                        {met.map((p) => {
                          const right = a.id === p.id;
                          const n = count(a.id, p.id);
                          return (
                            <td
                              key={p.id}
                              className={right ? s.diag : ''}
                              style={cellStyle(n, right ? maxRight : maxMix, right)}
                              title={right ? `${a.name}: right ${n}×` : `${a.name} heard as ${p.name}: ${n}×`}
                            >
                              {n || ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={s.legend}>
                <span>
                  <i className={s.keyRight} aria-hidden="true" />
                  Right answer
                </span>
                <span>
                  <i className={s.keyMixup} aria-hidden="true" />
                  Mixed up
                </span>
                <span>Darker = more often</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
