import { useEffect, useRef, useState, type RefObject, type PointerEvent } from 'react';
import { Maximize, Minimize, Menu, X, RotateCw } from 'lucide-react';
import './fullscreen.css';

function phoneViewport() {
  return matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) <= 600;
}
type Orientation = ScreenOrientation & { lock?: (value: string) => Promise<void> };

export function useGameFullscreen(
  surface: RefObject<HTMLElement | null>,
  playing: boolean,
  game = 'flappy',
) {
  const [phone, setPhone] = useState(phoneViewport);
  const [enabled, setEnabled] = useState(phoneViewport);
  const [visible, setVisible] = useState(true);
  const [portrait, setPortrait] = useState(innerHeight > innerWidth);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const native = useRef(false);
  function hide() {
    clearTimeout(timer.current);
    setVisible(false);
  }
  function reveal(event?: PointerEvent) {
    // Touching the board must never summon controls over the next tap.
    if (
      event &&
      (event.pointerType !== 'mouse' || !(event.target as HTMLElement).closest('.local-controls'))
    )
      return;
    setVisible(true);
    clearTimeout(timer.current);
    if (playing) timer.current = setTimeout(hide, phone ? 1100 : 1800);
  }
  useEffect(() => {
    const measure = () => {
      const viewport = window.visualViewport;
      const width = viewport?.width ?? innerWidth,
        height = viewport?.height ?? innerHeight;
      if (viewport && Math.abs(viewport.scale - 1) > 0.05) return;
      const root = surface.current;
      root?.style.setProperty('--game-width', `${Math.round(width)}px`);
      root?.style.setProperty('--game-height', `${Math.round(height)}px`);
      root?.style.setProperty('--game-top', `${viewport?.offsetTop || 0}px`);
      setPhone(phoneViewport());
      setPortrait(height > width);
    };
    measure();
    addEventListener('resize', measure);
    visualViewport?.addEventListener('resize', measure);
    visualViewport?.addEventListener('scroll', measure);
    return () => {
      removeEventListener('resize', measure);
      visualViewport?.removeEventListener('resize', measure);
      visualViewport?.removeEventListener('scroll', measure);
    };
  }, [surface]);
  useEffect(() => {
    if (!enabled) return;
    const element = surface.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const changed = () => {
      if (native.current && !document.fullscreenElement) {
        native.current = false;
        setEnabled(false);
      }
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
      if (document.fullscreenElement === element) void document.exitFullscreen().catch(() => {});
      (screen.orientation as Orientation)?.unlock?.();
    };
  }, [enabled]);
  useEffect(() => {
    if (playing && enabled) hide();
    else reveal();
    return () => clearTimeout(timer.current);
  }, [playing, enabled]);
  async function enter() {
    setEnabled(true);
    try {
      if (!document.fullscreenElement && surface.current?.requestFullscreen) {
        await surface.current.requestFullscreen();
        native.current = true;
      }
      if (phone)
        await (screen.orientation as Orientation)?.lock?.(
          game === 'pikachu' ? 'landscape' : 'portrait',
        );
    } catch {
      /* Safari uses the measured in-page fullscreen fallback. */
    }
  }
  async function toggle() {
    if (enabled) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setEnabled(false);
    } else await enter();
  }
  return {
    phone,
    enabled,
    enter,
    hide,
    orientationReady: !phone || game !== 'pikachu' || !portrait,
    className: `${phone ? ' phone-game' : ''}${enabled ? ` game-fullscreen ${playing ? 'is-playing' : ''} ${visible ? '' : 'controls-hidden'}` : phone ? ' phone-game-gate' : ''}`,
    reveal,
    button: (
      <button className="secondary fullscreen-toggle" onClick={() => void toggle()}>
        {enabled ? <Minimize size={18} /> : <Maximize size={18} />}
        {enabled ? 'Thu nhỏ' : 'Toàn màn hình'}
      </button>
    ),
    orientationHint:
      enabled && phone && game === 'pikachu' && portrait ? (
        <div className="orientation-hint">
          <RotateCw size={26} />
          <strong>Xoay ngang để chơi Pikachu</strong>
          <span>Bàn 16 × 9 sẽ vừa màn hình.</span>
        </div>
      ) : null,
    menu: enabled ? (
      <button
        className="fullscreen-menu"
        aria-label={visible ? 'Ẩn điều khiển' : 'Hiện điều khiển'}
        aria-expanded={visible}
        onClick={() => {
          clearTimeout(timer.current);
          setVisible((current) => !current);
        }}
      >
        {visible ? <X size={21} /> : <Menu size={21} />}
      </button>
    ) : null,
  };
}
