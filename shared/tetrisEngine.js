import { random } from './pikachuEngine.js';
import { pickBuff } from './buffPicker.js';
export const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  O: [
    [4, 4],
    [4, 4],
  ],
  S: [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  Z: [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
};
export function fits(s, matrix = s.active.matrix, x = s.active.x, y = s.active.y) {
  return matrix.every((r, dy) =>
    r.every(
      (v, dx) =>
        !v ||
        (x + dx >= 0 && x + dx < 10 && y + dy < 20 && (y + dy < 0 || !s.board[y + dy][x + dx])),
    ),
  );
}
function fillQueue(s) {
  while (s.next.length < 7) {
    const bag = Object.keys(SHAPES),
      rng = random(s.seed + s.bags++ * 9973);
    for (let i = 6; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    s.next.push(...bag);
  }
}
function spawn(s, type) {
  fillQueue(s);
  type ||= s.next.shift();
  fillQueue(s);
  s.active = { type, matrix: SHAPES[type].map((r) => [...r]), x: type === 'O' ? 4 : 3, y: 0 };
  s.fall = 0;
  s.lock = 0;
  s.resets = 0;
  if (!fits(s)) s.done = true;
}
export function createTetris(seed, target = 40) {
  const s = {
    board: Array.from({ length: 20 }, () => Array(10).fill(0)),
    seed,
    bags: 0,
    next: [],
    hold: null,
    canHold: true,
    active: null,
    score: 0,
    lines: 0,
    level: 1,
    done: false,
    completed: false,
    target,
    fall: 0,
    lock: 0,
    resets: 0,
    elapsed: 0,
    buffMilestone: 0,
    scoreMultiplierUntil: 0,
    speedUntil: 0,
    speedFactor: 1,
    forcedType: null,
    forcedRemaining: 0,
    pendingBuff: null,
    buffNotice: null,
  };
  spawn(s);
  return s;
}
function lockPiece(s) {
  for (let y = 0; y < s.active.matrix.length; y++)
    for (let x = 0; x < s.active.matrix[y].length; x++)
      if (s.active.matrix[y][x]) {
        const row = s.active.y + y;
        if (row < 0) {
          s.done = true;
          return;
        }
        s.board[row][s.active.x + x] = s.active.matrix[y][x];
      }
  const rows = s.board.filter((r) => r.some((v) => !v)),
    cleared = 20 - rows.length;
  s.board = [...Array.from({ length: cleared }, () => Array(10).fill(0)), ...rows];
  s.score +=
    [0, 100, 300, 500, 800][cleared] * s.level * (s.elapsed < s.scoreMultiplierUntil ? 2 : 1);
  s.score = Math.round(s.score);
  s.lines += cleared;
  s.level = 1 + Math.floor(s.lines / 10);
  if (s.target && s.lines >= s.target) {
    s.done = true;
    s.completed = true;
    return;
  }
  s.canHold = true;
  spawn(s);
}
export function tetrisAction(s, type) {
  if (s.done) return;
  const grounded = !fits(s, s.active.matrix, s.active.x, s.active.y + 1);
  let moved = false;
  if (type === 'left' || type === 'right') {
    const x = s.active.x + (type === 'left' ? -1 : 1);
    if (fits(s, s.active.matrix, x)) {
      s.active.x = x;
      moved = true;
    }
  } else if (type === 'rotate' || type === 'rotateBack') {
    const m = s.active.matrix,
      n = m.length;
    const rotated = Array.from({ length: n }, (_, y) =>
      Array.from({ length: n }, (_, x) => (type === 'rotate' ? m[n - 1 - x][y] : m[x][n - 1 - y])),
    );
    for (const [dx, dy] of [
      [0, 0],
      [-1, 0],
      [1, 0],
      [-2, 0],
      [2, 0],
      [0, -1],
      [-1, -1],
      [1, -1],
      [0, -2],
    ])
      if (fits(s, rotated, s.active.x + dx, s.active.y + dy)) {
        s.active.matrix = rotated;
        s.active.x += dx;
        s.active.y += dy;
        moved = true;
        break;
      }
  } else if (type === 'down') {
    if (fits(s, s.active.matrix, s.active.x, s.active.y + 1)) {
      s.active.y++;
      s.score++;
      s.fall = 0;
    }
  } else if (type === 'drop') {
    while (fits(s, s.active.matrix, s.active.x, s.active.y + 1)) {
      s.active.y++;
      s.score += 2;
    }
    lockPiece(s);
  } else if (type === 'hold') {
    if (!s.canHold) return;
    const type = s.active.type,
      old = s.hold;
    s.hold = type;
    spawn(s, old);
    s.canHold = false;
  } else throw new Error('Thao tác không hợp lệ.');
  if (moved && grounded && s.resets < 15) {
    s.lock = 0;
    s.resets++;
  }
}
export function tickTetris(s, ms) {
  if (s.done) return;
  s.elapsed += ms;
  s.fall += ms;
  if (s.elapsed >= s.speedUntil) s.speedFactor = 1;
  const interval = Math.max(80, 800 * Math.pow(0.8, s.level - 1) * s.speedFactor);
  while (s.fall >= interval) {
    s.fall -= interval;
    if (fits(s, s.active.matrix, s.active.x, s.active.y + 1)) s.active.y++;
  }
  if (!fits(s, s.active.matrix, s.active.x, s.active.y + 1)) {
    s.lock += ms;
    if (s.lock >= 500) lockPiece(s);
  } else s.lock = 0;
}
export function resolveTetrisBuff(s, opponent) {
  const milestone = Math.floor(Math.max(0, s.score) / 1000);
  if (milestone <= s.buffMilestone) return null;
  s.buffMilestone = milestone;
  const buff = pickBuff(
    s.seed,
    milestone,
    [
      { id: 'plus', weight: 35 },
      { id: 'slow', weight: 25 },
      { id: 'double', weight: 15 },
      { id: 'clear', weight: 10 },
      { id: 'same-next', weight: 8 },
      { id: 'fast-opponent', weight: 7 },
    ],
    [
      { id: 'fast-self', weight: 65 },
      { id: 'minus', weight: 35 },
    ],
  );
  const id = buff.id;
  const labels = {
    'same-next': 'Đối thủ nhận 5 khối giống nhau',
    slow: 'Rơi chậm 5 giây',
    double: 'Nhân đôi điểm 5 giây',
    'fast-opponent': 'Đối thủ rơi nhanh 5 giây',
    'fast-self': 'Khối của bạn rơi nhanh 5 giây',
    plus: 'Cộng 500 điểm',
    clear: 'Dọn sạch bàn xếp',
    minus: 'Trừ 500 điểm',
  };
  if (id === 'slow') Object.assign(s, { speedFactor: 1.65, speedUntil: s.elapsed + 5000 });
  else if (id === 'fast-self')
    Object.assign(s, { speedFactor: 0.52, speedUntil: s.elapsed + 5000 });
  else if (id === 'double') s.scoreMultiplierUntil = s.elapsed + 5000;
  else if (id === 'plus') s.score += 500;
  else if (id === 'clear') s.board = Array.from({ length: 20 }, () => Array(10).fill(0));
  else if (id === 'minus') s.score -= 500;
  else if (opponent && id === 'fast-opponent')
    Object.assign(opponent, { speedFactor: 0.52, speedUntil: opponent.elapsed + 5000 });
  else if (opponent && id === 'same-next') {
    opponent.forcedType = opponent.next[0];
    opponent.next.splice(0, 5, ...Array(5).fill(opponent.forcedType));
  } else s.score += 250;
  s.buffNotice = {
    id,
    label: labels[id],
    tone: buff.tone,
    serial: milestone,
  };
  return id;
}
