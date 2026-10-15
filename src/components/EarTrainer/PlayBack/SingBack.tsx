import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ROUND_LENGTH,
  SING_HOLD_MS,
  SING_TOLERANCE_CENTS,
  VOICE_RANGES,
  exerciseDef,
  noteName,
  singSound,
  singTarget,
} from '../../../utils/earTraining/playback';
import type { PlayOptions, PlayResult, VoiceRange } from '../../../utils/earTraining/playback';
import { midiToNote } from '../../../utils/earTraining/theory';
import type { ModuleProps } from '../types';
import { TopBar } from '../TopBar';
import { KeyStrip } from '../KeyStrip';
import { CheckIcon } from '../Icons';
import { RunResults } from './RunResults';
import { SetupScreen } from './SetupScreen';
import { Pill, Section, Segmented, Stage } from './shared';
import styles from '../EarTrainer.module.css';
import css from './PlayBack.module.css';

/** The mic hears the played note ring on briefly after it ends */
const LISTEN_AFTER_MS = 450;
/** Detection flickers; a gap shorter than this doesn't break a held note */
const DROPOUT_MS = 160;
const TICK_MS = 50;
const ADVANCE_MS = 1200;

type Status = 'listening' | 'success' | 'gaveUp';

function SingRun({ module, voice, onFinish }: { module: ModuleProps; voice: VoiceRange; onFinish: (r: PlayResult[]) => void }) {
  const { mic, player, labels, lightKeys, onRecord } = module;
  const { play } = player;
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState(() => singTarget(voice));
  const [status, setStatus] = useState<Status>('listening');
  const [hold, setHold] = useState(0);
  const [results, setResults] = useState<PlayResult[]>([]);

  const micRef = useRef(mic.current);
  const quietUntil = useRef(0);
  const startMic = useRef(() => {
    if (!mic.isListening) mic.start();
  });

  useEffect(() => {
    micRef.current = mic.current;
  }, [mic]);

  useEffect(() => startMic.current(), []);

  const playTarget = useCallback(() => {
    quietUntil.current = performance.now() + play(singSound(target)) + LISTEN_AFTER_MS;
  }, [play, target]);

  useEffect(playTarget, [playTarget]);

  const finishQuestion = useCallback(
    (correct: boolean) => {
      setStatus(correct ? 'success' : 'gaveUp');
      setResults((r) => [...r, { correct, mistakes: 0, shown: !correct, label: noteName(target, labels.notation), sound: singSound(target) }]);
      onRecord('play', correct);
    },
    [target, labels.notation, onRecord]
  );

  // Watches the mic: the target's pitch class, in tune, held long enough
  useEffect(() => {
    if (status !== 'listening') return;
    let holdStart: number | null = null;
    let lastGood = 0;
    let done = false;
    const id = window.setInterval(() => {
      if (done) return;
      const now = performance.now();
      const heard = micRef.current;
      const inTune =
        now >= quietUntil.current &&
        heard !== null &&
        (((heard.midi - target) % 12) + 12) % 12 === 0 &&
        Math.abs(heard.cents) <= SING_TOLERANCE_CENTS;
      if (inTune) {
        holdStart ??= now;
        lastGood = now;
      } else if (now - lastGood > DROPOUT_MS) {
        holdStart = null;
      }
      const progress = holdStart === null ? 0 : (now - holdStart) / SING_HOLD_MS;
      setHold(Math.min(1, progress));
      if (progress >= 1) {
        done = true;
        finishQuestion(true);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [status, target, finishQuestion]);

  const next = useCallback(() => {
    if (index + 1 >= ROUND_LENGTH) {
      onFinish(results);
      return;
    }
    setIndex(index + 1);
    setTarget(singTarget(voice, target));
    setStatus('listening');
    setHold(0);
  }, [index, results, voice, target, onFinish]);

  useEffect(() => {
    if (status !== 'success') return;
    const id = window.setTimeout(next, ADVANCE_MS);
    return () => clearTimeout(id);
  }, [status, next]);

  const giveUp = () => {
    finishQuestion(false);
    playTarget();
  };

  const heard = mic.current;
  const matches = heard !== null && (((heard.midi - target) % 12) + 12) % 12 === 0;
  const cents = heard ? Math.max(-50, Math.min(50, heard.cents)) : 0;
  const done = status !== 'listening';
  const { low, high } = VOICE_RANGES[voice];
  const lit = new Set<string>(lightKeys && done ? player.sounding : []);
  const good = new Set<string>(done ? [midiToNote(target)] : []);

  return (
    <div className={styles.screen}>
      <TopBar title={exerciseDef('sing').title} onBack={() => onFinish(results)} progress={{ done: index + 1, total: ROUND_LENGTH }} />
      <div className={`${styles.content} ${styles.quizContent}`}>
        <Stage playing={player.isPlaying} label="Hear it again" onClick={playTarget} />
        <p className={css.instruction}>Sing the note you heard — any octave, and hold it</p>

        {mic.error ? (
          <div className={css.notice}>
            <p>{mic.error}</p>
            <button className={styles.continueBtn} onClick={mic.start}>
              Try the microphone again
            </button>
          </div>
        ) : !mic.isListening ? (
          <div className={css.notice}>
            <p>This exercise listens through your microphone.</p>
            <button className={styles.continueBtn} onClick={mic.start}>
              Turn on microphone
            </button>
          </div>
        ) : (
          <div className={css.tuner}>
            <div className={css.tunerHead}>
              <span className={css.tunerNote}>{heard ? noteName(heard.midi, labels.notation) : '—'}</span>
              {heard && (
                <span className={matches ? css.matchYes : css.matchNo}>{matches ? 'Right note' : 'Not that note'}</span>
              )}
            </div>
            <div className={css.meter}>
              <span className={css.meterZone} style={{ '--zone': `${SING_TOLERANCE_CENTS}%` } as CSSProperties} />
              <span className={css.meterCenter} />
              {heard && (
                <span
                  className={`${css.needle} ${matches && Math.abs(heard.cents) <= SING_TOLERANCE_CENTS ? css.needleGood : ''}`}
                  style={{ left: `${50 + cents}%` }}
                />
              )}
            </div>
            <div className={css.meterScale}>
              <span>−50</span>
              <span>flat · sharp</span>
              <span>+50</span>
            </div>
            <div className={css.holdTrack}>
              <div className={css.holdFill} style={{ width: `${hold * 100}%` }} />
            </div>
          </div>
        )}

        <div className={styles.feedback}>
          {status === 'success' && (
            <p className={styles.feedbackCorrect}>
              <CheckIcon size={20} /> In tune — it was {noteName(target, labels.notation)}
            </p>
          )}
          {status === 'gaveUp' && (
            <div className={styles.feedbackWrong}>
              <p>
                It was <strong>{noteName(target, labels.notation)}</strong>
              </p>
              <button className={styles.continueBtn} onClick={next}>
                {index + 1 >= ROUND_LENGTH ? 'See results' : 'Next'}
              </button>
            </div>
          )}
          {status === 'listening' && (
            <div className={css.pills}>
              <Pill onClick={giveUp}>Give up</Pill>
            </div>
          )}
        </div>

        <div className={css.keys}>
          <KeyStrip lit={lit} good={good} low={low} high={high} />
        </div>
      </div>
    </div>
  );
}

export function SingBack({ module, options, onOptions, onBack }: { module: ModuleProps; options: PlayOptions; onOptions: (o: PlayOptions) => void; onBack: () => void }) {
  const [phase, setPhase] = useState<'setup' | 'run' | 'results'>('setup');
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<PlayResult[]>([]);
  const start = () => {
    setRound((r) => r + 1);
    setPhase('run');
  };

  if (phase === 'run') {
    return (
      <SingRun
        key={round}
        module={module}
        voice={options.voice}
        onFinish={(r) => {
          module.player.stop();
          setResults(r);
          setPhase(r.length ? 'results' : 'setup');
        }}
      />
    );
  }
  if (phase === 'results') {
    return (
      <RunResults
        title={exerciseDef('sing').title}
        results={results}
        player={module.player}
        shownLabel="Given up"
        mistakesLabel={null}
        onRetry={start}
        onDone={() => setPhase('setup')}
      />
    );
  }
  return (
    <SetupScreen
      exercise="sing"
      intro="You hear a note. Sing it back — any octave — and hold it steady until the bar fills. Headphones help the microphone hear only you."
      onStart={start}
      onBack={onBack}
    >
      <Section title="Your voice">
        <Segmented<VoiceRange>
          options={['low', 'mid', 'high']}
          value={options.voice}
          onChange={(voice) => onOptions({ ...options, voice })}
          label={(v) => VOICE_RANGES[v].label}
        />
        <p className={styles.helper}>
          Notes from {noteName(VOICE_RANGES[options.voice].low, module.labels.notation)} to{' '}
          {noteName(VOICE_RANGES[options.voice].high, module.labels.notation)}.
        </p>
      </Section>
      {module.mic.error && <p className={`${styles.helper} ${css.errorText}`}>{module.mic.error}</p>}
    </SetupScreen>
  );
}
