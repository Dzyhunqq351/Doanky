import { Server } from 'socket.io';
import { cookieToken } from '../middleware/auth.js';
import { resolveLogin, publicUser, authEvents } from '../services/authService.js';
import { OnlineRoomService } from '../services/onlineRoomService.js';
export function attachRooms(server) {
  const io = new Server(server, {
    maxHttpBufferSize: 8192,
    transports: ['websocket'],
    perMessageDeflate: false,
  });
  const rooms = new OnlineRoomService(io);
  io.use(async (socket, next) => {
    try {
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
  const revoke = (hash) => io.in(`auth:${hash}`).disconnectSockets(true);
  authEvents.on('revoked', revoke);
  io.on('connection', (socket) => {
    const login = socket.data.auth,
      user = publicUser(login.user);
    socket.join(`auth:${login.tokenHash}`);
    rooms.connect(socket, user);
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
        if (busy) return ack({ ok: false, message: 'Thao tác trước đang xử lý.' });
        try {
          if (rooms.sockets.get(user.id) !== socket || Date.now() >= login.expiresAt)
            throw new Error('Phiên đăng nhập đã kết thúc.');
          if (Date.now() - since > 1000) {
            count = 0;
            since = Date.now();
          }
          if (++count > 40) throw new Error('Thao tác quá nhanh.');
          busy = true;
          const result = await rooms[method](user, input || {});
          ack({ ok: true, data: result });
        } catch (e) {
          ack({ ok: false, message: e.message });
        } finally {
          busy = false;
        }
      });
    socket.on('disconnect', () => {
      clearTimeout(expiry);
      rooms.disconnect(user, socket);
    });
  });
  server.on('close', () => {
    rooms.stop();
    authEvents.off('revoked', revoke);
  });
  return { io, rooms };
}
