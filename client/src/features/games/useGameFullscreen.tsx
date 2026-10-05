import { useEffect, useRef, useState, type RefObject } from 'react';
import { Maximize, Minimize, Menu } from 'lucide-react';
import './fullscreen.css';

export function useGameFullscreen(surface: RefObject<HTMLElement | null>, playing: boolean) {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function reveal() {
    setVisible(true);
    clearTimeout(timer.current);
    if (playing) timer.current = setTimeout(() => setVisible(false), 2600);
  }
  useEffect(() => {
    if (!enabled) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const changed = () => {
      if (!document.fullscreenElement) setEnabled(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEnabled(false);
    };
    document.addEventListener('fullscreenchange', changed);
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('fullscreenchange', changed);
      document.removeEventListener('keydown', escape);
      clearTimeout(timer.current);
    };
  }, [enabled]);
  useEffect(() => {
    reveal();
    return () => clearTimeout(timer.current);
  }, [playing, enabled]);
  async function toggle() {
    if (enabled) {
      if (document.fullscreenElement) await document.exitFullscreen();
      setEnabled(false);
    } else {
      setEnabled(true);
      try {
        await surface.current?.requestFullscreen?.();
      } catch {
        /* In-page fullscreen on unsupported browsers. */
      }
    }
  }
  return {
    className: enabled
      ? ` game-fullscreen ${playing ? 'is-playing' : ''} ${visible ? '' : 'controls-hidden'}`
      : '',
    reveal,
    button: (
      <button className="secondary fullscreen-toggle" onClick={() => void toggle()}>
        {enabled ? <Minimize size={18} /> : <Maximize size={18} />}
        {enabled ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
      </button>
    ),
    menu: enabled ? (
      <button className="fullscreen-menu" aria-label="Hiện điều khiển" onClick={reveal}>
        <Menu size={21} />
      </button>
    ) : null,
  };
}
