import { useState } from 'react';
import { ArrowRight, Users } from 'lucide-react';
import type { LocalGame } from '../../../../shared/localMatch.js';
import { gameNames } from '../games/LocalGame';
import type { Listing } from './useRooms';
import './rooms.css';
const timeOptions = [
  [0, 'Không giới hạn'],
  [15000, '15 giây'],
  [30000, '30 giây'],
  [60000, '1 phút'],
  [120000, '2 phút'],
  [180000, '3 phút'],
  [300000, '5 phút'],
  [600000, '10 phút'],
  [1800000, '30 phút'],
] as const;
export default function RoomLauncher({
  game,
  onClose,
  send,
  connected,
}: {
  game: LocalGame | 'join';
  onClose: () => void;
  send: (event: string, data?: unknown) => Promise<any>;
  connected: boolean;
}) {
  const [code, setCode] = useState(new URLSearchParams(location.search).get('room') || ''),
    [privateRoom, setPrivate] = useState(false),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [hints, setHints] = useState(3),
    [swaps, setSwaps] = useState(5),
    [ranking, setRanking] = useState('score'),
    [timeLimit, setTimeLimit] = useState(180000);
  return (
    <section className="room-launcher" aria-label={game === 'join' ? 'Vào phòng' : 'Tạo phòng'}>
      <div>
        <h2>{game === 'join' ? 'Vào phòng của bạn bè' : `Tạo phòng ${gameNames[game]}`}</h2>
        <button className="text-button" onClick={onClose}>
          Đóng
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await send(game === 'join' ? 'room:join' : 'room:create', {
              game,
              code,
              name,
              password,
              private: privateRoom,
              rules: { hints, swaps, ranking, timeLimit },
            });
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {game === 'join' ? (
          <label>
            Mã phòng
            <input
              required
              autoFocus
              maxLength={8}
              minLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="8 ký tự"
            />
          </label>
        ) : (
          <>
            <label>
              Tên phòng
              <input
                maxLength={48}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên phòng (không bắt buộc)"
              />
            </label>
            <label className="room-check">
              <input
                type="checkbox"
                checked={privateRoom}
                onChange={(e) => setPrivate(e.target.checked)}
              />
              Phòng riêng có mật khẩu
            </label>
          </>
        )}
        {(game === 'join' || privateRoom) && (
          <label>
            Mật khẩu {game === 'join' ? '(nếu có)' : ''}
            <input
              type="password"
              autoComplete="off"
              required={game !== 'join' && privateRoom}
              minLength={game !== 'join' ? 4 : undefined}
              maxLength={64}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {game !== 'join' && (
          <label>
            Thời gian trận
            <select value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))}>
              {timeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {game === 'pikachu' && (
          <>
            <label>
              Xếp hạng theo
              <select value={ranking} onChange={(e) => setRanking(e.target.value)}>
                <option value="score">Điểm cao nhất</option>
                <option value="time">Thời gian hoàn thành</option>
              </select>
            </label>
            <label>
              Gợi ý mỗi người (−30 điểm/lần)
              <input
                type="number"
                required
                min={0}
                max={10}
                step={1}
                value={hints}
                onChange={(e) => setHints(e.target.valueAsNumber)}
              />
            </label>
            <label>
              Đổi vị trí mỗi người (−10 điểm/lần)
              <input
                type="number"
                required
                min={0}
                max={10}
                step={1}
                value={swaps}
                onChange={(e) => setSwaps(e.target.valueAsNumber)}
              />
            </label>
          </>
        )}
        <button className="primary" disabled={busy || !connected}>
          {busy ? 'Đang xử lý…' : game === 'join' ? 'Vào phòng' : 'Tạo phòng'}
          <ArrowRight size={17} />
        </button>
      </form>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
export function RoomList({ rooms, join }: { rooms: Listing[]; join: (code: string) => void }) {
  const [query, setQuery] = useState(''),
    [game, setGame] = useState('all'),
    [available, setAvailable] = useState(false),
    [expanded, setExpanded] = useState(false);
  const filtered = rooms.filter(
    (r) =>
      (game === 'all' || r.game === game) &&
      (!available || (r.count < r.capacity && r.phase !== 'playing')) &&
      `${r.name} ${r.code}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')),
  );
  const visibleRooms = expanded ? filtered : filtered.slice(0, 2);
  if (!rooms.length) return null;
  return (
    <section className="room-list-panel">
      <div
        className="hub-section-head"
        style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2>Phòng chờ</h2>
          <span className="tag">{rooms.length} phòng</span>
        </div>
        <div className="room-filters" style={{ margin: 0, gap: '10px' }}>
          <label>
            Tìm phòng
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tên hoặc mã phòng"
            />
          </label>
          <label>
            Trò chơi
            <select value={game} onChange={(e) => setGame(e.target.value)}>
              <option value="all">Tất cả game</option>
              {Object.entries(gameNames).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
              />{' '}
              Chỉ phòng còn chỗ
            </span>
          </label>
        </div>
      </div>
      {filtered.length ? (
        <>
          <div className="room-rows">
            {visibleRooms.map((r) => (
              <div key={r.code}>
                <span className="room-game-icon">
                  <Users size={21} />
                </span>
                <span>
                  <b>{r.name}</b>
                  <small>
                    {gameNames[r.game]} · {r.code}
                  </small>
                </span>
                <span>
                  {r.count}/{r.capacity}
                </span>
                <button
                  className="secondary compact"
                  disabled={r.phase === 'playing' || r.count >= r.capacity}
                  onClick={() => join(r.code)}
                >
                  {r.phase === 'playing'
                    ? 'Đang chơi'
                    : r.count >= r.capacity
                      ? 'Đã đầy'
                      : 'Tham gia'}
                </button>
              </div>
            ))}
          </div>
          {filtered.length > 2 && (
            <button
              className="secondary"
              style={{
                width: '100%',
                marginTop: '12px',
                border: '1px solid var(--line)',
                borderRadius: '10px',
              }}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Thu gọn' : `Xem thêm ${filtered.length - 2} phòng`}
            </button>
          )}
        </>
      ) : (
        <p className="room-empty">
          {rooms.length
            ? 'Không có phòng phù hợp. Thử đổi bộ lọc hoặc từ khóa.'
            : 'Chưa có phòng public. Chọn một game phía trên để tạo phòng đầu tiên.'}
        </p>
      )}
    </section>
  );
}
