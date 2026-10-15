import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header/Header';
import { PianoKeyboard } from './components/Piano/PianoKeyboard';
import { Controls } from './components/Controls/Controls';
import { NoteDetector } from './components/NoteDetector/NoteDetector';
import { SheetMusic } from './components/SheetMusic/SheetMusic';
import { NoteGame } from './components/NoteGame/NoteGame';
import { ChordGame } from './components/ChordGame/ChordGame';
import { SongPractice } from './components/SongPractice/SongPractice';
import { InputSelector } from './components/InputSelector/InputSelector';
import { EarTrainer } from './components/EarTrainer/EarTrainer';
import type { TrainerEntry } from './components/EarTrainer/EarTrainer';
import { CoursePath } from './components/Course/CoursePath';
import { CourseLessonView } from './components/Course/CourseLessonView';
import { TheoryLessonView } from './components/Course/TheoryLessonView';
import { usePiano } from './hooks/usePiano';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import { useRecorder } from './hooks/useRecorder';
import { usePitchDetector } from './hooks/usePitchDetector';
import { useSheetMusic } from './hooks/useSheetMusic';
import { useNoteGame } from './hooks/useNoteGame';
import { useSongPractice } from './hooks/useSongPractice';
import { useMidiInput } from './hooks/useMidiInput';
import { useInputSource } from './hooks/useInputSource';
import { useCourseStore, useWorkoutStore } from './hooks/useCourseStore';
import { useChordGame } from './hooks/useChordGame';
import { dailyWorkout, dayKey, findCourseLesson, nextCourseLesson } from './utils/course';
import type { CourseLesson } from './utils/course';
import type { InputSource } from './hooks/useInputSource';
import { DEFAULT_VOLUME_DB } from './utils/constants';
import { ALL_NOTES } from './utils/noteMapping';
import styles from './App.module.css';

type Mode = 'sheet' | 'game' | 'practice' | 'chords' | 'course';
/** What is taking played notes: a tab, or the Chord Game inside a course lesson */
type Activity = Exclude<Mode, 'course'> | 'chords' | 'none';

/** What the Course tab is showing besides the lesson path */
type CourseView =
  | { type: 'lesson'; lesson: CourseLesson }
  | { type: 'workout'; index: number }
  | { type: 'theory'; id: string };

// Ear lessons open in the ear trainer instead
const ACTIVITY_OF = { reading: 'game', song: 'practice', chords: 'chords', ear: 'none' } as const;

/** Where a note came from; recorder playback replays notes that were already checked once */
type NoteOrigin = InputSource | 'playback';

// How long after the app releases a note the microphone may still hear it ring
const ECHO_MS = 1500;
const SUSTAIN_ECHO_MS = 4000;
const MIDI_OF = new Map(ALL_NOTES.map((n) => [n.note, n.midi]));
const NOTE_OF = new Map(ALL_NOTES.map((n) => [n.midi, n.note]));

export default function App() {
  const piano = usePiano();
  const { keyDown: pianoKeyDown, keyUp: pianoKeyUp } = piano;
  const [inputSource, setInputSource] = useInputSource();

  // Notes the app itself is sounding, so the microphone doesn't score the app's own output
  const appSoundRef = useRef(new Map<string, { held: boolean; at: number }>());
  const sustainRef = useRef(false);

  const playNote = useCallback(
    (note: string, velocity?: number) => {
      appSoundRef.current.set(note, { held: true, at: performance.now() });
      pianoKeyDown(note, velocity);
    },
    [pianoKeyDown]
  );

  const releaseNote = useCallback(
    (note: string) => {
      appSoundRef.current.set(note, { held: false, at: performance.now() });
      pianoKeyUp(note);
    },
    [pianoKeyUp]
  );

  const isAppEcho = useCallback((note: string) => {
    const midi = MIDI_OF.get(note);
    if (midi === undefined) return false;
    const now = performance.now();
    // Pitch detection often lands an octave off, so those count as echoes too
    return [midi - 12, midi, midi + 12].some((m) => {
      const sound = appSoundRef.current.get(NOTE_OF.get(m) ?? '');
      const ringMs = sustainRef.current ? SUSTAIN_ECHO_MS : ECHO_MS;
      return !!sound && (sound.held || now - sound.at < ringMs);
    });
  }, []);

  const sheet = useSheetMusic();
  const game = useNoteGame();
  const practice = useSongPractice({ playNote, releaseNote });
  const { noteDown: sheetNoteDown, noteUp: sheetNoteUp } = sheet;
  const { press: gamePress } = game;
  const { press: practicePress } = practice;
  const [mode, setMode] = useState<Mode>('sheet');
  // The Chords tab keeps its own settings; course lessons use a separate, unsaved game
  const chordPractice = useChordGame();
  const courseChords = useChordGame({ persist: false });
  const course = useCourseStore();
  const WORKOUT_SIZE = 3;
  const workoutStore = useWorkoutStore(WORKOUT_SIZE);
  // Today's workout is picked once, so it doesn't change as lessons are passed
  const [workout] = useState(() => dailyWorkout(dayKey(), course.stars));
  const [courseView, setCourseView] = useState<CourseView | null>(null);
  const viewLesson =
    courseView?.type === 'lesson' ? courseView.lesson : courseView?.type === 'workout' ? workout[courseView.index] : undefined;
  // A course lesson runs in the Note Game, Song Practice or Chord Game, so notes and hints go there
  const activity: Activity =
    mode !== 'course' ? mode : viewLesson ? ACTIVITY_OF[viewLesson.activity.type] : 'none';
  const chordGame = mode === 'chords' ? chordPractice : courseChords;
  const { press: chordPress } = chordGame;
  const [trainerOpen, setTrainerOpen] = useState(false);
  // An ear lesson opened from the Course tab, and the course lesson to credit
  const [trainerEntry, setTrainerEntry] = useState<(TrainerEntry & { courseLessonId: string }) | null>(null);
  // The ear trainer's open quiz takes played notes as answers while it's on screen
  const trainerInputRef = useRef<((note: string) => void) | null>(null);
  const registerTrainerInput = useCallback((handler: ((note: string) => void) | null) => {
    trainerInputRef.current = handler;
  }, []);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState(DEFAULT_VOLUME_DB);
  const [sustainActive, setSustainActive] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  // A digital piano usually has its own speakers, so app sound for MIDI is optional
  const [midiSound, setMidiSound] = useState(true);

  const recorderRef = useRef<{
    recordNoteDown: (note: string, velocity: number) => void;
    recordNoteUp: (note: string) => void;
  }>({ recordNoteDown: () => {}, recordNoteUp: () => {} });

  /** Hands a played note to the open tab: written down, or checked by the game / practice */
  const sendToMode = useCallback(
    (note: string, origin: NoteOrigin) => {
      if (trainerOpen) trainerInputRef.current?.(note);
      // The microphone hears one note at a time, so either key of a pair completes it
      else if (activity === 'game') gamePress(note, origin === 'mic');
      // The microphone hears one note at a time, so any note of a chord completes it
      else if (activity === 'practice') practicePress(note, origin === 'mic');
      else if (activity === 'chords') chordPress(note, origin === 'mic');
      else if (activity === 'sheet') sheetNoteDown(note);
    },
    [trainerOpen, activity, gamePress, practicePress, chordPress, sheetNoteDown]
  );

  const handleNoteDown = useCallback(
    (note: string, velocity: number, origin: NoteOrigin) => {
      if (!piano.isLoaded) return;
      // A digital piano usually has its own speakers
      if (origin !== 'midi' || midiSound) playNote(note, velocity);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.add(note);
        return next;
      });
      recorderRef.current.recordNoteDown(note, velocity);
      // Only the chosen input is checked; the others still play sound
      if (origin === inputSource || origin === 'playback') sendToMode(note, origin);
    },
    [piano.isLoaded, midiSound, playNote, inputSource, sendToMode]
  );

  const handleNoteUp = useCallback(
    (note: string) => {
      if (!piano.isLoaded) return;
      releaseNote(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      recorderRef.current.recordNoteUp(note);
      // Not gated by input, so a note still held when the input changes is closed on the sheet
      sheetNoteUp(note);
    },
    [piano.isLoaded, releaseNote, sheetNoteUp]
  );

  const handlePlaybackNoteDown = useCallback(
    (note: string, velocity: number) => handleNoteDown(note, velocity, 'playback'),
    [handleNoteDown]
  );

  const recorder = useRecorder(handlePlaybackNoteDown, handleNoteUp);
  useEffect(() => {
    recorderRef.current = recorder;
  }, [recorder]);

  const handleMouseNoteDown = useCallback(
    (note: string) => {
      if (!piano.isLoaded) {
        piano.init();
        return;
      }
      handleNoteDown(note, 0.7, 'keyboard');
    },
    [piano, handleNoteDown]
  );

  // Last note the microphone handed on, so only that one is closed on the sheet
  const micNoteRef = useRef<string | null>(null);

  // Experimental full-chord check for the microphone; the detector is created below
  const [micChordCheck, setMicChordCheck] = useState(false);
  const hasNotesRef = useRef<((notes: string[], anyOctave?: boolean) => boolean) | null>(null);
  const chordMissRef = useRef({ target: '', misses: 0 });
  const CHORD_CHECK_TRIES = 3;
  const chordTarget =
    activity === 'practice'
      ? practice.currentStep?.notes
      : activity === 'game'
        ? game.currentStep?.notes.map((n) => n.note)
        : activity === 'chords'
          ? chordGame.card?.notes
          : undefined;

  const handleMicNoteOn = useCallback(
    (note: string) => {
      if (inputSource !== 'mic' || isAppEcho(note)) return;
      micNoteRef.current = note;
      if (micChordCheck && !trainerOpen && chordTarget && chordTarget.length > 1) {
        // Chord games accept the chord in any octave and inversion
        const heard = hasNotesRef.current?.(chordTarget, activity === 'chords');
        const key = chordTarget.join('+');
        const tries = chordMissRef.current.target === key ? chordMissRef.current.misses : 0;
        if (heard) {
          chordMissRef.current = { target: '', misses: 0 };
          if (activity === 'chords') {
            // The microphone can't tell inversions apart, so a heard chord counts in any voicing
            chordPress(chordTarget[0], true);
            return;
          }
          const press = activity === 'game' ? gamePress : practicePress;
          chordTarget.forEach((n) => press(n, false));
          return;
        }
        chordMissRef.current = { target: key, misses: tries + 1 };
        // After a few tries the chord isn't being heard: fall back to one correct note
        if (tries + 1 < CHORD_CHECK_TRIES) return;
      }
      sendToMode(note, 'mic');
    },
    [inputSource, isAppEcho, sendToMode, micChordCheck, trainerOpen, chordTarget, activity, gamePress, chordPress, practicePress]
  );

  const handleMicNoteOff = useCallback(
    (note: string) => {
      if (micNoteRef.current !== note) return;
      micNoteRef.current = null;
      sheetNoteUp(note);
    },
    [sheetNoteUp]
  );

  const pitch = usePitchDetector({ onNoteOn: handleMicNoteOn, onNoteOff: handleMicNoteOff });
  const { start: startPitch, current: pitchNow, isListening: pitchListening, error: pitchError } = pitch;
  // Singing exercises read the live pitch and may switch the microphone on
  const trainerMic = useMemo(
    () => ({ current: pitchNow, isListening: pitchListening, error: pitchError, start: () => void startPitch() }),
    [pitchNow, pitchListening, pitchError, startPitch]
  );
  const { hasNotes } = pitch;
  useEffect(() => {
    hasNotesRef.current = hasNotes;
  }, [hasNotes]);

  const handleSustainToggle = useCallback(() => {
    setSustainActive((prev) => {
      const next = !prev;
      sustainRef.current = next;
      if (next) {
        piano.pedalDown();
      } else {
        piano.pedalUp();
      }
      return next;
    });
  }, [piano]);

  const handleSustainChange = useCallback(
    (down: boolean) => {
      setSustainActive(down);
      sustainRef.current = down;
      if (down) piano.pedalDown();
      else piano.pedalUp();
    },
    [piano]
  );

  const handleMidiNoteDown = useCallback(
    (note: string, velocity: number) => handleNoteDown(note, velocity, 'midi'),
    [handleNoteDown]
  );

  const midi = useMidiInput({
    onNoteDown: handleMidiNoteDown,
    onNoteUp: handleNoteUp,
    onSustain: handleSustainChange,
  });

  const handleInputChange = useCallback(
    (next: InputSource) => {
      if (next === inputSource) return;
      if (inputSource === 'mic') pitch.stop();
      if (next === 'mic') pitch.start();
      if (next === 'midi') midi.connect();
      setInputSource(next);
    },
    [inputSource, pitch, midi, setInputSource]
  );

  // A saved microphone choice starts listening once the user has clicked Start
  // (browsers keep audio suspended until then)
  const { isLoaded } = piano;
  const { start: startListening } = pitch;
  const micResumedRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || micResumedRef.current) return;
    micResumedRef.current = true;
    if (inputSource === 'mic') startListening();
  }, [isLoaded, inputSource, startListening]);

  // Plugging in a piano switches from the virtual keyboard to it
  const [midiDeviceCount, setMidiDeviceCount] = useState(0);
  if (midi.devices.length !== midiDeviceCount) {
    setMidiDeviceCount(midi.devices.length);
    if (midiDeviceCount === 0 && inputSource === 'keyboard') setInputSource('midi');
  }

  const handleVolumeChange = useCallback(
    (db: number) => {
      setVolume(db);
      piano.setVolume(db);
    },
    [piano]
  );

  const handleKeyboardNoteDown = useCallback(
    (note: string, velocity: number) => {
      if (!piano.isLoaded) return;
      handleNoteDown(note, velocity, 'keyboard');
    },
    [piano.isLoaded, handleNoteDown]
  );

  useKeyboardInput({
    onNoteDown: handleKeyboardNoteDown,
    onNoteUp: handleNoteUp,
    onSustainToggle: handleSustainToggle,
    enabled: piano.isLoaded,
  });

  const gameHints = game.hintNotes;
  const chordHints = chordGame.hintNotes;
  const hintNotes = useMemo(() => {
    if (activity === 'game') return new Set(gameHints);
    if (activity === 'practice') return practice.hintNotes;
    if (activity === 'chords') return new Set(chordHints);
    return undefined;
  }, [activity, gameHints, practice.hintNotes, chordHints]);
  const isQuizzing =
    (activity === 'game' && game.status === 'playing') ||
    (activity === 'practice' && practice.status === 'playing') ||
    (activity === 'chords' && chordGame.status === 'playing');

  const { configure: configureGame, quit: quitGame } = game;
  const { configure: configurePractice, stop: stopPractice } = practice;
  const { configure: configureChords, quit: quitChords } = courseChords;
  /** Sets up the game or song a lesson or workout activity runs in */
  const prepareActivity = useCallback(
    (lesson: CourseLesson) => {
      const a = lesson.activity;
      if (a.type === 'ear') return;
      if (a.type !== 'song') stopPractice();
      if (a.type === 'reading') configureGame(a.staves, a.level);
      else if (a.type === 'chords') configureChords(a.level);
      else {
        configurePractice({
          songId: a.songId,
          choice: a.hands,
          pace: a.pace,
          tempo: a.tempo ?? 100,
          // Checkpoints test reading: keys only light up after mistakes
          showKeys: lesson.kind !== 'checkpoint',
        });
      }
    },
    [stopPractice, configureGame, configureChords, configurePractice]
  );
  const openLesson = useCallback(
    (lesson: CourseLesson) => {
      if (lesson.activity.type === 'ear') {
        setTrainerEntry({ skill: lesson.activity.skill, lessonId: lesson.activity.lessonId, courseLessonId: lesson.id });
        setTrainerOpen(true);
        return;
      }
      prepareActivity(lesson);
      setCourseView({ type: 'lesson', lesson });
    },
    [prepareActivity]
  );
  const openWorkout = useCallback(
    (index: number) => {
      prepareActivity(workout[index]);
      setCourseView({ type: 'workout', index });
    },
    [prepareActivity, workout]
  );
  const leaveLesson = useCallback(() => {
    stopPractice();
    if (activity === 'game') quitGame();
    if (activity === 'chords') quitChords();
    setCourseView(null);
  }, [stopPractice, quitGame, quitChords, activity]);

  const { recordStars, markTheory } = course;
  const { markDone: markWorkoutDone } = workoutStore;
  const lessonId = courseView?.type === 'lesson' ? courseView.lesson.id : null;
  const workoutIndex = courseView?.type === 'workout' ? courseView.index : null;
  const handleLessonFinish = useCallback(
    (stars: number) => {
      if (lessonId) recordStars(lessonId, stars);
      if (workoutIndex !== null) markWorkoutDone(workoutIndex);
    },
    [lessonId, workoutIndex, recordStars, markWorkoutDone]
  );

  let courseScreen;
  if (courseView?.type === 'theory') {
    courseScreen = (
      <TheoryLessonView
        key={courseView.id}
        lessonId={courseView.id}
        playNote={playNote}
        releaseNote={releaseNote}
        onFinish={() => {
          markTheory(courseView.id);
          setCourseView(null);
        }}
        onBack={() => setCourseView(null)}
      />
    );
  } else if (viewLesson) {
    const place = findCourseLesson(viewLesson.id);
    const isWorkout = courseView?.type === 'workout';
    const index = workoutIndex ?? 0;
    // The next workout activity still to do, wherever it is in the list
    const nextWorkout = workout.findIndex((_, i) => i !== index && !workoutStore.done.includes(i));
    courseScreen = (
      <CourseLessonView
        key={viewLesson.id}
        lesson={viewLesson}
        kicker={
          isWorkout
            ? `Daily workout · ${index + 1} of ${workout.length}`
            : place
              ? `${place.track.title} · Unit ${place.unitNumber} · ${
                  viewLesson.kind === 'checkpoint' ? 'Checkpoint' : `Lesson ${place.number}`
                }`
              : ''
        }
        isWorkout={isWorkout}
        next={isWorkout ? workout[nextWorkout] : nextCourseLesson(viewLesson.id)}
        nextLabel={isWorkout ? 'Next activity →' : undefined}
        game={game}
        practice={practice}
        chordGame={courseChords}
        inputSource={inputSource}
        bestStars={isWorkout ? (workoutStore.done.includes(index) ? 1 : 0) : (course.stars[viewLesson.id] ?? 0)}
        onFinish={handleLessonFinish}
        onNext={(l) => (isWorkout ? openWorkout(nextWorkout) : openLesson(l))}
        onBack={leaveLesson}
      />
    );
  } else {
    courseScreen = (
      <CoursePath
        stars={course.stars}
        skipped={course.skipped}
        theoryDone={course.theory}
        workout={workout}
        workoutDone={workoutStore.done}
        streak={workoutStore.streak}
        bestStreak={workoutStore.best}
        onOpen={openLesson}
        onOpenWorkout={openWorkout}
        onOpenTheory={(id) => setCourseView({ type: 'theory', id })}
        onSkip={course.skipLessons}
        onReset={course.resetProgress}
      />
    );
  }

  return (
    <div className={styles.app}>
      <Header onOpenTrainer={() => setTrainerOpen(true)} />

      {trainerOpen && (
        <EarTrainer
          playNote={playNote}
          releaseNote={releaseNote}
          registerPianoInput={registerTrainerInput}
          inputSource={inputSource}
          mic={trainerMic}
          entry={trainerEntry}
          onEntryResult={(stars) => {
            if (trainerEntry) course.recordStars(trainerEntry.courseLessonId, stars);
          }}
          onClose={() => {
            setTrainerOpen(false);
            setTrainerEntry(null);
            // Singing exercises may have switched the microphone on
            if (inputSource !== 'mic') pitch.stop();
          }}
        />
      )}

      {!piano.isLoaded && (
        <div className={styles.overlay}>
          {piano.isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading piano samples...</p>
            </div>
          ) : (
            <button className={styles.startBtn} onClick={() => piano.init()}>
              Click to Start
            </button>
          )}
        </div>
      )}

      <div className={styles.sheetWrapper}>
        <InputSelector
          source={inputSource}
          onChange={handleInputChange}
          pitch={pitch}
          midi={midi}
          chordCheck={micChordCheck}
          onToggleChordCheck={() => setMicChordCheck((c) => !c)}
        />
        <div className={styles.tabs}>
          <button
            className={mode === 'sheet' ? styles.tabActive : ''}
            onClick={() => setMode('sheet')}
          >
            Sheet Music
          </button>
          <button
            className={mode === 'game' ? styles.tabActive : ''}
            onClick={() => setMode('game')}
          >
            Note Game
          </button>
          <button
            className={mode === 'practice' ? styles.tabActive : ''}
            onClick={() => setMode('practice')}
          >
            Song Practice
          </button>
          <button
            className={mode === 'chords' ? styles.tabActive : ''}
            onClick={() => setMode('chords')}
          >
            Chords
          </button>
          <button
            className={mode === 'course' ? styles.tabActive : ''}
            onClick={() => setMode('course')}
          >
            Course
          </button>
        </div>
        {mode === 'sheet' ? (
          <SheetMusic
            notes={sheet.notes}
            isWriting={sheet.isWriting}
            bpm={sheet.bpm}
            onBpmChange={sheet.setBpm}
            grid={sheet.grid}
            onGridChange={sheet.setGrid}
            onToggleWriting={sheet.toggleWriting}
            onClear={sheet.clear}
          />
        ) : mode === 'game' ? (
          <NoteGame game={game} />
        ) : mode === 'practice' ? (
          <SongPractice practice={practice} inputSource={inputSource} />
        ) : mode === 'chords' ? (
          <ChordGame game={chordPractice} />
        ) : (
          courseScreen
        )}
      </div>

      <div className={styles.pianoWrapper}>
        <div className={styles.pianoBody}>
          <PianoKeyboard
            activeNotes={activeNotes}
            detectedNote={pitch.current?.note}
            hintNotes={hintNotes}
            fingerMarks={activity === 'game' ? game.fingerMarks : activity === 'practice' ? practice.fingerMarks : undefined}
            // Note names would give the answers away mid-round
            showLabels={showLabels && !isQuizzing}
            onNoteDown={handleMouseNoteDown}
            onNoteUp={handleNoteUp}
          />
        </div>
      </div>

      <div className={styles.detectorWrapper}>
        <NoteDetector
          isListening={pitch.isListening}
          current={pitch.current}
          history={pitch.history}
          error={pitch.error}
          onStart={pitch.start}
          onStop={pitch.stop}
        />
      </div>

      <div className={styles.controlsWrapper}>
        <Controls
          volume={volume}
          onVolumeChange={handleVolumeChange}
          sustainActive={sustainActive}
          onSustainToggle={handleSustainToggle}
          isRecording={recorder.isRecording}
          isPlaying={recorder.isPlaying}
          hasRecording={recorder.hasRecording}
          onRecord={recorder.startRecording}
          onStopRecording={recorder.stopRecording}
          onPlay={recorder.playRecording}
          onStopPlayback={recorder.stopPlayback}
          showLabels={showLabels}
          onToggleLabels={() => setShowLabels((p) => !p)}
          midi={midi}
          midiSound={midiSound}
          onToggleMidiSound={() => setMidiSound((p) => !p)}
        />
      </div>
    </div>
  );
}
