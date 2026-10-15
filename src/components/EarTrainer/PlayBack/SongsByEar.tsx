import { useEffect, useMemo, useRef, useState } from 'react';
import { exerciseDef, phraseQuestion, songMelody, songPhrases } from '../../../utils/earTraining/playback';
import type { Phrase, PlayOptions, PlayResult } from '../../../utils/earTraining/playback';
import { midiToNote } from '../../../utils/earTraining/theory';
import { useSongLibrary } from '../../../utils/songLibrary';
import type { SongSource } from '../../../utils/songs';
import { parseSong, segmentKey } from '../../../utils/songPractice';
import type { ParsedSong } from '../../../utils/songPractice';
import { renderGrandStaff } from '../../../utils/renderGrandStaff';
import type { Staff } from '../../../utils/renderGrandStaff';
import type { ModuleProps } from '../types';
import { TopBar } from '../TopBar';
import { Chevron, SpeakerIcon } from '../Icons';
import { rangeOf } from '../keyRange';
import { EchoRun } from './EchoRun';
import { RunResults } from './RunResults';
import { Pill, Section, Segmented } from './shared';
import { useEchoRun } from './useEchoRun';
import styles from '../EarTrainer.module.css';
import css from './PlayBack.module.css';

const COLORS = { correct: '#2e9e4f', missed: '#d9822b', inactive: '#b5b5b5' };

const GROUPS: { title: string; matches: (s: SongSource) => boolean }[] = [
  { title: 'Songs', matches: (s) => !s.category || s.category === 'song' },
  { title: 'Imported', matches: (s) => s.category === 'imported' },
  { title: 'Exercises', matches: (s) => s.category === 'exercise' || s.category === 'chords' },
];

interface Prepared {
  song: ParsedSong;
  phrases: Phrase[];
  range: [number, number];
}

/** Parses a song for playing by ear; null when it can't be read or has no tune */
function prepare(source: SongSource): Prepared | null {
  try {
    const song = parseSong(source);
    const phrases = songPhrases(song);
    if (phrases.length === 0) return null;
    const range = rangeOf([songMelody(song).map((n) => midiToNote(n.midi))]);
    return { song, phrases, range };
  } catch {
    return null;
  }
}

/** The song's grand staff, its tune colored by how each phrase went */
function SongSheet({ prepared, results }: { prepared: Prepared; results: PlayResult[] }) {
  const paperRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  const { song, phrases } = prepared;

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

  const phraseOf = useMemo(() => {
    const map = new Map<string, number>();
    phrases.forEach((p, i) => p.notes.forEach((n) => n.refs.forEach((r) => map.set(segmentKey(r), i))));
    return map;
  }, [phrases]);

  useEffect(() => {
    if (!scoreRef.current || !fontsReady || width === 0) return;
    const colorOf = (staff: Staff, measure: number, segment: number) => {
      if (staff === 'bass') return COLORS.inactive;
      const i = phraseOf.get(segmentKey({ staff, measure, segment }));
      if (i === undefined || i >= results.length) return undefined;
      return results[i].correct ? COLORS.correct : COLORS.missed;
    };
    renderGrandStaff(scoreRef.current, song.measures, width, {
      beats: song.source.beats,
      keySignature: song.source.keySignature,
      colorOf,
    });
  }, [song, width, fontsReady, phraseOf, results]);

  return (
    <div className={css.paper} ref={paperRef}>
      <div ref={scoreRef} />
    </div>
  );
}

interface SongRunProps {
  module: ModuleProps;
  prepared: Prepared;
  anyOctave: boolean;
  onFinish: (r: PlayResult[]) => void;
  /** Back before any phrase is done */
  onLeave: () => void;
}

function SongRun({ module, prepared, anyOctave, onFinish, onLeave }: SongRunProps) {
  const { song, phrases, range } = prepared;
  const [makeQuestion] = useState(() => (i: number) => phraseQuestion(phrases[i], song.source.bpm, anyOctave, range));
  const run = useEchoRun(module, { total: phrases.length, makeQuestion, onFinish });
  return (
    <EchoRun
      run={run}
      title={song.source.title}
      inputSource={module.inputSource}
      onBack={run.results.length ? run.finish : onLeave}
      allowHint
      extra={<Pill onClick={run.finish}>Reveal sheet</Pill>}
    />
  );
}

export function SongsByEar({ module, options, onOptions, onBack }: { module: ModuleProps; options: PlayOptions; onOptions: (o: PlayOptions) => void; onBack: () => void }) {
  const library = useSongLibrary();
  const [picked, setPicked] = useState<Prepared | null>(null);
  const [phase, setPhase] = useState<'pick' | 'run' | 'results'>('pick');
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<PlayResult[]>([]);
  const title = exerciseDef('song').title;

  const prepared = useMemo(() => new Map(library.map((s) => [s.id, prepare(s)])), [library]);

  const start = (p: Prepared) => {
    setPicked(p);
    setRound((r) => r + 1);
    setPhase('run');
  };

  if (phase === 'run' && picked) {
    return (
      <SongRun
        key={round}
        module={module}
        prepared={picked}
        anyOctave={options.songAnyOctave}
        onFinish={(r) => {
          module.player.stop();
          setResults(r);
          setPhase('results');
        }}
        onLeave={() => {
          module.player.stop();
          setPhase('pick');
        }}
      />
    );
  }

  if (phase === 'results' && picked) {
    const tune = phraseQuestion(
      { notes: picked.phrases.flatMap((p) => p.notes), firstBar: 0, lastBar: 0 },
      picked.song.source.bpm,
      false,
      picked.range
    ).sound;
    return (
      <RunResults
        title={picked.song.source.title}
        results={results}
        player={module.player}
        unit="phrases"
        onRetry={() => start(picked)}
        onDone={() => setPhase('pick')}
      >
        <Section title="The sheet">
          <div className={css.pills}>
            <Pill onClick={() => module.player.play(tune)}>
              <SpeakerIcon size={16} /> Play the tune
            </Pill>
          </div>
          <SongSheet prepared={picked} results={results} />
          <p className={styles.helper}>
            <span className={css.legendGood}>Green</span> phrases you played right first time,{' '}
            <span className={css.legendMissed}>orange</span> ones that took a few tries.
          </p>
        </Section>
      </RunResults>
    );
  }

  const groups = GROUPS.map((g) => ({ ...g, songs: library.filter(g.matches) })).filter((g) => g.songs.length > 0);

  return (
    <div className={styles.screen}>
      <TopBar title={title} onBack={onBack} />
      <div className={`${styles.content} ${styles.setupContent}`}>
        <p className={css.introText}>
          Pick a song. You hear it a phrase at a time and play each one back; at the end you see the sheet music.
        </p>
        <Section title="Octave">
          <Segmented<boolean>
            options={[true, false]}
            value={options.songAnyOctave}
            onChange={(songAnyOctave) => onOptions({ ...options, songAnyOctave })}
            label={(v) => (v ? 'Any octave' : 'Exact octave')}
          />
        </Section>

        {groups.length === 0 && <p className={css.empty}>No songs yet. Import one from the song practice panel.</p>}
        {groups.map((g) => (
          <Section key={g.title} title={g.title}>
            <div className={css.songList}>
              {g.songs.map((s) => {
                const p = prepared.get(s.id) ?? null;
                return (
                  <button key={s.id} className={css.songRow} disabled={!p} onClick={() => p && start(p)}>
                    <span className={css.songText}>
                      <strong>{s.title}</strong>
                      <span>{p ? `${s.composer} · ${p.phrases.length} phrases` : 'No melody to play'}</span>
                    </span>
                    {p && <Chevron />}
                  </button>
                );
              })}
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}
