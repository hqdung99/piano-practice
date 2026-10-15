import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { isPracticed, segmentKey } from '../../utils/songPractice';
import type { ParsedSong } from '../../utils/songPractice';
import { PASS_LABELS, TEMPOS } from '../../hooks/useSongPractice';
import type { HandsChoice, Pace, SongClock } from '../../hooks/useSongPractice';
import { renderGrandStaff } from '../../utils/renderGrandStaff';
import type { GrandStaffLayout, Staff } from '../../utils/renderGrandStaff';
import { NOTE_TO_KEY } from '../../utils/noteMapping';
import { addImportedSong, removeImportedSong, useSongLibrary } from '../../utils/songLibrary';
import { MAX_IMPORT_BARS, importSongFile } from '../../utils/importSong';
import { printSong } from '../../utils/printSong';
import type { UseSongPracticeReturn } from '../../hooks/useSongPractice';
import type { InputSource } from '../../hooks/useInputSource';
import { FingeringPanel } from '../Fingering/FingeringPanel';
import styles from './SongPractice.module.css';

interface SongPracticeProps {
  practice: UseSongPracticeReturn;
  inputSource: InputSource;
  /** A course lesson sets the song, hands and pace, so those controls are hidden */
  locked?: boolean;
}

const COLORS = {
  correct: '#2e9e4f',
  missed: '#d9822b',
  current: '#2a6fdb',
  wrong: '#d93636',
  inactive: '#b5b5b5',
};

const HANDS: { value: HandsChoice; label: string; title: string }[] = [
  { value: 'treble', label: 'Treble', title: 'Right hand only' },
  { value: 'bass', label: 'Bass', title: 'Left hand only' },
  { value: 'both', label: 'Both', title: 'Both hands together' },
  { value: 'learn', label: 'R → L → Both', title: 'Right hand, then left hand, then both, with a score for each' },
];

const PACES: { value: Pace; label: string; title: string }[] = [
  { value: 'wait', label: 'Wait for me', title: 'The song waits until you play each step' },
  { value: 'tempo', label: 'Tempo', title: 'Play in time with a metronome' },
];

const GROUPS: { label: string; category: string }[] = [
  { label: 'Songs', category: 'song' },
  { label: 'Hand coordination exercises', category: 'exercise' },
  { label: 'Chord studies', category: 'chords' },
  { label: 'Imported', category: 'imported' },
];

// The playhead spans both staves of a row
const PLAYHEAD_TOP = 30;
const PLAYHEAD_HEIGHT = 150;

function formatSeconds(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** A line that glides across the score in time with the music, scrolling to each new row */
function usePlayhead(
  clock: SongClock | null,
  song: ParsedSong,
  layoutRef: RefObject<GrandStaffLayout | null>,
  paperRef: RefObject<HTMLDivElement | null>
) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!clock) {
      el.style.display = 'none';
      return;
    }
    let raf = 0;
    let row = -1;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const layout = layoutRef.current;
      if (!layout) return;
      const points = song.onsets
        .map((o) => ({ time: o.time, ...layout.positions.get(segmentKey(o.refs[0]))! }))
        .filter((p) => p.x !== undefined);
      if (points.length === 0) return;
      const t = (performance.now() - clock.beatZero) / clock.stepMs;
      let i = points.findIndex((p) => p.time > t) - 1;
      if (i === -2) i = points.length - 1;
      const cur = points[Math.max(0, i)];
      const next = points[i + 1];
      let x = cur.x;
      if (i >= 0 && next) {
        const f = Math.min(1, (t - cur.time) / (next.time - cur.time));
        const to = next.row === cur.row ? next.x : layout.rowEndX;
        x = cur.x + (to - cur.x) * f;
      }
      el.style.display = 'block';
      el.style.transform = `translate(${x}px, ${layout.topY + cur.row * layout.rowHeight + PLAYHEAD_TOP}px)`;
      if (cur.row !== row) {
        row = cur.row;
        paperRef.current?.scrollTo({ top: layout.topY + row * layout.rowHeight - 10, behavior: 'smooth' });
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      el.style.display = 'none';
    };
  }, [clock, song, layoutRef, paperRef]);
  return ref;
}

export function SongPractice({ practice, inputSource, locked = false }: SongPracticeProps) {
  const paperRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<GrandStaffLayout | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrolledRowRef = useRef(-1);
  const [width, setWidth] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const library = useSongLibrary();

  const { song, hands, status, steps, stepIndex, results, wrongNote, currentStep, fingering, showFingering } =
    practice;
  const playheadRef = usePlayhead(practice.playClock, song, layoutRef, paperRef);

  useEffect(() => {
    document.fonts.load('30px Bravura').then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    const el = paperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Which step each notehead belongs to, so it can be colored by progress
  const stepOfSegment = useMemo(() => {
    const map = new Map<string, number>();
    steps.forEach((step, i) => step.refs.forEach((r) => map.set(segmentKey(r), i)));
    return map;
  }, [steps]);

  const range = practice.range;
  useEffect(() => {
    if (!scoreRef.current || !fontsReady || width === 0) return;
    const inRange = (measure: number) => !range || (measure >= range.from && measure <= range.to);
    const colorOf = (staff: Staff, measure: number, segment: number) => {
      if (!isPracticed(staff, hands) || !inRange(measure)) return COLORS.inactive;
      const i = stepOfSegment.get(segmentKey({ staff, measure, segment }));
      if (i === undefined) return undefined;
      if (i < stepIndex) return COLORS[results[i]];
      if (i === stepIndex && status === 'playing') return wrongNote ? COLORS.wrong : COLORS.current;
      return undefined;
    };
    // Numbers only for the hands being practiced, so the other part stays uncluttered
    const fingersOf = (staff: Staff, measure: number, segment: number) =>
      showFingering && isPracticed(staff, hands)
        ? fingering.bySegment.get(segmentKey({ staff, measure, segment }))
        : undefined;
    const chords = song.source.chords?.split('|').map((c) => c.trim());
    layoutRef.current = renderGrandStaff(scoreRef.current, song.measures, width, {
      beats: song.source.beats,
      keySignature: song.source.keySignature,
      colorOf,
      fingersOf,
      chordOf: chords ? (m) => chords[m] : undefined,
    });
  }, [song, width, fontsReady, hands, stepOfSegment, stepIndex, results, status, wrongNote, fingering, showFingering, range]);

  // Keep the line being played in view (the playhead scrolls by itself while it runs)
  useEffect(() => {
    const paper = paperRef.current;
    const layout = layoutRef.current;
    if (!paper || !layout) return;
    const measure = currentStep?.refs[0].measure ?? range?.from ?? 0;
    const row = layout.rowOf[measure] ?? 0;
    if (row === scrolledRowRef.current) return;
    scrolledRowRef.current = row;
    paper.scrollTo({ top: layout.topY + row * layout.rowHeight - 10, behavior: 'smooth' });
  }, [currentStep, width, song, range]);

  const outOfKeyboardRange = useMemo(() => {
    const notes = new Set<string>();
    for (const onset of song.onsets) {
      if (isPracticed(onset.staff, hands)) onset.notes.forEach((n) => notes.add(n));
    }
    return [...notes].filter((n) => !NOTE_TO_KEY[n]);
  }, [song, hands]);

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    try {
      const imported = await importSongFile(file);
      if (!addImportedSong(imported)) throw new Error('Not enough browser storage to keep this song');
      practice.setSong(imported.id);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not read that file');
    }
  };

  const { accuracy, pace, choice, passes, barCount } = practice;
  const isTempo = pace === 'tempo';
  const isListening = practice.listening !== null;
  const passLabel = choice === 'learn' ? `${PASS_LABELS[hands]} (${passes.length + (status === 'done' ? 0 : 1)} of 3) · ` : '';
  const loopLabel = practice.loop && practice.loopCount > 1 ? `Loop ${practice.loopCount} · ` : '';

  let feedback: ReactNode;
  if (isListening) {
    feedback = 'Listening… this is how it should sound.';
  } else if (status === 'idle') {
    feedback = isTempo
      ? 'Press Start. After a one-bar count-in, play each note on the beat.'
      : 'Press Start. The song waits for you to play each highlighted note.';
    if (choice === 'learn') feedback = `Learn it hand by hand: right hand, then left, then both. ${feedback}`;
  } else if (status === 'playing' && practice.stalled) {
    feedback = (
      <>
        <strong className={styles.hint}>Let's slow down to {practice.tempo}%.</strong> Play the lit note to carry
        on — a new count-in follows.
      </>
    );
  } else if (status === 'playing' && practice.counting) {
    feedback = `${loopLabel}${passLabel}Count-in… get ready`;
  } else if (status === 'playing') {
    const hit = results.filter((r) => r === 'correct').length;
    feedback = wrongNote ? (
      <>
        {isTempo ? 'Off the beat or wrong key: ' : 'You played '}
        <strong className={styles.wrong}>{wrongNote}</strong>
        {isTempo ? '' : ' — try again'}
      </>
    ) : isTempo ? (
      `${loopLabel}${passLabel}${hit} on time · ${results.length - hit} missed`
    ) : (
      `${loopLabel}${passLabel}Step ${stepIndex + 1} of ${steps.length}${
        currentStep && currentStep.notes.length > 1
          ? inputSource === 'mic'
            ? ' — play any note of the chord'
            : ` — press ${currentStep.notes.length} keys together`
          : ''
      }`
    );
  }

  const barOptions = Array.from({ length: barCount }, (_, i) => i);
  const from = range?.from ?? 0;
  const to = range?.to ?? barCount - 1;
  const setBars = (f: number, t: number) =>
    practice.setRange(f === 0 && t === barCount - 1 ? null : { from: f, to: Math.max(f, t) });

  return (
    <div className={styles.practice}>
      <div className={styles.header}>
        <span className={styles.label}>{locked ? 'Lesson' : 'Song Practice'}</span>
        <div className={styles.actions}>
          {!locked && (
            <>
              <select
                className={styles.select}
                value={practice.songId}
                onChange={(e) => practice.setSong(e.target.value)}
              >
                {GROUPS.map((g) => {
                  const songs = library.filter((s) => (s.category ?? 'song') === g.category);
                  return songs.length === 0 ? null : (
                    <optgroup key={g.label} label={g.label}>
                      {songs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <div className={styles.segmented}>
                {HANDS.map((h) => (
                  <button
                    key={h.value}
                    className={choice === h.value ? styles.selected : ''}
                    onClick={() => practice.setChoice(h.value)}
                    title={h.title}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
              <div className={styles.segmented}>
                {PACES.map((p) => (
                  <button
                    key={p.value}
                    className={pace === p.value ? styles.selected : ''}
                    onClick={() => practice.setPace(p.value)}
                    title={p.title}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {status !== 'playing' && (
            <button
              className={styles.btn}
              onClick={isListening ? practice.stop : practice.listen}
              title="Hear the passage played for you, both hands"
            >
              {isListening ? '■ Stop' : '♪ Listen'}
            </button>
          )}
          {status === 'playing' ? (
            <button className={styles.btn} onClick={practice.stop}>
              Stop
            </button>
          ) : practice.nextPassHands && passes.length > 0 ? (
            <button className={`${styles.btn} ${styles.primary}`} onClick={practice.nextPass}>
              Next: {PASS_LABELS[practice.nextPassHands]}
            </button>
          ) : (
            <button className={`${styles.btn} ${styles.primary}`} onClick={practice.start}>
              {status === 'done' ? (choice === 'learn' ? 'Start over' : 'Play Again') : 'Start'}
            </button>
          )}
        </div>
      </div>

      <div className={styles.options}>
        <span className={styles.composer}>
          {song.source.title} · {song.source.composer}
          {song.source.description && <span className={styles.description}>{song.source.description}</span>}
        </span>
        {isTempo && (
          <>
            <label className={`${styles.check} ${locked ? styles.disabled : ''}`}>
              Tempo
              <select
                className={styles.selectSmall}
                value={practice.tempo}
                onChange={(e) => practice.setTempo(Number(e.target.value))}
                disabled={locked || status === 'playing'}
              >
                {TEMPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}% ({Math.round((song.source.bpm * t) / 100)} bpm)
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={practice.metronome}
                onChange={practice.toggleMetronome}
                disabled={status === 'playing'}
              />
              Metronome
            </label>
            <label className={styles.check} title="After 3 misses in a row, pause and slow the tempo down">
              <input type="checkbox" checked={practice.autoSlow} onChange={practice.toggleAutoSlow} />
              Auto-slow
            </label>
          </>
        )}
        <label className={styles.check}>
          <input type="checkbox" checked={practice.showKeys} onChange={practice.toggleShowKeys} />
          Show keys on piano
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={showFingering} onChange={practice.toggleFingering} />
          Show fingering
        </label>
        <label className={`${styles.check} ${hands === 'both' ? styles.disabled : ''}`}>
          <input
            type="checkbox"
            checked={practice.playOtherHand}
            disabled={hands === 'both'}
            onChange={practice.togglePlayOtherHand}
          />
          Play other hand for me
        </label>
      </div>

      <div className={styles.options}>
        {!locked && barCount > 1 && (
          <>
            <label className={styles.check}>
              Bars
              <select
                className={styles.selectSmall}
                value={from}
                onChange={(e) => setBars(Number(e.target.value), to)}
                disabled={status === 'playing'}
              >
                {barOptions.map((b) => (
                  <option key={b} value={b}>
                    {b + 1}
                  </option>
                ))}
              </select>
              to
              <select
                className={styles.selectSmall}
                value={to}
                onChange={(e) => setBars(from, Number(e.target.value))}
                disabled={status === 'playing'}
              >
                {barOptions.filter((b) => b >= from).map((b) => (
                  <option key={b} value={b}>
                    {b + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.check} title="Start the section again by itself when you finish it">
              <input type="checkbox" checked={practice.loop} onChange={practice.toggleLoop} />
              Loop
            </label>
          </>
        )}
        <span className={styles.spacer} />
        <button className={styles.linkBtn} onClick={() => printSong(song, fingering, showFingering)}>
          Print sheet music
        </button>
        {!locked && (
          <>
            <button
              className={styles.linkBtn}
              onClick={() => fileRef.current?.click()}
              title={`MIDI (.mid) or MusicXML (.musicxml, .xml); the first ${MAX_IMPORT_BARS} bars are kept`}
            >
              Import MIDI / MusicXML…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".mid,.midi,.musicxml,.xml,.mxl"
              hidden
              onChange={(e) => {
                void handleImport(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {song.source.category === 'imported' && (
              <button
                className={styles.linkBtn}
                onClick={() => {
                  if (!window.confirm(`Remove "${song.source.title}"?`)) return;
                  removeImportedSong(song.source.id);
                  practice.setSong(library[0].id);
                }}
              >
                Remove this song
              </button>
            )}
          </>
        )}
      </div>
      {importError && <p className={styles.importError}>{importError}</p>}

      <div className={styles.paper} ref={paperRef}>
        <div className={styles.scoreWrap}>
          <div ref={scoreRef} />
          <div ref={playheadRef} className={styles.playhead} style={{ height: PLAYHEAD_HEIGHT }} />
        </div>
      </div>

      {practice.handFingering.length > 0 && <FingeringPanel hands={practice.handFingering} />}

      {status === 'done' && passes.length > 0 && (
        <div className={styles.passes}>
          {passes.map((p, i) => (
            <div key={i} className={`${styles.pass} ${i === passes.length - 1 ? styles.passLatest : ''}`}>
              <span className={styles.passName}>{PASS_LABELS[p.hands]}</span>
              <span className={styles.passScore}>{p.accuracy}%</span>
              <span className={styles.passMeta}>
                {p.mistakes} wrong · {formatSeconds(p.ms)}
              </span>
            </div>
          ))}
          {practice.nextPassHands ? (
            <p className={styles.passHint}>
              {passes[passes.length - 1].accuracy >= 80
                ? `Nice! Now the ${PASS_LABELS[practice.nextPassHands].toLowerCase()}.`
                : `Try again with Start over, or go on to the ${PASS_LABELS[practice.nextPassHands].toLowerCase()}.`}
            </p>
          ) : (
            <p className={styles.passHint}>All three passes done — you've learnt it hand by hand.</p>
          )}
        </div>
      )}

      {status === 'done' ? (
        <>
          <div className={styles.results}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{accuracy}%</span>
              <span className={styles.statLabel}>{isTempo ? 'On time' : 'First-try accuracy'}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{practice.mistakes}</span>
              <span className={styles.statLabel}>Wrong notes</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{formatSeconds(practice.endTime - practice.startTime)}</span>
              <span className={styles.statLabel}>Time</span>
            </div>
          </div>
          {isTempo && practice.slowed && (
            <p className={styles.coach}>
              {accuracy >= 90
                ? `Clean run at ${practice.tempo}% — try a faster tempo next.`
                : `Slowed down to ${practice.tempo}% along the way. Practise it here until it's clean, then speed up.`}
            </p>
          )}
          {practice.loop && <p className={styles.coach}>Looping — starting again…</p>}
        </>
      ) : (
        <div className={styles.footer}>
          <p className={styles.feedback}>{feedback}</p>
          {status === 'playing' && (
            <div className={styles.progress}>
              <div className={styles.progressBar} style={{ width: `${(stepIndex / steps.length) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {inputSource === 'keyboard' && outOfKeyboardRange.length > 0 && (
        <p className={styles.note}>
          {outOfKeyboardRange.join(', ')} {outOfKeyboardRange.length > 1 ? 'are' : 'is'} outside
          the computer-keyboard range — click {outOfKeyboardRange.length > 1 ? 'them' : 'it'} with
          the mouse.
        </p>
      )}
    </div>
  );
}
