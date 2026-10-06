import { Server } from 'socket.io';
import { cookieToken } from '../middleware/auth.js';
import { resolveLogin, publicUser, authEvents } from '../services/authService.js';
import { OnlineRoomService } from '../services/onlineRoomService.js';
import { RedisRoomService } from '../services/redisRoomService.js';
import { assertGameAccess } from '../services/gameSettingsService.js';
export function attachRooms(server) {
  const io = new Server(server, {
    maxHttpBufferSize: 8192,
    transports: ['websocket'],
    perMessageDeflate: false,
  });
  const rooms = process.env.REDIS_URL
    ? new RedisRoomService(io, { checkGame: assertGameAccess })
    : new OnlineRoomService(io);
  io.use(async (socket, next) => {
    try {
      if (process.env.VERCEL && !process.env.REDIS_URL)
        throw new Error('Phòng online chưa được cấu hình Redis. Vui lòng liên hệ chủ website.');
      if (rooms.ready) await rooms.ready;
      const origin = socket.handshake.headers.origin,
        expected =
          process.env.APP_ORIGIN ||
          `${socket.request.socket.encrypted ? 'https' : 'http'}://${socket.handshake.headers.host}`;
      if (origin && origin !== expected) throw new Error('Nguồn kết nối không hợp lệ.');
      const login = await resolveLogin(cookieToken(socket.request));
      if (!login) throw new Error('Vui lòng đăng nhập.');
      socket.data.auth = login;
      next();
    } catch (e) {
      next(e);
    }
  });
  const revoke = (hash) => {
    io.in(`auth:${hash}`).disconnectSockets(true);
    rooms.revoke?.(hash);
  };
  authEvents.on('revoked', revoke);
  io.on('connection', (socket) => {
    const login = socket.data.auth,
      user = publicUser(login.user);
    socket.join(`auth:${login.tokenHash}`);
    const joined = Promise.resolve(rooms.connect(socket, user));
    joined.catch((e) => {
      socket.emit('room:error', e.message);
      socket.disconnect(true);
    });
    let busy = false,
      count = 0,
      since = Date.now();
    const expiry = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, login.expiresAt - Date.now()),
    );
    expiry.unref();
    for (const [event, method] of Object.entries({
      'room:create': 'create',
      'room:join': 'join',
      'room:start': 'start',
      'room:action': 'action',
      'room:stop': 'end',
      'room:leave': 'leave',
    }))
      socket.on(event, async (input = {}, ack) => {
        if (typeof ack !== 'function') return;
        const exclusive = method !== 'action';
        if (exclusive && busy) return ack({ ok: false, message: 'Thao tác trước đang xử lý.' });
        if (exclusive) busy = true;
        try {
          await joined;
          if (rooms.sockets.get(user.id) !== socket || Date.now() >= login.expiresAt)
            throw new Error('Phiên đăng nhập đã kết thúc.');
          if (Date.now() - since > 1000) {
            count = 0;
            since = Date.now();
          }
          if (++count > 40) throw new Error('Thao tác quá nhanh.');
          if (method === 'create') await assertGameAccess(input.game, 'online');
          if (method === 'start' && rooms instanceof OnlineRoomService)
            await assertGameAccess(rooms.get(user).game, 'online');
          const result = await rooms[method](user, input || {});
          ack({ ok: true, data: result });
        } catch (e) {
          ack({ ok: false, message: e.message });
        } finally {
          if (exclusive) busy = false;
        }
      });
    socket.on('disconnect', () => {
      clearTimeout(expiry);
      void Promise.resolve(rooms.disconnect(user, socket)).catch(() => {});
    });
  });
  server.on('close', () => {
    void rooms.stop();
    authEvents.off('revoked', revoke);
  });
  return { io, rooms };
}
