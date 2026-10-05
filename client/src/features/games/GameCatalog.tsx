import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { LocalGame, LocalMode } from '../../../../shared/localMatch.js';
import GameDetails from './GameDetails';
import BuffMeta from './BuffMeta';
import { games, type GameItem } from './gameData';

export default function GameCatalog({
  launch,
  createRoom,
}: {
  launch: (g: LocalGame, m: LocalMode) => void;
  createRoom?: (g: LocalGame) => void;
}) {
  const [selected, setSelected] = useState<GameItem | null>(null);
  return (
    <section className={`game-catalog ${createRoom ? 'compact-catalog' : ''}`}>
      <div className="hub-title">
        <div>
          <p>THƯ VIỆN TRÒ CHƠI</p>
          <h1>Chọn game. Chia bàn phím.</h1>
        </div>
        <span className="tag">3 trò chơi</span>
      </div>
      <div className="game-cards">
        {games.map((game) => {
          const { id, title, titleColor, icon: Icon, description } = game;
          return (
            <article
              className={`game-card game-card-preview ${id}`}
              key={id}
              role="button"
              tabIndex={0}
              aria-label={`Mở chi tiết ${title}`}
              onClick={() => setSelected(games.find((game) => game.id === id) ?? null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelected(games.find((game) => game.id === id) ?? null);
                }
              }}
            >
              <div className="game-art" aria-hidden="true">
                <Icon size={56} strokeWidth={1.35} />
                <span>
                  {id === 'flappy' ? '10 ĐIỂM → BUFF' : id === 'pikachu' ? '16 × 9 Ô' : 'SO ĐIỂM'}
                </span>
              </div>
              <h2 style={{ color: titleColor }}>{title}</h2>
              <p>{description}</p>

              <BuffMeta game={game} />
              <div className="game-card-open">
                Xem game <ArrowRight size={16} />
              </div>
            </article>
          );
        })}
      </div>
      <p className="hub-note">
        Các game chạy trực tiếp trên máy. Hai người dùng chung tài khoản đang đăng nhập; người thứ
        hai đặt tên trong màn chuẩn bị.
      </p>
      {selected && (
        <GameDetails
          game={selected}
          launch={launch}
          createRoom={createRoom}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
