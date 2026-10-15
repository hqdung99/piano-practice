import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Accidental,
  Annotation,
  Formatter,
  GhostNote,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Voice,
} from 'vexflow/bravura';
import { CONTENT_LABELS, LEVEL_LABELS, STAVES_HINTS, STAVES_LABELS, emptyCustomStaves, isGrandStaff, stavesOf, toVexKey } from '../../utils/noteGame';
import type { GameContent, GameLevel, GameStaves } from '../../utils/noteGame';
import { noteToMidi } from '../../utils/earTraining/theory';
import type { Staff } from '../../utils/renderGrandStaff';
import { MAX_TARGET, TARGET_PRESETS } from '../../hooks/useNoteGame';
import type { UseNoteGameReturn } from '../../hooks/useNoteGame';
import { FingeringPanel } from '../Fingering/FingeringPanel';
import { NotePicker } from './NotePicker';
import { ChordPicker } from '../ChordGame/ChordPicker';
import styles from './NoteGame.module.css';

interface NoteGameProps {
  game: UseNoteGameReturn;
  /** A course lesson sets the staves, level and length, so those controls are hidden */
  locked?: boolean;
}

// Tall enough for finger numbers above high notes and below low ones
const STAFF_HEIGHT = 200;
const GRAND_HEIGHT = 330;
const STAFF_Y = 40;
const STAVE_GAP = 130;
const PADDING_X = 10;
const BRACE_ROOM = 16;

const COLORS = {
  correct: '#2e9e4f',
  missed: '#d9822b',
  current: '#2a6fdb',
  wrong: '#d93636',
  upcoming: '#222',
};

const STAVES: GameStaves[] = ['treble', 'bass', 'both', 'together'];

function stepColor(game: UseNoteGameReturn, i: number, note: string): string {
  if (i < game.index) return COLORS[game.results[i]];
  if (i !== game.index || game.status !== 'playing') return COLORS.upcoming;
  if (game.wrongNote) return COLORS.wrong;
  // Hands together: a key already held turns green while waiting for the other
  return game.pressed.includes(note) ? COLORS.correct : COLORS.current;
}

/** Finger numbers stacked like printed fingering: right hand above, left hand below, nearest note nearest the staff */
function addFingers(note: StaveNote, staff: Staff, fingers: number[], colors: string[]) {
  // Keys are low to high; the bass stacks downwards, so it starts from the top note
  const order = fingers.map((_, k) => k);
  if (staff === 'bass') order.reverse();
  for (const k of order) {
    const finger = new Annotation(String(fingers[k]))
      .setFont('Inter, Arial, sans-serif', 13, 'bold')
      .setVerticalJustification(staff === 'treble' ? Annotation.VerticalJustify.TOP : Annotation.VerticalJustify.BOTTOM);
    finger.setStyle({ fillStyle: colors[k], strokeStyle: colors[k] });
    note.addModifier(finger, 0);
  }
}

/** One staff's notes or chords; steps with nothing on this staff get an invisible spacer to keep beats aligned */
function staffNotes(game: UseNoteGameReturn, staff: Staff) {
  return game.steps.map((step, i) => {
    const here = step.notes
      .filter((x) => x.staff === staff)
      .sort((a, b) => (noteToMidi(a.note) ?? 0) - (noteToMidi(b.note) ?? 0));
    if (!here.length) return new GhostNote({ duration: 'q' });
    const note = new StaveNote({
      clef: staff,
      keys: here.map((n) => toVexKey(n.note, n.flat)),
      duration: 'q',
      autoStem: true,
    });
    // Each key has its own colour, so the keys of a chord already held turn green
    const colors = here.map((n) => stepColor(game, i, n.note));
    const stemColor = colors.every((c) => c === COLORS.correct) ? COLORS.correct : stepColor(game, i, '');
    note.setStyle({ fillStyle: stemColor, strokeStyle: stemColor });
    colors.forEach((c, k) => note.setKeyStyle(k, { fillStyle: c, strokeStyle: c }));
    if (game.showFingering) addFingers(note, staff, here.map((n) => n.finger), colors);
    return note;
  });
}

function renderStaff(container: HTMLDivElement, width: number, game: UseNoteGameReturn) {
  container.innerHTML = '';
  const grand = isGrandStaff(game.staves);
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, grand ? GRAND_HEIGHT : STAFF_HEIGHT);
  const ctx = renderer.getContext();

  const left = PADDING_X + (grand ? BRACE_ROOM : 0);
  const staves = stavesOf(game.staves).map((staff, k) => {
    const stave = new Stave(left, STAFF_Y + k * STAVE_GAP, width - left - PADDING_X);
    stave.addClef(staff);
    return { staff, stave };
  });
  // Line both staves' notes up on the same beats
  const noteStartX = Math.max(...staves.map((s) => s.stave.getNoteStartX())) + 24;
  staves.forEach(({ stave }) => stave.setNoteStartX(noteStartX).setContext(ctx).draw());
  if (grand) {
    const [top, bottom] = staves.map((s) => s.stave);
    new StaveConnector(top, bottom).setType('brace').setContext(ctx).draw();
    new StaveConnector(top, bottom).setType('singleLeft').setContext(ctx).draw();
  }
  if (game.steps.length === 0) return;

  const voices = staves.map(({ staff, stave }) => {
    const voice = new Voice({ numBeats: game.steps.length, beatValue: 4 })
      .setMode(Voice.Mode.SOFT)
      .addTickables(staffNotes(game, staff));
    Accidental.applyAccidentals([voice], 'C');
    voice.setStave(stave);
    return voice;
  });
  const formatter = new Formatter();
  voices.forEach((v) => formatter.joinVoices([v]));
  formatter.format(voices, staves[0].stave.getNoteEndX() - noteStartX - 20);
  voices.forEach((v, k) => v.draw(ctx, staves[k].stave));
}

function formatSeconds(ms: number): string {
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const whole = Math.round(sec);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function NoteGame({ game, locked = false }: NoteGameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    document.fonts.load('30px Bravura').then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!staffRef.current || !fontsReady || width === 0) return;
    renderStaff(staffRef.current, width, game);
  }, [game, width, fontsReady]);

  // Enter starts the next round
  const { status, start } = game;
  useEffect(() => {
    if (status === 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      // A focused button already handles Enter itself
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, start]);

  // Custom notes are picked per staff, and every staff in play needs at least one
  const picking = !locked && game.level === 'custom' && game.status !== 'playing';
  const chords = game.content === 'chords';
  const dyads = game.content === 'dyads';
  const missingNotes = game.level === 'custom' && !chords ? emptyCustomStaves(game.staves, game.custom, game.content) : [];
  const unit = chords ? 'chord' : dyads ? 'interval' : game.staves === 'together' ? 'pair' : 'note';

  const accuracy = game.totalPlayed ? Math.round((game.totalCorrect / game.totalPlayed) * 100) : 0;
  const elapsedMs = game.endTime - game.startTime;
  const notesPerMin = elapsedMs > 0 ? Math.round(game.totalPlayed / (elapsedMs / 60000)) : 0;

  let feedback: ReactNode = null;
  if (game.status === 'idle' && missingNotes.length) {
    feedback = dyads
      ? `Pick at least two ${missingNotes.join(' and ')} notes, up to an octave apart.`
      : `Pick at least one ${missingNotes.join(' and ')} note to practise.`;
  } else if (game.status === 'idle' && !game.ready) {
    feedback = 'Pick at least one chord to practise.';
  } else if (game.status === 'idle' && (chords || dyads)) {
    feedback = `${STAVES_HINTS[game.staves]} Read each ${dyads ? 'pair of stacked notes' : 'chord'} and play all its notes together — the octave counts.${
      game.challenge ? ' One wrong note ends the run.' : ''
    } Press Start (or Enter).`;
  } else if (game.status === 'idle' && game.challenge) {
    feedback = `${STAVES_HINTS[game.staves]} Challenge: play as many notes in a row as you can — one wrong note ends the run. Press Start (or Enter).`;
  } else if (game.status === 'idle') {
    feedback = `${STAVES_HINTS[game.staves]} ${game.level === 'custom' ? 'Only your picked notes come up. ' : ''}${
      game.endless
        ? 'Press Start (or Enter). New notes keep coming until you press Stop.'
        : 'Press Start (or Enter), then play each note shown.'
    }`;
  } else if (game.status === 'playing') {
    if (game.hintNotes.length > 0) {
      feedback = (
        <>
          Hint: {game.hintNotes.length > 1 ? 'these notes are' : 'this note is'}{' '}
          <strong className={styles.hint}>{game.hintNotes.join(' + ')}</strong> — lit up on the keyboard
        </>
      );
    } else if (game.wrongNote) {
      feedback = (
        <>
          You played <strong className={styles.wrong}>{game.wrongNote}</strong> — try again
        </>
      );
    } else if (game.pressed.length > 0) {
      feedback = (
        <>
          <strong className={styles.good}>{game.pressed.join(' + ')}</strong> —{' '}
          {chords || dyads
            ? `${game.pressed.length} of ${game.currentStep?.notes.length} notes, keep going`
            : 'now the other hand too'}
        </>
      );
    } else if (game.challenge) {
      feedback =
        game.streak >= game.target ? (
          <>
            <strong className={styles.good}>🎯 Target reached!</strong> Keep going
            {game.streak >= game.record ? ' — every note now is a new record.' : ` for your record of ${game.record}.`}
          </>
        ) : (
          `${game.target - game.streak} more to reach your target`
        );
    } else if (game.endless) {
      feedback = `${game.totalPlayed} played · ${accuracy}% first try`;
    } else {
      feedback = `${unit[0].toUpperCase()}${unit.slice(1)} ${game.index + 1} of ${game.steps.length}`;
    }
  }

  return (
    <div className={styles.game}>
      <div className={styles.header}>
        <span className={styles.label}>{locked ? 'Lesson' : 'Note Game'}</span>
        <div className={styles.actions}>
          {!locked && (
            <>
            <div className={styles.segmented}>
              {STAVES.map((st) => (
                <button
                  key={st}
                  className={game.staves === st ? styles.selected : ''}
                  onClick={() => game.setStaves(st)}
                  title={STAVES_HINTS[st]}
                >
                  {STAVES_LABELS[st]}
                </button>
              ))}
            </div>
            <div className={styles.segmented}>
              {(Object.keys(CONTENT_LABELS) as GameContent[]).map((c) => (
                <button key={c} className={game.content === c ? styles.selected : ''} onClick={() => game.setContent(c)}>
                  {CONTENT_LABELS[c]}
                </button>
              ))}
            </div>
            <div className={styles.segmented}>
              {(Object.keys(LEVEL_LABELS) as GameLevel[]).map((l) => (
                <button
                  key={l}
                  className={game.level === l ? styles.selected : ''}
                  onClick={() => game.setLevel(l)}
                >
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
            <div className={styles.segmented}>
              <button className={!game.endless ? styles.selected : ''} onClick={() => game.setEndless(false)}>
                {chords ? '8 chords' : dyads ? '8 intervals' : '8 notes'}
              </button>
              <button className={game.endless && !game.challenge ? styles.selected : ''} onClick={() => game.setEndless(true)}>
                Endless
              </button>
              <button
                className={game.challenge ? styles.selected : ''}
                onClick={game.setChallenge}
                title="Keep going until the first wrong note"
              >
                Challenge
              </button>
            </div>
            </>
          )}
          <button
            className={`${styles.btn} ${game.showFingering ? styles.toggleOn : ''}`}
            onClick={game.toggleFingering}
            aria-pressed={game.showFingering}
          >
            Fingering
          </button>
          {game.status === 'playing' ? (
            <button className={styles.btn} onClick={game.quit}>
              {game.endless ? 'Stop' : 'Quit'}
            </button>
          ) : (
            <button className={`${styles.btn} ${styles.primary}`} onClick={game.start} disabled={!game.ready}>
              {game.status === 'done' ? 'Play Again' : 'Start'}
            </button>
          )}
        </div>
      </div>

      {picking && chords && <ChordPicker selected={game.customChords} onChange={game.setCustomChords} />}

      {picking &&
        !chords &&
        stavesOf(game.staves).map((staff) => (
          <NotePicker
            key={staff}
            staff={staff}
            selected={game.custom[staff]}
            onChange={(notes) => game.setCustom(staff, notes)}
            onToggle={(note) => game.toggleCustom(staff, note)}
          />
        ))}

      {game.challenge && !locked && game.status !== 'playing' && (
        <div className={styles.challengePanel}>
          <span className={styles.panelLabel}>Target streak</span>
          <div className={styles.segmented}>
            {TARGET_PRESETS.map((t) => (
              <button key={t} className={game.target === t ? styles.selected : ''} onClick={() => game.setTarget(t)}>
                {t}
              </button>
            ))}
          </div>
          <input
            className={styles.targetInput}
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
          <span className={styles.recordNote}>
            Record ({STAVES_LABELS[game.staves]} · {LEVEL_LABELS[game.level]}): <strong>{game.record || '—'}</strong>
          </span>
        </div>
      )}

      {game.challenge && game.status === 'playing' && (
        <div className={styles.challengeBar}>
          <div className={styles.challengeTrack}>
            <div
              className={game.streak >= game.target ? styles.challengeFillDone : styles.challengeFill}
              style={{ width: `${Math.min(100, (game.streak / game.target) * 100)}%` }}
            />
            {game.record > 0 && game.record < game.target && (
              <span className={styles.recordMark} style={{ left: `${(game.record / game.target) * 100}%` }} title={`Record: ${game.record}`} />
            )}
          </div>
          <span className={styles.challengeCount}>
            <strong>{game.streak}</strong> / {game.target}
            {game.record > 0 && <span className={styles.recordNote}> · record {game.record}</span>}
          </span>
        </div>
      )}

      <div className={styles.paper} ref={wrapRef}>
        <div ref={staffRef} />
      </div>

      {game.hands.length > 0 && <FingeringPanel hands={game.hands} />}

      {game.status === 'done' && game.challenge ? (
        <div className={styles.challengeResults}>
          <p className={styles.challengeHeadline}>
            {game.newRecord ? '🏆 New record!' : game.totalCorrect >= game.target ? '🎯 Target reached!' : 'Challenge over'}
          </p>
          {game.failed && (
            <p className={styles.feedback}>
              You played <strong className={styles.wrong}>{game.failed.played}</strong> — {game.failed.wanted.length > 1 ? 'it needed' : 'the note was'}{' '}
              <strong className={styles.good}>{game.failed.wanted.join(' + ')}</strong>.
            </p>
          )}
          <div className={styles.results}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{game.totalCorrect}</span>
              <span className={styles.statLabel}>In a row</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{game.target}</span>
              <span className={styles.statLabel}>Target</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{game.record}</span>
              <span className={styles.statLabel}>Record</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{formatSeconds(elapsedMs)}</span>
              <span className={styles.statLabel}>Time</span>
            </div>
          </div>
          {game.totalCorrect < game.target && (
            <p className={styles.feedback}>
              {game.target - game.totalCorrect} short of your target. Press Play Again (or Enter) to try again.
            </p>
          )}
        </div>
      ) : game.status === 'done' ? (
        <div className={styles.results}>
          {game.endless && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{game.totalPlayed}</span>
              <span className={styles.statLabel}>{chords ? 'Chords played' : dyads ? 'Intervals played' : game.staves === 'together' ? 'Pairs played' : 'Notes played'}</span>
            </div>
          )}
          <div className={styles.stat}>
            <span className={styles.statValue}>{accuracy}%</span>
            <span className={styles.statLabel}>First-try accuracy</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatSeconds(elapsedMs)}</span>
            <span className={styles.statLabel}>Time</span>
          </div>
          {game.endless && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{notesPerMin}</span>
              <span className={styles.statLabel}>Notes / min</span>
            </div>
          )}
          <div className={styles.stat}>
            <span className={styles.statValue}>{game.bestStreak}</span>
            <span className={styles.statLabel}>Best streak</span>
          </div>
        </div>
      ) : (
        <div className={styles.footer}>
          <p className={styles.feedback}>{feedback}</p>
          {game.streak > 1 && !game.challenge && <span className={styles.streak}>Streak {game.streak}</span>}
        </div>
      )}
    </div>
  );
}
