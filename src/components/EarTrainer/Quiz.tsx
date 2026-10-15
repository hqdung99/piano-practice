import { useEffect, useMemo, useRef } from 'react';
import { noteToMidi, pitchClassName } from '../../utils/earTraining/theory';
import {
  SKILLS,
  acceptsPiano,
  cadenceSound,
  itemSound,
  optionName,
  pianoAnswer,
  promptFor,
  questionSound,
  referenceSound,
  replaySound,
  resolutionSound,
  skillOptions,
} from '../../utils/earTraining/skills';
import type { Labels, Question } from '../../utils/earTraining/skills';
import { reminderFor } from '../../utils/earTraining/reminders';
import { SPEED_SECONDS, useQuiz } from '../../hooks/useQuiz';
import type { QuizMode, QuizResult } from '../../hooks/useQuiz';
import type { SequencePlayer } from '../../hooks/useSequencePlayer';
import type { InputSource } from '../../hooks/useInputSource';
import type { TrainerSettings } from '../../hooks/useTrainerStore';
import { TopBar } from './TopBar';
import { KeyStrip } from './KeyStrip';
import { rangeOf } from './keyRange';
import { RhythmGlyph } from './RhythmGlyph';
import { SkillIcon } from './SkillIcon';
import { CheckIcon, SpeakerIcon } from './Icons';
import { skillStyle } from './helpers';
import styles from './EarTrainer.module.css';

const CORRECT_ADVANCE_MS = 800;
const WRONG_ADVANCE_MS = 1800;
const SPEED_CORRECT_MS = 350;
const SPEED_WRONG_MS = 1000;

/** Keys that pick the 1st, 2nd… answer on screen */
const SHORTCUT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

const INPUT_NAMES: Record<InputSource, string> = {
  keyboard: 'computer keyboard',
  midi: 'MIDI piano',
  mic: 'piano (microphone)',
};

interface QuizProps {
  questions: Question[];
  mode: QuizMode;
  /** Makes more questions for endless and speed runs */
  generate?: (previous: Question) => Question;
  title: string;
  labels: Labels;
  settings: TrainerSettings;
  inputSource: InputSource;
  player: SequencePlayer;
  playNote: (note: string, velocity?: number) => void;
  releaseNote: (note: string) => void;
  /** Hands the quiz a handler for notes played on the piano, or takes it back with null */
  registerPianoInput: (handler: ((note: string) => void) | null) => void;
  /** Best endless streak or speed score so far, for comparison */
  best?: number;
  onAnswer: (result: QuizResult) => void;
  onFinish: (results: QuizResult[]) => void;
  onBack: () => void;
}

/** A sine wave twice as wide as the view, so sliding it by one period loops seamlessly */
function wavePath(amplitude: number, period: number, phase: number): string {
  const points: string[] = [];
  for (let x = 0; x <= 800; x += 8) {
    const y = 30 + amplitude * Math.sin(((x + phase) / period) * Math.PI * 2);
    points.push(`${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`);
  }
  return points.join(' ');
}

const WAVES = [
  { d: wavePath(12, 400, 0), main: true },
  { d: wavePath(8, 200, 60), main: false },
  { d: wavePath(6, 400, 150), main: false },
];

export function Quiz({
  questions,
  mode,
  generate,
  title,
  labels,
  settings,
  inputSource,
  player,
  playNote,
  releaseNote,
  registerPianoInput,
  best,
  onAnswer,
  onFinish,
  onBack,
}: QuizProps) {
  const quiz = useQuiz(questions, { mode, timeLimitSec: questions[0]?.config.timeLimit ?? 0, generate });
  const { phase, question, index, results, lastResult, asked, tick, answer, replayed, next, end, streak } = quiz;
  const { play, isPlaying, sounding } = player;
  const { answerHints, autoAdvance, resolve, lightKeys, showKeyboard } = settings;
  const mixed = useMemo(() => new Set(questions.map((q) => q.skill)).size > 1, [questions]);

  const skill = question?.skill ?? 'pitch';
  const config = question?.config;
  const def = SKILLS[skill];
  const options = useMemo(() => skillOptions(skill, labels), [skill, labels]);
  // Any note can be home, whichever keys the round draws from
  const enabledIds = useMemo(
    () => new Set(skill === 'tonic' ? options.map((o) => o.id) : (config?.items ?? [])),
    [skill, options, config]
  );
  const shortcutIds = options.filter((o) => enabledIds.has(o.id)).map((o) => o.id);
  // Long answer lists only show the answers in play
  const shown = options.length > 12 ? options.filter((o) => enabledIds.has(o.id)) : options;
  const replaysLeft = config && config.replays >= 0 ? config.replays - quiz.replays : Infinity;

  // Each new question plays on its own; the clock starts once it has finished
  useEffect(() => {
    if (phase !== 'asking' || !question) return;
    asked(play(questionSound(question)));
  }, [phase, question, play, asked]);

  const timed = mode === 'speed' || (config?.timeLimit ?? 0) > 0;
  useEffect(() => {
    if (!timed || phase === 'done') return;
    const id = window.setInterval(tick, 200);
    return () => clearInterval(id);
  }, [timed, phase, tick]);

  // Each answer counts toward stats once; scale degrees then walk home
  const recordedRef = useRef<QuizResult | null>(null);
  useEffect(() => {
    if (!lastResult || recordedRef.current === lastResult) return;
    recordedRef.current = lastResult;
    onAnswer(lastResult);
    if (resolve && mode !== 'speed') {
      const walk = resolutionSound(lastResult.question);
      if (walk.length) play(walk);
    }
  }, [lastResult, onAnswer, resolve, mode, play]);

  // Right answers move on by themselves; misses wait for Continue when hints are on
  useEffect(() => {
    if (phase !== 'feedback' || !lastResult) return;
    let delay: number;
    if (mode === 'speed') delay = lastResult.correct ? SPEED_CORRECT_MS : SPEED_WRONG_MS;
    else if (lastResult.correct) {
      if (!autoAdvance) return;
      // Let the walk home finish first
      delay = resolve && lastResult.question.skill === 'degrees' ? 1800 : CORRECT_ADVANCE_MS;
    } else {
      if (answerHints || !autoAdvance) return;
      delay = WRONG_ADVANCE_MS;
    }
    const id = window.setTimeout(next, delay);
    return () => clearTimeout(id);
  }, [phase, lastResult, answerHints, autoAdvance, resolve, mode, next]);

  const finishedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'done' || finishedRef.current) return;
    finishedRef.current = true;
    onFinish(results);
  }, [phase, results, onFinish]);

  const replay = () => {
    if (!question || replaysLeft <= 0) return;
    replayed();
    play(replaySound(question));
  };

  // Number keys answer, Space replays and Enter continues. Listening in the capture phase
  // keeps these keys from also playing notes on the app's computer-keyboard piano.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      let handled = true;
      if (e.key === 'Enter' && phase === 'feedback') next();
      else if (e.code === 'Space' && phase === 'asking') replay();
      else if (phase === 'asking' && SHORTCUT_KEYS.includes(e.key) && SHORTCUT_KEYS.indexOf(e.key) < shortcutIds.length) {
        answer(shortcutIds[SHORTCUT_KEYS.indexOf(e.key)]);
      } else handled = false;
      if (handled) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  // Notes, keys and scale degrees can be answered on the piano too, in any octave
  useEffect(() => {
    if (!question || !acceptsPiano(question.skill)) return;
    registerPianoInput((note) => {
      const midi = noteToMidi(note);
      if (midi === undefined) return;
      const id = pianoAnswer(question, midi);
      // Answers left out of this round are ignored, like their greyed-out buttons
      if (id !== null && enabledIds.has(id)) answer(id);
    });
    return () => registerPianoInput(null);
  }, [question, enabledIds, answer, registerPianoInput]);

  const range = useMemo(
    () => (question ? rangeOf(questionSound(question).map((e) => e.notes)) : ([48, 83] as [number, number])),
    [question]
  );

  if (phase === 'done' || !question || !config) return null;

  const hear = (id: string) => play(itemSound(skill, id, question.ctx, config));

  const buttonClass = (id: string) => {
    const classes = [styles.answerBtn];
    if (!enabledIds.has(id)) classes.push(styles.answerOff);
    if (phase === 'feedback' && lastResult) {
      if (id === question.answer) classes.push(styles.answerCorrect);
      else if (id === lastResult.picked) classes.push(styles.answerWrong);
      else classes.push(styles.answerDim);
    }
    return classes.join(' ');
  };

  const seconds = Math.ceil(quiz.remainingMs / 1000);
  const runSeconds = Math.ceil(quiz.runRemainingMs / 1000);
  const answerName = optionName(skill, question.answer, labels);
  const reminder = reminderFor(skill, question.answer, question.ctx.direction);
  const correctCount = results.filter((r) => r.correct).length;
  const waitingToContinue =
    phase === 'feedback' && mode !== 'speed' && lastResult && (lastResult.correct ? !autoAdvance : answerHints || !autoAdvance);
  const keyContext = def.keyContexts ? config.keyContext : 'none';
  // The answer stays hidden until it has been given
  const showLit = lightKeys && phase === 'feedback' && skill !== 'rhythm';
  const keyboardBase = skill === 'degrees' || skill === 'bass' ? question.ctx.rootMidi : question.ctx.rootMidi - (question.ctx.rootMidi % 12);

  let topBar;
  if (mode === 'endless') {
    topBar = (
      <TopBar
        title={title}
        onBack={onBack}
        action={
          <button className={styles.finishBtn} onClick={end}>
            Finish
          </button>
        }
        extra={
          <div className={styles.runStats}>
            <span>🔥 Streak {streak}</span>
            <span>Best {Math.max(best ?? 0, streak)}</span>
            <span>
              {correctCount}/{results.length} right
            </span>
          </div>
        }
      />
    );
  } else if (mode === 'speed') {
    topBar = (
      <TopBar
        title={title}
        onBack={onBack}
        progress={{ done: SPEED_SECONDS - runSeconds, total: SPEED_SECONDS }}
        progressLabel={`${runSeconds}s`}
        extra={
          <div className={styles.runStats}>
            <span>⚡ {correctCount} right</span>
            {best ? <span>Best {best}</span> : null}
          </div>
        }
      />
    );
  } else {
    topBar = <TopBar title={title} onBack={onBack} progress={{ done: index + 1, total: quiz.questions.length }} />;
  }

  return (
    <div className={styles.screen} style={mixed ? skillStyle(skill) : undefined}>
      {topBar}

      <div className={`${styles.content} ${styles.quizContent}`}>
        {mixed && (
          <span className={styles.skillChip}>
            <SkillIcon skill={skill} size={16} /> {def.title}
          </span>
        )}
        <button className={styles.stage} onClick={replay} aria-label={def.replayLabel} disabled={replaysLeft <= 0}>
          {isPlaying ? (
            <svg className={styles.wave} viewBox="0 0 400 60" preserveAspectRatio="none">
              {WAVES.map((w, i) => (
                <path
                  key={i}
                  d={w.d}
                  className={w.main ? styles.waveMain : styles.waveSoft}
                  style={{ animationDuration: `${1.6 + i * 0.5}s` }}
                />
              ))}
            </svg>
          ) : (
            <span className={styles.stageLine}>
              <span>
                {replaysLeft <= 0 ? 'No replays left' : def.replayLabel}
                {Number.isFinite(replaysLeft) && replaysLeft > 0 ? ` (${replaysLeft})` : ''}
              </span>
            </span>
          )}
        </button>

        <div className={styles.prompt}>
          {config.timeLimit > 0 && mode !== 'speed' && phase === 'asking' ? (
            <span className={seconds <= 3 ? styles.timerLow : styles.timer}>{seconds}s</span>
          ) : (
            <span className={styles.promptText}>{promptFor(question, labels)}</span>
          )}
        </div>

        {skill === 'pitch' && config.reference !== null && (
          <button className={styles.referenceBtn} onClick={() => play(referenceSound(config))}>
            Play Reference ({pitchClassName(config.reference, labels.notation)})
          </button>
        )}
        {keyContext !== 'none' && (
          <button className={styles.referenceBtn} onClick={() => play(cadenceSound(question.ctx.rootMidi))}>
            Replay the key
          </button>
        )}

        <div className={styles.answerGrid} style={{ gridTemplateColumns: `repeat(${def.columns}, 1fr)` }}>
          {shown.map((o) => {
            const shortcut = shortcutIds.indexOf(o.id);
            return (
              <button
                key={o.id}
                className={buttonClass(o.id)}
                disabled={!enabledIds.has(o.id) || phase !== 'asking'}
                onClick={() => answer(o.id)}
                title={o.name}
              >
                {skill === 'rhythm' ? <RhythmGlyph id={o.id} /> : o.label}
                {shortcut >= 0 && shortcut < SHORTCUT_KEYS.length && (
                  <kbd className={styles.shortcut}>{SHORTCUT_KEYS[shortcut]}</kbd>
                )}
              </button>
            );
          })}
        </div>

        <div className={styles.feedback}>
          {phase === 'feedback' && lastResult?.correct && (
            <p className={styles.feedbackCorrect}>
              <CheckIcon size={20} /> Correct!
            </p>
          )}
          {phase === 'feedback' && lastResult && !lastResult.correct && (
            <div className={styles.feedbackWrong}>
              <p>
                {lastResult.picked === null ? "Time's up — it" : 'Not quite — it'} was <strong>{answerName}</strong>
              </p>
              {answerHints && mode !== 'speed' && (
                <div className={styles.compareRow}>
                  <button className={styles.compareBtn} onClick={() => hear(question.answer)}>
                    <SpeakerIcon size={16} /> Answer: {answerName}
                  </button>
                  {lastResult.picked !== null && (
                    <button className={`${styles.compareBtn} ${styles.compareYours}`} onClick={() => hear(lastResult.picked!)}>
                      <SpeakerIcon size={16} /> Yours: {optionName(skill, lastResult.picked, labels)}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {phase === 'feedback' && reminder && mode !== 'speed' && <p className={styles.reminder}>💡 {reminder}</p>}
          {waitingToContinue && (
            <button className={styles.continueBtn} onClick={next}>
              Continue
            </button>
          )}
        </div>

        {showLit && <KeyStrip lit={sounding} low={range[0]} high={range[1]} />}

        {acceptsPiano(skill) && (
          <>
            {showKeyboard && phase === 'asking' && (
              <KeyStrip
                lit={new Set()}
                low={keyboardBase}
                high={keyboardBase + 11}
                onPress={(note) => {
                  playNote(note);
                  const midi = noteToMidi(note);
                  const id = midi === undefined ? null : pianoAnswer(question, midi);
                  if (id !== null && enabledIds.has(id)) answer(id);
                }}
                onRelease={releaseNote}
              />
            )}
            <p className={styles.inputHint}>
              Or play it on your {INPUT_NAMES[inputSource]} — any octave counts. Keys {SHORTCUT_KEYS[0]}–
              {SHORTCUT_KEYS[Math.min(shortcutIds.length, SHORTCUT_KEYS.length) - 1]} pick answers, Space replays.
            </p>
          </>
        )}
        {!acceptsPiano(skill) && (
          <p className={styles.inputHint}>
            Keys {SHORTCUT_KEYS[0]}–{SHORTCUT_KEYS[Math.min(shortcutIds.length, SHORTCUT_KEYS.length) - 1]} pick answers,
            Space replays, Enter continues.
          </p>
        )}
      </div>
    </div>
  );
}
