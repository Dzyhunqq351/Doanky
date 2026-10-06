import { useEffect, useRef } from 'react';
import { TETRIS_KEYS } from '../../../shared/controls.js';
import { useKeyboard } from '../features/games/useKeyboard';
import { type TetrisState, matrices } from '../lib/arcade';
import BuffNotice from './BuffNotice';
function Piece({ type }: { type: string | null }) {
  const m = type ? matrices[type] : null;
  return (
    <div
      className="piece-preview"
      style={{
        gridTemplateColumns: `repeat(${m?.[0].length || 4},1fr)`,
        width: `min(calc(100% - 12px),${(m?.[0].length || 4) * 18}px)`,
      }}
    >
      {m ? m.flat().map((v, i) => <i key={i} className={`tet-cell c${v}`} />) : <span>—</span>}
    </div>
  );
}
export default function TetrisBoard({
  state,
  name,
  active,
  act,
  controls = 'standard',
}: {
  state: TetrisState;
  name: string;
  active: boolean;
  controls?: 'standard' | 'p1' | 'p2';
  act: (data: Record<string, unknown>) => Promise<boolean>;
}) {
  const surface = useRef<HTMLElement>(null);
  const held = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const actRef = useRef(act);
  actRef.current = act;
  function release() {
    clearTimeout(held.current);
  }
  useEffect(() => {
    if (!active) release();
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      release();
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
    };
  }, [active]);
  function press(type: string) {
    release();
    void actRef.current({ type });
    if (['left', 'right', 'down'].includes(type)) {
      const repeat = () => {
        void actRef.current({ type });
        held.current = setTimeout(repeat, 75);
      };
      held.current = setTimeout(repeat, 160);
    }
  }
  useEffect(() => {
    if (active) surface.current?.focus({ preventScroll: true });
  }, [active]);
  useKeyboard(active, TETRIS_KEYS[controls], (type) => {
    void act({ type });
  });
  const cells = state.board.map((r) => [...r]),
    a = state.active;
  const fits = (y: number) =>
    a.matrix.every((row, dy) =>
      row.every((v, dx) => !v || (y + dy < 20 && (y + dy < 0 || !state.board[y + dy][a.x + dx]))),
    );
  if (!state.done) {
    let ghost = a.y;
    while (fits(ghost + 1)) ghost++;
    a.matrix.forEach((row, y) =>
      row.forEach((v, x) => {
        if (v && ghost + y >= 0) cells[ghost + y][a.x + x] = -v;
      }),
    );
    a.matrix.forEach((row, y) =>
      row.forEach((v, x) => {
        if (v && a.y + y >= 0) cells[a.y + y][a.x + x] = v;
      }),
    );
  }
  return (
    <section
      ref={surface}
      tabIndex={0}
      className={`tetris-player ${active ? 'is-mine' : ''}`}
      aria-label={`Bàn Tetris ${name}`}
    >
      <h3>
        {name}
        {active && <small>BẠN</small>}
      </h3>
      <BuffNotice notice={state.buffNotice} />
      <div className="tetris-machine">
        <aside className="tet-side">
          <div>
            <h4>GIỮ KHỐI</h4>
            <Piece type={state.hold} />
          </div>
          <div className="tet-level">
            <h4>CẤP ĐỘ</h4>
            <strong>{state.level}</strong>
            <p>{state.lines} hàng</p>
          </div>
        </aside>
        <div
          className="tet-well"
          role="img"
          aria-label={`${state.lines} hàng đã xóa, ${Math.round(state.score)} điểm`}
        >
          {cells.flat().map((v, i) => (
            <i key={i} className={`tet-cell c${Math.abs(v)} ${v < 0 ? 'ghost' : ''}`} />
          ))}
          {state.done && <div className="tet-ended">ĐÃ KẾT THÚC</div>}
        </div>
        <aside className="tet-side tet-next">
          <h4>TIẾP THEO</h4>
          {state.next.slice(0, 5).map((t, i) => (
            <Piece type={t} key={i} />
          ))}
          <div className="tet-points">
            <h4>ĐIỂM</h4>
            <strong>{Math.round(state.score)}</strong>
          </div>
        </aside>
      </div>
      {active && (
        <div className="tet-controls">
          {[
            ['left', '←'],
            ['rotate', '↻'],
            ['right', '→'],
            ['down', '↓'],
            ['drop', 'Thả nhanh'],
            ['hold', controls === 'p1' ? 'Giữ (Q)' : controls === 'p2' ? 'Giữ (Num 1)' : 'Giữ (C)'],
          ].map(([type, label]) => (
            <button
              key={type}
              data-action={type}
              aria-label={`Tetris ${type}`}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                press(type);
              }}
              onPointerUp={release}
              onPointerCancel={release}
              onLostPointerCapture={release}
              onClick={(e) => {
                if (e.detail === 0) void act({ type });
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
