import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  localResults,
  type LocalGame as Game,
  type LocalMode,
} from '../../../../shared/localMatch.js';
import type { BirdState } from '../../../../shared/flappyEngine.js';
import { type PikachuState, type TetrisState, clockText } from '../../lib/arcade';
import TetrisBoard from '../../components/TetrisBoard';
import PikachuBoard from '../../components/PikachuBoard';
import FlappyBoard from './FlappyBoard';
import { useLocalGame } from './useLocalGame';
import { api } from '../../lib/api';
import './games.css';
import GameGuide from './GameGuide';
import { useGameFullscreen } from './useGameFullscreen';
import { duelResults } from '../../../../shared/pikachuDuel.js';
export const gameNames = { flappy: 'Flappy Bird', pikachu: 'Pikachu', tetris: 'Tetris' };
export default function LocalGame({
  game,
  mode,
  name,
  onExit,
}: {
  game: Game;
  mode: LocalMode;
  name: string;
  onExit: () => void;
}) {
  const [second, setSecond] = useState('Người chơi 2'),
    [ranking, setRanking] = useState<'score' | 'time'>('score');
  const sequential = game === 'pikachu' && mode === 'local';
  const names = [name, mode === 'bot' ? 'Máy luyện tập' : second];
  const controller = useLocalGame(game, mode, names),
    { match, id, version, countdown, notice, audio } = controller;
  const surface = useRef<HTMLElement>(null),
    saved = useRef(''),
    [saving, setSaving] = useState(false),
    [saveStatus, setSaveStatus] = useState(''),
    [failed, setFailed] = useState(false),
    [finishRequested, setFinishRequested] = useState(false);
  useEffect(() => {
    if (match.phase === 'playing') surface.current?.focus({ preventScroll: true });
  }, [match.phase]);
  async function save() {
    setSaving(true);
    setFailed(false);
    try {
      await api('/matches', 'POST', {
        id,
        game,
        mode,
        ranking: match.ranking,
        results: [...(sequential ? duelResults(match) : localResults(match))].sort(
          (a, b) => a.index - b.index,
        ),
      });
      setSaveStatus('Đã lưu vào lịch sử tài khoản.');
    } catch (e) {
      setSaveStatus((e as Error).message);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    if (match.phase === 'results' && saved.current !== id) {
      saved.current = id;
      void save();
    }
  }, [version]);
  const results = sequential ? duelResults(match) : localResults(match),
    playing = match.phase === 'playing',
    displayElapsed =
      game === 'pikachu'
        ? Math.max(
            0,
            match.elapsed -
              ((match.players[match.turn ?? 0]?.state as PikachuState | undefined)?.timeCredit ||
                0),
          )
        : match.elapsed;
  const fullscreen = useGameFullscreen(surface, playing);
  return (
    <section
      className={`local-game ${game} ${mode === 'single' || sequential ? 'solo' : 'split'}${fullscreen.className}`}
      ref={surface}
      tabIndex={-1}
      onPointerMove={fullscreen.reveal}
    >
      <header className="local-game-header">
        <button
          className="secondary"
          onClick={() => {
            if (
              ['ready', 'results'].includes(match.phase) ||
              window.confirm('Rời lượt chơi chưa hoàn thành? Điểm của lượt này sẽ không được lưu.')
            )
              onExit();
          }}
        >
          <ArrowLeft size={16} />
          Về sảnh
        </button>
        <div>
          <h1>{gameNames[game]}</h1>
          <p>
            {mode === 'local'
              ? sequential
                ? '2 người thay phiên · 7 phút/người · Hai map riêng'
                : '2 người cùng máy'
              : mode === 'bot'
                ? 'Luyện với máy'
                : 'Chơi đơn'}
          </p>
        </div>
        <div className="local-clock">
          <small>{match.limit ? 'THỜI GIAN CÒN' : 'THỜI GIAN'}</small>
          <strong>{clockText(match.limit ? match.limit - displayElapsed : displayElapsed)}</strong>
        </div>
        <button
          className="secondary"
          aria-label={audio.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          onClick={audio.toggle}
        >
          {audio.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </header>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="fullscreen-hud" aria-live="polite">
        <small>{match.limit ? 'THỜI GIAN CÒN' : 'THỜI GIAN'}</small>
        <strong>{clockText(match.limit ? Math.max(0, match.limit - displayElapsed) : displayElapsed)}</strong>
      </div>
      <div className="local-controls">
        {fullscreen.button}
        <button
          className="primary"
          disabled={!['ready', 'paused', 'turn-ready'].includes(match.phase)}
          onClick={() => {
            if (['ready', 'turn-ready'].includes(match.phase)) {
              match.players.forEach((p, i) => (p.name = names[i]));
              if (sequential && match.phase === 'ready') match.ranking = ranking;
              controller.start();
            } else controller.resume();
          }}
        >
          <Play size={16} />
          {match.phase === 'paused'
            ? 'Tiếp tục'
            : sequential
              ? `Bắt đầu lượt ${(match.turn ?? 0) + 1}`
              : 'Bắt đầu'}
        </button>
        <button className="secondary" disabled={!playing} onClick={controller.pause}>
          <Pause size={16} />
          Tạm dừng
        </button>
        <button
          className="secondary"
          disabled={match.phase !== 'results'}
          onClick={() => {
            controller.restart();
            setSaveStatus('');
          }}
        >
          <RotateCcw size={16} />
          Chơi lại
        </button>
        <button
          className="text-button"
          disabled={!['playing', 'paused'].includes(match.phase)}
          onClick={() => {
            if (!sequential || finishRequested) {
              controller.stop();
              setFinishRequested(false);
            } else setFinishRequested(true);
          }}
        >
          {finishRequested ? 'Xác nhận kết thúc lượt' : 'Kết thúc lượt'}
        </button>
        {finishRequested && (
          <>
            <span>Lượt này sẽ ghi là chưa hoàn thành.</span>
            <button className="text-button" onClick={() => setFinishRequested(false)}>
              Tiếp tục chơi
            </button>
          </>
        )}
        {mode === 'local' && match.phase === 'ready' && (
          <label>
            Tên người 2
            <input
              value={second}
              maxLength={24}
              onChange={(e) => setSecond(e.target.value || 'Người chơi 2')}
            />
          </label>
        )}
      </div>
      {sequential && match.phase === 'ready' && (
        <label className="ranking-select">
          Xếp hạng theo{' '}
          <select
            value={ranking}
            onChange={(e) => {
              setRanking(e.target.value as 'score' | 'time');
            }}
          >
            <option value="score">Điểm cao nhất</option>
            <option value="time">Thời gian hoàn thành</option>
          </select>
        </label>
      )}
      {sequential && match.phase === 'turn-ready' && (
        <div className="turn-wait">
          <h2>Đến lượt {names[1]}</h2>
          <p>
            {names[0]}: {match.players[0].state.score} điểm ·{' '}
            {clockText(match.players[0].finishedAt ?? 0)}. Người chơi 2 có một bàn mới và 7 phút;
            bấm Bắt đầu lượt 2 khi sẵn sàng.
          </p>
        </div>
      )}
      <div className="local-boards">
        {match.players.map(
          (p, i) =>
            (!sequential ||
              (i === match.turn && !['ready', 'turn-ready', 'results'].includes(match.phase))) && (
              <article className="local-player" key={`${id}:${i}`}>
                <div className="local-player-head">
                  <span>
                    P{i + 1} · {match.phase === 'ready' ? names[i] : p.name}
                  </span>
                  <strong>
                    {p.state.score} <small>điểm</small>
                  </strong>
                </div>
                {game === 'flappy' ? (
                  <FlappyBoard
                    state={p.state as BirdState}
                    active={playing && p.finishedAt === null && !(mode === 'bot' && i === 1)}
                    index={i}
                    onFlap={() => void controller.act(i, { type: 'flap' })}
                  />
                ) : game === 'tetris' ? (
                  <TetrisBoard
                    state={p.state as TetrisState}
                    name={p.name}
                    active={playing && p.finishedAt === null && !(mode === 'bot' && i === 1)}
                    controls={mode === 'local' ? (i === 0 ? 'p1' : 'p2') : 'standard'}
                    act={(input) => controller.act(i, input)}
                  />
                ) : (
                  <PikachuBoard
                    state={p.state as PikachuState}
                    disabled={!playing || p.finishedAt !== null || (mode === 'bot' && i === 1)}
                    act={(input) => controller.act(i, input)}
                  />
                )}
                {p.finishedAt !== null && match.phase !== 'results' && (
                  <div className="player-finished">
                    Đã kết thúc · {p.state.score} điểm
                    <br />
                    <small>Đang chờ người còn lại.</small>
                  </div>
                )}
              </article>
            ),
        )}
        {['ready', 'countdown', 'paused'].includes(match.phase) && (
          <div className="local-overlay">
            <strong>
              {match.phase === 'countdown'
                ? countdown
                : match.phase === 'paused'
                  ? 'Tạm dừng'
                  : 'Sẵn sàng?'}
            </strong>
            <p>
              {match.phase === 'ready'
                ? 'Bấm Bắt đầu để chơi.'
                : match.phase === 'paused'
                  ? 'Bấm Tiếp tục để chơi.'
                  : sequential
                    ? `Lượt ${(match.turn ?? 0) + 1}`
                    : 'Chuẩn bị bắt đầu.'}
            </p>
          </div>
        )}
      </div>
      <p className="local-help">
        {game === 'flappy'
          ? mode === 'local'
            ? 'Người 1: W / Space · Người 2: ↑ / NumPad 0.'
            : 'Space, ↑ hoặc chạm để bay.'
          : game === 'tetris'
            ? mode === 'local'
              ? 'Người 1: WASD · Space thả · Q giữ. Người 2: mũi tên · NumPad 0 thả · NumPad 1 giữ.'
              : '← → di chuyển · ↑ xoay · ↓ hạ · Space thả · C giữ.'
            : 'Nối hai quân giống nhau với tối đa 2 góc rẽ. Gợi ý −30 điểm · Đổi vị trí −10 điểm.'}{' '}
        {mode !== 'single' && game === 'tetris'
          ? 'Cùng chuỗi khối, chơi đến khi kết thúc và so điểm.'
          : ''}
      </p>
      {match.phase === 'results' && (
        <section className="local-results" aria-label="Kết quả lượt chơi">
          {sequential && (
            <p>Xếp hạng: {match.ranking === 'time' ? 'Thời gian hoàn thành' : 'Điểm cao nhất'}</p>
          )}
          <h2>
            {results.length === 1
              ? 'Hoàn thành lượt chơi'
              : results[0].rank === results[1].rank
                ? 'Hòa'
                : `${results[0].name} chiến thắng!`}
          </h2>
          {results.map((r) => (
            <div key={r.index}>
              <b>#{r.rank}</b>
              <span>
                {r.name}
                {'completed' in r && (
                  <small>{r.completed ? ' · Hoàn thành' : ' · Chưa hoàn thành'}</small>
                )}
              </span>
              <strong>{r.score} điểm</strong>
              <small>{clockText(r.elapsed)}</small>
            </div>
          ))}
          <p role="status">{saving ? 'Đang lưu kết quả…' : saveStatus}</p>
          {failed && (
            <button className="secondary" disabled={saving} onClick={() => void save()}>
              Thử lưu lại
            </button>
          )}
          <button
            className="primary"
            onClick={() => {
              controller.restart();
              setSaveStatus('');
            }}
          >
            Chơi lượt mới
          </button>
        </section>
      )}
      {fullscreen.menu}
      <GameGuide game={game} />
    </section>
  );
}
