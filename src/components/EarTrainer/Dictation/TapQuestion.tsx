import { useEffect, useRef, useState } from 'react';
import { soundLength } from '../../../utils/earTraining/skills';
import { BAR_STEPS, beatMs, gradeTaps, onsets, rhythmSound, rhythmStaffNotes } from '../../../utils/earTraining/dictation';
import type { TapGrade, TapQuestion as Question } from '../../../utils/earTraining/dictation';
import { SpeakerIcon } from '../Icons';
import { RhythmStaff } from './MiniStaff';
import { Card, QuestionFooter, Tool, Verdict } from './parts';
import { INK, usePianoInput } from './shared';
import type { QuestionProps } from './shared';
import shell from '../EarTrainer.module.css';
import styles from './Dictation.module.css';

type Phase = 'ready' | 'countIn' | 'tapping' | 'done';

/** Offsets this small read as "on time" */
const ON_TIME_MS = 25;
/** How long after the last beat taps still count */
const TAIL_MS = 400;

interface TapResult {
  grade: TapGrade;
  /** Written onsets and beat length in ms, after the playback speed setting */
  expected: number[];
  beat: number;
  span: number;
}

/** Timing lane: written onsets on top, taps below, matched pairs joined */
function TimingLane({ result }: { result: TapResult }) {
  const { grade, expected, beat, span } = result;
  const W = 400;
  const PAD = 14;
  const x = (t: number) => PAD + (Math.min(Math.max(t, -beat / 2), span) / span) * (W - PAD * 2);
  const beats = Math.round(span / beat);
  const extra = new Set(grade.extras);
  return (
    <svg className={styles.lane} viewBox={`0 0 ${W} 72`} role="img" aria-label="Your taps compared with the written rhythm">
      {Array.from({ length: beats + 1 }, (_, b) => (
        <line key={b} x1={x(b * beat)} x2={x(b * beat)} y1={8} y2={64} className={b % 4 === 0 ? styles.laneBar : styles.laneBeat} />
      ))}
      <line x1={PAD} x2={W - PAD} y1={22} y2={22} className={styles.laneRow} />
      <line x1={PAD} x2={W - PAD} y1={52} y2={52} className={styles.laneRow} />
      {grade.offsets.map(
        (o, i) =>
          o !== null && <line key={`m${i}`} x1={x(expected[i])} y1={22} x2={x(expected[i] + o)} y2={52} stroke={INK.good} strokeWidth={1.5} />
      )}
      {expected.map((t, i) => (
        <circle
          key={`e${i}`}
          cx={x(t)}
          cy={22}
          r={5}
          fill={grade.offsets[i] === null ? '#fff' : INK.entered}
          stroke={grade.offsets[i] === null ? INK.bad : INK.entered}
          strokeWidth={2}
        />
      ))}
      {grade.taps.map((t, i) => (
        <circle key={`t${i}`} cx={x(t)} cy={52} r={4.5} fill={extra.has(t) ? INK.bad : INK.good} />
      ))}
    </svg>
  );
}

function offsetLabel(o: number | null): string {
  if (o === null) return 'missed';
  if (Math.abs(o) <= ON_TIME_MS) return 'on time';
  return `${Math.round(Math.abs(o))} ms ${o < 0 ? 'early' : 'late'}`;
}

/** Read a written rhythm and tap it in time after a count-in */
export function TapQuestion({ question, module, onChecked, onNext, isLast }: QuestionProps<Question>) {
  const { steps, bpm, tolerance, clicks } = question;
  const { play, isPlaying } = module.player;
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [result, setResult] = useState<TapResult | null>(null);
  const run = useRef({ t0: 0, taps: [] as number[], expected: [] as number[], beat: 0, span: 0 });
  const timers = useRef<number[]>([]);
  const onCheckedRef = useRef(onChecked);

  const finish = () => {
    const { taps, expected, beat, span } = run.current;
    // Taps during the count-in are just people tapping along
    const grade = gradeTaps(expected, taps.filter((t) => t >= -tolerance), tolerance);
    setResult({ grade, expected, beat, span });
    setPhase('done');
    onCheckedRef.current(grade.correct);
  };

  const start = () => {
    const raw = rhythmSound(steps, bpm, { notes: false, clicks });
    const length = play(raw);
    // The player may be slowed down or sped up in the settings
    const scale = length / soundLength(raw) || 1;
    const beat = beatMs(bpm) * scale;
    const total = steps.reduce((s, x) => s + Math.abs(x), 0);
    const span = (total / 4) * beat;
    run.current = { t0: performance.now() + 4 * beat, taps: [], expected: onsets(steps, bpm).map((t) => t * scale), beat, span };
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    [0, 1, 2, 3].forEach((i) => later(() => setCount(i + 1), i * beat));
    later(() => setPhase('tapping'), 4 * beat - tolerance);
    later(finish, 4 * beat + span + TAIL_MS);
    setCount(0);
    setTapCount(0);
    setPhase('countIn');
  };

  const tap = () => {
    if (phase !== 'countIn' && phase !== 'tapping') return;
    run.current.taps.push(performance.now() - run.current.t0);
    setTapCount((c) => c + 1);
  };

  /** What Space does right now */
  const action = phase === 'ready' ? start : tap;
  const actionRef = useRef(action);
  const tapRef = useRef(tap);
  useEffect(() => {
    actionRef.current = action;
    tapRef.current = tap;
    onCheckedRef.current = onChecked;
  });

  // Space taps here instead of working the sustain pedal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type === 'keydown' && !e.repeat) actionRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
    };
  }, []);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((id) => clearTimeout(id));
  }, []);

  usePianoInput(module, () => tapRef.current(), true);

  const bars = Math.round(steps.reduce((s, x) => s + Math.abs(x), 0) / BAR_STEPS);
  const busy = phase === 'countIn' || phase === 'tapping';
  const hits = result ? result.grade.offsets.filter((o) => o !== null).length : 0;
  const extras = result ? result.grade.extras.length : 0;

  let padText = 'Tap to start';
  if (phase === 'countIn') padText = count > 0 ? String(count) : 'Ready…';
  if (phase === 'tapping') padText = 'Tap!';

  return (
    <>
      <div className={`${shell.content} ${styles.questionContent}`}>
        <p className={styles.instructions}>
          {phase === 'done'
            ? 'Here is how your taps lined up.'
            : `Tap each note of the ${bars > 1 ? 'two bars' : 'bar'} after four clicks — on the pad, with Space or any piano key.`}
        </p>

        <Card label={`${bpm} beats per minute · ±${tolerance} ms`} tone={result ? (result.grade.correct ? 'good' : 'bad') : undefined}>
          <RhythmStaff notes={rhythmStaffNotes(steps)} label="The rhythm to tap" />
        </Card>

        {phase !== 'done' ? (
          <button
            type="button"
            className={`${styles.tapPad} ${phase === 'tapping' ? styles.tapPadLive : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              action();
            }}
          >
            <span key={tapCount} className={tapCount > 0 ? styles.tapFlash : undefined}>
              {padText}
            </span>
            {busy && <small>{tapCount} taps</small>}
          </button>
        ) : (
          result && (
            <>
              <Verdict correct={result.grade.correct}>
                {result.grade.correct
                  ? `All ${result.expected.length} notes in time!`
                  : `${hits} of ${result.expected.length} notes in time${extras ? `, ${extras} extra tap${extras > 1 ? 's' : ''}` : ''}`}
              </Verdict>
              <Card label="Timing">
                <TimingLane result={result} />
                <div className={styles.laneLegend}>
                  <span>
                    <i style={{ background: INK.entered }} /> written
                  </span>
                  <span>
                    <i style={{ background: INK.good }} /> your tap
                  </span>
                  <span>
                    <i style={{ background: INK.bad }} /> missed / extra
                  </span>
                </div>
              </Card>
              <div className={styles.offsetList}>
                {result.grade.offsets.map((o, i) => (
                  <span key={i} className={o === null ? styles.offsetBad : styles.offsetGood}>
                    {i + 1}: {offsetLabel(o)}
                  </span>
                ))}
              </div>
            </>
          )
        )}

        <div className={styles.tools}>
          <Tool onClick={() => play(rhythmSound(steps, bpm, { clicks }))} disabled={busy}>
            <SpeakerIcon size={16} /> {phase === 'done' ? 'Hear it' : 'Listen first'}
          </Tool>
          {isPlaying && !busy && <span className={styles.toolNote}>Playing…</span>}
        </div>
      </div>
      <QuestionFooter
        checked={phase === 'done'}
        canCheck={phase === 'ready'}
        onCheck={start}
        onNext={onNext}
        isLast={isLast}
        checkLabel={busy ? 'Tapping…' : 'Start'}
      />
    </>
  );
}
