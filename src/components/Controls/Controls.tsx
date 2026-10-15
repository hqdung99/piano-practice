import { VolumeSlider } from './VolumeSlider';
import { SustainToggle } from './SustainToggle';
import { RecorderControls } from './RecorderControls';
import { MidiControls } from './MidiControls';
import type { UseMidiInputReturn } from '../../hooks/useMidiInput';
import styles from './Controls.module.css';

interface ControlsProps {
  volume: number;
  onVolumeChange: (db: number) => void;
  sustainActive: boolean;
  onSustainToggle: () => void;
  isRecording: boolean;
  isPlaying: boolean;
  hasRecording: boolean;
  onRecord: () => void;
  onStopRecording: () => void;
  onPlay: () => void;
  onStopPlayback: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  midi: UseMidiInputReturn;
  midiSound: boolean;
  onToggleMidiSound: () => void;
}

export function Controls({
  volume,
  onVolumeChange,
  sustainActive,
  onSustainToggle,
  isRecording,
  isPlaying,
  hasRecording,
  onRecord,
  onStopRecording,
  onPlay,
  onStopPlayback,
  showLabels,
  onToggleLabels,
  midi,
  midiSound,
  onToggleMidiSound,
}: ControlsProps) {
  return (
    <div className={styles.controls}>
      <VolumeSlider value={volume} onChange={onVolumeChange} />
      <SustainToggle active={sustainActive} onToggle={onSustainToggle} />
      <RecorderControls
        isRecording={isRecording}
        isPlaying={isPlaying}
        hasRecording={hasRecording}
        onRecord={onRecord}
        onStop={onStopRecording}
        onPlay={onPlay}
        onStopPlayback={onStopPlayback}
      />
      <MidiControls midi={midi} soundOn={midiSound} onToggleSound={onToggleMidiSound} />
      <div className={styles.controlGroup}>
        <label className={styles.label}>Labels</label>
        <button
          className={`${styles.toggleBtn} ${showLabels ? styles.toggleActive : ''}`}
          onClick={onToggleLabels}
        >
          {showLabels ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
