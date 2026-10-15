import { useCallback, useEffect, useRef, useState } from 'react';
import { detectPitch, frequencyToNote, getRms } from '../utils/pitchDetection';
import { noteToMidi } from '../utils/earTraining/theory';

export interface DetectedNote {
  note: string;
  midi: number;
  frequency: number;
  cents: number;
}

interface UsePitchDetectorOptions {
  /** A new note started sounding (also fires when the same key is struck again) */
  onNoteOn?: (note: string) => void;
  /** The reported note stopped or was replaced by another */
  onNoteOff?: (note: string) => void;
}

export interface UsePitchDetectorReturn {
  start: () => Promise<void>;
  stop: () => void;
  isListening: boolean;
  /** Currently sounding note, or null when silent / unclear */
  current: DetectedNote | null;
  /** Most recent distinct notes, newest last */
  history: string[];
  error: string | null;
  /**
   * Experimental: whether every one of `notes` is sounding right now, judged
   * from the spectrum. With `anyOctave`, each note's letter may be in any octave.
   */
  hasNotes: (notes: string[], anyOctave?: boolean) => boolean;
}

const FFT_SIZE = 4096;
const DETECT_INTERVAL_MS = 40;
const MIN_RMS = 0.01;
const MIN_CLARITY = 0.85;
// Number of consecutive detections of the same note before we report it.
// Three frames skips the noisy hammer attack, which games would score as a wrong note.
const STABLE_FRAMES = 3;
const HISTORY_LENGTH = 16;
// A jump in loudness over the recent quietest frame marks a new key strike,
// so repeated notes (C C G G) are reported as separate presses
const ONSET_RATIO = 1.8;
const ONSET_WINDOW = 3;
const ONSET_REFRACTORY_MS = 150;
// A note counts as sounding when its fundamental (or 2nd harmonic) stands this far
// above the noise floor, and isn't far below the loudest partial
const NOTE_ABOVE_FLOOR_DB = 20;
const NOTE_BELOW_PEAK_DB = 30;

export function usePitchDetector({ onNoteOn, onNoteOff }: UsePitchDetectorOptions = {}): UsePitchDetectorReturn {
  const [isListening, setIsListening] = useState(false);
  const [current, setCurrent] = useState<DetectedNote | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  // Note currently reported to onNoteOn, released on stop
  const reportedRef = useRef<string | null>(null);
  const handlersRef = useRef({ onNoteOn, onNoteOff });

  useEffect(() => {
    handlersRef.current = { onNoteOn, onNoteOff };
  }, [onNoteOn, onNoteOff]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    contextRef.current?.close();
    contextRef.current = null;
    analyserRef.current = null;
    if (reportedRef.current) handlersRef.current.onNoteOff?.(reportedRef.current);
    reportedRef.current = null;
    setIsListening(false);
    setCurrent(null);
  }, []);

  const start = useCallback(async () => {
    if (contextRef.current) return;
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Voice processing distorts musical pitch
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone access denied');
      return;
    }

    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    context.createMediaStreamSource(stream).connect(analyser);

    contextRef.current = context;
    analyserRef.current = analyser;
    streamRef.current = stream;
    setIsListening(true);

    const buffer = new Float32Array(FFT_SIZE);
    const recentRms: number[] = [];
    let lastDetect = 0;
    let lastOnset = 0;
    let candidateMidi = -1;
    let candidateCount = 0;
    let reportedMidi = -1;

    const release = () => {
      if (reportedRef.current) handlersRef.current.onNoteOff?.(reportedRef.current);
      reportedRef.current = null;
      reportedMidi = -1;
    };

    const tick = (time: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (time - lastDetect < DETECT_INTERVAL_MS) return;
      lastDetect = time;

      analyser.getFloatTimeDomainData(buffer);
      const rms = getRms(buffer);

      const quietest = recentRms.length ? Math.min(...recentRms) : 0;
      recentRms.push(rms);
      if (recentRms.length > ONSET_WINDOW) recentRms.shift();
      const isOnset =
        rms >= MIN_RMS * 2 &&
        rms > quietest * ONSET_RATIO &&
        time - lastOnset > ONSET_REFRACTORY_MS;
      if (isOnset) {
        lastOnset = time;
        // Start over so a re-struck note is reported again
        release();
        candidateMidi = -1;
        candidateCount = 0;
      }

      const pitch = rms >= MIN_RMS ? detectPitch(buffer, context.sampleRate) : null;

      if (!pitch || pitch.clarity < MIN_CLARITY) {
        candidateMidi = -1;
        candidateCount = 0;
        if (reportedMidi !== -1) {
          release();
          setCurrent(null);
        }
        return;
      }

      const { note, midi, cents } = frequencyToNote(pitch.frequency);
      if (midi === candidateMidi) {
        candidateCount++;
      } else {
        candidateMidi = midi;
        candidateCount = 1;
      }
      if (candidateCount < STABLE_FRAMES) return;

      if (midi !== reportedMidi) {
        release();
        reportedMidi = midi;
        reportedRef.current = note;
        setHistory((prev) => [...prev, note].slice(-HISTORY_LENGTH));
        handlersRef.current.onNoteOn?.(note);
      }
      setCurrent({ note, midi, frequency: pitch.frequency, cents });
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => stop, [stop]);

  const hasNotes = useCallback((notes: string[], anyOctave = false) => {
    const analyser = analyserRef.current;
    const context = contextRef.current;
    if (!analyser || !context) return false;
    const bins = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(bins);
    const hz = context.sampleRate / analyser.fftSize;
    const lo = Math.floor(50 / hz);
    const hi = Math.floor(4000 / hz);
    const band = Array.from(bins.slice(lo, hi));
    const floor = [...band].sort((a, b) => a - b)[Math.floor(band.length / 2)];
    const peak = Math.max(...band);
    const levelAt = (f: number) => {
      const b = Math.round(f / hz);
      return Math.max(bins[b - 1] ?? -Infinity, bins[b] ?? -Infinity, bins[b + 1] ?? -Infinity);
    };
    const sounding = (midi: number) => {
      const f = 440 * 2 ** ((midi - 69) / 12);
      const level = Math.max(levelAt(f), levelAt(2 * f) - 3);
      return level > floor + NOTE_ABOVE_FLOOR_DB && level > peak - NOTE_BELOW_PEAK_DB;
    };
    return notes.every((note) => {
      const midi = noteToMidi(note);
      if (midi === undefined) return false;
      if (!anyOctave) return sounding(midi);
      // Octaves 2 to 5 cover where chords are usually played
      return [2, 3, 4, 5].some((octave) => sounding((octave + 1) * 12 + (midi % 12)));
    });
  }, []);

  return { start, stop, isListening, current, history, error, hasNotes };
}
