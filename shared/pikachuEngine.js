import { pickBuff } from './buffPicker.js';

export const COLS = 16,
  ROWS = 9;
export function random(seed) {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(values, rng) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
// Search includes an empty border so a connection can go around the board.
export function connection(board, a, b) {
  if (
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    a < 0 ||
    b < 0 ||
    a >= board.length ||
    b >= board.length ||
    a === b ||
    !board[a] ||
    board[a] !== board[b]
  )
    return null;
  const w = COLS + 2,
    h = ROWS + 2;
  const start = [(a % COLS) + 1, Math.floor(a / COLS) + 1],
    end = [(b % COLS) + 1, Math.floor(b / COLS) + 1];
  const queue = [{ x: start[0], y: start[1], dir: -1, turns: 0, path: [start] }],
    best = new Map();
  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    for (let d = 0; d < 4; d++) {
      const x = p.x + dirs[d][0],
        y = p.y + dirs[d][1],
        turns = p.turns + (p.dir !== -1 && p.dir !== d ? 1 : 0);
      if (x < 0 || y < 0 || x >= w || y >= h || turns > 2) continue;
      const path = [...p.path, [x, y]];
      if (x === end[0] && y === end[1]) return path;
      if (x > 0 && x <= COLS && y > 0 && y <= ROWS && board[(y - 1) * COLS + x - 1]) continue;
      const key = (y * w + x) * 4 + d;
      if ((best.get(key) ?? 3) <= turns) continue;
      best.set(key, turns);
      queue.push({ x, y, dir: d, turns, path });
    }
  }
  return null;
}
export function findPair(board) {
  for (let a = 0; a < board.length; a++)
    if (board[a])
      for (let b = a + 1; b < board.length; b++)
        if (board[a] === board[b] && connection(board, a, b)) return [a, b];
  return null;
}
export function rearrange(state) {
  const slots = state.board.flatMap((v, i) => (v ? [i] : []));
  if (!slots.length) return;
  const rng = random(state.seed + ++state.shuffles * 7919);
  const values = shuffle(
    slots.map((i) => state.board[i]),
    rng,
  );
  slots.forEach((p, i) => (state.board[p] = values[i]));
  if (!findPair(state.board)) {
    // First two occupied cells of the topmost occupied row connect directly.
    const a = slots[0];
    const b =
      slots.find((i) => i !== a && Math.floor(i / COLS) === Math.floor(a / COLS)) ?? slots[1];
    // If top row has only one tile, connect it around the empty outer border to the next row's leftmost tile.
    const c = slots.find((i) => i !== a && state.board[i] === state.board[a]);
    [state.board[b], state.board[c]] = [state.board[c], state.board[b]];
    if (!findPair(state.board)) {
      // A sparse board can always connect the two leftmost occupied cells through the empty space to their left.
      const sorted = [...slots].sort((x, y) => (x % COLS) - (y % COLS) || x - y);
      const x = sorted[0],
        y = sorted[1],
        z = slots.find((i) => i !== x && state.board[i] === state.board[x]);
      [state.board[y], state.board[z]] = [state.board[z], state.board[y]];
    }
  }
  state.hint = null;
}
export function createPikachu(seed, hints = 3, swaps = 5) {
  const state = {
    board: Array.from({ length: COLS * ROWS }, (_, i) => (Math.floor(i / 2) % 36) + 1),
    seed,
    shuffles: 0,
    hints,
    swaps,
    score: 0,
    pairs: 0,
    done: false,
    hint: null,
    path: null,
    revision: 0,
    autoShuffle: false,
    buffMilestone: 0,
    scoreMultiplierUntil: 0,
    timeCredit: 0,
    buffNotice: null,
  };
  rearrange(state);
  return state;
}
export function pikachuAction(state, input) {
  if (state.done) throw new Error('Bạn đã hoàn thành bàn chơi.');
  state.path = null;
  state.autoShuffle = false;
  if (input.type === 'hint') {
    if (state.hints <= 0) throw new Error('Đã hết lượt gợi ý.');
    state.hint = findPair(state.board);
    state.hints--;
    state.score -= 30;
  } else if (input.type === 'shuffle') {
    if (state.swaps <= 0) throw new Error('Đã hết lượt đổi vị trí.');
    rearrange(state);
    state.swaps--;
    state.score -= 10;
  } else if (input.type === 'pair') {
    const path = connection(state.board, input.a, input.b);
    if (!path) throw new Error('Hai quân cần giống nhau và nối được với tối đa 2 góc rẽ.');
    state.board[input.a] = state.board[input.b] = 0;
    state.path = path;
    state.hint = null;
    state.score += (input.elapsed ?? 0) < state.scoreMultiplierUntil ? 200 : 100;
    state.pairs++;
    state.done = state.board.every((v) => v === 0);
    if (!state.done && !findPair(state.board)) {
      rearrange(state);
      state.autoShuffle = true;
    }
  } else throw new Error('Thao tác không hợp lệ.');
  const milestone = Math.floor(Math.max(0, state.score) / 1000);
  if (milestone > state.buffMilestone) {
    state.buffMilestone = milestone;
    const buff = pickBuff(
      state.seed,
      milestone,
      [
        { id: 'assist', weight: 50 },
        { id: 'freeze', weight: 30 },
        { id: 'double', weight: 20 },
      ],
      [
        { id: 'minus-assist', weight: 65 },
        { id: 'minus-score', weight: 35 },
      ],
    );
    const id = buff.id;
    const notices = {
      double: ['Nhân đôi điểm', 'good'],
      freeze: ['Đóng băng thời gian 5 giây', 'good'],
      assist: ['Tặng thêm trợ giúp', 'good'],
      'minus-score': ['Mất 1.000 điểm', 'bad'],
      'minus-assist': ['Mất một trợ giúp', 'bad'],
    };
    if (id === 'double') state.scoreMultiplierUntil = (input.elapsed ?? 0) + 5000;
    else if (id === 'freeze') state.timeCredit += 5000;
    else if (id === 'assist')
      random(state.seed + milestone * 31)() < 0.5 ? state.hints++ : state.swaps++;
    else if (id === 'minus-score') state.score -= 1000;
    else if (state.hints > 0 || state.swaps > 0) {
      if (state.hints > 0 && (!state.swaps || random(state.seed + milestone * 37)() < 0.5))
        state.hints--;
      else state.swaps--;
    }
    state.buffNotice = { id, label: notices[id][0], tone: buff.tone, serial: milestone };
  }
  state.revision++;
}
