import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { OnlineRoomService } from './onlineRoomService.js';

// One fenced game coordinator, many WebSocket gateways. A Socket.IO adapter alone
// cannot share the game's Maps or prevent two instances from ticking the same room.
const LEASE_MS = 6000;
const RENEW = `if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('pexpire',KEYS[1],ARGV[2]) else return 0 end`;
const CHECKPOINT = `if redis.call('get',KEYS[1]) == ARGV[1] then redis.call('set',KEYS[2],ARGV[2],'EX',86400); return 1 else return 0 end`;
const RELEASE = `if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end`;

export class RedisRoomService {
  constructor(
    io,
    {
      url = process.env.REDIS_URL,
      prefix = process.env.REDIS_PREFIX || 'playroom:v1',
      persist,
      checkGame = async () => {},
      redisFactory = (uri, options) => new Redis(uri, options),
    } = {},
  ) {
    this.io = io;
    this.id = randomUUID();
    this.prefix = prefix;
    this.sockets = new Map();
    this.users = new Map();
    this.pending = new Map();
    this.seen = new Map();
    this.queue = Promise.resolve();
    this.deadline = 0;
    this.closed = false;
    this.persist = persist;
    this.checkGame = checkGame;
    const options = {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      lazyConnect: true,
    };
    this.redis = redisFactory(url, options);
    this.sub = redisFactory(url, options);
    // Never log connection URLs, credentials or user payloads.
    this.redis.on('error', () => this.suspend());
    this.sub.on('error', () => this.suspend());
    this.sub.on('message', (channel, raw) => {
      try {
        this.receive(channel, JSON.parse(raw));
      } catch {
        /* Malformed internal message. */
      }
    });
    this.startInitialization();
  }
  startInitialization() {
    if (this.closed) return;
    this.ready = this.initialize();
    this.ready.catch(() => {
      if (!this.closed) this.retryTimer = setTimeout(() => this.startInitialization(), 2000);
    });
  }
  async connectionReady(client) {
    if (client.status === 'ready') return;
    if (!client.status || ['wait', 'end'].includes(client.status)) return client.connect();
    await new Promise((resolve, reject) => {
      const finish = () => {
        clearTimeout(timer);
        client.off('ready', finish);
        resolve();
      };
      const timer = setTimeout(() => {
        client.off('ready', finish);
        reject(new Error('Redis đang kết nối lại.'));
      }, 5000);
      client.once('ready', finish);
    });
  }
  key(name) {
    return `${this.prefix}:${name}`;
  }
  owns() {
    return !!this.engine && performance.now() < this.deadline && !this.closed;
  }
  suspend() {
    this.deadline = 0;
  }
  async initialize() {
    await Promise.all([this.connectionReady(this.redis), this.connectionReady(this.sub)]);
    await this.sub.subscribe(
      this.key('commands'),
      this.key('events'),
      this.key(`reply:${this.id}`),
    );
    await this.elect();
    this.electionTimer = setInterval(() => void this.elect().catch(() => this.suspend()), 1000);
    this.electionTimer.unref();
    this.tickTimer = setInterval(() => {
      if (this.owns()) this.engine.tick();
    }, 16);
    this.tickTimer.unref();
    this.saveTimer = setInterval(() => {
      if (this.owns()) void this.checkpoint().catch(() => this.suspend());
    }, 500);
    this.saveTimer.unref();
    this.presenceTimer = setInterval(() => {
      for (const [userId, entry] of this.users) {
        if (this.sockets.get(userId)?.connected)
          void this.request('connect', entry.user, entry.connection).catch(() => {});
      }
    }, 2000);
    this.presenceTimer.unref();
  }
  async elect() {
    if (this.closed || this.electing) return;
    this.electing = true;
    const began = performance.now();
    try {
      if (this.owns()) {
        for (const [userId, socket] of this.engine.sockets)
          if (Date.now() - socket.seenAt > 10000) this.engine.disconnect({ id: userId }, socket);
        const renewed = await this.redis.eval(RENEW, 1, this.key('leader'), this.id, LEASE_MS);
        this.deadline = renewed ? began + LEASE_MS - 1500 : 0;
        return;
      }
      this.engine?.stop();
      this.engine = null;
      // If our deadline expired, do not revive an old in-memory state. Wait for
      // the old lease to expire and load the latest checkpoint under a new lease.
      const acquired = await this.redis.set(this.key('leader'), this.id, 'PX', LEASE_MS, 'NX');
      if (!acquired) return;
      const raw = await this.redis.get(this.key('state'));
      const snapshot = raw ? JSON.parse(raw) : null;
      this.engine = new OnlineRoomService(
        { emit: (event, data) => this.emit({ event, data }) },
        {
          autoTick: false,
          ...(this.persist ? { persist: this.persist } : {}),
        },
      );
      this.seen = new Map(snapshot?.seen || []);
      if (snapshot) {
        for (const room of snapshot.rooms || []) {
          // Expired unattended rooms cannot be resurrected by a fresh deploy.
          if (Date.now() - snapshot.savedAt > 30000) continue;
          for (const player of room.players) {
            player.connected = false;
            player.disconnectedAt = snapshot.savedAt;
            this.engine.members.set(player.id, room.code);
          }
          if (room.phase === 'playing') {
            // Pause simulation during failover instead of killing birds while
            // no coordinator was serving inputs. Keep countdown/time aligned.
            room.startsAt += Math.max(0, Date.now() - snapshot.savedAt);
          }
          this.engine.rooms.set(room.code, room);
        }
      }
      this.deadline = began + LEASE_MS - 1500;
      for (const room of this.engine.rooms.values())
        if (room.phase === 'results' && room.persistence !== 'saved') this.engine.saveResults(room);
      this.engine.lobby();
      this.emit({ event: 'coordinator:ready' });
    } finally {
      this.electing = false;
    }
  }
  async checkpoint() {
    if (!this.owns()) throw new Error('Máy chủ phòng đang kết nối lại.');
    // Serialize at call time; Redis fences writes from an expired coordinator.
    const state = JSON.stringify({
      savedAt: Date.now(),
      rooms: [...this.engine.rooms.values()],
      seen: [...this.seen].slice(-200),
    });
    const saved = await this.redis.eval(
      CHECKPOINT,
      2,
      this.key('leader'),
      this.key('state'),
      this.id,
      state,
    );
    if (!saved) {
      this.suspend();
      throw new Error('Máy chủ phòng đang chuyển kết nối.');
    }
  }
  emit(message) {
    if (!this.owns()) return;
    void this.redis
      .publish(this.key('events'), JSON.stringify(message))
      .catch(() => this.suspend());
  }
  receive(channel, message) {
    if (channel === this.key(`reply:${this.id}`)) {
      const pending = this.pending.get(message.id);
      if (pending) {
        clearInterval(pending.retry);
        clearTimeout(pending.timeout);
        this.pending.delete(message.id);
        message.ok ? pending.resolve(message.data) : pending.reject(new Error(message.message));
      }
    } else if (channel === this.key('events')) {
      if (message.event === 'coordinator:ready') {
        for (const entry of this.users.values())
          void this.request('connect', entry.user, entry.connection).catch(() => {});
      } else if (message.event === 'auth:revoked') {
        this.io.in(`auth:${message.data}`).disconnectSockets(true);
      } else if (message.connectionId) {
        const socket = this.sockets.get(message.userId);
        if (socket?.id !== message.connectionId) return;
        if (message.event === 'socket:disconnect') socket.disconnect(true);
        else socket.emit(message.event, message.data);
      } else this.io.emit(message.event, message.data);
    } else if (channel === this.key('commands') && this.owns()) {
      this.queue = this.queue.then(() => this.execute(message)).catch(() => this.suspend());
    }
  }
  proxy(user, connection) {
    return {
      id: connection.id,
      connected: true,
      since: connection.since,
      seenAt: Date.now(),
      join() {},
      leave() {},
      emit: (event, data) =>
        this.emit({ userId: user.id, connectionId: connection.id, event, data }),
      disconnect: () =>
        this.emit({ userId: user.id, connectionId: connection.id, event: 'socket:disconnect' }),
    };
  }
  async execute(message) {
    if (!this.owns()) return;
    const { id, gateway, method, user, input, connection } = message;
    let reply = this.seen.get(id);
    if (!reply) {
      try {
        if (!user?.id || !connection?.id) throw new Error('Kết nối không hợp lệ.');
        const current = this.engine.sockets.get(user.id);
        if (method === 'connect') {
          if (!current || (current.id !== connection.id && connection.since > current.since)) {
            this.engine.connect(this.proxy(user, connection), user);
          } else if (current.id === connection.id) current.seenAt = Date.now();
        } else if (method === 'disconnect') {
          if (current?.id === connection.id) this.engine.disconnect(user, current);
        } else {
          if (current?.id !== connection.id)
            throw new Error('Kết nối phòng đã thay đổi. Vui lòng kết nối lại.');
          if (!['create', 'join', 'start', 'action', 'end', 'leave'].includes(method))
            throw new Error('Lệnh không hợp lệ.');
          if (method === 'start') await this.checkGame(this.engine.get(user).game, 'online');
          const data = await this.engine[method](user, input || {});
          reply = { id, ok: true, data };
        }
        reply ||= { id, ok: true };
        this.seen.set(id, reply);
        if (this.seen.size > 300) this.seen.delete(this.seen.keys().next().value);
        if (!['connect', 'disconnect', 'action'].includes(method)) await this.checkpoint();
      } catch (e) {
        this.seen.delete(id);
        reply = { id, ok: false, message: e.message };
      }
    }
    if (!this.owns()) return;
    // Detect gateways that disappeared without delivering disconnect.
    for (const [userId, socket] of this.engine.sockets) {
      if (Date.now() - socket.seenAt > 10000) this.engine.disconnect({ id: userId }, socket);
    }
    await this.redis.publish(this.key(`reply:${gateway}`), JSON.stringify(reply));
  }
  async request(method, user, connection, input) {
    await this.ready;
    if (this.closed) throw new Error('Kết nối phòng đã đóng.');
    const id = randomUUID(),
      payload = JSON.stringify({ id, gateway: this.id, method, user, connection, input });
    return new Promise((resolve, reject) => {
      const publish = () => void this.redis.publish(this.key('commands'), payload).catch(() => {});
      const retry = setInterval(publish, 1500);
      const timeout = setTimeout(() => {
        clearInterval(retry);
        this.pending.delete(id);
        reject(new Error('Phòng đang kết nối lại. Vui lòng thử lại sau giây lát.'));
      }, 8500);
      this.pending.set(id, { resolve, reject, retry, timeout });
      publish();
    });
  }
  async connect(socket, user) {
    const old = this.sockets.get(user.id);
    this.sockets.set(user.id, socket);
    if (old && old !== socket) {
      old.emit('replaced');
      old.disconnect(true);
    }
    const connection = { id: socket.id, since: Date.now() };
    this.users.set(user.id, { user, connection });
    await this.request('connect', user, connection);
  }
  async disconnect(user, socket) {
    if (this.sockets.get(user.id) !== socket) return;
    const entry = this.users.get(user.id);
    this.sockets.delete(user.id);
    this.users.delete(user.id);
    if (entry) await this.request('disconnect', user, entry.connection);
  }
  call(method, user, input) {
    const entry = this.users.get(user.id);
    if (!entry) throw new Error('Kết nối phòng đã đóng.');
    return this.request(method, user, entry.connection, input);
  }
  revoke(hash) {
    void this.redis
      .publish(this.key('events'), JSON.stringify({ event: 'auth:revoked', data: hash }))
      .catch(() => {});
  }
  async stop() {
    if (this.closed) return;
    if (this.owns()) await this.checkpoint().catch(() => {});
    this.closed = true;
    clearTimeout(this.retryTimer);
    for (const timer of [this.electionTimer, this.tickTimer, this.saveTimer, this.presenceTimer])
      clearInterval(timer);
    this.engine?.stop();
    for (const pending of this.pending.values()) {
      clearInterval(pending.retry);
      clearTimeout(pending.timeout);
      pending.reject(new Error('Máy chủ đóng kết nối.'));
    }
    this.pending.clear();
    await this.redis.eval(RELEASE, 1, this.key('leader'), this.id).catch(() => {});
    this.redis.disconnect();
    this.sub.disconnect();
  }
}
for (const method of ['create', 'join', 'start', 'action', 'end', 'leave'])
  RedisRoomService.prototype[method] = function (user, input) {
    return this.call(method, user, input);
  };
