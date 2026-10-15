import { useEffect, useState } from 'react';

/** Where played notes come from when checking them in the sheet, game and practice */
export type InputSource = 'keyboard' | 'mic' | 'midi';

const STORAGE_KEY = 'piano.inputSource';
const SOURCES: InputSource[] = ['keyboard', 'mic', 'midi'];

function loadSource(): InputSource {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SOURCES.includes(saved as InputSource)) return saved as InputSource;
  } catch {
    // Storage can be blocked; fall back to the default
  }
  return 'keyboard';
}

export function useInputSource() {
  const [source, setSource] = useState<InputSource>(loadSource);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, source);
    } catch {
      // Not remembering the choice is fine
    }
  }, [source]);

  return [source, setSource] as const;
}
