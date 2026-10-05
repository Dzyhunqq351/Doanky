import { createPikachu, pikachuAction } from './pikachuEngine.js';

// The second board does not exist until player 2 starts their turn.
export function createDuel(names, rules) {
  return {
    game: 'pikachu',
    mode: 'local',
    phase: 'countdown',
    elapsed: 0,
    limit: rules.timeLimit ?? 0,
    turn: 0,
    ranking: rules.ranking,
    rules,
    players: names.map((name) => ({
      name,
      finishedAt: null,
      completed: false,
      forfeited: false,
      state: { score: 0 },
    })),
  };
}
export function dealTurn(match) {
  let board;
  do {
    board = createPikachu(
      crypto.getRandomValues(new Uint32Array(1))[0],
      match.rules.hints,
      match.rules.swaps,
    );
  } while (match.turn === 1 && board.seed === match.players[0].state.seed);
  match.players[match.turn].state = board;
  match.elapsed = 0;
  match.phase = 'countdown';
}
export function duelAction(match, index, input) {
  if (match.phase !== 'playing' || index !== match.turn) throw new Error('Chưa đến lượt của bạn.');
  const player = match.players[index];
  if (input.type !== 'finish-turn')
    pikachuAction(player.state, { ...input, elapsed: match.elapsed });
  if (input.type === 'finish-turn' || player.state.done) {
    player.completed = !!player.state.done;
    player.finishedAt = Math.round(Math.max(0, match.elapsed - (player.state.timeCredit || 0)));
    if (match.turn === 0) {
      match.turn = 1;
      match.phase = 'turn-ready';
      match.elapsed = 0;
    } else match.phase = 'results';
  }
}
export function abandonDuel(match, index) {
  match.players[index].forfeited = true;
  for (const [i, p] of match.players.entries())
    if (p.finishedAt === null) p.finishedAt = i === match.turn ? Math.round(match.elapsed) : 0;
  match.phase = 'results';
}
export function duelResults(match) {
  const compare = (a, b) =>
    Number(a.forfeited) - Number(b.forfeited) ||
    (match.ranking === 'time'
      ? Number(b.completed) - Number(a.completed) ||
        (a.completed && b.completed
          ? a.elapsed - b.elapsed || b.score - a.score
          : b.score - a.score || a.elapsed - b.elapsed)
      : b.score - a.score || a.elapsed - b.elapsed);
  const rows = match.players
    .map((p, index) => ({
      index,
      name: p.name,
      score: p.state.score,
      elapsed: p.finishedAt ?? 0,
      completed: p.completed,
      forfeited: p.forfeited,
    }))
    .sort(compare);
  return rows.map((p, i) => ({ ...p, rank: i > 0 && compare(p, rows[i - 1]) === 0 ? 1 : i + 1 }));
}
