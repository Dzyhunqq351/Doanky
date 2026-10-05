import { useEffect, useRef } from 'react';
export function useKeyboard(
  active: boolean,
  bindings: Record<string, string>,
  act: (type: string) => void,
) {
  const callback = useRef(act);
  callback.current = act;
  useEffect(() => {
    if (!active) return;
    const held = new Map<string, { type: string; next: number }>();
    const down = (e: KeyboardEvent) => {
      const type = bindings[e.code];
      if (!type || (e.target as HTMLElement).closest('input,select,textarea,button')) return;
      e.preventDefault();
      if (e.repeat || held.has(e.code)) return;
      callback.current(type);
      held.set(e.code, { type, next: performance.now() + 150 });
    };
    const up = (e: KeyboardEvent) => {
      held.delete(e.code);
    };
    const clear = () => held.clear();
    const timer = setInterval(() => {
      const now = performance.now();
      for (const value of held.values())
        if (['left', 'right', 'down'].includes(value.type) && now >= value.next) {
          callback.current(value.type);
          value.next = now + 70;
        }
    }, 20);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
    };
  }, [active, bindings]);
}
