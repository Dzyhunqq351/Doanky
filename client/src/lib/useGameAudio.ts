import { useCallback, useEffect, useRef, useState } from 'react';
export type GameSound = 'flap' | 'point' | 'hit';
export function useGameAudio() {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const context = useRef<AudioContext | null>(null);
  const buffers = useRef<Partial<Record<GameSound, AudioBuffer>>>({});
  const unlock = useCallback(() => {
    if (!context.current) {
      const ctx = new AudioContext();
      context.current = ctx;
      for (const name of ['flap', 'point', 'hit'] as const) {
        void fetch(`/flappy/audio/${name}.wav`)
          .then((r) => r.arrayBuffer())
          .then((b) => ctx.decodeAudioData(b))
          .then((b) => {
            buffers.current[name] = b;
          })
          .catch(() => {});
      }
    }
    if (context.current.state === 'suspended') void context.current.resume().catch(() => {});
  }, []);
  useEffect(() => {
    const gesture = () => unlock();
    window.addEventListener('pointerdown', gesture, { capture: true });
    window.addEventListener('keydown', gesture, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', gesture, true);
      window.removeEventListener('keydown', gesture, true);
      void context.current?.close();
      context.current = null;
      buffers.current = {};
    };
  }, [unlock]);
  const play = useCallback((name: GameSound) => {
    const ctx = context.current,
      buffer = buffers.current[name];
    if (mutedRef.current || !ctx || !buffer || ctx.state !== 'running') return;
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.55;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }, []);
  const toggle = useCallback(() => {
    unlock();
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
  }, [unlock]);
  return { muted, toggle, play };
}
