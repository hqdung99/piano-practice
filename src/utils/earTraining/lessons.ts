import { SKILLS } from './skills';
import { COMPOUND_INTERVAL_IDS, DIATONIC_NUMERALS, PROGRESSIONS, RHYTHMS, SCALES, SIMPLE_INTERVAL_IDS } from './theory';
import type { PracticeConfig, SkillId } from './skills';

export interface IntroSlide {
  title: string;
  body: string;
  /** Answers the slide lets you hear */
  examples?: string[];
}

export interface Lesson {
  id: string;
  kind: 'intro' | 'lesson' | 'checkpoint';
  title: string;
  subtitle: string;
  /** Overrides on the skill's practice defaults */
  config?: Partial<PracticeConfig>;
  /** Answers to listen to before the quiz; defaults to all of the lesson's answers */
  focus?: string[];
  questions?: number;
  slides?: IntroSlide[];
}

/** Lowest first-try score that completes a lesson */
export const PASS_PERCENT = 80;

export function starsFor(percent: number): number {
  if (percent >= 100) return 3;
  if (percent >= 90) return 2;
  if (percent >= PASS_PERCENT) return 1;
  return 0;
}

const LESSON_QUESTIONS = 10;
const CHECKPOINT_QUESTIONS = 15;

function lesson(id: string, title: string, subtitle: string, items: string[], extra: Partial<Lesson> = {}): Lesson {
  return { id, kind: 'lesson', title, subtitle, questions: LESSON_QUESTIONS, ...extra, config: { timeLimit: 0, ...extra.config, items } };
}

function checkpoint(id: string, title: string, subtitle: string, items: string[], config: Partial<PracticeConfig> = {}): Lesson {
  return { id, kind: 'checkpoint', title, subtitle, questions: CHECKPOINT_QUESTIONS, config: { timeLimit: 15, ...config, items } };
}

function intro(skill: SkillId, subtitle: string, slides: IntroSlide[]): Lesson {
  return { id: `${skill}-intro`, kind: 'intro', title: `Intro: ${SKILLS[skill].trainerTitle}`, subtitle, slides };
}

const WHITE = ['0', '2', '4', '5', '7', '9', '11'];
const ALL_PITCHES = Array.from({ length: 12 }, (_, i) => String(i));
const DIATONIC = ['0', '2', '4', '5', '7', '9', '11'];
// Early pitch lessons play C first, so each note is heard against home
const WITH_C = { reference: 0 };

export const LESSONS: Record<SkillId, Lesson[]> = {
  compare: [
    intro('compare', 'Telling higher from lower.', [
      { title: 'Up or down?', body: 'Every melody moves up, down or stays put. Hearing which way it goes is the first step to playing by ear.' },
      { title: 'Two notes', body: 'You will hear two notes. Is the second one higher, lower or the same? Start with big jumps, then the gaps get smaller.', examples: ['higher', 'lower'] },
    ]),
    lesson('cmp-1', 'Big Jumps', 'Higher or lower, far apart.', ['higher', 'lower']),
    lesson('cmp-2', 'Same or Different', 'Sometimes the note repeats.', ['higher', 'lower', 'same'], { focus: ['same'] }),
    lesson('cmp-3', 'Closer Together', 'Smaller steps, up or down.', ['higher', 'lower', 'same'], { config: { difficulty: 'medium' } }),
    checkpoint('cmp-cp1', 'Half Steps', 'The smallest step on the piano.', ['higher', 'lower', 'same'], { difficulty: 'hard' }),
  ],
  contour: [
    intro('contour', 'Following the shape of a melody.', [
      { title: 'Melodies have shapes', body: 'Three notes can climb, fall, rise and fall like a hill, or dip like a valley. Picture the line as you listen.', examples: ['up-up', 'up-down'] },
    ]),
    lesson('ctr-1', 'Climbing & Falling', 'Up-up vs down-down.', ['up-up', 'down-down']),
    lesson('ctr-2', 'Hills & Valleys', 'Up-down vs down-up.', ['up-down', 'down-up']),
    lesson('ctr-3', 'All Four Shapes', 'Big steps.', ['up-up', 'down-down', 'up-down', 'down-up']),
    checkpoint('ctr-cp1', 'Small Steps', 'All four shapes, close together.', ['up-up', 'down-down', 'up-down', 'down-up'], { difficulty: 'hard' }),
  ],
  pitch: [
    intro('pitch', 'What pitch training is and how it works.', [
      { title: 'Every note has a colour', body: 'Pitch training teaches you to name a note just by hearing it. Each note has its own character, and with practice you start to recognise it like a familiar voice.' },
      { title: 'Start from home', body: 'Early lessons play middle C before every question. Hear the question note against C and ask: how far from home is it?', examples: ['0'] },
      { title: 'Answer your way', body: 'Tap a note name, or play the note on the keyboard, your MIDI piano or into the microphone — any octave counts.', examples: ['0', '7'] },
    ]),
    lesson('pitch-1', 'Home & the Fifth', 'C and G. The strongest pair.', ['0', '7'], { config: WITH_C }),
    lesson('pitch-2', 'The Major Third', 'Add E. Now you have a chord.', ['0', '4', '7'], { config: WITH_C, focus: ['4'] }),
    lesson('pitch-3', 'Pentatonic Start', 'Add D and A. No wrong notes.', ['0', '2', '4', '7', '9'], { config: WITH_C, focus: ['2', '9'] }),
    lesson('pitch-4', 'The 4th & 7th', 'Add F and B. The tension notes.', WHITE, { config: WITH_C, focus: ['5', '11'] }),
    checkpoint('pitch-cp1', 'Middle C Major', 'All white keys, middle octave.', WHITE, WITH_C),
    lesson('pitch-5', 'F♯ (bright & tense)', 'Bright and sharp.', [...WHITE, '6'], { config: WITH_C, focus: ['5', '6', '7'] }),
    lesson('pitch-6', 'B♭ (smooth & bluesy)', 'Smooth and flat.', [...WHITE, '6', '10'], { config: WITH_C, focus: ['9', '10', '11'] }),
    lesson('pitch-7', 'E♭ & A♭ (dark & warm)', 'The minor colours.', [...WHITE, '3', '6', '8', '10'], { config: WITH_C, focus: ['3', '8'] }),
    lesson('pitch-8', 'D♭ (the last one)', 'All twelve notes.', ALL_PITCHES, { config: WITH_C, focus: ['0', '1', '2'] }),
    checkpoint('pitch-cp2', 'Chromatic', 'All twelve notes, middle octave.', ALL_PITCHES, WITH_C),
    lesson('pitch-9', 'Low Register', 'The same notes, an octave down.', ALL_PITCHES, { config: { ...WITH_C, octave: 'low' }, focus: ['0', '4', '7'] }),
    lesson('pitch-10', 'High Register', 'The same notes, an octave up.', ALL_PITCHES, { config: { ...WITH_C, octave: 'high' }, focus: ['0', '4', '7'] }),
    checkpoint('pitch-cp3', 'No Reference', 'All twelve notes, no C to lean on.', ALL_PITCHES),
  ],
  intervals: [
    intro('intervals', 'What interval recognition is and how it works.', [
      { title: 'The distance between notes', body: 'An interval is the gap between two notes. Melodies are built from intervals, so hearing them lets you work out tunes by ear.' },
      { title: 'Start with the pillars', body: 'The octave (P8), fifth (P5) and fourth (P4) are the most stable intervals. You will learn them first, then fill in the rest.', examples: ['P8', 'P5', 'P4'] },
      { title: 'Up and down', body: 'Intervals can go up (ascending) or down (descending). The same interval feels different in each direction, so you will practise both.' },
    ]),
    lesson('int-1', 'Octave vs 5th', 'The same note higher up vs stable and powerful.', ['P8', 'P5']),
    lesson('int-2', 'Perfect 4th (P4)', 'Stable but wants to move.', ['P4', 'P5', 'P8'], { focus: ['P4'] }),
    lesson('int-3', 'Anchors, Top Down', 'P8, P5, P4, descending.', ['P4', 'P5', 'P8'], { config: { direction: 'desc' } }),
    checkpoint('int-cp1', 'Perfect Intervals', 'P4, P5, P8, up or down.', ['P4', 'P5', 'P8'], { direction: 'mixed' }),
    lesson('int-4', 'Major 3rd (M3)', 'Bright and happy.', ['M3', 'P4', 'P5', 'P8'], { focus: ['M3'] }),
    lesson('int-5', 'Minor 3rd (m3)', 'Sad and soft.', ['m3', 'M3'], { focus: ['m3', 'M3'] }),
    lesson('int-6', 'Thirds & Fifths', 'm3, M3, P4, P5.', ['m3', 'M3', 'P4', 'P5']),
    checkpoint('int-cp2', 'Thirds', 'm3 to P8, up or down.', ['m3', 'M3', 'P4', 'P5', 'P8'], { direction: 'mixed' }),
    lesson('int-7', 'Seconds', 'Steps: m2 and M2.', ['m2', 'M2', 'm3', 'M3'], { focus: ['m2', 'M2'] }),
    lesson('int-8', 'Sixths', 'Wide and sweet: m6 and M6.', ['m6', 'M6', 'P5', 'P8'], { focus: ['m6', 'M6'] }),
    lesson('int-9', 'Sevenths', 'Almost an octave: m7 and M7.', ['m7', 'M7', 'M6', 'P8'], { focus: ['m7', 'M7'] }),
    lesson('int-10', 'The Tritone (A4)', 'Unstable, right in the middle.', ['A4', 'P4', 'P5'], { focus: ['A4'] }),
    checkpoint('int-cp3', 'All Intervals Up', 'Every interval, ascending.', ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8']),
    checkpoint('int-cp4', 'All Intervals', 'Every interval, up or down.', ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'], { direction: 'mixed' }),
    lesson('int-11', 'Together: Perfect Intervals', 'Both notes at once: P4, P5, P8.', ['P4', 'P5', 'P8'], { config: { playStyle: 'harmonic' } }),
    lesson('int-12', 'Together: Thirds & Sixths', 'Sweet harmonies: m3, M3, m6, M6.', ['m3', 'M3', 'm6', 'M6'], { config: { playStyle: 'harmonic' } }),
    lesson('int-13', 'Together: Clashes', 'Seconds, sevenths and the tritone.', ['m2', 'M2', 'A4', 'm7', 'M7'], { config: { playStyle: 'harmonic' } }),
    checkpoint('int-cp5', 'Harmonic Intervals', 'Every interval, both notes together.', SIMPLE_INTERVAL_IDS, { playStyle: 'harmonic' }),
    lesson('int-14', 'Wider than an Octave', 'Ninths and tenths: an octave plus a step or a third.', ['m9', 'M9', 'm10', 'M10'], { focus: ['M9', 'M10'] }),
    lesson('int-15', 'Elevenths & Twelfths', 'An octave plus a 4th or 5th.', ['P11', 'P12', 'M10', 'P15'], { focus: ['P11', 'P12'] }),
    lesson('int-16', 'Thirteenths', 'An octave plus a 6th.', ['m13', 'M13', 'P12', 'P15'], { focus: ['m13', 'M13'] }),
    checkpoint('int-cp6', 'Compound Intervals', 'Ninths to two octaves, up or down.', COMPOUND_INTERVAL_IDS, { direction: 'mixed' }),
  ],
  chords: [
    intro('chords', 'What chord recognition is and how it works.', [
      { title: 'The colour of a chord', body: 'Chords are three or more notes played together. Their quality — major, minor and so on — gives them a mood, whatever note they start on.' },
      { title: 'Happy and sad', body: 'Major chords sound bright and stable; minor chords sound darker. Almost everything else is built on this contrast.', examples: ['maj', 'min'] },
      { title: 'Then add colour', body: 'Later you will meet diminished and augmented triads, and the five seventh chords used in jazz and pop.' },
    ]),
    lesson('chord-1', 'Happy vs Sad', 'Major vs minor.', ['maj', 'min']),
    lesson('chord-2', 'Diminished Triad', 'Tense, scary, unstable.', ['maj', 'min', 'dim'], { focus: ['dim'] }),
    lesson('chord-3', 'Augmented Triad', 'Dreamy, floating, unresolved.', ['maj', 'min', 'aug'], { focus: ['aug'] }),
    lesson('chord-4', 'The Weird Ones', 'Diminished vs augmented.', ['dim', 'aug']),
    checkpoint('chord-cp1', 'Basic Triads', 'Major, minor, diminished, augmented.', ['maj', 'min', 'dim', 'aug']),
    lesson('chord-5', 'Dominant vs Major 7th', 'Bluesy pull vs smooth glow.', ['dom7', 'maj7']),
    lesson('chord-6', 'Minor 7th', 'Mellow and soulful.', ['maj7', 'min7', 'dom7'], { focus: ['min7'] }),
    lesson('chord-7', 'The Diminished Sevenths', 'Half-diminished vs fully diminished.', ['hdim7', 'dim7']),
    checkpoint('chord-cp2', 'Seventh Chords', 'All five sevenths.', ['maj7', 'min7', 'dom7', 'hdim7', 'dim7']),
    checkpoint('chord-cp3', 'Every Chord', 'All nine qualities.', ['maj', 'min', 'aug', 'dim', 'maj7', 'min7', 'dom7', 'hdim7', 'dim7']),
    lesson('chord-8', 'Suspended Chords', 'No third: open and unresolved.', ['maj', 'sus2', 'sus4'], { focus: ['sus2', 'sus4'] }),
    lesson('chord-9', 'Sixth Chords', 'Major and minor with an added 6th.', ['6', 'm6', 'maj7', 'min7'], { focus: ['6', 'm6'] }),
    lesson('chord-10', 'Ninth Chords', 'add9, 9, maj9 and m9: rich colour.', ['add9', '9', 'maj9', 'm9']),
    checkpoint('chord-cp4', 'Colour Chords', 'Suspended, sixth and ninth chords.', ['sus2', 'sus4', '6', 'm6', 'add9', '9', 'maj9', 'm9']),
    lesson('chord-11', 'Broken Triads', 'The same chords, one note at a time.', ['maj', 'min', 'dim', 'aug'], { config: { playStyle: 'melodic' } }),
    checkpoint('chord-cp5', 'Block or Broken', 'Every triad and seventh, played either way.', ['maj', 'min', 'aug', 'dim', 'maj7', 'min7', 'dom7', 'hdim7', 'dim7'], { playStyle: 'both' }),
  ],
  scales: [
    intro('scales', 'What scale detection is and why it matters.', [
      { title: 'The set of notes', body: 'A scale is the set of notes a melody draws from. Recognising it tells you the mood of a piece and which notes will fit when you play along.' },
      { title: 'The big contrast', body: 'Major and natural minor are the two foundations. Listen for the third note: high and bright in major, low and dark in minor.', examples: ['major', 'naturalMinor'] },
      { title: 'Modes and more', body: 'After the foundations come the modes (Dorian, Lydian…) and the pentatonic and blues scales used in rock and jazz.' },
    ]),
    lesson('scale-1', 'Major vs Natural Minor', 'The most fundamental contrast in music.', ['major', 'naturalMinor']),
    lesson('scale-2', 'Harmonic Minor', 'Natural minor with a dramatic raised 7th.', ['naturalMinor', 'harmonicMinor']),
    lesson('scale-3', 'Melodic Minor', 'The smoothest minor scale.', ['harmonicMinor', 'melodicMinor']),
    lesson('scale-4', 'The Four Together', 'Mix all four foundation scales.', ['major', 'naturalMinor', 'harmonicMinor', 'melodicMinor']),
    checkpoint('scale-cp1', 'The Foundation', 'Major, natural, harmonic and melodic minor.', ['major', 'naturalMinor', 'harmonicMinor', 'melodicMinor']),
    lesson('scale-5', 'Dorian', 'Natural minor with a brighter 6th.', ['naturalMinor', 'dorian']),
    lesson('scale-6', 'Mixolydian', 'Major with a flat 7th.', ['major', 'mixolydian']),
    lesson('scale-7', 'Lydian', 'Major with a raised 4th.', ['major', 'lydian']),
    lesson('scale-8', 'Phrygian', 'Natural minor with a dark 2nd.', ['naturalMinor', 'phrygian']),
    checkpoint('scale-cp2', 'The Modes', 'Dorian, Phrygian, Lydian, Mixolydian.', ['dorian', 'phrygian', 'lydian', 'mixolydian']),
    lesson('scale-9', 'Pentatonics', 'Five notes, major vs minor.', ['pentatonicMajor', 'pentatonicMinor']),
    lesson('scale-10', 'The Blues', 'Minor pentatonic plus the blue note.', ['pentatonicMinor', 'blues']),
    checkpoint('scale-cp3', 'Every Scale', 'All eleven scales.', ['major', 'naturalMinor', 'harmonicMinor', 'melodicMinor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'pentatonicMajor', 'pentatonicMinor', 'blues']),
    lesson('scale-11', 'Locrian', 'The darkest mode: ♭2 and ♭5.', ['phrygian', 'locrian']),
    lesson('scale-12', 'Whole Tone & Chromatic', 'No half steps vs every half step.', ['wholeTone', 'chromatic', 'major']),
    lesson('scale-13', 'Top Down', 'Scales played descending.', ['major', 'naturalMinor', 'harmonicMinor', 'dorian'], { config: { direction: 'desc' } }),
    checkpoint('scale-cp4', 'All Scales, Both Ways', 'Every scale, up or down.', SCALES.map((sc) => sc.id), { direction: 'mixed' }),
  ],
  progressions: [
    intro('progressions', 'What chord progression recognition is and how it works.', [
      { title: 'Songs are patterns', body: 'A progression is the order of chords in a song. A handful of patterns power thousands of hits, so learning them lets you work out songs by ear.' },
      { title: 'Roman numerals', body: 'Chords are named by their place in the key: I is home, IV and V are the strong neighbours, and lower-case numerals (ii, iii, vi) are minor.', examples: ['I-IV-V-I'] },
      { title: 'Follow the bass', body: 'In root position the lowest note follows the chord roots, so listen to the bass line first. Inversions come later.' },
    ]),
    lesson('prog-1', 'The 1-4-5', 'Rock, blues and country backbone.', ['I-IV-V-I', 'I-IV-I-V']),
    lesson('prog-2', 'The 4-Chord Pop', 'Hundreds of hit songs.', ['I-IV-V-I', 'I-V-vi-IV'], { focus: ['I-V-vi-IV'] }),
    lesson('prog-3', 'Modern vs 50s Pop', 'I-V-vi-IV vs I-vi-IV-V.', ['I-V-vi-IV', 'I-vi-IV-V']),
    lesson('prog-4', 'The Classic Rock iii', 'Adding the iii chord.', ['I-vi-IV-V', 'I-iii-IV-V'], { focus: ['I-iii-IV-V'] }),
    lesson('prog-5', 'Pop vs Classic Rock', 'I-V-vi-IV vs I-iii-IV-V.', ['I-V-vi-IV', 'I-iii-IV-V']),
    checkpoint('prog-cp1', 'Major Foundations', 'All five major-key progressions.', ['I-IV-V-I', 'I-V-vi-IV', 'I-vi-IV-V', 'I-iii-IV-V', 'I-IV-I-V']),
    lesson('prog-6', 'The Sad Loop', 'Minor feel, major key.', ['vi-IV-I-V', 'I-V-vi-IV'], { focus: ['vi-IV-I-V'] }),
    lesson('prog-7', 'Jazz ii-V-I', 'The jazz cadence.', ['ii-V-I', 'I-IV-V-I'], { focus: ['ii-V-I'] }),
    lesson('prog-8', 'Minor Keys', 'Epic minor vs minor cadence.', ['i-VI-III-VII', 'i-iv-i-V']),
    checkpoint('prog-cp2', 'Every Progression', 'All nine, root position.', ['I-IV-V-I', 'I-V-vi-IV', 'I-vi-IV-V', 'I-iii-IV-V', 'vi-IV-I-V', 'i-VI-III-VII', 'i-iv-i-V', 'ii-V-I', 'I-IV-I-V']),
    checkpoint('prog-cp3', 'Inversions', 'The pop four, played like a pianist would.', ['I-IV-V-I', 'I-V-vi-IV', 'I-vi-IV-V', 'vi-IV-I-V'], { voicing: 'inversions' }),
    lesson('prog-9', 'The Turnaround', 'I-vi-ii-V, the jazz-pop loop.', ['I-vi-ii-V', 'I-vi-IV-V'], { focus: ['I-vi-ii-V'] }),
    lesson('prog-10', 'Borrowed Chords', 'Chords from the parallel minor.', ['I-♭VII-IV-I', 'I-♭VI-♭VII-I', 'I-IV-iv-I']),
    lesson('prog-11', 'Secondary Dominants', 'Dominant chords that point to other chords.', ['I-V/V-V-I', 'I-V/vi-vi-IV', 'I-IV-V-I']),
    lesson('prog-12', 'Minor Journeys', 'The Andalusian cadence vs epic minor.', ['i-VII-VI-V', 'i-VI-III-VII', 'i-iv-i-V']),
    lesson('prog-13', 'Long Forms', 'The Canon and the 12-bar blues.', ['I-V-vi-iii-IV-I-IV-V', '12-bar blues', 'I-V-vi-IV']),
    checkpoint('prog-cp4', 'Progression Master', 'Every progression, voiced like a pianist.', PROGRESSIONS.map((p) => p.id), { voicing: 'inversions' }),
  ],
  degrees: [
    intro('degrees', 'Hearing notes as steps of a key.', [
      { title: 'Notes have jobs', body: 'In a key, every note has a role. 1 is home, 5 is stable, 7 pulls up to 1, 4 leans down to 3. Hearing these roles is how musicians play by ear in any key.' },
      { title: 'First, set the key', body: 'Each question starts with a short cadence (I-IV-V-I) that sets the key. Then one note plays: which step of the key is it?' },
      { title: 'Feel the pull', body: 'After you answer, the note walks home to 1 so you feel where it wants to go. Turn this off in Settings if you like.' },
    ]),
    lesson('deg-1', 'Home & Five', '1 and 5: the pillars of the key.', ['0', '7']),
    lesson('deg-2', 'The Major Third', 'Add 3: the bright note.', ['0', '4', '7'], { focus: ['4'] }),
    lesson('deg-3', 'Steps Around Home', 'Add 2 and 7, the neighbours of 1.', ['0', '2', '4', '7', '11'], { focus: ['2', '11'] }),
    lesson('deg-4', 'Four & Six', 'The last of the major scale.', DIATONIC, { focus: ['5', '9'] }),
    checkpoint('deg-cp1', 'The Major Scale', 'All seven degrees.', DIATONIC),
    lesson('deg-5', 'Minor Colours', '♭3, ♭6 and ♭7 from the minor key.', [...DIATONIC, '3', '8', '10'], { focus: ['3', '8', '10'] }),
    lesson('deg-6', 'The Last Two', '♭2 and ♯4.', ALL_PITCHES, { focus: ['1', '6'] }),
    checkpoint('deg-cp2', 'Chromatic Degrees', 'All twelve, over a drone.', ALL_PITCHES, { keyContext: 'drone' }),
    checkpoint('deg-cp3', 'Two Octaves', 'Every degree, in either octave.', ALL_PITCHES, { difficulty: 'hard' }),
  ],
  tonic: [
    intro('tonic', 'Finding home in a melody.', [
      { title: 'Every tune has a home', body: 'Melodies circle around one note, the tonic. When it returns, the tune feels finished. Finding it is the first step to working out a song.' },
      { title: 'A starting point', body: 'You will be told the first note of the tune. Use it to work out which note is home — try singing until it feels like rest.' },
    ]),
    lesson('ton-1', 'Ending at Home', 'The tune ends on the tonic.', ALL_PITCHES, { questions: 8 }),
    lesson('ton-2', 'Ending Elsewhere', 'The tune stops on 3 or 5.', ALL_PITCHES, { questions: 8, config: { difficulty: 'medium' } }),
    checkpoint('ton-cp1', 'Anywhere', 'Major or minor, ending on any note.', ALL_PITCHES, { difficulty: 'hard', timeLimit: 0 }),
  ],
  keys: [
    intro('keys', 'Hearing major and minor.', [
      { title: 'Two moods', body: 'Most music is in a major key (bright, open) or a minor key (darker, more serious). The difference comes down to a few notes, mostly the third.', examples: ['major', 'minor'] },
    ]),
    lesson('key-1', 'With Chords', 'A tune over its home chord.', ['major', 'minor']),
    lesson('key-2', 'Wandering Tunes', 'The tune ends anywhere.', ['major', 'minor'], { config: { difficulty: 'medium' } }),
    checkpoint('key-cp1', 'Melody Only', 'No chords to help.', ['major', 'minor'], { difficulty: 'hard' }),
  ],
  inversions: [
    intro('inversions', 'Which note of the chord is lowest.', [
      { title: 'Same chord, new bass', body: 'An inversion keeps the same notes but puts a different one at the bottom. Root position sounds solid; 1st inversion lighter; 2nd inversion unsettled.', examples: ['root', '1st', '2nd'] },
      { title: 'Listen low', body: 'Focus on the lowest note. Is it the root, the third or the fifth of the chord?' },
    ]),
    lesson('inv-1', 'Root vs 1st', 'Major chords.', ['root', '1st']),
    lesson('inv-2', 'Add 2nd Inversion', 'Major chords.', ['root', '1st', '2nd'], { focus: ['2nd'] }),
    lesson('inv-3', 'Minor Chords Too', 'Major and minor triads.', ['root', '1st', '2nd'], { config: { qualities: ['maj', 'min'] } }),
    checkpoint('inv-cp1', 'Triad Inversions', 'Major, minor, broken or block.', ['root', '1st', '2nd'], { qualities: ['maj', 'min'], playStyle: 'both' }),
    lesson('inv-4', 'Seventh Chords', 'Four notes: up to the 3rd inversion.', ['root', '1st', '2nd', '3rd'], { config: { qualities: ['dom7', 'maj7', 'min7'] }, focus: ['3rd'] }),
    checkpoint('inv-cp2', 'Every Inversion', 'Triads and sevenths.', ['root', '1st', '2nd', '3rd'], { qualities: ['maj', 'min', 'dom7', 'maj7', 'min7'] }),
  ],
  functions: [
    intro('functions', 'Naming chords by their place in the key.', [
      { title: 'Chords have roles too', body: 'I is home, V is tension that wants to resolve, IV moves away. Hearing these roles lets you play along with songs in any key.' },
      { title: 'Set the key first', body: 'A cadence sets the key, then one chord plays. Which numeral is it?' },
    ]),
    lesson('fn-1', 'I, IV, V', 'The three main chords.', ['I', 'IV', 'V']),
    lesson('fn-2', 'Add vi', 'The relative minor.', ['I', 'IV', 'V', 'vi'], { focus: ['vi'] }),
    lesson('fn-3', 'Add ii', 'The pre-dominant.', ['I', 'ii', 'IV', 'V', 'vi'], { focus: ['ii'] }),
    checkpoint('fn-cp1', 'Common Chords', 'I, ii, IV, V and vi.', ['I', 'ii', 'IV', 'V', 'vi']),
    lesson('fn-4', 'iii and vii°', 'The rarer two.', DIATONIC_NUMERALS, { focus: ['iii', 'vii°'] }),
    checkpoint('fn-cp2', 'Every Diatonic Chord', 'All seven, over a drone.', DIATONIC_NUMERALS, { keyContext: 'drone' }),
  ],
  bass: [
    intro('bass', 'Hearing the bass line.', [
      { title: 'The foundation', body: 'The bass note shapes how a chord feels. Bass players and pianists’ left hands follow it, so hearing it is key to playing along.' },
      { title: 'Which degree?', body: 'After the key is set, a chord plays with a bass note under it. Name the bass note as a degree of the key.' },
    ]),
    lesson('bass-1', '1, 4, 5', 'The strongest bass notes.', ['0', '5', '7']),
    lesson('bass-2', 'Add 6', 'The relative minor’s root.', ['0', '5', '7', '9'], { focus: ['9'] }),
    lesson('bass-3', 'Add 2 and 3', 'Passing notes in the bass.', ['0', '2', '4', '5', '7', '9'], { focus: ['2', '4'] }),
    checkpoint('bass-cp1', 'Every Bass Degree', 'All seven degrees.', DIATONIC),
  ],
  cadences: [
    intro('cadences', 'How musical phrases end.', [
      { title: 'Musical punctuation', body: 'A cadence ends a phrase. Authentic (V → I) is a full stop, half (→ V) a comma, plagal (IV → I) an “amen”, deceptive (V → vi) a surprise.', examples: ['authentic', 'half'] },
    ]),
    lesson('cad-1', 'Full Stop or Comma', 'Authentic vs half.', ['authentic', 'half']),
    lesson('cad-2', 'The Amen', 'Add plagal.', ['authentic', 'half', 'plagal'], { focus: ['plagal'] }),
    lesson('cad-3', 'The Surprise', 'Add deceptive.', ['authentic', 'deceptive'], { focus: ['deceptive'] }),
    checkpoint('cad-cp1', 'All Cadences', 'All four, voiced smoothly.', ['authentic', 'half', 'plagal', 'deceptive'], { voicing: 'inversions' }),
  ],
  rhythm: [
    intro('rhythm', 'Hearing note lengths.', [
      { title: 'Feel the beat', body: 'Four clicks count you in, then a one-bar rhythm plays. Tap along and match it to the notation.', examples: ['qqqq', 'hh'] },
    ]),
    lesson('rhy-1', 'Long & Short', 'Wholes, halves and quarters.', ['w', 'hh', 'qqqq', 'hqq']),
    lesson('rhy-2', 'Dotted & Rests', 'Dotted halves and quarter rests.', ['h.q', 'qrqr', 'qhq', 'qqh']),
    lesson('rhy-3', 'Eighth Notes', 'Two to a beat.', ['eeqqq', 'qqeeq', 'qeeqee', 'e8']),
    checkpoint('rhy-cp1', 'Basic Rhythms', 'Halves, quarters and eighths.', ['hh', 'qqqq', 'hqq', 'qhq', 'eeqqq', 'qeeqee', 'e8']),
    lesson('rhy-4', 'Dotted Quarters', 'Long-short patterns.', ['q.eh', 'q.eq.e', 'eqeh']),
    lesson('rhy-5', 'Sixteenths', 'Four to a beat.', ['ssssqqq', 'qssssqq', 'esseqq'], { config: { tempo: 60 } }),
    checkpoint('rhy-cp2', 'Every Rhythm', 'All patterns at a steady tempo.', RHYTHMS.map((r) => r.id), { tempo: 80 }),
  ],
  dynamics: [
    intro('dynamics', 'Loud, soft and in between.', [
      { title: 'Volume tells a story', body: 'Pianists shape music with how hard they press the keys: forte (loud), piano (soft), crescendo (growing) and diminuendo (fading).', examples: ['loud', 'soft'] },
    ]),
    lesson('dyn-1', 'Loud or Soft', 'Forte vs piano.', ['loud', 'soft']),
    lesson('dyn-2', 'Growing & Fading', 'Crescendo vs diminuendo.', ['cresc', 'dim']),
    checkpoint('dyn-cp1', 'All Dynamics', 'Closer together.', ['loud', 'soft', 'cresc', 'dim'], { difficulty: 'medium' }),
  ],
  articulation: [
    intro('articulation', 'How the notes are touched.', [
      { title: 'Touch', body: 'Legato notes are smooth and connected; staccato notes are short and detached; accents make some notes stand out.', examples: ['legato', 'staccato'] },
    ]),
    lesson('art-1', 'Smooth or Short', 'Legato vs staccato.', ['legato', 'staccato']),
    checkpoint('art-cp1', 'With Accents', 'Legato, staccato and accented.', ['legato', 'staccato', 'accent']),
  ],
};

export function findLesson(skill: SkillId, lessonId: string): Lesson | undefined {
  return LESSONS[skill].find((l) => l.id === lessonId);
}

export function lessonConfig(skill: SkillId, lesson: Lesson): PracticeConfig {
  return { ...SKILLS[skill].defaultConfig, ...lesson.config };
}
