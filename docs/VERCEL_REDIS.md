# Phòng online trên Vercel với Redis

## Vì sao cần Redis

WebSocket của hai người có thể được Vercel chuyển tới hai instance khác nhau. Các `Map` trong RAM không được chia sẻ, nên bản cũ có thể hiển thị phòng trên máy chủ phòng nhưng báo “Không tìm thấy phòng” ở người thứ hai. Chỉ thêm Socket.IO adapter không đủ: trạng thái engine và vòng lặp game cũng cần có một nơi điều khiển duy nhất.

Bản hiện tại dùng Redis Pub/Sub chuyển lệnh giữa các instance và một khóa có hạn dùng để chọn tiến trình điều khiển game. Các tiến trình khác giữ WebSocket của người dùng, nhận snapshot từ tiến trình điều khiển. Phòng được checkpoint mỗi 500 ms; tạo/vào/bắt đầu/rời phòng được checkpoint trước khi xác nhận lệnh. Kết quả và tài khoản vẫn lưu MongoDB Atlas.

## Cấu hình

1. Tạo Redis hỗ trợ kết nối TCP/TLS và Pub/Sub, ví dụ Redis trên Upstash. Chọn khu vực gần backend Vercel để giảm độ trễ. Lấy **Redis connection URL** dạng `rediss://…`; không dùng REST URL hoặc REST token thay thế.
2. Trong Vercel → Project → Settings → Environment Variables, thêm:

   ```dotenv
   REDIS_URL=rediss://<username>:<password>@<host>:<port>
   REDIS_PREFIX=playroom:production:v1
   ```

   Giữ các biến đang dùng: `MONGODB_URI`, `JWT_SECRET`, `APP_ORIGIN` bằng đúng origin HTTPS của website. Các biến SMTP phục vụ khôi phục mật khẩu giữ nguyên. **Không thêm tiền tố VITE_ cho các biến bí mật.**
3. Chỉ gán prefix production cho môi trường Production. Preview dùng Redis riêng hoặc prefix riêng cho từng deployment, tránh ghép các phiên bản engine khác nhau vào cùng phòng.
4. Redeploy cả service web và server với `vercel.json` hiện tại. Việc thêm biến môi trường không tự cập nhật deployment đang chạy.
5. Local có thể chạy không Redis trên một tiến trình. Để kiểm tra cùng cơ chế như Vercel, điền Redis test vào `.env` và dùng `REDIS_PREFIX=playroom:local:v1`, rồi khởi động lại `npm run dev`.

Trên Vercel, thiếu `REDIS_URL` sẽ trả thông báo cấu hình rõ ràng và không cho tạo phòng RAM riêng. Chế độ chơi tại máy và tài khoản không cần Redis.

## Kiểm tra trước khi phát hành

- Dùng hai tài khoản trên hai thiết bị. Tạo phòng public: tài khoản kia thấy phòng và vào được cả bằng mã lẫn link.
- Thử phòng private, mật khẩu sai/đúng và phòng đã đủ người.
- Bắt đầu từng game; một người rời giữa trận, người kia trở về phòng chờ và vẫn rời được.
- Refresh host/người chơi, thử kết nối lại, rồi tạo phòng mới. Mỗi tài khoản chỉ giữ một kết nối phòng đang hoạt động.
- Với Flappy Bird: chạm liên tục, để chết, nhận hồi sinh, mất mạng ngắn và khôi phục. Điểm/kết quả luôn từ server; chuyển động dự đoán ở client chỉ phục vụ hiển thị.
- Trên iPhone: Flappy/Tetris dọc, Pikachu ngang; menu ẩn/hiện; xoay và thay đổi thanh địa chỉ. Safari không hỗ trợ API fullscreen/orientation lock sẽ dùng vùng chơi phủ viewport, không cam kết ẩn thanh địa chỉ của Safari.

Chạy `npm test` và `npm run check`. Bài kiểm tra logic Redis có transport giả để tái hiện hai instance và chuyển quyền điều khiển. Muốn kiểm tra **Redis thật**, đặt `TEST_REDIS_URL` trong môi trường shell rồi chạy:

```sh
node --test tests/redis-rooms.test.js
```

Bài này tạo prefix ngẫu nhiên `playroom:test:<uuid>`; không dùng prefix production. Khi chưa cung cấp URL, test Redis thật được ghi SKIP, không được coi là đã kiểm thử dịch vụ.

## Giới hạn vận hành

- Khóa điều khiển có hạn 6 giây, gia hạn mỗi giây. Khi tiến trình mất quyền hoặc Redis lỗi, nó dừng mô phỏng thay vì tiếp tục một bản phòng riêng. Tiến trình mới khôi phục checkpoint; gián đoạn có thể vài giây và có thể mất tối đa khoảng checkpoint gần nhất trong sự cố đột ngột.
- Phòng không có kết nối được giải phóng sau thời gian giữ chỗ. Phòng cũ không có checkpoint mới quá 30 giây không được phục hồi thành phòng sống.
- Đây là một coordinator cho giới hạn hiện tại 100 phòng, chưa có benchmark 100 phòng chạy đồng thời. Cần theo dõi số lệnh Redis, băng thông Pub/Sub, độ trễ giữa vùng và giới hạn gói dịch vụ khi tăng tải.
- Không lưu ảnh từng khung vào Redis. Snapshot engine được gửi khoảng 15 lần/giây; Flappy vẽ bằng requestAnimationFrame trên thiết bị.

Tham khảo chính thức: https://vercel.com/kb/guide/real-time-chat-websockets và https://vercel.com/docs/services/routing.
