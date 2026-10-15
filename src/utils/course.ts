import type { GameLevel, GameStaves } from './noteGame';
import type { Hands } from './songPractice';
import type { ChordLevel } from './chordGame';
import type { Pace } from '../hooks/useSongPractice';
import type { SkillId } from './earTraining/skills';
import { SKILLS } from './earTraining/skills';

/** Reading notes in the Note Game, one round */
export interface ReadingActivity {
  type: 'reading';
  staves: GameStaves;
  level: GameLevel;
}

/** Playing a song or exercise in Song Practice */
export interface SongActivity {
  type: 'song';
  songId: string;
  hands: Hands;
  pace: Pace;
  /** Percent of the song's tempo, for tempo mode */
  tempo?: number;
}

/** Reading chord symbols in the Chord Game, one round */
export interface ChordsActivity {
  type: 'chords';
  level: ChordLevel;
}

/** A lesson from the ear trainer, opened in the trainer */
export interface EarActivity {
  type: 'ear';
  skill: SkillId;
  lessonId: string;
}

export type Activity = ReadingActivity | SongActivity | ChordsActivity | EarActivity;

export interface CourseLesson {
  id: string;
  kind: 'lesson' | 'checkpoint';
  title: string;
  subtitle: string;
  activity: Activity;
  /** Score needed to pass, in percent; 0 means finishing is enough */
  pass: number;
}

export interface CourseUnit {
  id: string;
  title: string;
  subtitle: string;
  lessons: CourseLesson[];
}

export type TrackId = 'soloist' | 'chords' | 'ear';

export interface CourseTrack {
  id: TrackId;
  title: string;
  subtitle: string;
  units: CourseUnit[];
}

const LESSON_PASS = 80;
const CHECKPOINT_PASS = 85;

function lesson(id: string, title: string, subtitle: string, activity: Activity): CourseLesson {
  return { id, kind: 'lesson', title, subtitle, activity, pass: LESSON_PASS };
}

function checkpoint(id: string, title: string, subtitle: string, activity: Activity): CourseLesson {
  return { id, kind: 'checkpoint', title, subtitle, activity, pass: CHECKPOINT_PASS };
}

const reading = (staves: GameStaves, level: GameLevel = 'easy'): ReadingActivity => ({ type: 'reading', staves, level });
const chords = (level: ChordLevel): ChordsActivity => ({ type: 'chords', level });
const song = (songId: string, hands: Hands, pace: Pace = 'wait', tempo?: number): SongActivity => ({
  type: 'song',
  songId,
  hands,
  pace,
  tempo,
});

/** Reading music and playing pieces with both hands */
const SOLOIST: CourseTrack = {
  id: 'soloist',
  title: 'Soloist',
  subtitle: 'Read music and play pieces with both hands.',
  units: [
    {
      id: 'u1',
      title: 'Right hand',
      subtitle: 'Middle C position and your first melodies.',
      lessons: [
        lesson('s1-read-treble', 'Reading the treble staff', 'Name C, D, E, F and G above middle C.', reading('treble')),
        lesson('s1-five-rh', 'Five fingers, five notes', 'Thumb on middle C, one finger per key.', song('ex-five-parallel', 'treble')),
        lesson('s1-mary-rh', 'Mary Had a Little Lamb', 'Your first tune, right hand only.', song('mary', 'treble')),
        checkpoint('s1-cp', 'Twinkle, Twinkle', 'A full melody with a pinky stretch to A.', song('twinkle', 'treble')),
      ],
    },
    {
      id: 'u2',
      title: 'Left hand',
      subtitle: 'The bass staff and the left-hand C position.',
      lessons: [
        lesson('s2-read-bass', 'Reading the bass staff', 'Name C, D, E, F and G below middle C.', reading('bass')),
        lesson('s2-five-lh', 'Left-hand five fingers', 'Pinky on C: the finger numbers run backwards.', song('ex-five-parallel', 'bass')),
        checkpoint('s2-cp', 'Block chords', 'Hold C and G chords with the left hand.', song('ex-mary-chords', 'bass')),
      ],
    },
    {
      id: 'u3',
      title: 'Hands together',
      subtitle: 'Reading both staves and playing with both hands.',
      lessons: [
        lesson('s3-read-both', 'Reading both staves', 'Notes jump between treble and bass.', reading('both')),
        lesson('s3-parallel', 'Five fingers, hands together', 'Both hands move the same way.', song('ex-five-parallel', 'both')),
        lesson('s3-contrary', 'Contrary motion', 'Thumbs start on C and the hands move apart.', song('ex-five-contrary', 'both')),
        checkpoint('s3-cp', 'Melody + chords', 'Mary in the right hand over left-hand chords.', song('ex-mary-chords', 'both')),
      ],
    },
    {
      id: 'u4',
      title: 'Scales and tempo',
      subtitle: 'Passing the thumb under, then keeping the beat.',
      lessons: [
        lesson('s4-scale', 'C major scale', 'Contrary motion, both thumbs pass under together.', song('ex-scale-contrary', 'both')),
        lesson('s4-tempo', 'Keeping the beat', 'Five-finger pattern with the metronome.', song('ex-five-parallel', 'both', 'tempo', 75)),
        checkpoint('s4-cp', 'Ode to Joy', 'Melody over broken chords, in time.', song('ex-ode-broken', 'both', 'tempo', 75)),
      ],
    },
  ],
};

/** Pop, rock and jazz accompaniment: chord symbols, voicings and rhythm */
const CHORDS: CourseTrack = {
  id: 'chords',
  title: 'Chords',
  subtitle: 'Accompany songs from chord symbols, the way pop and rock players do.',
  units: [
    {
      id: 'c1',
      title: 'First chords',
      subtitle: 'C, F and G: the three chords of countless songs.',
      lessons: [
        lesson('c1-read', 'Reading chord symbols', 'See C, F or G and play it.', chords('easy')),
        lesson('c1-cfg', 'Moving between chords', 'Root-position chords in the left hand.', song('ch-cfg', 'bass')),
        checkpoint('c1-cp', 'Close chords', 'Inversions keep the hand still: F/C and G/B.', song('ch-inversions', 'bass')),
      ],
    },
    {
      id: 'c2',
      title: 'Minor chords and pop',
      subtitle: 'Am, Dm and Em, and the four-chord pop progression.',
      lessons: [
        lesson('c2-read', 'Minor chord symbols', 'Add Am, Dm and Em.', chords('medium')),
        lesson('c2-pop-lh', 'Four-chord pop, left hand', 'C – G/B – Am – F/A.', song('ch-pop-four', 'bass')),
        lesson('c2-pop-both', 'Four-chord pop, both hands', 'Add the tune on top.', song('ch-pop-four', 'both')),
        checkpoint('c2-cp', 'Pop in time', 'The full progression with the metronome.', song('ch-pop-four', 'both', 'tempo', 75)),
      ],
    },
    {
      id: 'c3',
      title: 'Rhythm and arpeggios',
      subtitle: 'Bring chords to life with a beat and broken patterns.',
      lessons: [
        lesson('c3-rhythm', 'Pulse the chords', 'A chord on every beat, steady through the changes.', song('ch-rhythm', 'bass', 'tempo', 75)),
        lesson('c3-broken', 'Broken chords', 'Root – fifth – third – fifth.', song('ch-broken', 'bass')),
        lesson('c3-arp-rh', 'Arpeggios', 'Roll each chord up to the octave and back.', song('ch-arpeggio', 'treble')),
        checkpoint('c3-cp', 'Arpeggios, both hands', 'Left hand holds the root under the arpeggio.', song('ch-arpeggio', 'both')),
      ],
    },
  ],
};

const ear = (skill: SkillId, lessonId: string): EarActivity => ({ type: 'ear', skill, lessonId });

/** Listening skills, using lessons from the ear trainer */
const EAR: CourseTrack = {
  id: 'ear',
  title: 'Ear',
  subtitle: 'Train your ear to hear notes, chords and rhythm, then play what you hear.',
  units: [
    {
      id: 'e1',
      title: 'First listening',
      subtitle: 'Higher or lower, and your first notes by name.',
      lessons: [
        lesson('e1-compare', 'Higher or lower', 'Which way did the melody go?', ear('compare', 'cmp-1')),
        lesson('e1-pitch', 'Home and the fifth', 'C and G, with C as a reference.', ear('pitch', 'pitch-1')),
        lesson('e1-int', 'Octave vs fifth', 'Your first intervals.', ear('intervals', 'int-1')),
        checkpoint('e1-cp', 'Perfect intervals', 'P4, P5 and P8, up and down.', ear('intervals', 'int-cp1')),
      ],
    },
    {
      id: 'e2',
      title: 'Chords and keys',
      subtitle: 'Major and minor, and notes inside a key.',
      lessons: [
        lesson('e2-chords', 'Happy vs sad', 'Major and minor chords.', ear('chords', 'chord-1')),
        lesson('e2-keys', 'Major or minor key', 'The mood of a tune.', ear('keys', 'key-1')),
        lesson('e2-degrees', 'Scale degrees 1 and 5', 'Notes as steps of a key.', ear('degrees', 'deg-1')),
        checkpoint('e2-cp', 'Basic triads', 'Major, minor, diminished, augmented.', ear('chords', 'chord-cp1')),
      ],
    },
    {
      id: 'e3',
      title: 'Harmony and rhythm',
      subtitle: 'Chord functions, progressions and the beat.',
      lessons: [
        lesson('e3-functions', 'I, IV and V', 'The three main chords of a key.', ear('functions', 'fn-1')),
        lesson('e3-prog', 'The 1-4-5', 'Your first progression.', ear('progressions', 'prog-1')),
        lesson('e3-rhythm', 'Long and short', 'Wholes, halves and quarters.', ear('rhythm', 'rhy-1')),
        checkpoint('e3-cp', 'Major foundations', 'Five common progressions.', ear('progressions', 'prog-cp1')),
      ],
    },
  ],
};

export const TRACKS: CourseTrack[] = [SOLOIST, CHORDS, EAR];

export function trackLessons(track: TrackId): CourseLesson[] {
  return TRACKS.find((t) => t.id === track)!.units.flatMap((u) => u.lessons);
}

export const COURSE_LESSONS: CourseLesson[] = TRACKS.flatMap((t) => t.units.flatMap((u) => u.lessons));

export interface LessonPlace {
  lesson: CourseLesson;
  track: CourseTrack;
  unit: CourseUnit;
  unitNumber: number;
  /** Position in its track, from 1 */
  number: number;
}

export function findCourseLesson(id: string): LessonPlace | undefined {
  for (const track of TRACKS) {
    const lessons = trackLessons(track.id);
    for (const [u, unit] of track.units.entries()) {
      const lesson = unit.lessons.find((l) => l.id === id);
      if (lesson) return { lesson, track, unit, unitNumber: u + 1, number: lessons.indexOf(lesson) + 1 };
    }
  }
  return undefined;
}

export function nextCourseLesson(id: string): CourseLesson | undefined {
  const place = findCourseLesson(id);
  if (!place) return undefined;
  const lessons = trackLessons(place.track.id);
  return lessons[lessons.indexOf(place.lesson) + 1];
}

/** Stars for a passing score: just over the bar, 10 points above it, or perfect */
export function courseStars(percent: number, pass: number): number {
  if (percent < pass) return 0;
  if (percent >= 100) return 3;
  return percent >= Math.min(95, pass + 10) ? 2 : 1;
}

const passed = (id: string, stars: Record<string, number>) => (stars[id] ?? 0) > 0;

/** The Chords track opens once the basics (Soloist unit 1) are done */
export const CHORDS_TRACK_NEEDS = SOLOIST.units[0];

export function isTrackOpen(track: TrackId, stars: Record<string, number>): boolean {
  return track !== 'chords' || CHORDS_TRACK_NEEDS.lessons.every((l) => passed(l.id, stars));
}

/** A lesson is open once the one before it in its track has been passed */
export function isUnlocked(id: string, stars: Record<string, number>): boolean {
  const place = findCourseLesson(id);
  if (!place || !isTrackOpen(place.track.id, stars)) return false;
  const lessons = trackLessons(place.track.id);
  const i = lessons.indexOf(place.lesson);
  return i === 0 || passed(lessons[i - 1].id, stars);
}

export function describeActivity(activity: Activity): string {
  if (activity.type === 'reading') {
    const staves = { treble: 'Treble', bass: 'Bass', both: 'Both staves', together: 'Hands together' }[activity.staves];
    return `Note reading · ${staves}`;
  }
  if (activity.type === 'chords') return 'Chord symbols';
  if (activity.type === 'ear') return `Ear training · ${SKILLS[activity.skill].title}`;
  const hands = { treble: 'Right hand', bass: 'Left hand', both: 'Both hands' }[activity.hands];
  return activity.pace === 'tempo' ? `${hands} · in tempo (${activity.tempo ?? 100}%)` : `${hands} · at your own pace`;
}

// ---------- Placement ----------

export interface PlacementAnswers {
  /** 0 never played, 1 simple tunes with one hand, 2 pieces with both hands */
  playing: 0 | 1 | 2;
  /** 0 can't read music, 1 treble staff, 2 both staves */
  reading: 0 | 1 | 2;
  /** 0 no chords, 1 knows C, F and G */
  chords: 0 | 1;
}

/** Lessons a learner can skip, judging by what they already know */
export function placementSkips(a: PlacementAnswers): CourseLesson[] {
  const units: CourseUnit[] = [];
  if (a.playing >= 1 && a.reading >= 1) units.push(SOLOIST.units[0]);
  if (a.playing >= 1 && a.reading >= 2) units.push(SOLOIST.units[1]);
  if (a.playing >= 2 && a.reading >= 2) units.push(SOLOIST.units[2]);
  if (a.chords >= 1 && a.playing >= 1) units.push(CHORDS.units[0]);
  return units.flatMap((u) => u.lessons);
}

// ---------- Daily workout ----------

/** Local date as YYYY-MM-DD */
export function dayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const TECHNIQUE = ['ex-five-parallel', 'ex-five-contrary', 'ex-scale-parallel', 'ex-scale-contrary'];

/**
 * Three short activities for the day, matched to how far the learner has got:
 * a reading warm-up, a technique exercise and chord symbols (or more reading).
 */
export function dailyWorkout(day: string, stars: Record<string, number>): CourseLesson[] {
  const unitDone = (u: CourseUnit) => u.lessons.every((l) => passed(l.id, stars));
  const [u1, u2, u3] = SOLOIST.units;
  const seed = [...day].reduce((s, c) => s + c.charCodeAt(0), 0);

  const staves: GameStaves = unitDone(u3) ? 'together' : unitDone(u2) ? 'both' : unitDone(u1) ? 'bass' : 'treble';
  const level: GameLevel = unitDone(u3) ? 'medium' : 'easy';
  const hands: Hands = unitDone(u3) ? 'both' : unitDone(u2) ? 'bass' : 'treble';
  const third: Activity = isTrackOpen('chords', stars)
    ? chords(unitDone(CHORDS.units[0]) ? 'medium' : 'easy')
    : reading(staves === 'treble' ? 'treble' : 'both', 'easy');

  const make = (i: number, title: string, subtitle: string, activity: Activity): CourseLesson => ({
    id: `workout-${day}-${i}`,
    kind: 'lesson',
    title,
    subtitle,
    activity,
    pass: 0,
  });
  return [
    make(0, 'Reading warm-up', 'One round of note reading.', reading(staves, level)),
    make(1, 'Technique', 'A finger exercise, at your own pace.', song(TECHNIQUE[seed % TECHNIQUE.length], hands)),
    make(2, third.type === 'chords' ? 'Chord symbols' : 'More reading', 'Finish strong.', third),
  ];
}
