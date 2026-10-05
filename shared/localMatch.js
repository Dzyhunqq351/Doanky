import { createBird, flap, stepBird, resolveFlappyBuff, PHYSICS, STEP } from './flappyEngine.js';
import { createTetris, tetrisAction, tickTetris, resolveTetrisBuff } from './tetrisEngine.js';
import { createPikachu, pikachuAction } from './pikachuEngine.js';
import { playBot } from './arcadeBot.js';
export function createLocalMatch(game, mode, seed, names, rules = {}) {
  return {
    game,
    mode,
    seed,
    phase: 'ready',
    elapsed: 0,
    accumulator: 0,
    lastBot: 0,
    limit: rules.timeLimit ?? 0,
    ranking: rules.ranking ?? 'score',
    players: names.slice(0, mode === 'single' ? 1 : 2).map((name) => ({
      name,
      finishedAt: null,
      state:
        game === 'flappy'
          ? createBird(seed)
          : game === 'tetris'
            ? createTetris(seed, 0)
            : createPikachu(seed, rules.hints ?? 3, rules.swaps ?? 5),
    })),
  };
}
const done = (game, state) => (game === 'flappy' ? !state.alive : state.done);
export function settleMatch(match) {
  for (const p of match.players)
    if (p.finishedAt === null && done(match.game, p.state))
      p.finishedAt = Math.max(
        0,
        match.elapsed - (match.game === 'pikachu' ? p.state.timeCredit || 0 : 0),
      );
  if (match.players.every((p) => p.finishedAt !== null)) match.phase = 'results';
}
export function localAction(match, index, input) {
  const player = match.players[index];
  if (match.phase !== 'playing' || !player || player.finishedAt !== null) return false;
  if (match.game === 'flappy') flap(player.state);
  else if (match.game === 'tetris') {
    tetrisAction(player.state, input.type);
    resolveTetrisBuff(player.state, match.players[index === 0 ? 1 : 0]?.state);
  } else pikachuAction(player.state, { ...input, elapsed: match.elapsed });
  settleMatch(match);
  return true;
}
export function stepLocalMatch(match, dt) {
  if (match.phase !== 'playing') return;
  const step = Math.min(dt, 100);
  match.elapsed += step;
  match.accumulator += step;
  while (match.accumulator >= STEP) {
    match.accumulator -= STEP;
    match.players.forEach((p, i) => {
      if (p.finishedAt !== null) return;
      if (match.game === 'flappy') {
        if (i === 1 && match.mode === 'bot') {
          const pipe = p.state.pipes.find((p) => p.x + PHYSICS.pipeW > PHYSICS.x - PHYSICS.rx);
          const target = pipe ? pipe.y + PHYSICS.pipeH + PHYSICS.gap * 0.6 : 270;
          if (p.state.v > 0 && p.state.y > target) flap(p.state);
        }
        stepBird(p.state);
        resolveFlappyBuff(p.state, match.players[i === 0 ? 1 : 0]?.state);
      } else if (match.game === 'tetris') {
        tickTetris(p.state, STEP);
        resolveTetrisBuff(p.state, match.players[i === 0 ? 1 : 0]?.state);
      }
    });
  }
  if (match.mode === 'bot' && match.game !== 'flappy' && match.elapsed - match.lastBot > 1200) {
    match.lastBot = match.elapsed;
    playBot(match.game, match.players[1].state);
    if (match.game === 'tetris') resolveTetrisBuff(match.players[1].state, match.players[0].state);
  }
  if (match.limit && match.elapsed >= match.limit) {
    match.elapsed = match.limit;
    finishLocalMatch(match);
    return;
  }
  settleMatch(match);
}
export function finishLocalMatch(match) {
  match.phase = 'results';
  for (const p of match.players) if (p.finishedAt === null) p.finishedAt = match.elapsed;
}
export function localResults(match) {
  const compare =
    match.game === 'pikachu'
      ? (a, b) =>
          Number(a.forfeited) - Number(b.forfeited) ||
          (match.ranking === 'time'
            ? Number(b.completed) - Number(a.completed) ||
              (a.completed && b.completed
                ? a.elapsed - b.elapsed || b.score - a.score
                : b.score - a.score || a.elapsed - b.elapsed)
            : b.score - a.score || a.elapsed - b.elapsed)
      : (a, b) => b.score - a.score || b.elapsed - a.elapsed;
  const rows = match.players
    .map((p, index) => ({
      index,
      name: p.name,
      score: p.state.score,
      elapsed: Math.round(p.finishedAt ?? match.elapsed),
      lines: p.state.lines || 0,
      pairs: p.state.pairs || 0,
      completed: match.game === 'pikachu' ? !!p.state.done : undefined,
      forfeited: !!p.forfeited,
    }))
    .sort(compare);
  let rank = 0;
  return rows.map((p, i) => {
    if (i === 0 || compare(p, rows[i - 1]) !== 0) rank = i + 1;
    return { ...p, rank };
  });
}
