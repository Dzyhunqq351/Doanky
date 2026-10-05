import type { GameItem } from './gameData';

export default function BuffMeta({ game }: { game: GameItem }) {
  return (
    <div className="game-buff-meta">
      <span
        className="buff-tooltip-wrap"
        tabIndex={0}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        BUFF
        <span className="buff-popup" role="tooltip">
          <b className="buff-ratio">
            {game.buffTrigger} · {game.buffRatio}
          </b>
          <span className="buff-section buff-good">
            <b className="buff-section-label">Lợi</b>
            <span className="buff-list">
              {game.buffs.good.map((buff) => (
                <span key={buff}>• {buff}</span>
              ))}
            </span>
          </span>
          <span className="buff-section buff-bad">
            <b className="buff-section-label">Hại</b>
            <span className="buff-list">
              {game.buffs.bad.map((buff) => (
                <span key={buff}>• {buff}</span>
              ))}
            </span>
          </span>
        </span>
      </span>
      <span className="buff-trigger-text">
        {game.buffTrigger} · {game.buffRatio}
      </span>
    </div>
  );
}
