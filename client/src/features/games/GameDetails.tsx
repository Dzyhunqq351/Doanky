import { useEffect, useState } from 'react';
import { Bot, LoaderCircle, Play, Trophy, Users, X } from 'lucide-react';
import type { LocalGame, LocalMode } from '../../../../shared/localMatch.js';
import Avatar from '../../components/Avatar';
import { api } from '../../lib/api';
import type { GameItem, GamePolicy } from './gameData';
import GameGuide from './GameGuide';
import BuffMeta from './BuffMeta';

type LeaderboardRow = {
  playerId: string;
  name: string;
  avatar: number;
  score: number;
  played: number;
  rank: number;
};
type Leaderboard = { top: LeaderboardRow[]; me: LeaderboardRow | null; totalPlayers: number };

export default function GameDetails({
  game,
  launch,
  createRoom,
  onClose,
  policy,
}: {
  game: GameItem;
  launch: (game: LocalGame, mode: LocalMode) => void;
  createRoom?: (game: LocalGame) => void;
  onClose: () => void;
  policy?: GamePolicy;
}) {
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const Icon = game.icon;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    api<Leaderboard>(`/leaderboard?game=${game.id}`)
      .then(setBoard)
      .catch((reason) => setError((reason as Error).message));
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [game.id, onClose]);

  const allowed = (mode: string) =>
    !starting && policy?.enabled !== false && (!policy || policy.modes.includes(mode));
  const start = async (mode: LocalMode | 'online') => {
    setStarting(true);
    try {
      await api(`/games/${game.id}/access`, 'POST', { mode });
      onClose();
      if (mode === 'online') createRoom?.(game.id);
      else launch(game.id, mode);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setStarting(false);
    }
  };
  const openRoom = () => {
    void start('online');
  };

  return (
    <div className="game-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`game-detail ${game.id}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`game-detail-${game.id}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="game-detail-close" onClick={onClose} aria-label="Đóng chi tiết game">
          <X size={20} />
        </button>

        <aside className="game-detail-play">
          <div className="game-art" aria-hidden="true">
            <Icon size={68} strokeWidth={1.35} />
            <span>
              {game.id === 'flappy'
                ? '10 ĐIỂM → BUFF'
                : game.id === 'pikachu'
                  ? '16 × 9 Ô'
                  : 'SO ĐIỂM'}
            </span>
          </div>
          <h2 id={`game-detail-${game.id}`} style={{ color: game.titleColor }}>
            {game.title}
          </h2>
          <p>{game.description}</p>
          <BuffMeta game={game} />
          {policy?.enabled === false && <p role="status">{policy.maintenanceMessage}</p>}
          <div className="game-detail-actions">
            <button
              className="primary"
              disabled={!allowed('single')}
              onClick={() => void start('single')}
            >
              <Play size={17} /> Chơi đơn
            </button>
            {createRoom && (
              <button className="secondary" disabled={!allowed('online')} onClick={openRoom}>
                <Users size={17} /> Tạo phòng đấu
              </button>
            )}
            <button
              className="secondary"
              disabled={!allowed('local')}
              onClick={() => void start('local')}
            >
              <Users size={17} />
              {game.id === 'pikachu' ? 'Thay phiên · 7 phút/người' : '2 người cùng máy'}
            </button>
            {game.id !== 'pikachu' && (
              <button
                className="text-button"
                disabled={!allowed('bot')}
                onClick={() => void start('bot')}
              >
                <Bot size={16} /> Luyện với máy
              </button>
            )}
          </div>
        </aside>

        <div className="game-detail-info">
          <section className="game-leaderboard" aria-labelledby={`leaderboard-${game.id}`}>
            <header>
              <div>
                <span className="eyebrow">
                  <Trophy size={14} /> BẢNG XẾP HẠNG
                </span>
                <h3 id={`leaderboard-${game.id}`}>Điểm cao nhất</h3>
              </div>
              <small>{board ? `${board.totalPlayers} người chơi` : 'Đang cập nhật'}</small>
            </header>
            {!board && !error ? (
              <p className="leaderboard-loading">
                <LoaderCircle size={18} className="spin" /> Đang tải bảng xếp hạng…
              </p>
            ) : error ? (
              <p className="notice" role="alert">
                {error}
              </p>
            ) : board?.top.length ? (
              <div className="leaderboard-list">
                {board.top.map((row) => (
                  <div className={`leaderboard-row rank-${row.rank}`} key={row.playerId}>
                    <strong className="leaderboard-rank">{row.rank}</strong>
                    <Avatar index={row.avatar} small />
                    <span>
                      <b>{row.name}</b>
                      <small>{row.played} lượt đã lưu</small>
                    </span>
                    <strong>{row.score.toLocaleString('vi-VN')} điểm</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="leaderboard-empty">Chưa có điểm. Hãy hoàn thành lượt chơi đầu tiên.</p>
            )}
            <div className="leaderboard-me">
              <span>Hạng của bạn</span>
              {board?.me ? (
                <>
                  <b>#{board.me.rank}</b>
                  <strong>{board.me.score.toLocaleString('vi-VN')} điểm</strong>
                </>
              ) : (
                <strong>Chưa có điểm</strong>
              )}
            </div>
          </section>
          <div className="game-detail-guide">
            <GameGuide game={game.id} open />
          </div>
        </div>
      </section>
    </div>
  );
}
