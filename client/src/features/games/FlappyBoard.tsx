import { useEffect, useRef } from 'react';
import { PHYSICS, type BirdState } from '../../../../shared/flappyEngine.js';
import { presentBird, type BirdVisual } from '../../../../shared/flappyPresentation.js';
import BuffNotice from '../../components/BuffNotice';
export default function FlappyBoard({
  state,
  onFlap,
  active,
  index,
  network = false,
  flapSignal = 0,
  acknowledged = 0,
  running = active,
}: {
  state: BirdState;
  onFlap: () => void;
  active: boolean;
  index: number;
  network?: boolean;
  flapSignal?: number;
  acknowledged?: number;
  running?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    current = useRef(state),
    visual = useRef<BirdVisual | null>(null),
    lastFlap = useRef(flapSignal);
  const motion = useRef({ running, acknowledged, flapSignal });
  motion.current = { running, acknowledged, flapSignal };
  const received = useRef(performance.now());
  if (current.current !== state) received.current = performance.now();
  current.current = state;
  useEffect(() => {
    if (!network || flapSignal === lastFlap.current) return;
    const freshInput = flapSignal > lastFlap.current;
    lastFlap.current = flapSignal;
    if (freshInput && visual.current?.alive) visual.current.v = -PHYSICS.jump;
  }, [flapSignal, network]);
  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!,
      sprite = new Image();
    sprite.src = '/flappy/sprite_sheet.png';
    let viewWidth = 360,
      viewHeight = 640;
    const resize = new ResizeObserver(() => {
      const element = canvas.current;
      if (!element) return;
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      const scale = Math.min(width / 360, height / 640);
      viewWidth = width / scale;
      viewHeight = height / scale;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelsWide = Math.round(width * ratio),
        pixelsHigh = Math.round(height * ratio);
      if (element.width !== pixelsWide) element.width = pixelsWide;
      if (element.height !== pixelsHigh) element.height = pixelsHigh;
    });
    resize.observe(canvas.current!);
    let frame = 0,
      lastDraw = performance.now();
    const draw = () => {
      // React can detach the canvas before passive effect cleanup runs.
      const element = canvas.current;
      if (!element) return;
      const now = performance.now(),
        dt = now - lastDraw;
      lastDraw = now;
      let b = current.current;
      if (network) {
        const shown = presentBird(b, visual.current, {
          dt,
          age: now - received.current,
          running: motion.current.running,
          pendingFlap: motion.current.flapSignal > motion.current.acknowledged,
        });
        visual.current = shown;
        const travel = (shown.frame - b.frame) * PHYSICS.dx;
        b = {
          ...b,
          y: shown.y,
          v: shown.v,
          frame: shown.frame,
          pipes: b.pipes.map((p) => ({ ...p, x: p.x - travel })),
          pickups: b.pickups.map((p) => ({ ...p, x: p.x - travel })),
        };
      }
      ctx.setTransform(element.width / viewWidth, 0, 0, element.height / viewHeight, 0, 0);
      const offset = (viewWidth - 360) / 2;
      const offsetY = (viewHeight - 640) / 2;
      ctx.fillStyle = '#99e3f7';
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      ctx.fillStyle = '#d8cf85';
      ctx.fillRect(0, PHYSICS.ground + offsetY, viewWidth, viewHeight);
      ctx.save();
      ctx.translate(0, offsetY);
      if (b.reverseFrames > 0) {
        ctx.translate(viewWidth, 0);
        ctx.scale(-1, 1);
      }
      if (sprite.complete && sprite.naturalWidth) {
        for (let x = 0; x < viewWidth; x += 360)
          ctx.drawImage(sprite, 0, 392, 552, 408, x, 315, 360, 266);
        ctx.save();
        ctx.translate(offset, 0);
        for (const p of b.pipes) {
          ctx.drawImage(sprite, 1001, 0, 104, 800, p.x, p.y, PHYSICS.pipeW, PHYSICS.pipeH);
          ctx.drawImage(
            sprite,
            1105,
            0,
            104,
            800,
            p.x,
            p.y + PHYSICS.pipeH + PHYSICS.gap,
            PHYSICS.pipeW,
            PHYSICS.pipeH,
          );
        }
        for (const item of b.pickups || []) {
          const harmful = ['zero', 'gift', 'reverse'].includes(item.id);
          ctx.beginPath();
          ctx.arc(item.x, item.y, 18, 0, Math.PI * 2);
          ctx.fillStyle = harmful ? '#fb7185' : '#facc15';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 14;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#102238';
          ctx.font = 'bold 18px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('?', item.x, item.y + 6);
        }
        for (let x = -offset - ((b.frame * PHYSICS.dx) % 252); x < viewWidth - offset; x += 251)
          ctx.drawImage(sprite, 553, 576, 447, 224, x, PHYSICS.ground, 252, 116);
        ctx.save();
        ctx.translate(PHYSICS.x, b.y);
        ctx.rotate(b.alive ? Math.max(-0.43, Math.min(1.4, (b.v - 1) * 0.19)) : 1.5);
        if (index === 1) ctx.filter = 'hue-rotate(130deg)';
        ctx.drawImage(
          sprite,
          932,
          429 + (Math.floor(b.frame / 5) % 3) * 49,
          68,
          48,
          -21,
          -15,
          42,
          30,
        );
        ctx.restore();
        ctx.restore();
      }
      ctx.restore();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [index, network]);
  return (
    <div className="flappy-surface">
      <BuffNotice notice={state.buffNotice} />
      <div className="flappy-powers">
        {state.revives > 0 && <span>Hồi sinh ×{state.revives}</span>}
        {state.invincible > 0 && <span>Bất tử {state.invincible} ống</span>}
      </div>
      <canvas
        className="local-flappy-canvas"
        width={360}
        height={640}
        ref={canvas}
        aria-label={`Flappy Bird người ${index + 1}`}
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault();
          if (active) onFlap();
        }}
      />
    </div>
  );
}
