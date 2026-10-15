import { noteToMidi } from '../../utils/earTraining/theory';

/** MIDI range covering every note in the lists, padded to whole octaves */
export function rangeOf(noteLists: string[][], fallback: [number, number] = [48, 83]): [number, number] {
  const midis = noteLists.flat().map((n) => noteToMidi(n)).filter((m): m is number => m !== undefined);
  if (!midis.length) return fallback;
  let lo = Math.min(...midis);
  let hi = Math.max(...midis);
  // At least two octaves, so a single note still shows its neighbours
  while (hi - lo < 23) {
    lo -= 6;
    hi += 6;
  }
  return [Math.max(21, lo), Math.min(108, hi)];
}
