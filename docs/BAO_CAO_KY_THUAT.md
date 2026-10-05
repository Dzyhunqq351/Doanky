# Báo cáo kỹ thuật Playroom

## 1. Tổng quan

Playroom là website minigame gồm Flappy Bird, Pikachu và Tetris. Hệ thống hỗ trợ tài khoản, chơi đơn, hai người cùng máy, phòng đấu online, lưu lịch sử, thành tích cá nhân và bảng xếp hạng theo từng game.

Kiến trúc tổng thể theo mô hình client–server và chia layer:

```text
React client → Express API / Socket.IO → Controller → Service → Mongoose Model → MongoDB Atlas
```

Backend tổ chức gần với MVC kết hợp service layer:

- Model định nghĩa cấu trúc dữ liệu MongoDB.
- Controller nhận request và trả response.
- Service xử lý nghiệp vụ tài khoản, kết quả, lịch sử và phòng đấu.
- Route ánh xạ URL hoặc sự kiện Socket.IO đến controller/service.
- React đảm nhiệm view và tương tác phía trình duyệt.

## 2. Ngôn ngữ và công nghệ

| Nhóm               | Công nghệ               | Vai trò                                                  |
| ------------------ | ----------------------- | -------------------------------------------------------- |
| Ngôn ngữ frontend  | TypeScript, TSX         | Component React, kiểu dữ liệu và logic giao diện         |
| Ngôn ngữ backend   | JavaScript ES Modules   | API, xác thực, Socket.IO, nghiệp vụ và kết nối database  |
| Giao diện          | HTML5, CSS3 responsive  | Bố cục, animation, toàn màn hình và tương thích thiết bị |
| Frontend framework | React 19                | Xây dựng giao diện theo component                        |
| Công cụ build      | Vite 6                  | Biên dịch TypeScript/React và tạo `client/dist`          |
| Backend framework  | Node.js, Express 5      | HTTP server, REST API và phục vụ SPA khi chạy local      |
| Realtime           | Socket.IO 4             | Tạo/vào phòng, đồng bộ trận và kết quả online            |
| Database           | MongoDB Atlas           | Lưu tài khoản, phiên đăng nhập và kết quả trận           |
| ODM                | Mongoose 8              | Schema, validation, index và truy vấn MongoDB            |
| Xác thực           | JWT HS256 với `jose`    | Token đăng nhập có chữ ký và thời hạn 7 ngày             |
| Mật khẩu           | Node.js `crypto.scrypt` | Băm mật khẩu với salt riêng cho từng tài khoản           |
| Kiểm thử           | Node.js Test Runner     | Unit test engine và integration test HTTP/Socket/Atlas   |
| Triển khai         | Vercel + MongoDB Atlas  | Chạy web/function và database cloud                      |

Project **không cài Tailwind CSS** ở trạng thái hiện tại. Giao diện sử dụng CSS thuần trong `styles.css`, `hub.css`, `arcade.css` và các file CSS theo feature. Vì vậy không nên ghi Tailwind CSS vào báo cáo nếu chưa bổ sung dependency và chuyển style sang utility class.

## 3. Cấu trúc mã nguồn

```text
server.js                         Khởi động HTTP, Socket.IO và MongoDB
src/
  app.js                          Express middleware, API và SPA
  config/database.js              Kết nối Atlas, cache connection/pool
  models/User.js                  Tài khoản
  models/Session.js               Phiên JWT có thể thu hồi
  models/Match.js                 Lịch sử và kết quả trận
  controllers/                    Auth, hub, leaderboard, lưu kết quả
  services/                       Nghiệp vụ tài khoản, trận và phòng online
  routes/                         REST API và Socket.IO
  middleware/auth.js              Xác thực, CSRF/origin và database guard
shared/                           Engine và luật dùng chung client/server
client/src/                       React + TypeScript
client/dist/                      Frontend production sau khi build
tests/                            Unit và integration test
```

## 4. Dữ liệu lưu trên MongoDB Atlas

Database sử dụng tên `playroom` và có ba collection chính.

### `users`

Lưu tài khoản lâu dài:

- `username`: tên đăng nhập đã chuyển về chữ thường, duy nhất.
- `name`: tên nhân vật.
- `avatar`: chỉ số avatar mặc định.
- `passwordHash`: chuỗi `salt:hash` tạo bằng scrypt; không trả về client.
- `createdAt`, `updatedAt`: thời điểm tạo và cập nhật.

Index: `_id_`, `username_1` unique.

### `sessions`

Lưu phiên đăng nhập:

- `tokenHash`: SHA-256 của JWT, không lưu JWT nguyên bản.
- `userId`: tham chiếu tài khoản.
- `expiresAt`: thời điểm hết hạn.

Index: `tokenHash_1` unique, `expiresAt_1` TTL để MongoDB tự xóa phiên hết hạn, `userId_1` để tìm/thu hồi phiên nhanh.

### `matches`

Lưu lịch sử chơi và nguồn dữ liệu thành tích:

- `matchId`: định danh duy nhất, giúp request lưu lặp không tạo bản ghi trùng.
- `accountId`: tài khoản sở hữu lịch sử.
- `game`: `flappy`, `pikachu` hoặc `tetris`.
- `mode`: `single`, `local`, `bot` hoặc `online`.
- `ranking`: xếp theo điểm hoặc thời gian.
- `endedAt`: thời điểm kết thúc.
- `results[]`: người chơi, avatar, điểm, thời gian, hạng, hoàn thành hoặc bỏ cuộc.
- `createdAt`, `updatedAt`.

Index: `matchId_1` unique, `accountId_1_endedAt_-1` cho lịch sử cá nhân và `game_1_endedAt_-1` cho bảng xếp hạng game.

Không tạo collection riêng cho “kỷ lục” hoặc “bảng xếp hạng”. Hai phần này được tính từ collection `matches`:

- Lịch sử cá nhân: lọc theo `accountId`, sắp xếp `endedAt` giảm dần.
- Kỷ lục cá nhân: chọn kết quả tốt nhất của tài khoản theo game.
- Bảng xếp hạng game: lấy điểm tốt nhất của từng tài khoản, sắp giảm dần và gán hạng.
- Tổng số người chơi: số tài khoản có kết quả hợp lệ trong bảng xếp hạng.

Cách này tránh lưu dữ liệu tổng hợp bị lệch so với lịch sử gốc.

## 5. Luồng đăng ký và đăng nhập

1. Client gửi username, tên nhân vật và mật khẩu tới REST API.
2. Backend kiểm tra định dạng và băm mật khẩu bằng scrypt với salt ngẫu nhiên.
3. Tài khoản được ghi vào `users`.
4. Backend ký JWT HS256, chỉ chứa định danh và các claim bảo mật.
5. Hash của token được lưu trong `sessions` để có thể đăng xuất hoặc thu hồi ngay.
6. JWT gửi về bằng cookie `HttpOnly`, `SameSite=Strict`, và `Secure` trên production.
7. Mỗi request được kiểm tra chữ ký, issuer, audience, thời hạn JWT và session trong MongoDB.

## 6. Luồng lưu kết quả và xếp hạng

- Chơi local: engine tạo kết quả, API kiểm tra game, mode, số người, điểm và thời gian trước khi ghi.
- Chơi online: server là nguồn kết quả, tự ghi cho cả hai tài khoản.
- `persistMatch()` dùng upsert và `matchId` unique để chống ghi trùng.
- Trang Thành tích gọi `/api/hub` để lấy lịch sử và kỷ lục cá nhân.
- Chi tiết game gọi `/api/leaderboard` để lấy top 10, hạng bản thân và tổng người chơi.
- Dữ liệu của tài khoản khác không thể đọc qua tham số URL vì backend luôn lấy `req.user._id` từ phiên đã xác thực.

## 7. Cấu hình MongoDB Atlas và Vercel

Các biến môi trường phải được thêm trong **Vercel → Project Settings → Environment Variables** cho Production và Preview:

```text
MONGODB_URI=mongodb+srv://<database-user>:<url-encoded-password>@<cluster>/playroom?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=<chuỗi hex ngẫu nhiên ít nhất 64 ký tự>
NODE_ENV=production
APP_ORIGIN=https://<ten-du-an>.vercel.app
MONGODB_TIMEOUT_MS=10000
MONGODB_MAX_POOL_SIZE=10
```

Sau khi thay biến môi trường phải redeploy. Không đặt mật khẩu Atlas hoặc JWT trong GitHub, mã nguồn hay `vercel.json`.

Trong MongoDB Atlas:

1. Database Access: database user phải có quyền `readWrite` cho database `playroom`.
2. Network Access: cho phép outbound IP của Vercel. Với project học tập có thể dùng `0.0.0.0/0` và mật khẩu mạnh; môi trường production nên dùng Vercel Secure Compute/static egress hoặc private networking.
3. URI phải có `/playroom` sau hostname. Nếu bỏ tên database, driver có thể ghi vào database mặc định `test`.
4. Ký tự đặc biệt trong username/password phải được URL encode.

`connectDatabase()` cache connection promise và pool Mongoose để các request trên cùng Vercel Function tái sử dụng kết nối. Middleware đợi kết nối hoàn tất nên request đầu tiên sau cold start không còn kiểm tra hụt và trả 503 ngay lập tức.

Express bật `trust proxy = 1` để nhận đúng HTTPS protocol và địa chỉ client qua reverse proxy của Vercel. Điều này giúp kiểm tra Origin, cookie Secure và rate limit hoạt động đúng sau khi deploy.

API kiểm tra triển khai:

```text
GET /api/health
```

Kết quả đúng:

```json
{ "status": "ok", "database": "connected", "databaseName": "playroom", "authentication": true }
```

## 8. Lưu ý realtime khi chạy trên Vercel

Vercel Functions hỗ trợ WebSocket nhưng một kết nối chỉ gắn với một function instance. Phòng online hiện giữ state trong RAM của `OnlineRoomService`; hai người có thể bị chuyển vào hai instance khác nhau khi scale hoặc reconnect. Để triển khai multiplayer ổn định nhiều instance cần chuyển room state, presence và pub/sub sang Redis hoặc một dịch vụ realtime dùng chung.

Trên gói Hobby, kết nối WebSocket cũng bị giới hạn theo maximum function duration, nên client phải reconnect. MongoDB Atlas chỉ lưu tài khoản và kết quả; Atlas không thay thế kho state realtime của phòng.

## 9. Kết quả kiểm thử Atlas ngày 05/10/2026

- DNS SRV trên môi trường Windows kiểm thử trả `querySrv ECONNREFUSED`; kiểm tra TCP tới node Atlas vẫn thành công.
- URI trực tiếp tới replica set kết nối thành công với database `playroom`.
- Ping Atlas: đạt.
- Ghi → đọc → xóa document kiểm tra: đạt.
- Integration test đăng ký, JWT, session, đăng nhập lại sau reconnect, lịch sử riêng tư, lưu idempotent, profile, ba game online, kết quả hai tài khoản, logout và session expiry: đạt.
- Test Atlas: 1/1 đạt; dữ liệu QA được xóa sau test.
- Kiểm tra thực tế: `users`, `sessions`, `matches` tồn tại và đủ index.
- `/api/health` trên ứng dụng local dùng Atlas trả database `connected`, database name `playroom`.
- Đã migration dữ liệu local sang Atlas bằng script idempotent: 4 users, 2 session còn hạn và 50 match hợp lệ. Phân bố: 45 Flappy Bird, 4 Pikachu, 1 Tetris.
- Đã phát hiện và không chuyển 41 match phát triển cũ không còn tài khoản sở hữu; Atlas sau migration có `orphanSessions = 0`, `orphanMatches = 0`.

Có thể kiểm tra lại mà không hiển thị dữ liệu cá nhân:

```powershell
npm run db:audit
```

Migration có thể chạy lại an toàn vì dùng upsert theo `_id`:

```powershell
npm run db:migrate:atlas
```

## 10. Nguồn tham khảo triển khai

- MongoDB Atlas – Connect to a Cluster: https://www.mongodb.com/docs/atlas/connect-to-database-deployment/
- Vercel – Express on Vercel: https://vercel.com/docs/frameworks/backend/express
- Vercel – WebSocket connections: https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections
