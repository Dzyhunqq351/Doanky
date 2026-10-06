import { useEffect, useRef, useState } from 'react';
import {
  createLocalMatch,
  localAction,
  stepLocalMatch,
  finishLocalMatch,
  type LocalGame,
  type LocalMode,
} from '../../../../shared/localMatch.js';
import { useGameAudio } from '../../lib/useGameAudio';
import { flappyPlayer } from '../../../../shared/controls.js';
import { createDuel, dealTurn, duelAction } from '../../../../shared/pikachuDuel.js';
export function useLocalGame(game: LocalGame, mode: LocalMode, names: string[]) {
  const sequential = game === 'pikachu' && mode === 'local';
  function makeMatch() {
    if (!sequential)
      return createLocalMatch(game, mode, crypto.getRandomValues(new Uint32Array(1))[0], names);
    const next = createDuel(names, {
      hints: 3,
      swaps: 5,
      ranking: 'score',
      timeLimit: 7 * 60 * 1000,
    });
    next.phase = 'ready';
    return next;
  }
  const [run, setRun] = useState(() => ({
    id: crypto.randomUUID(),
    match: makeMatch(),
  }));
  const [version, render] = useState(0),
    [countdown, setCountdown] = useState(3),
    [notice, setNotice] = useState('');
  const countdownAt = useRef(0),
    audio = useGameAudio(),
    audioRef = useRef(audio);
  audioRef.current = audio;
  const match = run.match;
  function start() {
    if (sequential) dealTurn(match);
    match.phase = 'countdown';
    countdownAt.current = performance.now();
    setCountdown(3);
    render((v) => v + 1);
  }
  function pause() {
    if (match.phase === 'playing') {
      match.phase = 'paused';
      render((v) => v + 1);
    }
  }
  function resume() {
    match.phase = 'playing';
    render((v) => v + 1);
  }
  function restart() {
    setRun({
      id: crypto.randomUUID(),
      match: makeMatch(),
    });
    setNotice('');
  }
  async function act(index: number, input: Record<string, unknown>) {
    try {
      const ok = sequential
        ? (duelAction(match, index, input), true)
        : localAction(match, index, input);
      if (ok && game === 'flappy') audioRef.current.play('flap');
      render((v) => v + 1);
      return ok;
    } catch (e) {
      setNotice((e as Error).message);
      return false;
    }
  }
  const actRef = useRef(act);
  actRef.current = act;
  useEffect(() => {
    let handle = 0,
      last = performance.now(),
      paint = 0,
      previousView = '';
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (match.phase === 'countdown') {
        const left = 3 - Math.floor((now - countdownAt.current) / 1000);
        setCountdown(Math.max(0, left));
        if (left <= 0) match.phase = 'playing';
      }
      const before = match.players.map((p) => ({
        score: p.state.score,
        done: p.finishedAt !== null,
      }));
      if (sequential) {
        if (match.phase === 'playing') {
          match.elapsed += Math.min(dt, 100);
          if (match.limit && match.elapsed >= match.limit) {
            match.elapsed = match.limit;
            duelAction(match, match.turn!, { type: 'finish-turn' });
          }
        }
      } else stepLocalMatch(match, dt);
      match.players.forEach((p, i) => {
        if (p.state.score > before[i].score) audioRef.current.play('point');
        if (p.finishedAt !== null && !before[i].done && game === 'flappy')
          audioRef.current.play('hit');
      });
      // Canvas reads the live Flappy state at display refresh rate. React only
      // updates HUD seconds, phase, or visible board changes, not 144 tiles 20x/s.
      const view = `${match.phase}:${match.turn}:${match.players
        .map((p) => {
          const s = p.state as {
            score: number;
            active?: { x: number; y: number; type: string };
            revision?: number;
          };
          return `${s.score},${p.finishedAt},${s.revision},${s.active?.x},${s.active?.y},${s.active?.type}`;
        })
        .join('|')}`;
      if (now - paint >= 250 || view !== previousView) {
        render((v) => v + 1);
        paint = now;
        previousView = view;
      }
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    const hidden = () => {
      if (document.hidden) {
        if (match.phase === 'playing') match.phase = 'paused';
        else if (match.phase === 'countdown')
          match.phase = sequential && match.turn === 1 ? 'turn-ready' : 'ready';
        render((v) => v + 1);
      }
    };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      cancelAnimationFrame(handle);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [run]);
  useEffect(() => {
    if (game !== 'flappy') return;
    const key = (e: KeyboardEvent) => {
      if (e.repeat || (e.target as HTMLElement).closest('input,textarea,select,button')) return;
      const index = flappyPlayer(e.code, mode);
      if (index >= 0) {
        e.preventDefault();
        void actRef.current(index, { type: 'flap' });
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [game, mode]);
  return {
    match,
    id: run.id,
    version,
    countdown,
    notice,
    audio,
    start,
    pause,
    resume,
    restart,
    act,
    stop: () => {
      if (sequential) {
        match.phase = 'playing';
        duelAction(match, match.turn!, { type: 'finish-turn' });
      } else finishLocalMatch(match);
      render((v) => v + 1);
    },
  };
}
