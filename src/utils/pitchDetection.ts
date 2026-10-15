const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Piano range: A0 (27.5 Hz) to C8 (~4186 Hz)
export const MIN_FREQUENCY = 27.5;
export const MAX_FREQUENCY = 5000;

const YIN_THRESHOLD = 0.15;

export interface DetectedPitch {
  frequency: number;
  /** 0..1, how periodic the signal is (1 = perfectly periodic) */
  clarity: number;
}

export interface NoteFromFrequency {
  note: string;
  midi: number;
  /** Deviation from the exact note pitch, -50..50 */
  cents: number;
}

/**
 * Monophonic pitch detection using the YIN algorithm.
 * Returns null when no clear pitch is found.
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): DetectedPitch | null {
  const minTau = Math.floor(sampleRate / MAX_FREQUENCY);
  const maxTau = Math.min(Math.floor(sampleRate / MIN_FREQUENCY), Math.floor(buffer.length / 2));
  const windowSize = buffer.length - maxTau;

  // Step 1-2: difference function
  const diff = new Float32Array(maxTau + 1);
  for (let tau = minTau; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < windowSize; i++) {
      const d = buffer[i] - buffer[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }

  // Step 3: cumulative mean normalized difference
  const cmnd = new Float32Array(maxTau + 1);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    runningSum += diff[tau];
    cmnd[tau] = tau < minTau || runningSum === 0 ? 1 : (diff[tau] * tau) / runningSum;
  }

  // Step 4: absolute threshold — first dip below threshold, then walk to its local minimum
  let tauEstimate = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (cmnd[tau] < YIN_THRESHOLD) {
      while (tau + 1 <= maxTau && cmnd[tau + 1] < cmnd[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }
  if (tauEstimate === -1) return null;

  // Step 5: parabolic interpolation for sub-sample accuracy
  let betterTau = tauEstimate;
  if (tauEstimate > minTau && tauEstimate < maxTau) {
    const s0 = cmnd[tauEstimate - 1];
    const s1 = cmnd[tauEstimate];
    const s2 = cmnd[tauEstimate + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) betterTau = tauEstimate + (s2 - s0) / denom;
  }

  return {
    frequency: sampleRate / betterTau,
    clarity: 1 - cmnd[tauEstimate],
  };
}

export function getRms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

export function frequencyToNote(frequency: number): NoteFromFrequency {
  const exactMidi = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(exactMidi);
  const octave = Math.floor(midi / 12) - 1;
  return {
    note: `${NOTE_NAMES[((midi % 12) + 12) % 12]}${octave}`,
    midi,
    cents: Math.round((exactMidi - midi) * 100),
  };
}
