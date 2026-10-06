import { randomBytes, randomUUID } from 'node:crypto';
import { hashPassword, checkPassword } from './authService.js';
import {
  createLocalMatch,
  stepLocalMatch,
  localAction,
  finishLocalMatch,
  localResults,
} from '../../shared/localMatch.js';
import { persistMatch } from './matchService.js';
import { roomRules } from '../../shared/roomRules.js';
const fail = (message) => {
  throw new Error(message);
};
const games = ['flappy', 'pikachu', 'tetris'];
export class OnlineRoomService {
  constructor(io, { autoTick = true, persist = persistMatch } = {}) {
    this.io = io;
    this.persist = persist;
    this.rooms = new Map();
    this.members = new Map();
    this.sockets = new Map();
    this.last = performance.now();
    this.lastSent = 0;
    if (autoTick) {
      this.timer = setInterval(() => this.tick(), 16);
      this.timer.unref();
    }
  }
  stop() {
    clearInterval(this.timer);
  }
  list() {
    return [...this.rooms.values()]
      .filter(
        (r) =>
          !r.private &&
          r.phase === 'waiting' &&
          r.players.length < 2 &&
          r.players.some((p) => p.connected),
      )
      .map((r) => ({
        code: r.code,
        name: r.name,
        game: r.game,
        count: r.players.length,
        capacity: 2,
        phase: r.phase,
      }));
  }
  lobby() {
    this.io.emit('rooms', this.list());
  }
  snapshot(r, viewerId) {
    const viewerIndex = r.players.findIndex((p) => p.id === viewerId);
    const privateMatch =
      r.game === 'pikachu' && r.phase === 'playing' && r.match && viewerIndex >= 0
        ? {
            ...r.match,
            players: r.match.players.map((player, index) =>
              index === viewerIndex
                ? player
                : {
                    name: player.name,
                    finishedAt: null,
                    state: { score: 0, hidden: true },
                  },
            ),
          }
        : r.match;
    return {
      code: r.code,
      name: r.name,
      game: r.game,
      private: r.private,
      hostId: r.hostId,
      phase: r.phase,
      players: r.players,
      startsAt: r.startsAt,
      now: Date.now(),
      matchId: r.matchId,
      match: privateMatch,
      results: r.results,
      persistence: r.persistence,
      rules: r.rules,
      inputSeq: r.inputSeq || {},
    };
  }
  publish(r) {
    for (const player of r.players)
      this.sockets.get(player.id)?.emit('room', this.snapshot(r, player.id));
  }
  connect(socket, user) {
    const old = this.sockets.get(user.id);
    this.sockets.set(user.id, socket);
    if (old && old !== socket) {
      old.emit('replaced');
      old.disconnect(true);
    }
    socket.emit('rooms', this.list());
    const r = this.rooms.get(this.members.get(user.id));
    if (r) {
      socket.join(r.code);
      const p = r.players.find((p) => p.id === user.id);
      p.connected = true;
      p.disconnectedAt = null;
      if (r.phase !== 'playing') {
        p.name = user.name;
        p.avatar = user.avatar;
      }
      this.publish(r);
      this.lobby();
    } else socket.emit('room', null);
  }
  get(user) {
    const r = this.rooms.get(this.members.get(user.id));
    if (!r) fail('Bạn chưa vào phòng.');
    return r;
  }
  host(user) {
    const r = this.get(user);
    if (r.hostId !== user.id) fail('Chỉ chủ phòng được thực hiện.');
    return r;
  }
  async create(user, input) {
    if (this.members.has(user.id)) fail('Hãy rời phòng hiện tại trước.');
    if (!games.includes(input.game)) fail('Game không hợp lệ.');
    const rules = roomRules(input.game, input.rules);
    if (this.rooms.size >= 100) fail('Máy chủ đã đủ phòng.');
    let code;
    do {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      code = [...randomBytes(8)].map((v) => alphabet[v % 32]).join('');
    } while (this.rooms.has(code));
    let passwordHash = null;
    if (input.private) {
      if (
        typeof input.password !== 'string' ||
        input.password.length < 4 ||
        input.password.length > 64
      )
        fail('Mật khẩu phòng cần 4–64 ký tự.');
      passwordHash = await hashPassword(input.password);
    }
    if (!this.sockets.get(user.id)?.connected) fail('Kết nối đã đóng.');
    const r = {
      code,
      game: input.game,
      rules,
      name: String(input.name || `Phòng của ${user.name}`)
        .trim()
        .slice(0, 48),
      private: !!input.private,
      passwordHash,
      hostId: user.id,
      players: [],
      phase: 'waiting',
      startsAt: 0,
      matchId: '',
      match: null,
      results: [],
      persistence: 'none',
    };
    this.rooms.set(code, r);
    this.add(user, r);
    return { code };
  }
  add(user, r) {
    r.players.push({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      connected: true,
      disconnectedAt: null,
    });
    this.members.set(user.id, r.code);
    this.sockets.get(user.id)?.join(r.code);
    this.publish(r);
    this.lobby();
  }
  async join(user, input) {
    if (this.members.has(user.id)) fail('Hãy rời phòng hiện tại trước.');
    const r = this.rooms.get(
      String(input.code || '')
        .trim()
        .toUpperCase(),
    );
    if (!r) fail('Không tìm thấy phòng.');
    if (r.phase === 'playing' || r.players.length >= 2) fail('Phòng đang chơi hoặc đã đủ 2 người.');
    if (
      r.private &&
      (typeof input.password !== 'string' ||
        input.password.length > 64 ||
        !(await checkPassword(input.password, r.passwordHash)))
    )
      fail('Mật khẩu phòng không đúng.');
    if (!this.sockets.get(user.id)?.connected) fail('Kết nối đã đóng.');
    if (!this.rooms.has(r.code) || r.players.length >= 2 || r.phase === 'playing')
      fail('Phòng vừa thay đổi. Vui lòng thử lại.');
    this.add(user, r);
    return { code: r.code };
  }
  start(user) {
    const r = this.host(user);
    if (r.phase === 'playing') fail('Trận đã bắt đầu.');
    if (r.players.length !== 2 || r.players.some((p) => !p.connected))
      fail('Cần đủ 2 tài khoản đang kết nối.');
    r.match = createLocalMatch(
      r.game,
      'local',
      randomBytes(4).readUInt32LE(),
      r.players.map((p) => p.name),
      r.rules,
    );
    r.match.phase = 'countdown';
    r.phase = 'playing';
    r.startsAt = Date.now() + 3000;
    r.matchId = randomUUID();
    r.results = [];
    r.inputSeq = {};
    r.persistence = 'none';
    this.publish(r);
    this.lobby();
  }
  action(user, input) {
    const r = this.get(user);
    if (r.phase !== 'playing' || r.matchId !== input.matchId || Date.now() < r.startsAt)
      fail('Trận chưa bắt đầu hoặc thao tác thuộc trận cũ.');
    const index = r.players.findIndex((p) => p.id === user.id);
    if (Number.isSafeInteger(input.seq) && input.seq > 0) {
      r.inputSeq ||= {};
      if (input.seq <= (r.inputSeq[user.id] || 0)) return;
      r.inputSeq[user.id] = input.seq;
    }
    if (!localAction(r.match, index, input)) return;
    this.finish(r);
    this.publish(r);
  }
  end(user) {
    const r = this.host(user);
    if (r.phase !== 'playing') return;
    finishLocalMatch(r.match);
    this.finish(r);
    this.publish(r);
  }
  finish(r) {
    if (r.phase !== 'playing' || r.match.phase !== 'results') return;
    r.phase = 'results';
    r.results = localResults(r.match).map((p) => ({
      ...p,
      playerId: r.players[p.index].id,
      avatar: r.players[p.index].avatar,
    }));
    r.persistence = 'saving';
    this.saveResults(r);
    this.publish(r);
    this.lobby();
  }
  saveResults(r) {
    const matchId = r.matchId;
    void Promise.all(
      r.players.map((p) =>
        this.persist({
          matchId: `${p.id}:${matchId}`,
          accountId: p.id,
          game: r.game,
          mode: 'online',
          ranking: r.rules.ranking || 'score',
          endedAt: new Date(),
          results: r.results,
        }),
      ),
    ).then((saved) => {
      if (this.rooms.get(r.code) === r && r.matchId === matchId && r.phase === 'results') {
        r.persistence = saved.every(Boolean) ? 'saved' : 'failed';
        this.publish(r);
      }
    });
  }
  leave(user) {
    const code = this.members.get(user.id),
      r = this.rooms.get(code);
    if (!r) {
      this.members.delete(user.id);
      this.sockets.get(user.id)?.emit('room', null);
      return;
    }
    if (r.phase === 'playing') {
      const index = r.players.findIndex((p) => p.id === user.id);
      if (index >= 0) r.match.players[index].forfeited = true;
      finishLocalMatch(r.match);
      this.finish(r);
    }
    this.members.delete(user.id);
    const socket = this.sockets.get(user.id);
    socket?.leave(code);
    socket?.emit('room', null);
    r.players = r.players.filter((p) => p.id !== user.id);
    if (!r.players.length) this.rooms.delete(code);
    else {
      if (r.hostId === user.id) r.hostId = r.players[0].id;
      r.phase = 'waiting';
      r.match = null;
      r.results = [];
      r.matchId = '';
      r.startsAt = 0;
      r.persistence = 'none';
      r.inputSeq = {};
      this.publish(r);
    }
    this.lobby();
  }
  disconnect(user, socket) {
    if (this.sockets.get(user.id) !== socket) return;
    this.sockets.delete(user.id);
    const r = this.rooms.get(this.members.get(user.id));
    const p = r?.players.find((p) => p.id === user.id);
    if (p) {
      p.connected = false;
      p.disconnectedAt = Date.now();
      this.publish(r);
      this.lobby();
    }
  }
  tick() {
    const now = performance.now(),
      dt = now - this.last;
    this.last = now;
    for (const r of this.rooms.values()) {
      for (const p of [...r.players])
        if (!p.connected && Date.now() - p.disconnectedAt > 30000) this.leave(p);
      if (!this.rooms.has(r.code) || r.phase !== 'playing') continue;
      if (Date.now() >= r.startsAt) {
        if (r.match.phase === 'countdown') {
          r.match.phase = 'playing';
          this.publish(r);
        }
        stepLocalMatch(r.match, dt);
        this.finish(r);
      }
      if (r.game !== 'pikachu' && now - this.lastSent >= 66) this.publish(r);
    }
    if (now - this.lastSent >= 66) this.lastSent = now;
  }
}
