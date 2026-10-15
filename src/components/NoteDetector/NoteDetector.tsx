import type { DetectedNote } from '../../hooks/usePitchDetector';
import styles from './NoteDetector.module.css';

interface NoteDetectorProps {
  isListening: boolean;
  current: DetectedNote | null;
  history: string[];
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

export function NoteDetector({
  isListening,
  current,
  history,
  error,
  onStart,
  onStop,
}: NoteDetectorProps) {
  const cents = current?.cents ?? 0;
  const inTune = current !== null && Math.abs(cents) <= 5;

  return (
    <div className={styles.detector}>
      <div className={styles.header}>
        <span className={styles.label}>Note Detector</span>
        <button
          className={`${styles.listenBtn} ${isListening ? styles.listening : ''}`}
          onClick={isListening ? onStop : onStart}
        >
          <span className={styles.micDot} />
          {isListening ? 'Stop Listening' : 'Listen'}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {isListening && (
        <div className={styles.body}>
          <div className={`${styles.note} ${current ? '' : styles.noteIdle}`}>
            {current?.note ?? '—'}
          </div>
          <div className={styles.freq}>
            {current ? `${current.frequency.toFixed(1)} Hz` : 'Play or sing a note…'}
          </div>

          <div className={styles.meter}>
            <div className={styles.meterCenter} />
            {current && (
              <div
                className={`${styles.needle} ${inTune ? styles.needleInTune : ''}`}
                style={{ left: `${50 + cents}%` }}
              />
            )}
          </div>
          <div className={styles.meterLabels}>
            <span>♭ -50</span>
            <span>{current ? `${cents > 0 ? '+' : ''}${cents}¢` : '0¢'}</span>
            <span>+50 ♯</span>
          </div>

          {history.length > 0 && (
            <div className={styles.history}>
              {history.map((n, i) => (
                <span key={i} className={styles.historyNote}>
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
