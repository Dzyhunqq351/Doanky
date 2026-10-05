import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Copy, Play, Users } from 'lucide-react';
import type { Room } from './useRooms';
import { gameNames } from '../games/LocalGame';
import FlappyBoard from '../games/FlappyBoard';
import TetrisBoard from '../../components/TetrisBoard';
import PikachuBoard from '../../components/PikachuBoard';
import Avatar from '../../components/Avatar';
import { clockText, type TetrisState, type PikachuState } from '../../lib/arcade';
import type { BirdState } from '../../../../shared/flappyEngine.js';
import { useGameAudio } from '../../lib/useGameAudio';
import GameGuide from '../games/GameGuide';
import { useGameFullscreen } from '../games/useGameFullscreen';
export default function OnlineRoom({
  room,
  userId,
  send,
  connected,
}: {
  room: Room;
  userId: string;
  send: (event: string, data?: unknown) => Promise<any>;
  connected: boolean;
}) {
  const [now, setNow] = useState(Date.now()),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false),
    [flapSignal, setFlapSignal] = useState(0);
  const surface = useRef<HTMLElement>(null),
    audio = useGameAudio(),
    anchor = useRef({ server: room.now, local: Date.now() }),
    previous = useRef({ score: 0, finished: false, id: room.matchId });
  useEffect(() => {
    anchor.current = { server: room.now, local: Date.now() };
  }, [room.now]);
  useEffect(() => {
    const timer = setInterval(
      () => setNow(anchor.current.server + Date.now() - anchor.current.local),
      100,
    );
    return () => clearInterval(timer);
  }, []);
  const me = room.players.findIndex((p) => p.id === userId),
    host = room.hostId === userId,
    match = room.match,
    countdown = Math.max(0, Math.ceil((room.startsAt - now) / 1000)),
    liveElapsed = match
      ? room.phase === 'playing' && match.phase === 'playing' && !countdown
        ? Math.max(match.elapsed, now - room.startsAt)
        : match.elapsed
      : 0,
    active =
      connected &&
      room.phase === 'playing' &&
      !countdown &&
      match?.phase === 'playing' &&
      match?.players[me]?.finishedAt === null;
  async function command(event: string, data?: unknown) {
    if (
      room.phase === 'playing' &&
      ['room:leave', 'room:stop'].includes(event) &&
      !window.confirm(
        room.game === 'pikachu'
          ? 'Rời trận được tính là bỏ cuộc. Tiếp tục?'
          : 'Kết thúc trận và chốt điểm hiện tại?',
      )
    )
      return false;
    setError('');
    try {
      await send(event, data);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  async function act(input: Record<string, unknown>) {
    if (!active) return false;
    if (room.game === 'flappy') {
      setFlapSignal((value) => value + 1);
      audio.play('flap');
    }
    const ok = await command('room:action', { ...input, matchId: room.matchId });
    return ok;
  }
  const actRef = useRef(act);
  actRef.current = act;
  useEffect(() => {
    if (active) surface.current?.focus({ preventScroll: true });
  }, [!!active]);
  useEffect(() => {
    if (room.game !== 'flappy') return;
    const key = (e: KeyboardEvent) => {
      if (
        ['Space', 'ArrowUp', 'KeyW'].includes(e.code) &&
        !e.repeat &&
        !(e.target as HTMLElement).closest('button,input,select,textarea')
      ) {
        e.preventDefault();
        void actRef.current({ type: 'flap' });
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [room.game]);
  useEffect(() => {
    const p = match?.players[me];
    if (!p) return;
    if (previous.current.id === room.matchId) {
      if (p.state.score > previous.current.score) audio.play('point');
      if (p.finishedAt !== null && !previous.current.finished && room.game === 'flappy')
        audio.play('hit');
    }
    previous.current = { score: p.state.score, finished: p.finishedAt !== null, id: room.matchId };
  }, [room.now]);
  const fullscreen = useGameFullscreen(surface, !!active);
  return (
    <section
      className={`local-game online-game ${room.game}${room.game === 'pikachu' ? ' solo' : ''}${fullscreen.className}`}
      ref={surface}
      tabIndex={-1}
      onPointerMove={fullscreen.reveal}
    >
      {fullscreen.menu}
      {match && (
        <div className="fullscreen-hud" aria-live="polite">
          <small>{match.limit ? 'THỜI GIAN CÒN' : 'THỜI GIAN'}</small>
          <strong>
            {clockText(match.limit ? Math.max(0, match.limit - liveElapsed) : liveElapsed)}
          </strong>
        </div>
      )}
      <header className="local-game-header">
        <button className="secondary" disabled={busy} onClick={() => void command('room:leave')}>
          <ArrowLeft size={16} />
          Rời phòng
        </button>
        <div>
          <h1>{gameNames[room.game]}</h1>
          <p>
            {room.name} · {room.private ? 'Riêng tư' : 'Công khai'} ·{' '}
            {connected ? 'Đã kết nối' : 'Đang kết nối lại…'}
          </p>
        </div>
        <div className="room-code">
          <small>MÃ PHÒNG</small>
          <strong>{room.code}</strong>
        </div>
        <button
          className="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${location.origin}/?room=${room.code}`);
              setCopied(true);
            } catch {
              setError('Không thể sao chép. Hãy gửi mã phòng cho bạn bè.');
            }
          }}
        >
          <Copy size={16} />
          {copied ? 'Đã sao chép' : 'Mời bạn'}
        </button>
      </header>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <p className="tag">
        {room.rules.timeLimit
          ? `Thời gian: ${clockText(room.rules.timeLimit)}`
          : 'Thời gian: Không giới hạn'}
        {room.game === 'pikachu' && (
          <>
            {' · '}Mỗi người: {room.rules.hints} gợi ý · {room.rules.swaps} đổi vị trí
            {' · '}
            {room.rules.ranking === 'time' ? 'Xếp theo thời gian hoàn thành' : 'Xếp theo điểm'}
          </>
        )}
      </p>
      <div className="online-roster">
        {room.players.map((p) => (
          <div key={p.id}>
            <Avatar index={p.avatar} small />
            <span>
              <b>
                {p.name}
                {p.id === userId ? ' · Bạn' : ''}
              </b>
              <small>
                {p.id === room.hostId ? 'Chủ phòng' : 'Người chơi'} ·{' '}
                {p.connected ? 'Sẵn sàng' : 'Mất kết nối'}
              </small>
            </span>
          </div>
        ))}
        {room.players.length < 2 && (
          <div className="empty-seat">
            <Users size={22} />
            <span>
              Đang chờ người thứ hai<small>Gửi link hoặc mã phòng để mời bạn bè.</small>
            </span>
          </div>
        )}
      </div>
      <div className="local-controls">
        {fullscreen.button}
        {host && (
          <button
            className="primary"
            disabled={
              busy ||
              !connected ||
              room.phase === 'playing' ||
              room.players.length < 2 ||
              room.players.some((p) => !p.connected)
            }
            onClick={async () => {
              setBusy(true);
              await command('room:start');
              setBusy(false);
            }}
          >
            <Play size={16} />
            {room.phase === 'results' ? 'Trận mới' : 'Bắt đầu trận'}
          </button>
        )}
        {host && room.phase === 'playing' && (
          <button className="secondary" onClick={() => void command('room:stop')}>
            Kết thúc trận
          </button>
        )}
        <button className="text-button" onClick={audio.toggle}>
          {audio.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        </button>
        {match && (
          <b className="online-time">
            {match.limit ? 'Còn ' : 'Đã chơi '}
            {clockText(
              match.limit
                ? Math.max(0, match.limit - liveElapsed)
                : liveElapsed,
            )}
          </b>
        )}
      </div>
      {!match ? (
        <div className="online-waiting">
          <h2>{room.players.length === 2 ? 'Đã đủ người chơi' : 'Phòng đã sẵn sàng'}</h2>
          <p>{host ? 'Bắt đầu khi đủ 2 người.' : 'Chờ chủ phòng bắt đầu.'}</p>
          <span className="tag">{gameNames[room.game]} · 2 tài khoản</span>
        </div>
      ) : (
        <div className="local-boards">
          {match.players.map(
            (p, i) =>
              (room.game !== 'pikachu' || i === me) && (
                <article className="local-player" key={`${room.matchId}:${i}`}>
                  <div className="local-player-head">
                    <span>
                      {room.players[i]?.name}
                      {i === me ? ' · Bạn' : ''}
                    </span>
                    <strong>
                      {p.state.score} <small>điểm</small>
                    </strong>
                  </div>
                  {room.game === 'flappy' ? (
                    <FlappyBoard
                      state={p.state as BirdState}
                      index={i}
                      active={!!active && i === me}
                      onFlap={() => void act({ type: 'flap' })}
                      network
                      flapSignal={i === me ? flapSignal : 0}
                    />
                  ) : room.game === 'tetris' ? (
                    <TetrisBoard
                      state={p.state as TetrisState}
                      name={room.players[i]?.name || p.name}
                      active={!!active && i === me}
                      act={act}
                    />
                  ) : (
                    <PikachuBoard
                      state={p.state as PikachuState}
                      disabled={!active || i !== me}
                      act={act}
                    />
                  )}
                  {p.finishedAt !== null && room.phase === 'playing' && (
                    <div className="player-finished">Đã kết thúc · {p.state.score} điểm</div>
                  )}
                </article>
              ),
          )}
          {countdown > 0 && room.phase === 'playing' && (
            <div className="local-overlay">
              <strong>{countdown}</strong>
              <p>
                Chuẩn bị bắt đầu.
              </p>
            </div>
          )}
        </div>
      )}
      {room.phase === 'results' && (
        <section className="local-results">
          <h2>Kết quả trận đấu</h2>
          {room.results.map((p) => (
            <div key={p.playerId}>
              <b>#{p.rank}</b>
              <span>
                {p.name}
                {room.game === 'pikachu' && (
                  <small>
                    {p.forfeited
                      ? ' · Bỏ cuộc'
                      : p.completed
                        ? ' · Hoàn thành'
                        : ' · Chưa hoàn thành'}
                  </small>
                )}
              </span>
              <strong>{p.score} điểm</strong>
              <small>{clockText(p.elapsed)}</small>
            </div>
          ))}
          <p>
            {room.persistence === 'saved'
              ? 'Đã lưu cho cả hai tài khoản.'
              : room.persistence === 'failed'
                ? 'Chưa lưu được vào cơ sở dữ liệu.'
                : 'Đang lưu kết quả…'}
          </p>
        </section>
      )}
      <GameGuide game={room.game} />
      <p className="local-help">
        {room.game === 'flappy'
          ? 'Space / ↑ / chạm để bay.'
          : room.game === 'tetris'
            ? '← → di chuyển · ↑ xoay · ↓ hạ · Space thả · C giữ khối.'
            : 'Nối hai quân giống nhau · Gợi ý −30 điểm · Đổi vị trí −10 điểm.'}{' '}
        {room.game === 'pikachu'
          ? 'Hai người chơi đồng thời; bàn và tiến độ đối thủ được ẩn đến khi có kết quả.'
          : 'Mỗi tài khoản điều khiển màn hình của mình.'}
      </p>
    </section>
  );
}
