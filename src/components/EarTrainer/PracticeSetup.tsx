import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  MIN_ITEMS,
  PITCH_PRESETS,
  REPLAY_LIMITS,
  SKILLS,
  TEMPOS,
  TIME_LIMITS,
  matchPitchPreset,
  skillOptions,
} from '../../utils/earTraining/skills';
import type { Difficulty, KeyContext, Labels, PlayStyle, PracticeConfig, Register, SkillId } from '../../utils/earTraining/skills';
import {
  CHORDS,
  COMPOUND_INTERVAL_IDS,
  DIRECTION_HINTS,
  DIRECTION_LABELS,
  OCTAVE_LABELS,
  PITCH_CLASSES,
  SEVENTH_IDS,
  SIMPLE_INTERVAL_IDS,
  TRIAD_IDS,
  VOICING_HINTS,
  VOICING_LABELS,
  midiToNote,
  pitchClassName,
} from '../../utils/earTraining/theory';
import type { Direction, Voicing } from '../../utils/earTraining/theory';
import type { QuizMode } from '../../hooks/useQuiz';
import { SPEED_SECONDS } from '../../hooks/useQuiz';
import { TopBar } from './TopBar';
import { RhythmGlyph } from './RhythmGlyph';
import { BookIcon, Chevron, PlayIcon } from './Icons';
import styles from './EarTrainer.module.css';

interface PracticeSetupProps {
  skill: SkillId;
  config: PracticeConfig;
  labels: Labels;
  /** 0..1 per answer id, for the mastery bars */
  mastery: (item: string) => number;
  onChange: (config: PracticeConfig) => void;
  onRefresher: () => void;
  onStart: (mode: QuizMode) => void;
  onBack: () => void;
}

const DIFFICULTY_HINTS: Partial<Record<SkillId, Record<Difficulty, string>>> = {
  compare: { easy: 'Notes far apart.', medium: 'A few steps apart.', hard: 'Just a half step apart.' },
  contour: { easy: 'Big leaps.', medium: 'Small leaps.', hard: 'Half and whole steps.' },
  degrees: { easy: 'One octave above home.', medium: 'One octave above home.', hard: 'Either of two octaves.' },
  tonic: { easy: 'The tune ends on home.', medium: 'The tune ends on 3 or 5.', hard: 'Major or minor, ending anywhere.' },
  keys: { easy: 'Chords underneath, ends at home.', medium: 'Chords underneath, ends anywhere.', hard: 'The melody alone.' },
  dynamics: { easy: 'Very loud vs very soft.', medium: 'A clear difference.', hard: 'A subtle difference.' },
};

const KEY_CONTEXT_LABELS: Record<KeyContext, string> = { none: 'None', cadence: 'Cadence', drone: 'Drone' };
const KEY_CONTEXT_HINTS: Record<KeyContext, string> = {
  none: 'Each question plays on its own.',
  cadence: 'I-IV-V-I sets the key before each question.',
  drone: 'A low tonic and fifth hum under each question.',
};

const MODE_LABELS: Record<QuizMode, string> = { round: 'Round', endless: 'Endless', speed: `Speed (${SPEED_SECONDS}s)` };
const MODE_HINTS: Record<QuizMode, string> = {
  round: 'A set number of questions, then your score.',
  endless: 'Questions until you stop. Build the longest streak.',
  speed: 'As many right answers as you can in a minute.',
};

/** Quick picks for skills with many answers */
const ITEM_GROUPS: Partial<Record<SkillId, { label: string; items: string[] }[]>> = {
  intervals: [
    { label: 'Within an octave', items: SIMPLE_INTERVAL_IDS },
    { label: 'Compound', items: COMPOUND_INTERVAL_IDS },
  ],
  chords: [
    { label: 'Triads', items: TRIAD_IDS },
    { label: 'Sevenths', items: SEVENTH_IDS },
    { label: 'Colour', items: ['sus2', 'sus4', '6', 'm6', 'add9', '9', 'maj9', 'm9'] },
  ],
  degrees: [
    { label: 'Major scale', items: ['0', '2', '4', '5', '7', '9', '11'] },
    { label: 'Chromatic', items: PITCH_CLASSES.map(String) },
  ],
};

const RANGE_NOTES = Array.from({ length: 88 }, (_, i) => 21 + i);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>{title}</h4>
      {children}
    </section>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: (v: T) => string;
}) {
  return (
    <div className={styles.segmented}>
      {options.map((o) => (
        <button key={o} className={o === value ? styles.segActive : ''} onClick={() => onChange(o)}>
          {label(o)}
        </button>
      ))}
    </div>
  );
}

export function PracticeSetup({ skill, config, labels, mastery, onChange, onRefresher, onStart, onBack }: PracticeSetupProps) {
  const def = SKILLS[skill];
  const has = (f: (typeof def.features)[number]) => def.features.includes(f);
  const options = skillOptions(skill, labels);
  const set = (patch: Partial<PracticeConfig>) => onChange({ ...config, ...patch });
  const [mode, setMode] = useState<QuizMode>('round');

  const setItems = (items: string[]) => set({ items: options.map((o) => o.id).filter((o) => items.includes(o)) });
  const toggleItem = (id: string) =>
    setItems(config.items.includes(id) ? config.items.filter((i) => i !== id) : [...config.items, id]);

  const preset = skill === 'pitch' ? matchPitchPreset(config.items) : null;
  const tooFew = config.items.length < MIN_ITEMS;
  const columns = skill === 'scales' || skill === 'rhythm' || skill === 'inversions' || skill === 'cadences' ? 2 : skill === 'progressions' ? 2 : 4;
  const itemTitle =
    skill === 'pitch'
      ? `Notes (${preset === 'custom' ? 'custom' : PITCH_PRESETS.find((p) => p.id === preset)?.name})`
      : skill === 'tonic'
        ? 'Keys the tunes are in'
        : def.itemHeading;

  return (
    <div className={styles.screen}>
      <TopBar title={def.trainerTitle} skill={skill} onBack={onBack} />
      <div className={`${styles.content} ${styles.setupContent}`}>
        {skill === 'pitch' && (
          <Section title="Scale">
            <div className={styles.chipRow}>
              <button className={`${styles.chip} ${preset === 'custom' ? styles.chipActive : ''}`} disabled>
                Custom
              </button>
              {PITCH_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`${styles.chip} ${preset === p.id ? styles.chipActive : ''}`}
                  onClick={() => set({ items: p.items })}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section title={itemTitle}>
          {ITEM_GROUPS[skill] && (
            <div className={styles.chipRow}>
              {ITEM_GROUPS[skill]!.map((g) => (
                <button key={g.label} className={styles.chip} onClick={() => setItems(g.items)}>
                  {g.label}
                </button>
              ))}
              <button className={styles.chip} onClick={() => setItems(options.map((o) => o.id))}>
                All
              </button>
            </div>
          )}
          <div className={styles.toggleGrid} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {options.map((o) => {
              const m = mastery(o.id);
              return (
                <button
                  key={o.id}
                  className={`${styles.toggle} ${config.items.includes(o.id) ? styles.toggleOn : ''}`}
                  onClick={() => toggleItem(o.id)}
                  title={`${o.name} · ${Math.round(m * 100)}% mastered`}
                >
                  {skill === 'rhythm' ? <RhythmGlyph id={o.id} width={110} /> : o.label}
                  {m > 0 && (
                    <span className={styles.masteryBar}>
                      <span style={{ width: `${m * 100}%` }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {tooFew && <p className={styles.helper}>Pick at least {MIN_ITEMS} to practise.</p>}
        </Section>

        {has('qualities') && (
          <Section title="Chord qualities">
            <div className={styles.chipRow}>
              {CHORDS.filter((c) => TRIAD_IDS.includes(c.id) || SEVENTH_IDS.includes(c.id)).map((c) => (
                <button
                  key={c.id}
                  className={`${styles.chip} ${config.qualities.includes(c.id) ? styles.chipActive : ''}`}
                  onClick={() => {
                    const on = config.qualities.includes(c.id);
                    const qualities = on ? config.qualities.filter((q) => q !== c.id) : [...config.qualities, c.id];
                    if (qualities.length) set({ qualities });
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <p className={styles.helper}>3rd inversions need a seventh chord; with triads only, a seventh is used.</p>
          </Section>
        )}

        {has('playStyle') && def.playStyleLabels && (
          <Section title={skill === 'intervals' ? 'Notes' : 'Chord style'}>
            <Segmented<PlayStyle>
              options={['melodic', 'harmonic', 'both']}
              value={config.playStyle}
              onChange={(playStyle) => set({ playStyle })}
              label={(v) => def.playStyleLabels![v]}
            />
          </Section>
        )}

        {has('direction') && (skill !== 'intervals' || config.playStyle !== 'harmonic') && (
          <Section title="Direction">
            <Segmented<Direction>
              options={['asc', 'desc', 'mixed']}
              value={config.direction}
              onChange={(direction) => set({ direction })}
              label={(d) => DIRECTION_LABELS[d]}
            />
            <p className={styles.helper}>{DIRECTION_HINTS[config.direction]}</p>
          </Section>
        )}

        {has('keyContext') && def.keyContexts && (
          <Section title="Set the key">
            <Segmented<KeyContext>
              options={def.keyContexts}
              value={def.keyContexts.includes(config.keyContext) ? config.keyContext : def.keyContexts[0]}
              onChange={(keyContext) => set({ keyContext })}
              label={(k) => KEY_CONTEXT_LABELS[k]}
            />
            <p className={styles.helper}>{KEY_CONTEXT_HINTS[config.keyContext]}</p>
          </Section>
        )}

        {has('voicing') && (
          <Section title="Chord voicing">
            <Segmented<Voicing>
              options={['root', 'inversions']}
              value={config.voicing}
              onChange={(voicing) => set({ voicing })}
              label={(v) => VOICING_LABELS[v]}
            />
            <p className={styles.helper}>{VOICING_HINTS[config.voicing]}</p>
          </Section>
        )}

        {has('difficulty') && (
          <Section title="Difficulty">
            <Segmented<Difficulty>
              options={['easy', 'medium', 'hard']}
              value={config.difficulty}
              onChange={(difficulty) => set({ difficulty })}
              label={(d) => d[0].toUpperCase() + d.slice(1)}
            />
            {DIFFICULTY_HINTS[skill] && <p className={styles.helper}>{DIFFICULTY_HINTS[skill]![config.difficulty]}</p>}
          </Section>
        )}

        {has('tempo') && (
          <Section title="Tempo">
            <Segmented<number> options={TEMPOS} value={config.tempo} onChange={(tempo) => set({ tempo })} label={(t) => `${t} bpm`} />
          </Section>
        )}

        <button className={styles.refresher} onClick={onRefresher} disabled={config.items.length === 0}>
          <span className={styles.refresherIcon}>
            <BookIcon />
          </span>
          <span className={styles.sheetOptionText}>
            <strong>Need a refresher?</strong>
            <span>Learn how each one sounds first</span>
          </span>
          <Chevron />
        </button>

        {has('register') ? (
          <Section title="Register">
            <Segmented<Register>
              options={['low', 'medium', 'high', 'custom']}
              value={config.octave}
              onChange={(octave) => set({ octave })}
              label={(o) => (o === 'custom' ? 'Custom' : OCTAVE_LABELS[o])}
            />
            {config.octave === 'custom' && (
              <div className={styles.rangeRow}>
                <select
                  className={styles.select}
                  value={config.rangeLow}
                  onChange={(e) => set({ rangeLow: Math.min(Number(e.target.value), config.rangeHigh - 12) })}
                  aria-label="Lowest note"
                >
                  {RANGE_NOTES.filter((m) => m <= 96).map((m) => (
                    <option key={m} value={m}>
                      {midiToNote(m)}
                    </option>
                  ))}
                </select>
                <span>to</span>
                <select
                  className={styles.select}
                  value={config.rangeHigh}
                  onChange={(e) => set({ rangeHigh: Math.max(Number(e.target.value), config.rangeLow + 12) })}
                  aria-label="Highest note"
                >
                  {RANGE_NOTES.filter((m) => m >= 33).map((m) => (
                    <option key={m} value={m}>
                      {midiToNote(m)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Section>
        ) : null}

        <Section title="Time limit">
          <Segmented<number>
            options={TIME_LIMITS}
            value={config.timeLimit}
            onChange={(timeLimit) => set({ timeLimit })}
            label={(t) => (t === 0 ? 'None' : `${t}s`)}
          />
        </Section>

        <Section title="Replays">
          <Segmented<number>
            options={REPLAY_LIMITS}
            value={config.replays}
            onChange={(replays) => set({ replays })}
            label={(r) => (r < 0 ? 'Unlimited' : r === 0 ? 'None (hard)' : `${r}`)}
          />
        </Section>

        {has('reference') && (
          <div className={styles.selectCard}>
            <span className={styles.sectionTitle}>Reference pitch</span>
            <select
              className={styles.select}
              value={config.reference ?? ''}
              onChange={(e) => set({ reference: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">None</option>
              {PITCH_CLASSES.map((pc) => (
                <option key={pc} value={pc}>
                  {pitchClassName(pc, labels.notation)}
                </option>
              ))}
            </select>
          </div>
        )}

        {has('root') && def.rootHeading && (
          <div className={styles.selectCard}>
            <span className={styles.sectionTitle}>{def.rootHeading}</span>
            <select
              className={styles.select}
              value={config.root ?? ''}
              onChange={(e) => set({ root: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">Random</option>
              {PITCH_CLASSES.map((pc) => (
                <option key={pc} value={pc}>
                  {pitchClassName(pc, labels.notation)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.selectCard}>
          <span className={styles.sectionTitle}>Smart review</span>
          <button
            role="switch"
            aria-checked={config.smart}
            aria-label="Smart review"
            className={`${styles.switch} ${config.smart ? styles.switchOn : ''}`}
            onClick={() => set({ smart: !config.smart })}
          >
            <span />
          </button>
        </div>
        <p className={styles.helper}>Ask more often about the answers you get wrong or haven’t seen yet.</p>

        <Section title="Mode">
          <Segmented<QuizMode>
            options={['round', 'endless', 'speed']}
            value={mode}
            onChange={setMode}
            label={(m) => MODE_LABELS[m]}
          />
          <p className={styles.helper}>{MODE_HINTS[mode]}</p>
        </Section>
      </div>

      <div className={styles.stickyFooter}>
        <button className={styles.primaryBtn} onClick={() => onStart(mode)} disabled={tooFew}>
          <PlayIcon size={20} />
          {mode === 'round' ? 'Practice now' : mode === 'endless' ? 'Start endless' : 'Start speed run'}
        </button>
      </div>
    </div>
  );
}
