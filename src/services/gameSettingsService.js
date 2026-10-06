import GameSetting from '../models/GameSetting.js';
import { authError } from './authService.js';
export const gameIds = ['flappy', 'pikachu', 'tetris'];
export const modeIds = ['single', 'local', 'bot', 'online'];
export function defaultGame(game) {
  return {
    game,
    enabled: true,
    description: '',
    maintenanceMessage: 'Game đang bảo trì. Vui lòng quay lại sau.',
    modes: modeIds.filter((m) => game !== 'pikachu' || m !== 'bot'),
  };
}
export async function readGames() {
  const saved = await GameSetting.find().lean();
  return gameIds.map((game) => ({ ...defaultGame(game), ...saved.find((s) => s.game === game) }));
}
export async function assertGameAccess(game, mode) {
  if (!gameIds.includes(game) || !modeIds.includes(mode))
    throw authError('Game hoặc chế độ không hợp lệ.');
  const setting = (await GameSetting.findOne({ game }).lean()) || defaultGame(game);
  if (!setting.enabled) throw authError(setting.maintenanceMessage, 403);
  if (!setting.modes.includes(mode)) throw authError('Chế độ này đang tạm đóng.', 403);
}
