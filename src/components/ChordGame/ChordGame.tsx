import { useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  CHORD_LEVEL_LABELS,
  PROGRESSION_PRESETS,
  ROOT_NAMES,
  VOICING_HINTS,
  VOICING_LABELS,
  bassRule,
} from '../../utils/chordGame';
import type { ChordLevel, Voicing } from '../../utils/chordGame';
import { noteToMidi } from '../../utils/earTraining/theory';
import { MAX_TARGET, TARGET_PRESETS } from '../../hooks/useChordGame';
import type { ChordLength, UseChordGameReturn } from '../../hooks/useChordGame';
import { ChordPicker } from './ChordPicker';
import gameStyles from '../NoteGame/NoteGame.module.css';
import styles from './ChordGame.module.css';

interface ChordGameProps {
  game: UseChordGameReturn;
  /** A course lesson sets the level, so the controls are hidden */
  locked?: boolean;
}

const LENGTH_LABELS: Record<ChordLength, string> = { round: '8 chords', endless: 'Endless', challenge: 'Challenge' };
const VOICING_SHORT: Record<Voicing, string> = { any: 'Any', root: 'Root', '1st': '1st inv.', '2nd': '2nd inv.' };
/** Chords shown before and after the current one in endless runs */
const STRIP_BEHIND = 3;
const STRIP_AHEAD = 4;

function formatSeconds(ms: number): string {
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const whole = Math.round(sec);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function ChordGame({ game, locked = false }: ChordGameProps) {
  const { status, start } = game;
  useEffect(() => {
    if (status === 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLInputElement)) start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, start]);

  const challenge = game.length === 'challenge';
  const progression = game.level === 'progression';
  const accuracy = game.totalPlayed ? Math.round((game.totalCorrect / game.totalPlayed) * 100) : 0;
  const elapsedMs = game.endTime - game.startTime;
  const perMinute = elapsedMs > 0 ? Math.round(game.totalPlayed / (elapsedMs / 60000)) : 0;
  const card = game.card;
  const pressedPcs = new Set(game.pressed.map((n) => noteToMidi(n)! % 12));
  const setup = !locked && status !== 'playing';

  let feedback: ReactNode = `${VOICING_HINTS[game.voicing]} ${
    challenge ? 'Challenge: one wrong note ends the run.' : ''
  } Press Start (or Enter).`;
  if (!game.ready) feedback = 'Pick at least one chord to practise.';
  if (status === 'playing' && card) {
    if (game.wrongNote && game.mistake?.kind === 'bass') {
      feedback = (
        <>
          Right notes, but <strong className={gameStyles.wrong}>{game.mistake.note}</strong> is at the bottom — put{' '}
          {bassRule(card, game.voicing)} lowest
        </>
      );
    } else if (game.wrongNote) {
      feedback = (
        <>
          <strong className={gameStyles.wrong}>{game.wrongNote}</strong> isn't in {card.symbol} — try again
        </>
      );
    } else if (game.pressed.length > 0) {
      feedback = `${pressedPcs.size} of ${card.pcs.length} notes — keep going`;
    } else if (challenge) {
      feedback =
        game.streak >= game.target ? (
          <>
            <strong className={gameStyles.good}>🎯 Target reached!</strong> Keep going
            {game.streak >= game.record ? ' — every chord now is a new record.' : ` for your record of ${game.record}.`}
          </>
        ) : (
          `${game.target - game.streak} more to reach your target`
        );
    } else if (game.length === 'endless') {
      feedback = `${game.totalPlayed} played · ${accuracy}% first try`;
    } else {
      const fingers = card.pcs.length > 3 ? '5–3–2–1' : '5–3–1';
      feedback = `Chord ${game.index + 1} of ${game.cards.length} · tip: left hand ${fingers}`;
    }
  }

  // Rounds show every chord; endless runs show a window around the current one
  const windowStart = game.length === 'round' ? 0 : Math.max(0, game.index - STRIP_BEHIND);
  const stripCards =
    game.cards.length === 0
      ? Array.from({ length: 8 }, () => null)
      : game.length === 'round'
        ? game.cards
        : game.cards.slice(windowStart, game.index + STRIP_AHEAD + 1);

  return (
    <div className={gameStyles.game}>
      <div className={gameStyles.header}>
        <span className={gameStyles.label}>{locked ? 'Lesson' : 'Chord Practice'}</span>
        <div className={gameStyles.actions}>
          {!locked && (
            <>
              <div className={gameStyles.segmented}>
                {(Object.keys(CHORD_LEVEL_LABELS) as ChordLevel[]).map((l) => (
                  <button key={l} className={game.level === l ? gameStyles.selected : ''} onClick={() => game.setLevel(l)}>
                    {CHORD_LEVEL_LABELS[l]}
                  </button>
                ))}
              </div>
              <div className={gameStyles.segmented}>
                {(Object.keys(VOICING_LABELS) as Voicing[]).map((v) => (
                  <button
                    key={v}
                    className={game.voicing === v ? gameStyles.selected : ''}
                    onClick={() => game.setVoicing(v)}
                    title={VOICING_HINTS[v]}
                  >
                    {VOICING_SHORT[v]}
                  </button>
                ))}
              </div>
              <div className={gameStyles.segmented}>
                {(Object.keys(LENGTH_LABELS) as ChordLength[]).map((l) => (
                  <button key={l} className={game.length === l ? gameStyles.selected : ''} onClick={() => game.setLength(l)}>
                    {LENGTH_LABELS[l]}
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            className={`${gameStyles.btn} ${game.showNotes ? gameStyles.toggleOn : ''}`}
            onClick={game.toggleNotes}
            aria-pressed={game.showNotes}
          >
            Show notes
          </button>
          {status === 'playing' ? (
            <button className={gameStyles.btn} onClick={game.quit}>
              {game.length === 'round' ? 'Quit' : 'Stop'}
            </button>
          ) : (
            <button className={`${gameStyles.btn} ${gameStyles.primary}`} onClick={game.start} disabled={!game.ready}>
              {status === 'done' ? 'Play Again' : 'Start'}
            </button>
          )}
        </div>
      </div>

      {setup && game.level === 'custom' && <ChordPicker selected={game.custom} onChange={game.setCustom} />}

      {setup && progression && (
        <div className={gameStyles.challengePanel}>
          <span className={gameStyles.panelLabel}>Progression</span>
          <div className={styles.chips}>
            {PROGRESSION_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`${styles.chipBtn} ${game.progression === p.id ? styles.chipOn : ''}`}
                onClick={() => game.setProgression(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <span className={gameStyles.panelLabel}>Key</span>
          <select className={gameStyles.targetInput} value={game.key} onChange={(e) => game.setKey(Number(e.target.value))} aria-label="Key">
            {ROOT_NAMES.map((name, pc) => (
              <option key={name} value={pc}>
                {name} major
              </option>
            ))}
          </select>
        </div>
      )}

      {setup && challenge && (
        <div className={gameStyles.challengePanel}>
          <span className={gameStyles.panelLabel}>Target streak</span>
          <div className={gameStyles.segmented}>
            {TARGET_PRESETS.map((t) => (
              <button key={t} className={game.target === t ? gameStyles.selected : ''} onClick={() => game.setTarget(t)}>
                {t}
              </button>
            ))}
          </div>
          <input
            className={gameStyles.targetInput}
            type="number"
            min={1}
            max={MAX_TARGET}
            value={game.target}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value > 0) game.setTarget(value);
            }}
            aria-label="Target streak"
          />
          <span className={gameStyles.recordNote}>
            Record ({CHORD_LEVEL_LABELS[game.level]} · {VOICING_LABELS[game.voicing]}): <strong>{game.record || '—'}</strong>
          </span>
        </div>
      )}

      {challenge && status === 'playing' && (
        <div className={gameStyles.challengeBar}>
          <div className={gameStyles.challengeTrack}>
            <div
              className={game.streak >= game.target ? gameStyles.challengeFillDone : gameStyles.challengeFill}
              style={{ width: `${Math.min(100, (game.streak / game.target) * 100)}%` }}
            />
            {game.record > 0 && game.record < game.target && (
              <span className={gameStyles.recordMark} style={{ left: `${(game.record / game.target) * 100}%` }} title={`Record: ${game.record}`} />
            )}
          </div>
          <span className={gameStyles.challengeCount}>
            <strong>{game.streak}</strong> / {game.target}
            {game.record > 0 && <span className={gameStyles.recordNote}> · record {game.record}</span>}
          </span>
        </div>
      )}

      <div className={styles.stage}>
        <div className={styles.strip}>
          {stripCards.map((c, k) => {
            const i = windowStart + k;
            // A progression is known ahead of time, so its upcoming chords show
            const visible = c && (i <= game.index || status === 'done' || progression);
            return (
              <span
                key={i}
                className={[
                  styles.mini,
                  i < game.index ? styles[game.results[i]] : '',
                  i === game.index && status === 'playing' ? styles.miniCurrent : '',
                ].join(' ')}
              >
                {visible ? c.symbol : '·'}
              </span>
            );
          })}
        </div>
        <div className={`${styles.card} ${game.wrongNote ? styles.cardWrong : ''}`}>
          {card ? (
            <>
              {card.numeral && <span className={styles.numeral}>{card.numeral}</span>}
              <span className={styles.symbol}>{card.symbol}</span>
              {card.bass !== null && <span className={styles.rule}>Lowest note: {bassRule(card, game.voicing)}</span>}
              <span className={styles.spelled}>{game.showHint ? card.spelled : 'Which notes make this chord?'}</span>
              <div className={styles.pressed}>
                {card.pcs.map((pc) => (
                  <span key={pc} className={pressedPcs.has(pc) ? styles.dotOn : styles.dot}>
                    {pressedPcs.has(pc) ? ROOT_NAMES[pc] : '?'}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <span className={styles.idle}>
              {status === 'done' ? (challenge ? 'Challenge over' : 'Round complete') : 'C · F · G · Am …'}
            </span>
          )}
        </div>
      </div>

      {status === 'done' && challenge ? (
        <div className={gameStyles.challengeResults}>
          <p className={gameStyles.challengeHeadline}>
            {game.newRecord ? '🏆 New record!' : game.totalCorrect >= game.target ? '🎯 Target reached!' : 'Challenge over'}
          </p>
          {game.failedCard && game.mistake && (
            <p className={gameStyles.feedback}>
              {game.mistake.kind === 'bass' ? (
                <>
                  {game.failedCard.symbol} needed {bassRule(game.failedCard, game.voicing)} at the bottom, not{' '}
                  <strong className={gameStyles.wrong}>{game.mistake.note}</strong>.
                </>
              ) : (
                <>
                  <strong className={gameStyles.wrong}>{game.mistake.note}</strong> isn't in {game.failedCard.symbol} (
                  <strong className={gameStyles.good}>{game.failedCard.spelled}</strong>).
                </>
              )}
            </p>
          )}
          <div className={gameStyles.results}>
            <div className={gameStyles.stat}>
              <span className={gameStyles.statValue}>{game.totalCorrect}</span>
              <span className={gameStyles.statLabel}>In a row</span>
            </div>
            <div className={gameStyles.stat}>
              <span className={gameStyles.statValue}>{game.target}</span>
              <span className={gameStyles.statLabel}>Target</span>
            </div>
            <div className={gameStyles.stat}>
              <span className={gameStyles.statValue}>{game.record}</span>
              <span className={gameStyles.statLabel}>Record</span>
            </div>
            <div className={gameStyles.stat}>
              <span className={gameStyles.statValue}>{formatSeconds(elapsedMs)}</span>
              <span className={gameStyles.statLabel}>Time</span>
            </div>
          </div>
        </div>
      ) : status === 'done' ? (
        <div className={gameStyles.results}>
          <div className={gameStyles.stat}>
            <span className={gameStyles.statValue}>{accuracy}%</span>
            <span className={gameStyles.statLabel}>First-try accuracy</span>
          </div>
          <div className={gameStyles.stat}>
            <span className={gameStyles.statValue}>{formatSeconds(elapsedMs)}</span>
            <span className={gameStyles.statLabel}>Time</span>
          </div>
          {game.length === 'endless' && (
            <div className={gameStyles.stat}>
              <span className={gameStyles.statValue}>{perMinute}</span>
              <span className={gameStyles.statLabel}>Chords / min</span>
            </div>
          )}
          <div className={gameStyles.stat}>
            <span className={gameStyles.statValue}>{game.bestStreak}</span>
            <span className={gameStyles.statLabel}>Best streak</span>
          </div>
        </div>
      ) : (
        <div className={gameStyles.footer}>
          <p className={gameStyles.feedback}>{feedback}</p>
          {game.streak > 1 && !challenge && <span className={gameStyles.streak}>Streak {game.streak}</span>}
        </div>
      )}
    </div>
  );
}
