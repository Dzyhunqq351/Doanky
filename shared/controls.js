export const TETRIS_KEYS = {
  standard: {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowDown: 'down',
    ArrowUp: 'rotate',
    Space: 'drop',
    KeyC: 'hold',
    KeyZ: 'rotateBack',
  },
  p1: { KeyA: 'left', KeyD: 'right', KeyS: 'down', KeyW: 'rotate', Space: 'drop', KeyQ: 'hold' },
  p2: {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowDown: 'down',
    ArrowUp: 'rotate',
    Numpad0: 'drop',
    Numpad1: 'hold',
  },
};
export function flappyPlayer(code, mode) {
  if (['Space', 'KeyW'].includes(code)) return 0;
  if (mode === 'single' || mode === 'bot') return code === 'ArrowUp' ? 0 : -1;
  return ['ArrowUp', 'Numpad0'].includes(code) ? 1 : -1;
}
