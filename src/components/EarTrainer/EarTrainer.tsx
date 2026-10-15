import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SKILLS, SKILL_IDS, generateQuestions, makeQuestion, nextQuestion } from '../../utils/earTraining/skills';
import type { PracticeConfig, Question, SkillId } from '../../utils/earTraining/skills';
import { LESSONS, findLesson, lessonConfig, starsFor } from '../../utils/earTraining/lessons';
import type { Lesson } from '../../utils/earTraining/lessons';
import { MAX_BOX, dayKey, itemKey } from '../../utils/earTraining/progress';
import { useSequencePlayer } from '../../hooks/useSequencePlayer';
import { useTrainerStore } from '../../hooks/useTrainerStore';
import type { QuizMode, QuizResult } from '../../hooks/useQuiz';
import { longestStreak } from '../../hooks/useQuiz';
import type { InputSource } from '../../hooks/useInputSource';
import { TrainerHome } from './TrainerHome';
import { LessonPath } from './LessonPath';
import { PracticeSetup } from './PracticeSetup';
import { ListenView } from './ListenView';
import { IntroSlides } from './IntroSlides';
import { Quiz } from './Quiz';
import { QuizResults } from './QuizResults';
import { TrainerSettings } from './TrainerSettings';
import { PlayByEar } from './PlayBack/PlayByEar';
import { Dictation } from './Dictation/Dictation';
import { StatsView } from './Stats/StatsView';
import { resultPercent, skillStyle } from './helpers';
import type { MicInfo, ModuleProps } from './types';
import styles from './EarTrainer.module.css';

/** What a round is for, which decides what happens when it ends */
type RoundKind = 'practice' | 'lesson' | 'placement' | 'mix' | 'review' | 'drill' | 'misses';

interface Round {
  kind: RoundKind;
  title: string;
  questions: Question[];
  mode: QuizMode;
  /** Set when every question is from one skill */
  skill?: SkillId;
  config?: PracticeConfig;
  lesson?: Lesson;
  /** Placement test: how many questions belong to each checkpoint, in order */
  stages?: { lessonIndex: number; count: number }[];
  /** Drill: the pair of answers being drilled */
  pair?: [string, string];
  /** Best endless streak / speed score before this run */
  previousBest?: number;
  /** Badges already earned when the round started */
  badgesBefore: string[];
  /** Where to go when the round is left */
  back: View;
  id: number;
}

type View =
  | { name: 'home' }
  | { name: 'settings' }
  | { name: 'stats' }
  | { name: 'playByEar' }
  | { name: 'dictation' }
  | { name: 'path'; skill: SkillId }
  | { name: 'setup'; skill: SkillId }
  | { name: 'refresher'; skill: SkillId }
  | { name: 'intro'; skill: SkillId; lesson: Lesson }
  | { name: 'lessonListen'; skill: SkillId; lesson: Lesson }
  | { name: 'quiz'; round: Round }
  | { name: 'results'; round: Round; results: QuizResult[] };

/** A course lesson to open straight away, and where to report its result */
export interface TrainerEntry {
  skill: SkillId;
  lessonId: string;
}

interface EarTrainerProps {
  playNote: (note: string, velocity?: number) => void;
  releaseNote: (note: string) => void;
  registerPianoInput: (handler: ((note: string) => void) | null) => void;
  inputSource: InputSource;
  mic: MicInfo;
  /** Opens a lesson directly, e.g. from the Course tab */
  entry?: TrainerEntry | null;
  /** A lesson opened through `entry` finished with these stars */
  onEntryResult?: (stars: number) => void;
  onClose: () => void;
}

const MIX_PER_SKILL = 3;
const MIX_SKILLS = 5;
const REVIEW_COUNT = 12;
const DRILL_COUNT = 10;
const PLACEMENT_PER_STAGE = 4;
const PLACEMENT_PASS = 0.75;
const LENGTH_FACTORS = { short: 0.6, normal: 1, long: 1.5 };

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function EarTrainer({
  playNote,
  releaseNote,
  registerPianoInput,
  inputSource,
  mic,
  entry,
  onEntryResult,
  onClose,
}: EarTrainerProps) {
  const store = useTrainerStore();
  const { settings, labels } = store;
  const playback = useMemo(
    () => ({ speed: settings.speed, lengthFactor: LENGTH_FACTORS[settings.noteLength] }),
    [settings.speed, settings.noteLength]
  );
  const player = useSequencePlayer({ playNote, releaseNote, options: playback });
  const [view, setView] = useState<View>({ name: 'home' });
  const roundRef = useRef(0);
  const { stop: stopSound } = player;

  const go = useCallback(
    (next: View) => {
      stopSound();
      setView(next);
    },
    [stopSound]
  );

  const practiceConfig = (skill: SkillId): PracticeConfig => ({
    ...SKILLS[skill].defaultConfig,
    ...store.configs[skill],
  });

  const badgesNow = () => Object.keys(store.badges);

  const startRound = (round: Omit<Round, 'id' | 'badgesBefore'>) =>
    go({ name: 'quiz', round: { ...round, id: ++roundRef.current, badgesBefore: badgesNow() } });

  /** A practice or lesson round on one skill */
  const startQuiz = (skill: SkillId, config: PracticeConfig, lesson?: Lesson, mode: QuizMode = 'round') => {
    const count = mode === 'round' ? (lesson?.questions ?? SKILLS[skill].questionCount) : 1;
    const weights = store.weights(skill, config.items);
    const bestKey = mode === 'speed' ? `speed:${skill}` : `streak:${skill}`;
    startRound({
      kind: lesson ? 'lesson' : 'practice',
      title: lesson?.title ?? SKILLS[skill].trainerTitle,
      skill,
      config,
      lesson,
      mode,
      questions: generateQuestions(skill, config, count, weights),
      previousBest: mode === 'round' ? undefined : (store.bests[bestKey] ?? 0),
      back: lesson ? { name: 'path', skill } : { name: 'setup', skill },
    });
  };

  const openLesson = (skill: SkillId, lesson: Lesson) => {
    if (lesson.kind === 'intro') go({ name: 'intro', skill, lesson });
    else if (lesson.kind === 'checkpoint') startQuiz(skill, lessonConfig(skill, lesson), lesson);
    else go({ name: 'lessonListen', skill, lesson });
  };

  // A lesson opened from the Course tab skips the trainer's home screen
  const [openedEntry, setOpenedEntry] = useState<TrainerEntry | null>(null);
  if (entry && entry !== openedEntry) {
    setOpenedEntry(entry);
    const lesson = findLesson(entry.skill, entry.lessonId);
    if (lesson) {
      if (lesson.kind === 'intro') setView({ name: 'intro', skill: entry.skill, lesson });
      else setView({ name: 'lessonListen', skill: entry.skill, lesson });
    }
  }
  const fromEntry = (lesson?: Lesson) => !!entry && !!lesson && lesson.id === entry.lessonId;
  const fromEntryRef = useRef(fromEntry);
  useEffect(() => {
    fromEntryRef.current = fromEntry;
  });

  /** The settings of the furthest lesson passed, so a mix only asks what has been learned */
  const learnedConfig = (skill: SkillId): PracticeConfig | null => {
    const passed = LESSONS[skill].filter((l) => l.kind !== 'intro' && (store.stars[l.id] ?? 0) > 0);
    if (passed.length) return { ...lessonConfig(skill, passed[passed.length - 1]), timeLimit: 0 };
    const practiced = Object.keys(store.items).some((k) => k.startsWith(`${skill}:`));
    return practiced ? { ...practiceConfig(skill), timeLimit: 0 } : null;
  };

  const startDailyMix = () => {
    let skills = SKILL_IDS.filter((s) => learnedConfig(s));
    if (skills.length < 3) skills = [...new Set([...skills, 'compare', 'pitch', 'intervals', 'chords', 'rhythm'] as SkillId[])];
    const chosen = shuffle(skills).slice(0, MIX_SKILLS);
    const questions = chosen.flatMap((s) => {
      const config = learnedConfig(s) ?? { ...SKILLS[s].defaultConfig, timeLimit: 0 };
      return generateQuestions(s, config, MIX_PER_SKILL, store.weights(s, config.items));
    });
    startRound({ kind: 'mix', title: 'Daily Mix', mode: 'round', questions: shuffle(questions), back: { name: 'home' } });
  };

  /** The weakest answers from every skill, stalest first among equals */
  const startSmartReview = () => {
    const stats = Object.entries(store.items)
      .map(([key, stat]) => {
        const [skill, item] = key.split(':') as [SkillId, string];
        return { skill, item, stat };
      })
      .filter((s) => SKILLS[s.skill])
      .sort((a, b) => a.stat.box - b.stat.box || a.stat.last - b.stat.last);
    const weakest = stats.filter((s) => s.stat.box < MAX_BOX).slice(0, REVIEW_COUNT);
    const picks = weakest.length ? weakest : stats.slice(0, REVIEW_COUNT);
    if (!picks.length) return;
    const questions = shuffle(
      picks.map(({ skill, item }) => {
        const base = learnedConfig(skill) ?? practiceConfig(skill);
        const items = base.items.includes(item) ? base.items : [...base.items, item];
        return makeQuestion(skill, { ...base, items, timeLimit: 0 }, item);
      })
    );
    startRound({ kind: 'review', title: 'Smart Review', mode: 'round', questions, back: { name: 'home' } });
  };

  const startDrill = (skill: SkillId, a: string, b: string) => {
    const config: PracticeConfig = { ...(learnedConfig(skill) ?? practiceConfig(skill)), items: [a, b], smart: false };
    startRound({
      kind: 'drill',
      title: 'Mix-up Drill',
      skill,
      config,
      pair: [a, b],
      mode: 'round',
      questions: generateQuestions(skill, config, DRILL_COUNT),
      back: { name: 'home' },
    });
  };

  const startPlacement = (skill: SkillId) => {
    const stages: { lessonIndex: number; count: number }[] = [];
    const questions: Question[] = [];
    LESSONS[skill].forEach((lesson, lessonIndex) => {
      if (lesson.kind !== 'checkpoint') return;
      const config = { ...lessonConfig(skill, lesson), timeLimit: 0, smart: false };
      questions.push(...generateQuestions(skill, config, PLACEMENT_PER_STAGE));
      stages.push({ lessonIndex, count: PLACEMENT_PER_STAGE });
    });
    startRound({
      kind: 'placement',
      title: 'Placement Test',
      skill,
      mode: 'round',
      questions,
      stages,
      back: { name: 'path', skill },
    });
  };

  const startMisses = (round: Round, results: QuizResult[]) => {
    const misses = results.filter((r) => !r.correct).map((r) => r.question);
    // Each miss comes back twice, in a fresh register or key
    const questions = shuffle([...misses, ...misses].map((q) => makeQuestion(q.skill, { ...q.config, timeLimit: 0 }, q.answer)));
    startRound({ ...round, kind: 'misses', title: 'Practise Misses', mode: 'round', questions, lesson: undefined, back: round.back });
  };

  const { recordAnswer, recordStars, recordBest, bumpCounter, passLessons, clearConfusion, recordActivity } = store;

  const onAnswer = useCallback(
    (r: QuizResult) => recordAnswer(r.question.skill, r.question.answer, r.picked, r.correct),
    [recordAnswer]
  );

  const handleFinish = useCallback(
    (results: QuizResult[]) => {
      if (view.name !== 'quiz') return;
      let { round } = view;
      const percent = resultPercent(results);
      bumpCounter('rounds');
      if (percent === 100 && results.length >= 5) bumpCounter('perfect');
      if (round.lesson) {
        const stars = starsFor(percent);
        recordStars(round.lesson.id, stars);
        if (fromEntryRef.current(round.lesson)) onEntryResult?.(stars);
      }
      if (round.kind === 'mix') {
        bumpCounter('dailyMix');
        bumpCounter(`dailyMix:${dayKey()}`);
      }
      if (round.skill && round.mode === 'speed') recordBest(`speed:${round.skill}`, results.filter((r) => r.correct).length);
      if (round.skill && round.mode === 'endless') recordBest(`streak:${round.skill}`, longestStreak(results));
      if (round.kind === 'drill' && round.skill && round.pair && percent >= 90) clearConfusion(round.skill, ...round.pair);
      if (round.kind === 'placement' && round.skill && round.stages) {
        // Lessons up to the last checkpoint passed in an unbroken run are skipped
        let offset = 0;
        let reached = -1;
        for (const stage of round.stages) {
          const slice = results.slice(offset, offset + stage.count);
          offset += stage.count;
          if (slice.filter((r) => r.correct).length / stage.count < PLACEMENT_PASS) break;
          reached = stage.lessonIndex;
        }
        const ids = LESSONS[round.skill].slice(0, reached + 1).map((l) => l.id);
        passLessons(round.skill, ids);
        if (reached >= 0) round = { ...round, title: `Placed: ${ids.length} lessons unlocked` };
      }
      setView({ name: 'results', round, results });
    },
    [view, bumpCounter, recordStars, onEntryResult, recordBest, clearConfusion, passLessons]
  );
  const leave = (back: View, lesson?: Lesson) => {
    // A course lesson goes back to the course when it's done
    if (fromEntry(lesson)) {
      stopSound();
      onClose();
    } else go(back);
  };

  const moduleProps: Omit<ModuleProps, 'onBack'> = {
    player,
    playNote,
    releaseNote,
    registerPianoInput,
    inputSource,
    mic,
    labels,
    lightKeys: settings.lightKeys,
    onRecord: recordActivity,
  };

  const skill = 'skill' in view ? view.skill : view.name === 'quiz' || view.name === 'results' ? view.round.skill : undefined;

  let screen;
  switch (view.name) {
    case 'home':
      screen = (
        <TrainerHome
          data={store}
          labels={labels}
          onLearn={(s) => go({ name: 'path', skill: s })}
          onPractice={(s) => go({ name: 'setup', skill: s })}
          onDailyMix={startDailyMix}
          onSmartReview={startSmartReview}
          onDrill={startDrill}
          onPlayByEar={() => go({ name: 'playByEar' })}
          onDictation={() => go({ name: 'dictation' })}
          onStats={() => go({ name: 'stats' })}
          onSettings={() => go({ name: 'settings' })}
          onClose={() => {
            stopSound();
            onClose();
          }}
        />
      );
      break;
    case 'settings':
      screen = (
        <TrainerSettings
          settings={settings}
          onChange={store.updateSettings}
          onResetProgress={store.resetProgress}
          onResetStats={store.resetStats}
          onBack={() => go({ name: 'home' })}
        />
      );
      break;
    case 'stats':
      screen = <StatsView data={store} labels={labels} onDrill={startDrill} onBack={() => go({ name: 'home' })} />;
      break;
    case 'playByEar':
      screen = <PlayByEar {...moduleProps} onBack={() => go({ name: 'home' })} />;
      break;
    case 'dictation':
      screen = <Dictation {...moduleProps} onBack={() => go({ name: 'home' })} />;
      break;
    case 'path':
      screen = (
        <LessonPath
          skill={view.skill}
          stars={store.stars}
          placed={!!store.placed[view.skill]}
          onOpen={(lesson) => openLesson(view.skill, lesson)}
          onPlacement={() => startPlacement(view.skill)}
          onBack={() => go({ name: 'home' })}
        />
      );
      break;
    case 'setup':
      screen = (
        <PracticeSetup
          skill={view.skill}
          config={practiceConfig(view.skill)}
          labels={labels}
          mastery={(item) => (store.items[itemKey(view.skill, item)]?.box ?? 0) / MAX_BOX}
          onChange={(config) => store.saveConfig(view.skill, config)}
          onRefresher={() => go({ name: 'refresher', skill: view.skill })}
          onStart={(mode) => startQuiz(view.skill, practiceConfig(view.skill), undefined, mode)}
          onBack={() => go({ name: 'home' })}
        />
      );
      break;
    case 'refresher': {
      const config = practiceConfig(view.skill);
      screen = (
        <ListenView
          key={view.skill}
          skill={view.skill}
          config={config}
          items={config.items}
          labels={labels}
          player={player}
          lightKeys={settings.lightKeys}
          title="How each one sounds"
          subtitle="Tap to listen. They all start from the same note, so you can compare."
          startLabel="Practice now"
          onStart={() => startQuiz(view.skill, config)}
          onBack={() => go({ name: 'setup', skill: view.skill })}
        />
      );
      break;
    }
    case 'lessonListen': {
      const config = lessonConfig(view.skill, view.lesson);
      screen = (
        <ListenView
          key={view.lesson.id}
          skill={view.skill}
          config={config}
          items={view.lesson.focus ?? config.items}
          labels={labels}
          player={player}
          lightKeys={settings.lightKeys}
          title={view.lesson.title}
          subtitle={`${view.lesson.subtitle} Listen to each one, then take the quiz.`}
          startLabel="Start lesson"
          onStart={() => startQuiz(view.skill, config, view.lesson)}
          onBack={() => leave({ name: 'path', skill: view.skill }, view.lesson)}
        />
      );
      break;
    }
    case 'intro':
      screen = (
        <IntroSlides
          key={view.lesson.id}
          skill={view.skill}
          lesson={view.lesson}
          labels={labels}
          lightKeys={settings.lightKeys}
          player={player}
          onFinish={() => {
            recordStars(view.lesson.id, 3);
            if (fromEntry(view.lesson)) onEntryResult?.(3);
            leave({ name: 'path', skill: view.skill }, view.lesson);
          }}
          onBack={() => leave({ name: 'path', skill: view.skill }, view.lesson)}
        />
      );
      break;
    case 'quiz': {
      const { round } = view;
      screen = (
        <Quiz
          key={round.id}
          questions={round.questions}
          mode={round.mode}
          generate={
            round.skill && round.config
              ? (prev) => nextQuestion(round.skill!, round.config!, prev, store.weights(round.skill!, round.config!.items))
              : undefined
          }
          title={round.title}
          labels={labels}
          settings={settings}
          inputSource={inputSource}
          player={player}
          playNote={playNote}
          releaseNote={releaseNote}
          registerPianoInput={registerPianoInput}
          best={round.previousBest}
          onAnswer={onAnswer}
          onFinish={handleFinish}
          onBack={() => leave(round.back, round.lesson)}
        />
      );
      break;
    }
    case 'results': {
      const { round, results } = view;
      const retry = () =>
        round.skill && round.config && round.kind !== 'drill'
          ? startQuiz(round.skill, round.config, round.lesson, round.mode)
          : round.kind === 'mix'
            ? startDailyMix()
            : round.kind === 'review'
              ? startSmartReview()
              : round.kind === 'placement' && round.skill
                ? startPlacement(round.skill)
                : startRound({ ...round, questions: shuffle(round.questions.map((q) => makeQuestion(q.skill, q.config, q.answer))) });
      screen = (
        <QuizResults
          results={results}
          title={round.title}
          mode={round.mode}
          isLesson={!!round.lesson}
          labels={labels}
          player={player}
          previousBest={round.previousBest}
          badges={Object.keys(store.badges).filter((b) => !round.badgesBefore.includes(b))}
          passLabel={round.kind === 'placement' ? 'Pass a checkpoint’s questions to skip the lessons before it.' : undefined}
          onRetry={retry}
          onPracticeMisses={round.kind === 'placement' ? undefined : () => startMisses(round, results)}
          onDone={() => leave(round.back, round.lesson)}
          doneLabel={fromEntry(round.lesson) ? 'Back to course' : undefined}
        />
      );
      break;
    }
  }

  return (
    <div className={styles.trainer} style={skill ? skillStyle(skill) : undefined}>
      <div className={styles.frame}>{screen}</div>
    </div>
  );
}
