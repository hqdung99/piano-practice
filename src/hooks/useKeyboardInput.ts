import { useEffect, useRef } from 'react';
import { getNoteFromKey } from '../utils/noteMapping';
import { DEFAULT_VELOCITY } from '../utils/constants';

interface UseKeyboardInputProps {
  onNoteDown: (note: string, velocity: number) => void;
  onNoteUp: (note: string) => void;
  onSustainToggle: () => void;
  enabled: boolean;
}

export function useKeyboardInput({
  onNoteDown,
  onNoteUp,
  onSustainToggle,
  enabled,
}: UseKeyboardInputProps) {
  const pressedKeys = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        onSustainToggle();
        return;
      }

      const note = getNoteFromKey(e.key);
      if (note && !pressedKeys.current.has(e.key)) {
        pressedKeys.current.add(e.key);
        onNoteDown(note, DEFAULT_VELOCITY);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        return;
      }

      const note = getNoteFromKey(e.key);
      if (note && pressedKeys.current.has(e.key)) {
        pressedKeys.current.delete(e.key);
        onNoteUp(note);
      }
    };

    const handleBlur = () => {
      pressedKeys.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, onNoteDown, onNoteUp, onSustainToggle]);
}
