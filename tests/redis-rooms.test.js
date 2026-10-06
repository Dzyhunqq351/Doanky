import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { RedisRoomService } from '../src/services/redisRoomService.js';
import { memoryRedisFactory } from './helpers/memoryRedis.js';

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(predicate, timeout = 5000) {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > end) throw new Error('Condition timed out');
    await pause(20);
  }
}
function socket(id) {
  return {
    id,
    connected: true,
    events: [],
    emit(event, data) {
      this.events.push({ event, data: structuredClone(data) });
    },
    disconnect() {
      this.connected = false;
    },
  };
}
async function scenario(t, redisFactory, url) {
  const prefix = `playroom:test:${randomUUID()}`,
    services = [];
  const make = () => {
    const events = [];
    const io = {
      emit(event, data) {
        events.push({ event, data });
      },
      in() {
        return { disconnectSockets() {} };
      },
    };
    const s = new RedisRoomService(io, {
      prefix,
      url,
      persist: async () => true,
      ...(redisFactory ? { redisFactory } : {}),
    });
    s.events = events;
    services.push(s);
    return s;
  };
  t.after(async () => {
    for (const s of services) await s.stop();
  });
  const first = make();
  await first.ready;
  const second = make();
  await second.ready;
  const host = { id: 'host', name: 'Host', avatar: 0 },
    peer = { id: 'peer', name: 'Peer', avatar: 1 };
  const a = socket('a'),
    b = socket('b');
  await first.connect(a, host);
  await second.connect(b, peer);
  const { code } = await first.create(host, { game: 'flappy' });
  await waitFor(() =>
    second.events.some((x) => x.event === 'rooms' && x.data.some((r) => r.code === code)),
  );
  await second.join(peer, { code });
  await first.start(host);
  await waitFor(() => b.events.some((x) => x.event === 'room' && x.data?.matchId));
  assert.equal([first, second].filter((x) => x.owns()).length, 1);
  // Lose the coordinating gateway; the other instance restores the shared room.
  await first.stop();
  await second.elect();
  assert.equal(second.owns(), true);
  const third = make();
  await third.ready;
  const fresh = socket('a-new');
  await third.connect(fresh, host);
  await second.connect(b, peer);
  await waitFor(() => fresh.events.some((x) => x.event === 'room' && x.data?.code === code));
  assert.equal(second.engine.rooms.get(code).players.length, 2);
  await third.leave(host);
  await waitFor(() =>
    b.events.some(
      (x) => x.event === 'room' && x.data?.phase === 'waiting' && x.data.match === null,
    ),
  );
  await second.leave(peer);
  assert.equal(second.engine.rooms.size, 0);
  const next = await second.create(peer, { game: 'tetris' });
  assert.equal(next.code.length, 8);
}
test('Redis coordinator logic: cross-gateway discovery, join, failover, refresh and leave', async (t) => {
  await scenario(t, memoryRedisFactory());
});
test(
  'real Redis cross-instance integration (requires TEST_REDIS_URL)',
  { skip: !process.env.TEST_REDIS_URL },
  async (t) => {
    await scenario(t, undefined, process.env.TEST_REDIS_URL);
  },
);

test('Redis initialization recovers after a temporary connection failure', async (t) => {
  const factory = memoryRedisFactory();
  let firstConnection = true;
  const service = new RedisRoomService(
    { emit() {} },
    {
      redisFactory: (...args) => {
        const client = factory(...args);
        client.connect = async () => {
          if (firstConnection) {
            firstConnection = false;
            throw new Error('temporary outage');
          }
        };
        return client;
      },
    },
  );
  t.after(() => service.stop());
  await assert.rejects(service.ready, /temporary outage/);
  await waitFor(() => service.owns());
  await service.ready;
  assert.equal(service.owns(), true);
});
