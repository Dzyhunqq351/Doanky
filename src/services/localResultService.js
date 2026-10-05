import { authError } from './authService.js';
import { persistMatch } from './matchService.js';
import { duelResults } from '../../shared/pikachuDuel.js';
export function validateResult(user, input) {
  input = input && typeof input === 'object' ? input : {};
  if (
    !['flappy', 'pikachu', 'tetris'].includes(input.game) ||
    !['single', 'local', 'bot'].includes(input.mode)
  )
    throw authError('Game không hợp lệ.');
  if (typeof input.id !== 'string' || !/^[a-f0-9-]{36}$/.test(input.id))
    throw authError('Mã lượt chơi không hợp lệ.');
  const count = input.mode === 'single' ? 1 : 2;
  if (input.game === 'pikachu' && input.mode === 'bot')
    throw authError('Pikachu không có chế độ luyện với máy.');
  const ranking = input.ranking ?? 'score';
  if (!['score', 'time'].includes(ranking)) throw authError('Cách xếp hạng không hợp lệ.');
  if (!Array.isArray(input.results) || input.results.length !== count)
    throw authError('Kết quả không hợp lệ.');
  let results = input.results
    .map((p, index) => {
      if (
        !p ||
        !Number.isInteger(p.score) ||
        p.score < -1000 ||
        p.score > 10000000 ||
        !Number.isInteger(p.elapsed) ||
        p.elapsed < 0 ||
        p.elapsed > 86400000
      )
        throw authError('Điểm hoặc thời gian không hợp lệ.');
      const name =
        index === 0
          ? user.name
          : input.mode === 'bot'
            ? 'Máy luyện tập'
            : String(p.name || 'Người chơi 2')
                .trim()
                .slice(0, 24);
      return {
        playerId: index === 0 ? String(user._id) : `${user._id}:second`,
        name,
        avatar: index === 0 ? user.avatar : 2,
        score: p.score,
        elapsed: p.elapsed,
        completed: p.completed === true,
      };
    })
    .sort((a, b) => b.score - a.score || b.elapsed - a.elapsed)
    .map((p, i) => ({ ...p, rank: i + 1 }));
  if (input.game === 'pikachu' && input.mode === 'local') {
    const ordered = duelResults({
      ranking,
      players: results.map((p) => ({
        ...p,
        state: { score: p.score },
        finishedAt: p.elapsed,
        forfeited: false,
      })),
    });
    results = ordered.map((p) => ({ ...results[p.index], rank: p.rank }));
  }
  return {
    accountId: user._id,
    mode: input.mode,
    ranking,
    matchId: `${user._id}:${input.id}`,
    game: input.game,
    endedAt: new Date(),
    results,
  };
}
export async function saveResult(user, input) {
  const saved = await persistMatch(validateResult(user, input));
  if (!saved) throw authError('Chưa lưu được kết quả. Vui lòng thử lại.', 503);
}
