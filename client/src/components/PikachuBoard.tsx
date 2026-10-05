import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Lightbulb, Shuffle } from 'lucide-react';
import { type PikachuState, creatures } from '../lib/arcade';
import ClassicTile from './ClassicTile';
import BuffNotice from './BuffNotice';
import { connection } from '../../../shared/pikachuEngine.js';

type BoardGeometry = {
  width: number;
  height: number;
  firstX: number;
  firstY: number;
  stepX: number;
  stepY: number;
};
export default function PikachuBoard({
  state,
  disabled,
  act,
}: {
  state: PikachuState;
  disabled: boolean;
  act: (data: Record<string, unknown>) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<number | null>(null),
    [path, setPath] = useState<number[][] | null>(null),
    [pending, setPending] = useState<number[]>([]),
    [rejected, setRejected] = useState<number[]>([]),
    [geometry, setGeometry] = useState<BoardGeometry | null>(null);
  const boardRef = useRef<HTMLDivElement>(null),
    rejectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const tiles = board.querySelectorAll<HTMLButtonElement>('.pika-tile');
      if (tiles.length < 17) return;
      const centerX = (tile: HTMLButtonElement) => tile.offsetLeft + tile.offsetWidth / 2,
        centerY = (tile: HTMLButtonElement) => tile.offsetTop + tile.offsetHeight / 2;
      setGeometry({
        width: board.clientWidth,
        height: board.clientHeight,
        firstX: centerX(tiles[0]),
        firstY: centerY(tiles[0]),
        stepX: centerX(tiles[1]) - centerX(tiles[0]),
        stepY: centerY(tiles[16]) - centerY(tiles[0]),
      });
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(board);
    return () => resize.disconnect();
  }, []);
  useEffect(() => {
    setSelected(null);
    setPending([]);
    setPath(state.path);
    const t = setTimeout(() => setPath(null), 450);
    return () => clearTimeout(t);
  }, [state.revision]);
  useEffect(
    () => () => {
      if (rejectTimer.current) clearTimeout(rejectTimer.current);
    },
    [],
  );
  async function pick(i: number) {
    if (disabled || pending.length) return;
    if (selected === null) {
      setSelected(i);
      return;
    }
    if (selected === i) {
      setSelected(null);
      return;
    }
    const first = selected;
    const nextPath = connection(state.board, first, i);
    if (!nextPath) {
      setRejected([first, i]);
      setSelected(i);
      if (rejectTimer.current) clearTimeout(rejectTimer.current);
      rejectTimer.current = setTimeout(() => setRejected([]), 220);
      return;
    }
    setPending([first, i]);
    setSelected(null);
    setPath(nextPath);
    const accepted = await act({ type: 'pair', a: first, b: i, revision: state.revision });
    if (!accepted) {
      setPending([]);
      setPath(null);
    }
  }
  const pathPoints =
    path && geometry
      ? path
          .map(([x, y]) => {
            const px = geometry.firstX + (x - 1) * geometry.stepX,
              py = geometry.firstY + (y - 1) * geometry.stepY;
            return `${px},${py}`;
          })
          .join(' ')
      : '';
  return (
    <div className="pikachu-play">
      <BuffNotice notice={state.buffNotice} />
      <div className="pika-progress">
        <span style={{ width: `${(state.pairs / 72) * 100}%` }} />
      </div>
      <div className="pika-board-wrap">
        <div
          className="pika-board"
          role="group"
          aria-label="Bàn Pikachu 16 cột 9 hàng"
          ref={boardRef}
        >
          {state.board.map((v, i) => (
            <button
              key={i}
              className={`pika-tile ${!v ? 'empty' : ''} ${selected === i ? 'picked' : ''} ${pending.includes(i) ? 'matching' : ''} ${rejected.includes(i) ? 'rejected' : ''} ${state.hint?.includes(i) ? 'hinted' : ''}`}
              disabled={!v || disabled}
              aria-label={`Hàng ${Math.floor(i / 16) + 1}, cột ${(i % 16) + 1}: ${v ? creatures[v - 1] : 'trống'}`}
              aria-pressed={selected === i}
              onClick={() => void pick(i)}
            >
              {v ? <ClassicTile index={v - 1} /> : ''}
            </button>
          ))}
          {pathPoints && geometry && (
            <svg
              className="pika-path"
              viewBox={`0 0 ${geometry.width} ${geometry.height}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polyline
                points={pathPoints}
                fill="none"
                stroke="#fce65a"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
        </div>
      </div>
      <div className="pika-tools">
        <button
          disabled={disabled || state.swaps === 0}
          onClick={() => void act({ type: 'shuffle', revision: state.revision })}
        >
          <Shuffle size={20} /> Đổi vị trí <b>{state.swaps}</b>
          <small>−10 điểm</small>
        </button>
        <button
          className="hint-button"
          disabled={disabled || state.hints === 0}
          onClick={() => void act({ type: 'hint', revision: state.revision })}
        >
          <Lightbulb size={20} /> Gợi ý <b>{state.hints}</b>
          <small>−30 điểm</small>
        </button>
      </div>
      <p className="arcade-instructions">
        +100 điểm mỗi cặp · Mỗi 1.000 điểm nhận một hiệu ứng bất ngờ.
      </p>
      {state.autoShuffle && (
        <p role="status">Bàn hết đường nối: đã tự sắp lại miễn phí, giữ nguyên các quân còn lại.</p>
      )}
    </div>
  );
}
