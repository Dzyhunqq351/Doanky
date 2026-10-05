export function roomRules(game, input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Luật phòng không hợp lệ.');
  const timeLimit = input.timeLimit ?? 180000;
  if (![0, 15000, 30000, 60000, 120000, 180000, 300000, 600000, 1800000].includes(timeLimit))
    throw new Error('Thời gian phòng không hợp lệ.');
  const hints = input.hints ?? 3,
    swaps = input.swaps ?? 5;
  if (![hints, swaps].every((v) => Number.isInteger(v) && v >= 0 && v <= 10))
    throw new Error('Gợi ý và đổi vị trí phải là số nguyên từ 0 đến 10.');
  const ranking = input.ranking ?? 'score';
  if (!['score', 'time'].includes(ranking)) throw new Error('Cách xếp hạng không hợp lệ.');
  return game === 'pikachu' ? { hints, swaps, ranking, timeLimit } : { timeLimit };
}
