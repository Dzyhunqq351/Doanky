type HudPlayer = { index: number; name: string; score: number; finished: boolean };

export default function GameHud({
  label,
  time,
  players,
  selected,
  onSelect,
}: {
  label: string;
  time: string;
  players: HudPlayer[];
  selected?: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <div className={`game-hud ${players.length > 1 ? 'duel-hud' : 'single-hud'}`}>
      <div className="game-hud-clock" aria-label={`${label}: ${time}`}>
        <small>{label}</small>
        <strong>{time}</strong>
      </div>
      {players.map((player, slot) => {
        const content = (
          <>
            <span className="game-hud-name" title={player.name}>
              {player.name}
            </span>
            <span className="game-hud-score">
              <b>{player.score}</b> điểm{player.finished ? ' · Đã xong' : ''}
            </span>
          </>
        );
        const className = `game-hud-player hud-slot-${slot}${selected === player.index ? ' is-current' : ''}`;
        return onSelect ? (
          <button
            key={player.index}
            className={className}
            aria-pressed={selected === player.index}
            aria-label={`Xem màn ${player.name}`}
            onClick={() => onSelect(player.index)}
          >
            {content}
          </button>
        ) : (
          <div key={player.index} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
