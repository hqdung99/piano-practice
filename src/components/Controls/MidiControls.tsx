import type { UseMidiInputReturn } from '../../hooks/useMidiInput';
import styles from './Controls.module.css';

interface MidiControlsProps {
  midi: UseMidiInputReturn;
  soundOn: boolean;
  onToggleSound: () => void;
}

export function MidiControls({ midi, soundOn, onToggleSound }: MidiControlsProps) {
  if (!midi.supported) {
    return (
      <div className={styles.controlGroup}>
        <label className={styles.label}>MIDI</label>
        <span className={styles.midiNote}>Not supported in this browser — try Chrome or Edge</span>
      </div>
    );
  }

  if (midi.status !== 'ready') {
    return (
      <div className={styles.controlGroup}>
        <label className={styles.label}>MIDI</label>
        <button
          className={styles.btn}
          onClick={midi.connect}
          disabled={midi.status === 'connecting'}
          title="Connect a digital piano or keyboard over USB"
        >
          <span className={styles.midiDot} />
          {midi.status === 'connecting' ? 'Connecting…' : 'Connect'}
        </button>
        {midi.error && <span className={styles.midiError}>{midi.error}</span>}
      </div>
    );
  }

  const connected = midi.devices.length > 0;
  return (
    <div className={styles.controlGroup}>
      <label className={styles.label}>MIDI</label>
      <span
        className={`${styles.midiDot} ${connected ? styles.midiDotOn : ''}`}
        title={connected ? 'Connected' : 'No device'}
      />
      {midi.devices.length === 0 && (
        <span className={styles.midiNote}>Plug in your piano via USB</span>
      )}
      {midi.devices.length === 1 && (
        <span className={styles.midiDevice}>{midi.devices[0].name}</span>
      )}
      {midi.devices.length > 1 && (
        <select
          className={styles.midiSelect}
          value={midi.deviceId}
          onChange={(e) => midi.setDeviceId(e.target.value)}
        >
          <option value="all">All devices</option>
          {midi.devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      )}
      <button
        className={`${styles.toggleBtn} ${soundOn ? styles.toggleActive : ''}`}
        onClick={onToggleSound}
        title="Play the app's piano sound for MIDI notes. Turn off if your piano has its own speakers."
      >
        Sound {soundOn ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}
