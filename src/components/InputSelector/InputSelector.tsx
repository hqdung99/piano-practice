import type { ReactNode } from 'react';
import type { InputSource } from '../../hooks/useInputSource';
import type { UseMidiInputReturn } from '../../hooks/useMidiInput';
import type { UsePitchDetectorReturn } from '../../hooks/usePitchDetector';
import styles from './InputSelector.module.css';

interface InputSelectorProps {
  source: InputSource;
  onChange: (source: InputSource) => void;
  pitch: UsePitchDetectorReturn;
  midi: UseMidiInputReturn;
  /** Experimental: chords must be heard in full through the microphone */
  chordCheck: boolean;
  onToggleChordCheck: () => void;
}

const OPTIONS: { value: InputSource; label: string; title: string }[] = [
  {
    value: 'keyboard',
    label: 'Virtual keyboard',
    title: 'Click the on-screen keys or use your computer keyboard',
  },
  {
    value: 'mic',
    label: 'Microphone',
    title: 'Listen to a real piano through the microphone',
  },
  {
    value: 'midi',
    label: 'MIDI cable',
    title: 'Connect a digital piano with a USB / MIDI cable',
  },
];

function MicStatus({
  pitch,
  chordCheck,
  onToggleChordCheck,
}: {
  pitch: UsePitchDetectorReturn;
  chordCheck: boolean;
  onToggleChordCheck: () => void;
}) {
  if (pitch.error) {
    return (
      <>
        <span className={styles.error}>{pitch.error}</span>
        <button className={styles.btn} onClick={pitch.start}>
          Try again
        </button>
      </>
    );
  }
  if (!pitch.isListening) {
    return (
      <>
        <span className={styles.dot} />
        <span>Microphone is off</span>
        <button className={styles.btn} onClick={pitch.start}>
          Start listening
        </button>
      </>
    );
  }
  return (
    <>
      <span className={`${styles.dot} ${styles.dotLive}`} />
      <span>Listening — play your piano</span>
      <span className={`${styles.heard} ${pitch.current ? '' : styles.heardIdle}`}>
        {pitch.current?.note ?? '—'}
      </span>
      <label
        className={styles.tip}
        title="Experimental: listens for every note of a chord in the sound. If it can't hear them after 3 tries, one correct note counts."
      >
        <input type="checkbox" checked={chordCheck} onChange={onToggleChordCheck} /> Check full chords (experimental)
      </label>
      {!chordCheck && <span className={styles.tip}>For chords, one correct note counts</span>}
    </>
  );
}

function MidiStatus({ midi }: { midi: UseMidiInputReturn }) {
  if (!midi.supported) {
    return <span className={styles.error}>MIDI isn’t supported in this browser — try Chrome or Edge</span>;
  }
  if (midi.status !== 'ready') {
    return (
      <>
        <span className={styles.dot} />
        <button
          className={styles.btn}
          onClick={midi.connect}
          disabled={midi.status === 'connecting'}
        >
          {midi.status === 'connecting' ? 'Connecting…' : 'Connect MIDI'}
        </button>
        {midi.error && <span className={styles.error}>{midi.error}</span>}
      </>
    );
  }
  if (midi.devices.length === 0) {
    return (
      <>
        <span className={styles.dot} />
        <span>Plug in your piano via USB</span>
      </>
    );
  }
  const selected = midi.devices.find((d) => d.id === midi.deviceId);
  return (
    <>
      <span className={`${styles.dot} ${styles.dotLive}`} />
      <span>
        Connected: {selected?.name ?? midi.devices.map((d) => d.name).join(', ')}
      </span>
    </>
  );
}

export function InputSelector({ source, onChange, pitch, midi, chordCheck, onToggleChordCheck }: InputSelectorProps) {
  let status: ReactNode;
  if (source === 'mic') {
    status = <MicStatus pitch={pitch} chordCheck={chordCheck} onToggleChordCheck={onToggleChordCheck} />;
  } else if (source === 'midi') status = <MidiStatus midi={midi} />;
  else status = <span>Click the keys below or use your computer keyboard</span>;

  return (
    <div className={styles.bar}>
      <span className={styles.label}>Input</span>
      <div className={styles.segmented} role="radiogroup" aria-label="Input source">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={source === o.value}
            className={source === o.value ? styles.selected : ''}
            title={o.title}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className={styles.status}>{status}</div>
    </div>
  );
}
