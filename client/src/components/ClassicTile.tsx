import { creatureFiles, creatures } from '../lib/arcade';
export default function ClassicTile({ index }: { index: number }) {
  const i = ((index % 36) + 36) % 36;
  return (
    <span className="classic-tile" title={creatures[i]}>
      <img className="classic-tile-art" src={`/pokemon/${creatureFiles[i]}.png`} alt="" />
    </span>
  );
}
