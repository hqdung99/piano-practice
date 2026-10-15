import styles from './Controls.module.css';

interface RecorderControlsProps {
  isRecording: boolean;
  isPlaying: boolean;
  hasRecording: boolean;
  onRecord: () => void;
  onStop: () => void;
  onPlay: () => void;
  onStopPlayback: () => void;
}

export function RecorderControls({
  isRecording,
  isPlaying,
  hasRecording,
  onRecord,
  onStop,
  onPlay,
  onStopPlayback,
}: RecorderControlsProps) {
  return (
    <div className={styles.controlGroup}>
      <label className={styles.label}>Record</label>
      <div className={styles.buttonRow}>
        {isRecording ? (
          <button className={`${styles.btn} ${styles.btnStop}`} onClick={onStop}>
            <span className={styles.stopIcon} /> Stop
          </button>
        ) : (
          <button
            className={`${styles.btn} ${styles.btnRecord}`}
            onClick={onRecord}
            disabled={isPlaying}
          >
            <span className={styles.recordIcon} /> Rec
          </button>
        )}
        {isPlaying ? (
          <button className={`${styles.btn} ${styles.btnStop}`} onClick={onStopPlayback}>
            <span className={styles.stopIcon} /> Stop
          </button>
        ) : (
          <button
            className={`${styles.btn} ${styles.btnPlay}`}
            onClick={onPlay}
            disabled={!hasRecording || isRecording}
          >
            <span className={styles.playIcon} /> Play
          </button>
        )}
      </div>
    </div>
  );
}
