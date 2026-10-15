import type { DetectedNote } from '../../hooks/usePitchDetector';
import type { InputSource } from '../../hooks/useInputSource';
import type { SequencePlayer } from '../../hooks/useSequencePlayer';
import type { Labels } from '../../utils/earTraining/skills';

/** The microphone's live pitch, for singing exercises */
export interface MicInfo {
  current: DetectedNote | null;
  isListening: boolean;
  error: string | null;
  /** Starts listening (asks for permission the first time) */
  start: () => void;
}

/** What every trainer module (play by ear, dictation…) gets from the trainer shell */
export interface ModuleProps {
  player: SequencePlayer;
  playNote: (note: string, velocity?: number) => void;
  releaseNote: (note: string) => void;
  /** Hands the module a handler for notes played on the piano (MIDI, computer keys or mic), or takes it back with null */
  registerPianoInput: (handler: ((note: string) => void) | null) => void;
  inputSource: InputSource;
  mic: MicInfo;
  labels: Labels;
  /** Light up keys while sounds play */
  lightKeys: boolean;
  /** Counts one finished exercise toward stats, XP and badges; `kind` is 'play' or 'dictation' */
  onRecord: (kind: 'play' | 'dictation', correct: boolean) => void;
  onBack: () => void;
}
