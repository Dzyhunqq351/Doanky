// Adapted from MMarQs/FlappyBird, commit 39bca3db5c2fad5f392c3bd501731508372cd93c.
// Classic-style 60 Hz tuning, shared with the local client predictor.
import { W, H, PHYSICS, advanceVertical, pipeY } from './flappyPhysics.js';
import { pickBuff } from './buffPicker.js';
export { W, H, FPS, STEP, PHYSICS } from './flappyPhysics.js';
export function createBird(seed = 1) {
  return {
    y: H * 0.395,
    v: -PHYSICS.jump,
    frame: 0,
    pipes: [],
    score: 0,
    seed: seed >>> 0,
    alive: true,
    pickups: [],
    revives: 0,
    invincible: 0,
    frozenFrames: 0,
    reverseFrames: 0,
    respawnGraceFrames: 0,
    buffMilestone: 0,
    pendingBuff: null,
    buffNotice: null,
  };
}
export function flap(bird) {
  if (bird.alive) bird.v = -PHYSICS.jump;
}
export function stepBird(bird) {
  if (!bird.alive) return false;
  if (bird.frozenFrames > 0) {
    bird.frozenFrames--;
    return true;
  }
  if (bird.reverseFrames > 0) bird.reverseFrames--;
  if (bird.respawnGraceFrames > 0) bird.respawnGraceFrames--;
  advanceVertical(bird, 1);
  if (
    bird.frame >= PHYSICS.firstPipeFrame &&
    (bird.frame - PHYSICS.firstPipeFrame) % PHYSICS.pipeInterval === 0
  )
    bird.pipes.push({
      x: W,
      y: pipeY(bird.seed, (bird.frame - PHYSICS.firstPipeFrame) / PHYSICS.pipeInterval),
      scored: false,
    });
  bird.frame++;
  if (bird.y + PHYSICS.ry >= PHYSICS.ground) {
    bird.y = PHYSICS.ground - PHYSICS.ry;
    bird.alive = false;
  }
  for (const pipe of bird.pipes) {
    const top = pipe.y + PHYSICS.pipeH;
    if (
      PHYSICS.x + PHYSICS.rx > pipe.x &&
      PHYSICS.x - PHYSICS.rx < pipe.x + PHYSICS.pipeW &&
      (bird.y - PHYSICS.ry < top || bird.y + PHYSICS.ry > top + PHYSICS.gap)
    )
      if (!bird.invincible && !bird.respawnGraceFrames) bird.alive = false;
    if (bird.alive && !pipe.scored && pipe.x + PHYSICS.pipeW < PHYSICS.x - PHYSICS.rx) {
      bird.score++;
      pipe.scored = true;
      if (bird.invincible > 0) bird.invincible--;
      const milestone = Math.floor(bird.score / 10);
      if (milestone > bird.buffMilestone) {
        bird.buffMilestone = milestone;
        const buff = pickBuff(
          bird.seed,
          milestone,
          [
            { id: 'plus', weight: 45 },
            { id: 'steal', weight: 22 },
            { id: 'revive', weight: 18 },
            { id: 'freeze', weight: 10 },
            { id: 'invincible', weight: 5 },
          ],
          [
            { id: 'gift', weight: 45 },
            { id: 'reverse', weight: 35 },
            { id: 'zero', weight: 20 },
          ],
        );
        bird.pickups.push({
          x: W + 35,
          y: top + PHYSICS.gap / 2,
          id: buff.id,
          tone: buff.tone,
          serial: milestone,
        });
      }
    }
    pipe.x -= PHYSICS.dx;
  }
  bird.pipes = bird.pipes.filter((p) => p.x + PHYSICS.pipeW > 0);
  for (const item of bird.pickups) {
    item.x -= PHYSICS.dx;
    if (Math.hypot(item.x - PHYSICS.x, item.y - bird.y) < 30) {
      bird.pendingBuff = item.id;
      item.taken = true;
    }
  }
  bird.pickups = bird.pickups.filter((p) => !p.taken && p.x > -30);
  if (!bird.alive && bird.revives > 0) {
    const next = bird.pipes.find((p) => p.x > PHYSICS.x + PHYSICS.rx + 25);
    bird.revives--;
    bird.alive = true;
    bird.v = 0;
    bird.respawnGraceFrames = 90;
    bird.y = next ? next.y + PHYSICS.pipeH + PHYSICS.gap / 2 : H * 0.42;
  }
  return bird.alive;
}
export function resolveFlappyBuff(bird, opponent) {
  const id = bird.pendingBuff;
  if (!id) return null;
  bird.pendingBuff = null;
  const labels = {
    plus: '+10 điểm',
    revive: '+1 hồi sinh',
    invincible: 'Bất tử qua 5 ống',
    steal: 'Đối thủ −10 điểm',
    freeze: 'Đóng băng đối thủ 5 giây',
    zero: 'Mất toàn bộ điểm',
    gift: 'Tặng đối thủ 10 điểm',
    reverse: 'Đảo màn hình 5 giây',
  };
  if (id === 'plus') bird.score += 10;
  else if (id === 'revive') bird.revives++;
  else if (id === 'invincible') bird.invincible += 5;
  else if (id === 'zero') bird.score = 0;
  else if (id === 'reverse') bird.reverseFrames = 300;
  else if (opponent && id === 'steal') opponent.score = Math.max(0, opponent.score - 10);
  else if (opponent && id === 'freeze') opponent.frozenFrames = 300;
  else if (opponent && id === 'gift') opponent.score += 10;
  else bird.score += 5;
  bird.buffNotice = {
    id,
    label: labels[id],
    tone: ['zero', 'gift', 'reverse'].includes(id) ? 'bad' : 'good',
    serial: bird.buffMilestone,
  };
  return id;
}
export function frameOf(bird) {
  return {
    y: Math.round(bird.y * 100) / 100,
    v: Math.round(bird.v * 100) / 100,
    frame: bird.frame,
    score: bird.score,
    alive: bird.alive,
    pipes: bird.pipes.map((p) => [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]),
  };
}
