import { DEGREE_LABEL_NAMES, NOTATION_LABELS } from '../../utils/earTraining/theory';
import type { DegreeLabels, Notation } from '../../utils/earTraining/theory';
import type { NoteLength, TrainerSettings as Settings } from '../../hooks/useTrainerStore';
import { TopBar } from './TopBar';
import styles from './EarTrainer.module.css';

interface TrainerSettingsProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onResetProgress: () => void;
  onResetStats: () => void;
  onBack: () => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];
const NOTE_LENGTHS: Record<NoteLength, string> = { short: 'Short', normal: 'Normal', long: 'Long' };

function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`${styles.switch} ${on ? styles.switchOn : ''}`}
      onClick={() => onChange(!on)}
    >
      <span />
    </button>
  );
}

export function TrainerSettings({ settings, onChange, onResetProgress, onResetStats, onBack }: TrainerSettingsProps) {
  return (
    <div className={styles.screen}>
      <TopBar title="Settings" onBack={onBack} />
      <div className={`${styles.content} ${styles.setupContent}`}>
        <h4 className={styles.sectionTitle}>Preferences</h4>
        <div className={styles.settingsCard}>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <strong>Note notation</strong>
              <span>How note names are written</span>
            </div>
            <select
              className={styles.select}
              value={settings.notation}
              onChange={(e) => onChange({ notation: e.target.value as Notation })}
            >
              {(Object.keys(NOTATION_LABELS) as Notation[]).map((n) => (
                <option key={n} value={n}>
                  {NOTATION_LABELS[n]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <strong>Scale degrees</strong>
              <span>How degrees of a key are named</span>
            </div>
            <select
              className={styles.select}
              value={settings.degreeLabels}
              onChange={(e) => onChange({ degreeLabels: e.target.value as DegreeLabels })}
            >
              {(Object.keys(DEGREE_LABEL_NAMES) as DegreeLabels[]).map((d) => (
                <option key={d} value={d}>
                  {DEGREE_LABEL_NAMES[d]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <strong>Keyboard</strong>
              <span>Answer pitch questions on a one-octave keyboard</span>
            </div>
            <Toggle label="Keyboard" on={settings.showKeyboard} onChange={(showKeyboard) => onChange({ showKeyboard })} />
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <strong>Answer hints</strong>
              <span>Compare your pick with the answer after a miss</span>
            </div>
            <Toggle label="Answer hints" on={settings.answerHints} onChange={(answerHints) => onChange({ answerHints })} />
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <strong>Auto-advance</strong>
              <span>Move on by itself after a right answer</span>
            </div>
            <Toggle label="Auto-advance" on={settings.autoAdvance} onChange={(autoAdvance) => onChange({ autoAdvance })} />
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <strong>Resolve degrees</strong>
              <span>After a scale-degree answer, walk the note home</span>
            </div>
            <Toggle label="Resolve degrees" on={settings.resolve} onChange={(resolve) => onChange({ resolve })} />
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <strong>Light up keys</strong>
              <span>Show sounding notes on a keyboard while learning and after answering</span>
            </div>
            <Toggle label="Light up keys" on={settings.lightKeys} onChange={(lightKeys) => onChange({ lightKeys })} />
          </div>
        </div>

        <h4 className={styles.sectionTitle}>Sound</h4>
        <div className={styles.settingsCard}>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <strong>Playback speed</strong>
              <span>How fast questions play</span>
            </div>
            <select
              className={styles.select}
              value={settings.speed}
              onChange={(e) => onChange({ speed: Number(e.target.value) })}
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s === 1 ? 'Normal' : `${s}×`}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <strong>Note length</strong>
              <span>How long each note is held</span>
            </div>
            <select
              className={styles.select}
              value={settings.noteLength}
              onChange={(e) => onChange({ noteLength: e.target.value as NoteLength })}
            >
              {(Object.keys(NOTE_LENGTHS) as NoteLength[]).map((n) => (
                <option key={n} value={n}>
                  {NOTE_LENGTHS[n]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h4 className={styles.sectionTitle}>Progress</h4>
        <div className={styles.settingsCard}>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <strong>Reset lessons</strong>
              <span>Lock every lesson again and clear your stars</span>
            </div>
            <button
              className={styles.dangerBtn}
              onClick={() => {
                if (window.confirm('Reset all lesson progress?')) onResetProgress();
              }}
            >
              Reset
            </button>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <strong>Reset stats</strong>
              <span>Clear XP, streaks, badges and answer history</span>
            </div>
            <button
              className={styles.dangerBtn}
              onClick={() => {
                if (window.confirm('Clear all stats, XP and badges?')) onResetStats();
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
