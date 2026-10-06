import test from 'node:test';
import assert from 'node:assert/strict';
import { OnlineRoomService } from '../src/services/onlineRoomService.js';
import { createBird, PHYSICS } from '../shared/flappyEngine.js';
import { presentBird } from '../shared/flappyPresentation.js';

function socket() {
  return {
    connected: true,
    events: [],
    join() {},
    leave() {},
    disconnect() {},
    emit(event, data) {
      this.events.push({ event, data: structuredClone(data) });
    },
  };
}
test('leaving a live room releases both players and late persistence cannot revive the round', async () => {
  const jobs = [];
  const service = new OnlineRoomService(
    { emit() {} },
    { autoTick: false, persist: () => new Promise((resolve) => jobs.push(resolve)) },
  );
  const host = { id: 'host', name: 'Host', avatar: 0 },
    peer = { id: 'peer', name: 'Peer', avatar: 1 };
  const a = socket(),
    b = socket();
  service.connect(a, host);
  service.connect(b, peer);
  const { code } = await service.create(host, { game: 'flappy' });
  await service.join(peer, { code });
  service.start(host);
  const room = service.rooms.get(code);
  service.leave(host);
  assert.equal(room.phase, 'waiting');
  assert.equal(room.match, null);
  assert.equal(room.matchId, '');
  assert.equal(room.hostId, peer.id);
  jobs.forEach((resolve) => resolve(true));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(b.events.at(-1).data.match, null);
  assert.equal(b.events.at(-1).data.persistence, 'none');
  service.leave(peer);
  service.leave(peer);
  assert.equal(b.events.at(-1).data, null);
  assert.equal(service.rooms.size, 0);
  assert.equal(service.members.size, 0);
  await service.create(peer, { game: 'tetris' });
  assert.equal(service.rooms.size, 1);
});
test('refresh replaces one socket without stranding the member; Flappy input sequences deduplicate', async () => {
  const service = new OnlineRoomService(
    { emit() {} },
    { autoTick: false, persist: async () => true },
  );
  const host = { id: 'a', name: 'A' },
    peer = { id: 'b', name: 'B' };
  const first = socket();
  service.connect(first, host);
  service.connect(socket(), peer);
  const { code } = await service.create(host, { game: 'flappy' });
  await service.join(peer, { code });
  const fresh = socket();
  service.connect(fresh, host);
  service.disconnect(host, first);
  assert.equal(service.rooms.get(code).players[0].connected, true);
  service.start(host);
  const room = service.rooms.get(code);
  room.startsAt = Date.now() - 1;
  room.match.phase = 'playing';
  service.action(host, { matchId: room.matchId, type: 'flap', seq: 1 });
  room.match.players[0].state.v = 2;
  service.action(host, { matchId: room.matchId, type: 'flap', seq: 1 });
  assert.equal(room.match.players[0].state.v, 2);
  assert.equal(service.snapshot(room).inputSeq.a, 1);
  assert.ok(!JSON.stringify(service.snapshot(room)).includes('passwordHash'));
});
test('Flappy presentation respects countdown, freeze, death, revive and pending local input', () => {
  const state = createBird(42);
  let visual = presentBird(state, null, { dt: 16, age: 80, running: false, pendingFlap: false });
  assert.equal(visual.frame, 0);
  assert.equal(visual.y, state.y);
  visual.v = -PHYSICS.jump;
  const originalY = visual.y;
  const stale = { ...state, v: 8 };
  visual = presentBird(stale, visual, { dt: 16, age: 50, running: true, pendingFlap: true });
  assert.ok(visual.y < originalY);
  assert.ok(visual.v < 0);
  const frozen = presentBird({ ...state, frozenFrames: 30 }, visual, {
    dt: 16,
    age: 50,
    running: true,
    pendingFlap: false,
  });
  assert.equal(frozen.frame, state.frame);
  assert.equal(frozen.y, state.y);
  const dead = presentBird({ ...state, alive: false, y: 500 }, visual, {
    dt: 16,
    age: 50,
    running: true,
    pendingFlap: false,
  });
  assert.equal(dead.y, 500);
  assert.equal(dead.alive, false);
  const revived = presentBird({ ...state, y: 250, respawnGraceFrames: 90 }, dead, {
    dt: 0,
    age: 0,
    running: true,
    pendingFlap: false,
  });
  assert.equal(revived.alive, true);
  assert.equal(revived.y, 250);
});
test('Flappy pipe presentation stays continuous across uneven snapshot arrival intervals', () => {
  const state = createBird(7);
  let visual = null,
    previous = 0,
    age = 0;
  for (let tick = 0; tick < 180; tick++) {
    age += 1000 / 60;
    if (tick % 5 === 0 || tick % 7 === 0) {
      state.frame = tick;
      age = 0;
    }
    visual = presentBird(state, visual, { dt: 1000 / 60, age, running: true, pendingFlap: false });
    assert.ok(visual.frame >= previous - 0.01);
    assert.ok(visual.frame - previous < 2);
    previous = visual.frame;
  }
});
