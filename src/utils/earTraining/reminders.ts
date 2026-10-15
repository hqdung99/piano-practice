import type { SkillId } from './skills';

/**
 * Well-known tunes that start with (or are built on) an answer, to help it stick.
 * Intervals have separate lists for going up and down.
 */
const INTERVAL_UP: Record<string, string[]> = {
  m2: ['Jaws theme', 'Für Elise'],
  M2: ['Happy Birthday', 'Silent Night'],
  m3: ['Greensleeves', 'Smoke on the Water'],
  M3: ['Oh When the Saints', 'Kumbaya'],
  P4: ['Here Comes the Bride', 'Amazing Grace'],
  A4: ['The Simpsons', 'Maria (West Side Story)'],
  P5: ['Twinkle, Twinkle', 'Star Wars theme'],
  m6: ['The Entertainer (3rd–4th notes)', 'Love Story theme'],
  M6: ['My Bonnie Lies over the Ocean', 'NBC chimes'],
  m7: ['Star Trek theme', 'Somewhere (West Side Story)'],
  M7: ['Take On Me (chorus)'],
  P8: ['Somewhere over the Rainbow', 'Singin’ in the Rain'],
};

const INTERVAL_DOWN: Record<string, string[]> = {
  m2: ['Joy to the World', 'Für Elise (1st notes)'],
  M2: ['Mary Had a Little Lamb', 'Three Blind Mice'],
  m3: ['Hey Jude', 'This Old Man'],
  M3: ['Swing Low, Sweet Chariot', 'Beethoven’s 5th'],
  P4: ['O Come, All Ye Faithful', 'Born Free'],
  A4: ['Black Sabbath (riff)'],
  P5: ['The Flintstones'],
  M6: ['Nobody Knows the Trouble I’ve Seen', 'Over There'],
  m7: ['Watermelon Man'],
  M7: ['I Love You (Cole Porter)'],
  P8: ['Willow Weep for Me'],
};

const PROGRESSION_SONGS: Record<string, string[]> = {
  'I-IV-V-I': ['Twist and Shout', 'La Bamba', 'Wild Thing'],
  'I-V-vi-IV': ['Let It Be', 'Someone Like You', 'With or Without You'],
  'I-vi-IV-V': ['Stand by Me', 'Earth Angel', 'Every Breath You Take'],
  'vi-IV-I-V': ['Zombie', 'Numb'],
  'ii-V-I': ['Autumn Leaves', 'Fly Me to the Moon'],
  'I-vi-ii-V': ['I Got Rhythm', 'Blue Moon', 'Heart and Soul'],
  'i-VII-VI-V': ['Hit the Road Jack', 'Runaway', 'Stray Cat Strut'],
  'I-♭VII-IV-I': ['Sweet Child o’ Mine (verse)', 'Hey Jude (coda)'],
  'I-♭VI-♭VII-I': ['the Super Mario level-clear tune'],
  'I-IV-iv-I': ['Creep (IV → iv)'],
  'I-V/V-V-I': ['Take the “A” Train'],
  'I-V-vi-iii-IV-I-IV-V': ['Pachelbel’s Canon', 'Basket Case'],
  '12-bar blues': ['Johnny B. Goode', 'Hound Dog', 'Pride and Joy'],
};

const CHORD_MOODS: Record<string, string> = {
  maj: 'Bright, stable, happy.',
  min: 'Darker, sad or serious.',
  aug: 'Dreamy, floating, unresolved.',
  dim: 'Tense, spooky, wants to move.',
  maj7: 'Smooth, jazzy glow.',
  min7: 'Mellow, soulful.',
  dom7: 'Bluesy pull back home.',
  hdim7: 'Sad tension, leads to V in minor.',
  dim7: 'Horror-movie suspense.',
  sus2: 'Open and airy, no third.',
  sus4: 'Hanging, wants to fall to the third.',
  '6': 'Sweet, old-fashioned ending chord.',
  m6: 'Mysterious, spy-movie minor.',
  add9: 'Sparkly major, pop ballad colour.',
  '9': 'Funky, full dominant.',
  maj9: 'Lush, neo-soul.',
  m9: 'Smooth R&B minor.',
};

const CADENCE_HINTS: Record<string, string> = {
  authentic: 'Feels finished, like a full stop. Ends of hymns and pop choruses.',
  half: 'Feels like a question or a comma: it stops on V.',
  plagal: 'The “Amen” at the end of hymns.',
  deceptive: 'You expect home, and land on a minor chord instead.',
};

/** A short memory hook for an answer, or null if there is none */
export function reminderFor(skill: SkillId, item: string, direction: 'asc' | 'desc' = 'asc'): string | null {
  switch (skill) {
    case 'intervals': {
      const songs = (direction === 'desc' ? INTERVAL_DOWN : INTERVAL_UP)[item];
      return songs ? `Like ${songs.join(' or ')}` : null;
    }
    case 'progressions': {
      const songs = PROGRESSION_SONGS[item];
      return songs ? `Heard in ${songs.join(', ')}` : null;
    }
    case 'chords':
      return CHORD_MOODS[item] ?? null;
    case 'cadences':
      return CADENCE_HINTS[item] ?? null;
    default:
      return null;
  }
}
