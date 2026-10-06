import Match from '../models/Match.js';
export function summarizeHub(matches, playerId, game = 'flappy') {
  const history = [...matches]
    .sort((a, b) => +new Date(b.endedAt) - +new Date(a.endedAt))
    .flatMap((m) => {
      const p = m.results.find((p) => p.playerId === playerId);
      return p
        ? [
            {
              id: m.matchId,
              game: m.game || 'flappy',
              mode: m.mode,
              ranking: m.ranking || 'score',
              at: m.endedAt,
              score: p.score,
              rank: p.rank,
              players: m.results.length,
              participants: m.results.map((entry) => ({
                name: entry.name,
                avatar: entry.avatar ?? 0,
                score: entry.score,
                rank: entry.rank,
                elapsed: entry.elapsed ?? 0,
                me: entry.playerId === playerId,
              })),
              duration: p.elapsed ?? 0,
              attempts: p.attempts || 1,
            },
          ]
        : [];
    })
    .slice(0, 100);
  return {
    history,
    records: history
      .filter((r) => r.game === game)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),
  };
}
export async function readHub(playerId, game) {
  const matches = await Match.find({ accountId: playerId, hidden: { $ne: true } })
    .sort({ endedAt: -1 })
    .limit(100)
    .maxTimeMS(3000)
    .lean();
  return summarizeHub(matches, playerId, game);
}

export function summarizeLeaderboard(matches, playerId) {
  const bestByPlayer = new Map();
  for (const match of matches) {
    const accountId = String(match.accountId);
    const result = match.results?.find((entry) => entry.playerId === accountId);
    if (!result) continue;
    const current = bestByPlayer.get(accountId);
    if (!current || result.score > current.score) {
      bestByPlayer.set(accountId, {
        playerId: accountId,
        name: result.name,
        avatar: result.avatar ?? 0,
        score: result.score,
        played: current?.played ?? 0,
      });
    }
    bestByPlayer.get(accountId).played += 1;
  }
  const rows = [...bestByPlayer.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'vi'))
    .map((row, index) => ({ ...row, rank: index + 1 }));
  return {
    top: rows.slice(0, 10),
    me: rows.find((row) => row.playerId === playerId) ?? null,
    totalPlayers: rows.length,
  };
}

export async function readLeaderboard(playerId, game) {
  const matches = await Match.find({ game, hidden: { $ne: true } })
    .sort({ endedAt: -1 })
    .limit(5000)
    .maxTimeMS(3000)
    .lean();
  return summarizeLeaderboard(matches, playerId);
}
