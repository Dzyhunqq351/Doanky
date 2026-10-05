import { useEffect, useRef } from 'react';
import { PHYSICS, type BirdState } from '../../../../shared/flappyEngine.js';
import { advanceVertical } from '../../../../shared/flappyPhysics.js';
import BuffNotice from '../../components/BuffNotice';
export default function FlappyBoard({
  state,
  onFlap,
  active,
  index,
  network = false,
  flapSignal = 0,
}: {
  state: BirdState;
  onFlap: () => void;
  active: boolean;
  index: number;
  network?: boolean;
  flapSignal?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    current = useRef(state),
    visual = useRef<{ y: number; v: number; seed: number; alive: boolean } | null>(null),
    lastFlap = useRef(flapSignal);
  const received = useRef(performance.now());
  if (current.current !== state) received.current = performance.now();
  current.current = state;
  useEffect(() => {
    if (!network || flapSignal === lastFlap.current) return;
    lastFlap.current = flapSignal;
    if (visual.current?.alive) visual.current.v = -PHYSICS.jump;
  }, [flapSignal, network]);
  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!,
      sprite = new Image();
    sprite.src = '/flappy/sprite_sheet.png';
    let viewWidth = 360;
    const resize = new ResizeObserver(() => {
      const element = canvas.current;
      if (!element) return;
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      viewWidth = Math.max(360, (width / height) * 640);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
    });
    resize.observe(canvas.current!);
    let frame = 0,
      lastDraw = performance.now();
    const draw = () => {
      const now = performance.now(),
        deltaFrames = Math.min(3, Math.max(0, now - lastDraw) / (1000 / 60));
      lastDraw = now;
      let b = current.current;
      if (network && b.alive) {
        const frames = Math.min(120, now - received.current) / (1000 / 60);
        b = { ...b, pipes: b.pipes.map((p) => ({ ...p, x: p.x - PHYSICS.dx * frames })) };
        advanceVertical(b, frames);
        b.y = Math.min(PHYSICS.ground - PHYSICS.ry, b.y);
        const shown = visual.current;
        if (
          !shown ||
          shown.seed !== b.seed ||
          shown.alive !== b.alive ||
          Math.abs(shown.y - b.y) > 110
        )
          visual.current = { y: b.y, v: b.v, seed: b.seed, alive: b.alive };
        else {
          advanceVertical(shown, deltaFrames);
          const blend = Math.min(0.24, 0.1 * deltaFrames);
          shown.y += (b.y - shown.y) * blend;
          shown.v += (b.v - shown.v) * Math.min(0.14, 0.055 * deltaFrames);
          shown.y = Math.min(PHYSICS.ground - PHYSICS.ry, Math.max(PHYSICS.ry, shown.y));
          b.y = shown.y;
          b.v = shown.v;
        }
      } else if (network) {
        visual.current = { y: b.y, v: b.v, seed: b.seed, alive: b.alive };
      }
      const element = canvas.current!;
      ctx.setTransform(element.width / viewWidth, 0, 0, element.height / 640, 0, 0);
      const offset = (viewWidth - 360) / 2;
      ctx.fillStyle = '#99e3f7';
      ctx.fillRect(0, 0, viewWidth, 640);
      ctx.save();
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
