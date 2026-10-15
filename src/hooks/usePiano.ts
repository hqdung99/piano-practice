import { useCallback, useRef, useState } from 'react';
import { Piano } from '@tonejs/piano/build/piano/Piano';
import * as Tone from 'tone';
import { DEFAULT_VOLUME_DB } from '../utils/constants';

export interface UsePianoReturn {
  init: () => Promise<void>;
  keyDown: (note: string, velocity?: number) => void;
  keyUp: (note: string) => void;
  pedalDown: () => void;
  pedalUp: () => void;
  setVolume: (db: number) => void;
  stopAll: () => void;
  isLoaded: boolean;
  isLoading: boolean;
}

export function usePiano(): UsePianoReturn {
  const pianoRef = useRef<Piano | null>(null);
  const volumeRef = useRef<Tone.Volume | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const init = useCallback(async () => {
    if (pianoRef.current || isLoading) return;
    setIsLoading(true);

    await Tone.start();

    const vol = new Tone.Volume(DEFAULT_VOLUME_DB).toDestination();
    volumeRef.current = vol;

    const piano = new Piano({
      velocities: 5,
      release: true,
      pedal: true,
    });
    piano.connect(vol);
    await piano.load();

    pianoRef.current = piano;
    setIsLoaded(true);
    setIsLoading(false);
  }, [isLoading]);

  const keyDown = useCallback((note: string, velocity = 0.7) => {
    pianoRef.current?.keyDown({ note, velocity });
  }, []);

  const keyUp = useCallback((note: string) => {
    pianoRef.current?.keyUp({ note });
  }, []);

  const pedalDown = useCallback(() => {
    pianoRef.current?.pedalDown();
  }, []);

  const pedalUp = useCallback(() => {
    pianoRef.current?.pedalUp();
  }, []);

  const setVolume = useCallback((db: number) => {
    if (volumeRef.current) {
      volumeRef.current.volume.value = db;
    }
  }, []);

  const stopAll = useCallback(() => {
    pianoRef.current?.stopAll();
  }, []);

  return {
    init,
    keyDown,
    keyUp,
    pedalDown,
    pedalUp,
    setVolume,
    stopAll,
    isLoaded,
    isLoading,
  };
}
