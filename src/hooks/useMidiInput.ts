import { useCallback, useEffect, useRef, useState } from 'react';

export interface MidiDevice {
  id: string;
  name: string;
}

export type MidiStatus = 'off' | 'connecting' | 'ready' | 'error';

interface UseMidiInputProps {
  onNoteDown: (note: string, velocity: number) => void;
  onNoteUp: (note: string) => void;
  onSustain: (down: boolean) => void;
}

export interface UseMidiInputReturn {
  supported: boolean;
  status: MidiStatus;
  error: string | null;
  devices: MidiDevice[];
  /** 'all' listens to every connected input */
  deviceId: string;
  setDeviceId: (id: string) => void;
  connect: () => Promise<void>;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// Same range as the on-screen keyboard: A0..C8
const LOWEST_MIDI = 21;
const HIGHEST_MIDI = 108;
const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;
const SUSTAIN_CC = 64;

function midiToNote(midi: number): string | null {
  if (midi < LOWEST_MIDI || midi > HIGHEST_MIDI) return null;
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function useMidiInput({ onNoteDown, onNoteUp, onSustain }: UseMidiInputProps): UseMidiInputReturn {
  const supported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  const [status, setStatus] = useState<MidiStatus>('off');
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [deviceId, setDeviceId] = useState('all');

  const accessRef = useRef<MIDIAccess | null>(null);
  // Latest handlers and selection, read from the MIDI callback without re-binding it
  const handlersRef = useRef({ onNoteDown, onNoteUp, onSustain });
  const deviceIdRef = useRef(deviceId);
  // Notes held per input, released if that input disconnects mid-note
  const heldRef = useRef(new Map<string, Set<string>>());
  const sustainRef = useRef(false);

  useEffect(() => {
    handlersRef.current = { onNoteDown, onNoteUp, onSustain };
  }, [onNoteDown, onNoteUp, onSustain]);

  const releaseHeld = useCallback((inputId?: string) => {
    for (const [id, notes] of heldRef.current) {
      if (inputId && id !== inputId) continue;
      notes.forEach((n) => handlersRef.current.onNoteUp(n));
      heldRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    deviceIdRef.current = deviceId;
    releaseHeld();
  }, [deviceId, releaseHeld]);

  const handleMessage = useCallback((event: MIDIMessageEvent) => {
    const input = event.target as MIDIInput;
    if (deviceIdRef.current !== 'all' && input.id !== deviceIdRef.current) return;
    const data = event.data;
    if (!data || data.length < 3) return;

    const command = data[0] & 0xf0;
    const [, data1, data2] = data;
    const held = heldRef.current.get(input.id) ?? new Set<string>();
    heldRef.current.set(input.id, held);

    if (command === NOTE_ON && data2 > 0) {
      const note = midiToNote(data1);
      if (!note) return;
      held.add(note);
      handlersRef.current.onNoteDown(note, data2 / 127);
    } else if (command === NOTE_OFF || (command === NOTE_ON && data2 === 0)) {
      // Many keyboards send note-on with velocity 0 instead of note-off
      const note = midiToNote(data1);
      if (!note || !held.delete(note)) return;
      handlersRef.current.onNoteUp(note);
    } else if (command === CONTROL_CHANGE && data1 === SUSTAIN_CC) {
      const down = data2 >= 64;
      if (down === sustainRef.current) return;
      sustainRef.current = down;
      handlersRef.current.onSustain(down);
    }
  }, []);

  const syncInputs = useCallback(() => {
    const access = accessRef.current;
    if (!access) return;
    const list: MidiDevice[] = [];
    access.inputs.forEach((input) => {
      if (input.state !== 'connected') return;
      input.onmidimessage = handleMessage;
      list.push({ id: input.id, name: input.name || 'MIDI device' });
    });
    setDevices(list);
    // Fall back to all inputs if the chosen one was unplugged
    setDeviceId((id) => (id === 'all' || list.some((d) => d.id === id) ? id : 'all'));
  }, [handleMessage]);

  const connect = useCallback(async () => {
    if (!supported || accessRef.current) return;
    setStatus('connecting');
    setError(null);
    try {
      const access = await navigator.requestMIDIAccess();
      accessRef.current = access;
      access.onstatechange = (e) => {
        const port = (e as MIDIConnectionEvent).port;
        if (port?.type === 'input' && port.state === 'disconnected') releaseHeld(port.id);
        syncInputs();
      };
      syncInputs();
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof DOMException && err.name === 'SecurityError'
          ? 'MIDI access was blocked. Allow it in the browser’s site settings.'
          : 'Could not access MIDI devices.'
      );
    }
  }, [supported, syncInputs, releaseHeld]);

  // Reconnect without a prompt if the user already granted MIDI access
  useEffect(() => {
    if (!supported || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'midi' as PermissionName })
      .then((result) => {
        if (result.state === 'granted') connect();
      })
      .catch(() => {});
  }, [supported, connect]);

  useEffect(
    () => () => {
      const access = accessRef.current;
      if (!access) return;
      access.onstatechange = null;
      access.inputs.forEach((input) => {
        input.onmidimessage = null;
      });
      accessRef.current = null;
    },
    []
  );

  return { supported, status, error, devices, deviceId, setDeviceId, connect };
}
