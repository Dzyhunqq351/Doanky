# Playroom — Flappy Bird, Pikachu & Tetris

Node.js + Express + Socket.IO + MongoDB; React + TypeScript + Tailwind CSS trong `client/`. Không có đăng nhập. Một định danh thiết bị ngẫu nhiên được giữ trong localStorage; một định danh chỉ dùng được một kết nối đang hoạt động. Mở tab mới cùng trình duyệt sẽ thay thế tab cũ. Trình duyệt khác, chế độ ẩn danh hoặc xóa localStorage tạo định danh mới (không fingerprint phần cứng).

## Chạy dự án

Yêu cầu Node.js 22+ và npm. MongoDB dùng để lưu lịch sử lâu dài, không nằm trên đường xử lý game realtime.

```powershell
npm ci
Copy-Item .env.example .env
# Chỉnh MONGODB_URI trong .env nếu dùng MongoDB Atlas hoặc máy chủ riêng.
npm run dev
```

Mở http://localhost:3000. `npm run dev` build frontend lần đầu vào `client/dist`, sau đó chạy Express bằng nodemon và Vite build watch đồng thời. Frontend được Express phục vụ cùng cổng; khi sửa frontend hãy tải lại trình duyệt (build watch không phải HMR). Tùy chọn HMR: chạy `node server.js` và `npm run dev --workspace client` ở hai terminal; Vite đã proxy HTTP/WebSocket tới backend.

```powershell
npm run build  # tạo client/dist
npm start      # Express phục vụ API, WebSocket và client/dist
npm test       # integration WebSocket + physics + authorization
npm run test:load # 60 client WebSocket thật, một trận 15 giây
npm run check  # TypeScript
npm run test:db # Kiểm tra ghi/đọc MongoDB trong database playroom_test
```

Các thiết bị cùng mạng có thể mở `http://<IP-LAN-máy-chủ>:3000` nếu firewall cho phép. Link chia sẻ dùng origin đang mở: đừng chia sẻ link `localhost` cho thiết bị khác. Khi đưa lên Internet, dùng HTTPS và proxy có hỗ trợ WebSocket, trỏ tất cả socket của một phòng về cùng tiến trình.

## Chức năng

- Sảnh hiển thị phòng public trực tuyến và Flappy Bird; tìm phòng theo tên/mã, lọc còn chỗ.
- Tạo phòng public hoặc private. Mỗi phòng có mã ngẫu nhiên 8 ký tự và link `/?room=XXXXXXXX`.
- Private: kiểm tra mật khẩu (scrypt, không lưu plaintext), sau đó chờ chủ phòng duyệt. Yêu cầu hết hạn sau 2 phút. Phòng private không nằm trên danh sách công khai; mật khẩu không nằm trong link.
- Tối đa **60 thiết bị bao gồm chủ phòng/khán giả**; chủ phòng giảm được giới hạn xuống 2–60.
- Tên 1–24 ký tự và avatar ngẫu nhiên từ bộ 12 icon mặc định; có thể đổi trước khi vào phòng.
- Chủ phòng kick, duyệt/từ chối, chỉnh luật trước ván, bắt đầu ván, chốt điểm sớm và chơi ván tiếp theo. Thiết bị bị kick bị chặn vào lại phòng đó.
- Thời gian: 15s / 30s / 1p / 2p / 5p / 10p / 30p / vô hạn; hoặc nhập 15–1.800 giây. Số lần hồi sinh: 0–100 hoặc vô hạn nếu trận có giới hạn thời gian. Người chơi bấm Chơi lại sau khi thua; đồng hồ trận vẫn chạy.
- Chủ phòng cùng chơi hoặc chỉ quan sát; xem toàn cảnh với chim mờ và tên của mọi người, hoặc focus riêng từng người. Màn hình người chơi chỉ hiện chim của họ. Chọn biểu tượng mắt cạnh người chơi để focus màn hình của họ. Người đã hết lượt vẫn có thể xem người khác.
- Đếm ngược 3 giây; cùng seed đường ống cho mọi người và mỗi lần hồi sinh. Chạm / Space để bay; máy chủ quyết định va chạm và điểm. Không pause riêng trong trận multiplayer.
- Mỗi lần thua cập nhật kết quả lượt ngay. Điểm xếp hạng là **điểm cao nhất của một lượt**, không cộng dồn các lần hồi sinh. Chủ phòng có thể chọn điểm trung bình = tổng điểm các lượt / số lượt đã bắt đầu. Đồng điểm dùng ID để thứ tự ổn định.
- Kết thúc khi hết giờ, mọi người hết lượt, hoặc chủ phòng chốt trận. Dashboard có top 1 lớn ở giữa, top 2 bên trái, top 3 bên phải; bảng đầy đủ gồm hạng, avatar, tên, điểm, số lượt và thời gian chơi. Giữ 10 ván gần nhất trong phòng; lưu kết quả vào MongoDB khi có kết nối. Người rời/kick giữa trận vẫn giữ thành tích trong kết quả trận đó.
- Mất mạng: giữ chỗ 30 giây và nối lại phòng. Game vẫn chạy để tránh lợi dụng ngắt mạng; hết 30 giây sẽ rời phòng. Chủ phòng rời thì quyền chuyển sang người còn kết nối; phòng rỗng tự đóng.

- Màn chơi tự mở rộng theo chiều ngang trên máy tính/tablet, có nút mở rộng và toàn màn hình; giữ nguyên tỉ lệ vật lý và map chung. HUD có thời gian, điểm và lượt hồi sinh; âm thanh bay, qua ống và va chạm có nút bật/tắt.
- Chủ phòng có thể ẩn chia sẻ: phòng ngừng hiện ở sảnh và không nhận người mới qua mã/link; người đang trong phòng vẫn chơi.
- Map chỉ tạo mới khi chủ phòng bắt đầu trận tiếp theo. Người đang chờ chơi lại vẫn giữ trận hoạt động cho đến khi hết giờ hoặc tự dừng chơi.

## Pikachu và Tetris

Ở sảnh, chọn **Chơi đơn** hoặc **Tạo phòng solo** trên thẻ game. Phòng solo chứa đúng 2 thiết bị; chỉ chủ phòng bắt đầu sau khi đủ người. Mời bằng mã 8 ký tự hoặc link `/?arena=XXXXXXXX`. Hai người dùng cùng bàn/chuỗi khối; lần bắt đầu tiếp theo tạo seed mới. Máy chủ kiểm tra điểm, đường nối, khối rơi và thời gian. Chơi đơn cũng cần kết nối máy chủ.

- **Pikachu:** bàn 16×9 dùng 36 icon động vật mặc định. Nối hai quân giống nhau với tối đa 2 góc rẽ, có thể đi qua viền trống. +100 điểm/cặp; đồng hồ đếm xuôi đến khi hết bàn hoặc dừng lượt. Chơi đơn có 3 gợi ý và 5 đổi vị trí; phòng đấu chỉnh mỗi loại 0–10. Mỗi lần dùng trừ 30 điểm, điểm có thể âm. Hết nước đi thì tự sắp lại miễn phí. Xếp hạng theo điểm hoặc thời gian hoàn thành; chưa hoàn thành đứng sau khi chọn thời gian.
- **Tetris:** bàn 10×20, chuỗi 7-bag, giữ khối một lần mỗi khối, xem trước 5 khối, bóng vị trí đáp, xoay có kiểm tra tường, khóa sau 500ms chạm nền (tối đa 15 lần gia hạn). Chơi đơn đến khi đầy bàn; đấu đôi **3 phút, so điểm**. Nếu mọi người đã kết thúc thì chốt sớm. Xóa 1/2/3/4 hàng được 100/300/500/800 × cấp độ; hạ chậm +1 và thả nhanh +2 mỗi ô. Đồng điểm ưu tiên thời gian sống lâu hơn.
- Tetris: ←/→ di chuyển, ↑ xoay, Z xoay ngược, ↓ hạ, Space thả nhanh, C giữ khối. Có nút chạm cho tablet/điện thoại. Hai bàn cạnh nhau trên máy tính/tablet, xếp dọc ở màn hẹp.
- Người dừng/rời trận xếp sau. Giữ chỗ mất mạng 30 giây; game vẫn chạy. Lưu loại game, điểm, thời gian và số cặp/hàng vào model `Match` trong MongoDB.
- Các lớp mới: `arcadeController.js` xử lý lệnh; `arcadeService.js` quản lý phòng/trận; `pikachuEngine.js` và `tetrisEngine.js` xử lý luật. Frontend có `ArcadeLobby`, `ArcadeView`, `PikachuBoard`, `TetrisBoard`.

## Kiến trúc

```text
server.js                       HTTP server + Socket.IO + MongoDB
src/
  app.js                        Express, Helmet, static SPA
  config/database.js            Kết nối / thử lại MongoDB
  models/Match.js               Model lưu kết quả trận
  services/
    rules.js                    Validation, mã phòng, mật khẩu
    flappyEngine.js              Physics cố định 60 Hz
    roomService.js               Phòng, vòng đời trận, điểm, focus
    matchService.js              Lưu lịch sử MongoDB
  controllers/roomController.js  Command/ack, rate limit, authorization
  routes/api.js                 Health API
  routes/socket.js              WebSocket transport
client/
  src/App.tsx                   Sảnh, danh tính, tạo/vào phòng
  src/components/RoomView.tsx    Phòng, admin, kết quả
  src/components/FlappyCanvas.tsx Canvas renderer
  src/components/RulesEditor.tsx Cấu hình luật
  src/lib/multiplayer.ts         Types và giao thức client
  public/flappy/                Sprite / âm thanh upstream
  dist/                         Sinh ra khi build
third_party/FlappyBird/          Snapshot mã nguồn upstream
tests/multiplayer.test.js        Kiểm thử tự động
scripts/load-test.js             Đo tải WebSocket 60 thiết bị
```

## Đường truyền và giới hạn vận hành

Kết quả kiểm thử và phạm vi đo: [docs/VALIDATION.md](docs/VALIDATION.md).

- Server mô phỏng fixed-step 60 Hz; canvas vẽ bằng requestAnimationFrame, dự đoán thao tác ngay tại client và hiệu chỉnh theo server; ngoại suy tối đa 250ms khi thiếu snapshot.
- Mỗi client nhận trạng thái người đang focus, 15 Hz, qua volatile event (bỏ frame cũ khi mạng chậm). Riêng chủ phòng ở chế độ toàn cảnh nhận thêm danh sách vị trí chim trong cùng gói tin. Không stream video và không broadcast 60 canvas cho mỗi client.
- Roster/điểm 2 Hz, thay đổi quan trọng và kết thúc lượt gửi ngay; bảng phòng chỉ gửi khi thay đổi. Asset cache bởi trình duyệt; sprite tải một lần cho canvas.
- Tối đa 100 phòng mỗi tiến trình; payload socket tối đa 8KB; thao tác quản trị/room giới hạn 25/s mỗi thiết bị; flap tối đa 20/s được áp dụng. Giới hạn 60 là giới hạn logic và được load test trên localhost, **không phải bảo đảm FPS/latency trên mọi điện thoại hoặc mạng di động**.
- Phòng và phiên đang chạy lưu trong RAM của một tiến trình; restart server mất phòng hiện tại. MongoDB lưu kết quả, không khôi phục trận đang chơi. Cần thiết kế room sharding/worker affinity trước khi chạy nhiều backend; thêm Redis adapter riêng không tự chia sẻ physics state.
- Nếu MongoDB chưa sẵn sàng, game và kết quả trong phòng vẫn hoạt động; UI báo kết quả chưa lưu lâu dài. Chưa có trang truy vấn lịch sử MongoDB sau khi phòng đóng.

## Nguồn Flappy Bird

Xem [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Dùng sprite, âm thanh và chuyển logic bird/pipes/physics của repo được chỉ định sang server; thay state/menu single-player bằng vòng đời trận multiplayer. Mã upstream được giữ lại để so sánh, không phải một iframe game độc lập gửi điểm tùy ý.
