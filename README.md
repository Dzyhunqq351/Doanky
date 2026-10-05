# Playroom — Hệ thống Minigame trực tuyến

Website minigame dùng Node.js, Express, Socket.IO, MongoDB Atlas và React + TypeScript + CSS thuần. Người chơi phải đăng ký/đăng nhập; danh tính và lịch sử gắn với tài khoản.

Playroom là hệ thống minigame trực tuyến trên nền tảng web, cho phép
người dùng đăng ký tài khoản, chơi game, tạo/phòng tham gia phòng online,
thi đấu với người chơi khác và lưu lịch sử thành tích.

Hệ thống hiện tích hợp 3 minigame:

- Flappy Bird
- Pikachu
- Tetris

## Demo

Website: https://doanky-1.vercel.app

## Chức năng chính

- Đăng ký, đăng nhập và quản lý tài khoản
- Chơi đơn
- Chơi 2 người trên cùng thiết bị
- Tạo và tham gia phòng online
- Phòng công khai hoặc phòng riêng có mật khẩu
- Mời người chơi bằng mã/link phòng
- Đồng bộ trận đấu thời gian thực bằng Socket.IO
- Lưu lịch sử trận đấu và thành tích
- Quản lý hồ sơ, avatar và đổi mật khẩu
- Khôi phục mật khẩu qua email
- Xử lý mất kết nối và tái kết nối phòng

## Công nghệ sử dụng

### Frontend
- React
- TypeScript
- Vite
- CSS

### Backend
- Node.js
- Express
- Socket.IO

### Database & Authentication
- MongoDB / MongoDB Atlas
- Mongoose
- JWT
- Cookie HttpOnly

### Deployment
- Vercel
- MongoDB Atlas

## Một số giao diện

<!-- Thêm ảnh đăng nhập -->
<!-- Thêm ảnh danh sách minigame -->
<!-- Thêm ảnh tạo phòng -->
<!-- Thêm ảnh đang chơi online -->

## Chạy dự án

## Chạy dự án

Yêu cầu Node.js 22+, npm và MongoDB đang chạy.

```powershell
npm ci
Copy-Item .env.example .env
npm run auth:setup
npm run dev
```

Mở http://localhost:3000. `npm run dev` build frontend vào `client/dist`, rồi chạy backend và Vite build watch đồng thời. Tải lại trình duyệt sau khi frontend build xong. MongoDB mặc định: `mongodb://127.0.0.1:27017/playroom`.

```powershell
npm run build   # Frontend production -> client/dist
npm start       # Backend phục vụ frontend + API + WebSocket
npm run check   # TypeScript
npm test        # Engine, tài khoản, HTTP và phòng online
npm run test:db # Integration với MongoDB thật
```

Nếu dùng Vite HMR riêng: chạy backend với `APP_ORIGIN=http://localhost:5173`, rồi `npm run dev --workspace client`. Khi triển khai HTTPS, đặt `NODE_ENV=production` và `APP_ORIGIN` đúng tên miền. Proxy phải hỗ trợ WebSocket. Thiết bị cùng mạng truy cập `http://<IP-LAN>:3000`; link localhost chỉ hoạt động trên máy chủ.

## Luồng người chơi

- Đăng ký tên đăng nhập, tên nhân vật, mật khẩu; avatar mặc định ngẫu nhiên. Đổi tên/avatar trong Hồ sơ.
- Trò chơi hiển thị ngay ba game, nút **Tạo phòng** trên từng game, **Nhập mã phòng**, và danh sách phòng public đang chờ thêm người (ẩn khi trống). Tìm theo tên/mã, lọc theo game hoặc chỉ phòng còn chỗ; chỗ giữ khi mất mạng vẫn được tính. Luật chơi/phím điều khiển mở ngay tại game, kèm mục yêu cầu thiết bị và kết nối.
- Phòng online tối đa **2 tài khoản**, mã ngẫu nhiên 8 ký tự, mời bằng link. Phòng riêng cần mật khẩu và không hiện trong danh sách public.
- Rời/chốt trận online đang chơi cần xác nhận; rời game local chưa hoàn thành cũng cảnh báo mất điểm chưa lưu.
- Chủ phòng bắt đầu khi đủ hai người; đếm ngược 3 giây. Flappy/Tetris dùng cùng map/chuỗi khối. Pikachu online cho hai người chơi đồng thời trên cùng bố cục, mỗi tài khoản chỉ nhận đầy đủ bàn của mình; điểm và thời gian đối thủ chỉ công bố khi trận kết thúc. Chủ phòng có thể kết thúc sớm và chơi trận mới.
- Kết quả online do server tính và lưu vào lịch sử của cả hai tài khoản. Flappy/Tetris xếp theo điểm; Pikachu dùng tiêu chí điểm hoặc thời gian do chủ phòng chọn.
- Mất kết nối giữ chỗ 30 giây, game tiếp tục chạy. Rời phòng kết thúc lượt hiện tại; quyền chủ phòng chuyển cho người còn lại. Một tài khoản chỉ giữ một kết nối phòng; tab mới thay thế tab cũ.
- Vẫn có Chơi đơn; Flappy/Tetris có 2 người cùng máy và Luyện với máy. Pikachu thay chế độ chia bàn bằng 2 người thay phiên, không có Luyện với máy. Các chế độ này cần đăng nhập, xử lý game tại trình duyệt và lưu kết quả vào lịch sử cá nhân.
- Thành tích: gộp lịch sử và điểm cao nhất trong 100 trận gần nhất vào một bảng, lọc game và sắp theo điểm hoặc thời gian ghi nhận. Kết quả local do client gửi, không dùng làm bảng xếp hạng cạnh tranh toàn hệ thống.

## Luật và điều khiển

- **Flappy Bird:** cùng đường ống theo seed, Space/↑/chạm để bay. Hai người cùng máy: P1 Space/W; P2 ↑/NumPad 0. Một mạng mỗi lượt; kết thúc khi cả hai thua hoặc chủ phòng dừng.
- **Pikachu:** nối hai quân giống nhau với tối đa hai góc rẽ. +100 điểm/cặp, mặc định 3 gợi ý (−30 điểm/lần), 5 đổi vị trí (−10 điểm/lần); tạo phòng cho phép chọn mỗi loại 0–10. Hết nước tự sắp lại miễn phí. Hai người cùng máy chơi lần lượt, tối đa 7 phút/người và dùng hai bàn khác nhau. Online chơi đồng thời trên cùng bố cục nhưng ẩn hoàn toàn tiến độ đối thủ đến cuối trận. Có thể xếp theo điểm hoặc thời gian hoàn thành.
- **Tetris:** bảng 10×20, cùng chuỗi 7-bag, giữ khối, xem trước 5 khối. Chơi đơn và hai người cùng máy chơi đến khi kết thúc rồi so điểm; phòng online dùng thời gian do chủ phòng chọn. Xóa 1/2/3/4 hàng: 100/300/500/800 × cấp; hạ chậm +1/ô, thả nhanh +2/ô.
- Tetris online/chơi đơn: ← → di chuyển, ↑ xoay, ↓ hạ, Space thả, C giữ. Cùng máy: P1 WASD + Space, Q giữ; P2 mũi tên + NumPad 0, NumPad 1 giữ. Có nút chạm trên giao diện.

## Cấu trúc dễ bảo trì

```text
server.js                          Khởi động HTTP, MongoDB, Socket.IO
src/
  app.js                           Express, static SPA, middleware
  config/database.js               Kết nối MongoDB
  models/                          User, Session, Match
  middleware/auth.js               Cookie, bảo vệ API, kiểm tra origin
  routes/                          API/auth và lệnh Socket.IO
  controllers/                     HTTP auth và lịch sử/kỷ lục
  services/
    authService.js                 Tài khoản, mật khẩu, phiên
    onlineRoomService.js           Phòng online, đồng bộ trận, quyền chủ phòng
    localResultService.js          Kiểm tra kết quả local
    matchService.js                Ghi MongoDB idempotent
    hubService.js                  Tổng hợp lịch sử/kỷ lục tài khoản
shared/
  localMatch.js                    Vòng đời trận dùng chung local/server
  flappyEngine.js, flappyPhysics.js Vật lý Flappy
  pikachuEngine.js, tetrisEngine.js Luật game
  controls.js, arcadeBot.js         Bàn phím và bot
client/src/
  App.tsx                          Cổng đăng nhập và điều hướng
  features/auth/                   Form tài khoản
  features/rooms/                  Tổng quan, tạo/vào phòng, game online
  features/games/                  Catalog, game local, canvas, bàn phím
  features/hub/                    Lịch sử, kỷ lục, hồ sơ
  components/                      Bàn Pikachu/Tetris và avatar
  lib/                             API, âm thanh, kiểu dữ liệu
client/public/flappy/               Sprite và âm thanh upstream
third_party/FlappyBird/             Bản nguồn lưu để đối chiếu
```

Luật game chỉ sửa trong `shared/`; giao diện và truyền tải không tự định nghĩa luật thứ hai. Các component và service của cơ chế khách/thiết bị cũ đã được loại bỏ. Dữ liệu MongoDB cũ không bị xóa và không tự gán sang tài khoản mới.

## Phiên và vận hành

Hồ sơ hỗ trợ liên kết email và đổi mật khẩu. Quên mật khẩu dùng mã email 6 số; xem [cấu hình Gmail](docs/GMAIL_SETUP.md). Thiết lập SMTP trên backend trước khi sử dụng chức năng gửi mã.

Mật khẩu dùng scrypt với salt riêng; tài khoản lưu lâu dài trong collection `users` của MongoDB. JWT ký HS256 bằng thư viện jose, bắt buộc kiểm tra chữ ký, issuer, audience, subject, jti và thời hạn 7 ngày. Token nằm trong cookie HttpOnly, SameSite=Strict (Secure khi production), không lưu localStorage. Collection `sessions` chỉ giữ hash token để thu hồi ngay khi đăng xuất, đồng thời ngắt socket tương ứng. API dùng kiểm tra origin/header và rate limit; socket xác thực cùng JWT, kiểm tra quyền theo tài khoản, giới hạn 40 lệnh/giây và payload đầu vào 8KB.

`npm run auth:setup` tạo khóa ngẫu nhiên 32 byte trong `.env` và giữ nguyên nếu đã có. Không commit hoặc chia sẻ khóa; mọi instance phải dùng cùng khóa. Server từ chối khởi động nếu thiếu khóa hoặc khóa sai định dạng. Đổi khóa làm hết hiệu lực tất cả JWT đã cấp. Sau cập nhật từ phiên token cũ, đăng nhập lại một lần; tài khoản và lịch sử vẫn giữ nguyên. JWT không chứa mật khẩu, tên hay avatar.

MongoDB bắt buộc để đăng nhập và lưu dữ liệu. Phòng đang chơi giữ trong RAM, mất khi server restart. Tối đa 100 phòng mỗi tiến trình là giới hạn cấu hình, chưa phải cam kết tải đã benchmark. Flappy/Tetris gửi snapshot khoảng 15Hz; Pikachu chỉ gửi khi trạng thái thay đổi. Canvas vẽ bằng requestAnimationFrame. Cần thiết kế phân phối phòng trước khi chạy nhiều backend.

### MongoDB Atlas và Vercel

Đặt `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production` và `APP_ORIGIN` trong Vercel Environment Variables, sau đó redeploy. URI Atlas phải chỉ rõ database `/playroom`. Kết nối Mongoose được cache theo function instance và middleware sẽ đợi cold-start connection hoàn tất. Kiểm tra bằng `GET /api/health`; kết quả hợp lệ có `database: "connected"` và `databaseName: "playroom"`.

Atlas Network Access phải cho phép IP outbound của Vercel. Dùng `0.0.0.0/0` chỉ phù hợp đồ án/thử nghiệm với database user và mật khẩu mạnh; production nên dùng static egress/private networking. Không commit URI, mật khẩu Atlas hoặc JWT secret.

Xem tài liệu có thể dùng cho báo cáo Word tại [docs/BAO_CAO_KY_THUAT.md](docs/BAO_CAO_KY_THUAT.md).

Kiểm tra dữ liệu Atlas bằng `npm run db:audit`. Chuyển dữ liệu từ MongoDB local mặc định sang Atlas bằng `npm run db:migrate:atlas`; script chỉ chuyển session còn hạn và match có tài khoản sở hữu, có thể chạy lại mà không tạo bản ghi trùng.

Xem [kiểm thử](docs/VALIDATION.md) và [nguồn bên thứ ba](THIRD_PARTY_NOTICES.md).

## Gợi ý phát triển

Xem [ý tưởng chức năng và giao diện](docs/IDEAS.md). Luật đấu lượt dùng chung trong shared/pikachuDuel.js; server kiểm tra quyền theo lượt và local dùng cùng cách xếp hạng.
