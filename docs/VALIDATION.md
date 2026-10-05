# Validation — 2026-09-29

Windows, Node.js, MongoDB local. Không dùng kết quả load test 60 người của phiên bản khách cũ để khẳng định tải cho phiên bản tài khoản mới.

## Tự động

- `npm test`: 18 test engine, tài khoản và integration HTTP/Socket.IO.
- `npm run check`: kiểm tra TypeScript.
- `npm run build`: build Vite production.
- `tests/auth-http.test.js`: dùng database `playroom_auth_test`, tạo fixture riêng và xóa đúng fixture sau chạy. Nếu không có MongoDB, integration được đánh dấu skip.

Bao phủ: scrypt có salt, kiểm tra credential, cookie HttpOnly/SameSite, từ chối request khác origin và người chưa đăng nhập, trùng username, sai mật khẩu, lịch sử riêng, lưu idempotent, sửa hồ sơ, hết hạn/thu hồi phiên.

Phòng online: hai tài khoản riêng, cả ba game, phòng private/mật khẩu, quyền bắt đầu của chủ phòng, map/chuỗi khối giống nhau, chặn thao tác trước countdown, không cho giả playerId để điều khiển đối thủ, lưu kết quả cho cả hai, logout ngắt socket.

Engine: Pikachu đường nối và giới hạn, giải 12 bàn (864 cặp), Tetris khối/hold/xóa hàng, map seed cố định, điều khiển hai người độc lập, giới hạn Tetris 180 giây, pause local và phạt gợi ý/đổi vị trí.

## Giao diện thực tế

Kiểm tra trên database riêng `playroom_ui_test` và cookie riêng, không thay đổi tài khoản thật:

- Đăng ký/đăng nhập; Tổng quan hiển thị ba game, tạo phòng và nhập mã.
- Tạo phòng Flappy từ giao diện, tài khoản thứ hai kết nối bằng Socket.IO thật, nút bắt đầu chỉ mở khi đủ người.
- Bắt đầu chung đếm ngược 3 giây, hai màn hình, kết quả và thông báo đã lưu cho cả hai; rời phòng trở lại Tổng quan.
- Kiểm tra bố cục desktop và màn hình hẹp; các chế độ local vẫn dùng bàn phím riêng cho hai người.

Giới hạn: chưa benchmark số lượng phòng đồng thời, chưa kiểm thử độ trễ Internet thực tế. Bàn phím NumPad được kiểm tra ánh xạ bằng unit test; cần bật NumLock theo bàn phím sử dụng.

JWT: kiểm tra chữ ký HS256, issuer/audience, thời hạn, claim bắt buộc, khóa cấu hình; chặn token sửa nội dung cả HTTP và Socket.IO. Xác nhận tài khoản và phiên tồn tại sau khi ngắt/nối lại MongoDB. Token thu hồi bị từ chối ngay sau logout.

Bổ sung: unit/integration kiểm tra luật Pikachu 0–10 áp dụng cho cả hai và từ chối ngoài giới hạn. Browser kiểm tra mở hướng dẫn và tạo phòng 0 gợi ý/10 đổi vị trí, xác nhận đúng luật hiển thị trong phòng.

Pikachu thay phiên: kiểm tra map người 2 chưa tồn tại trước lượt; chặn thao tác sai người, đếm ngược riêng, đổi map, đồng hồ riêng, kết thúc sớm, xếp theo điểm/thời gian, hòa và bỏ cuộc. HTTP/Socket integration kiểm tra quyền bắt đầu lượt 2, từ chối chủ phòng kết thúc thay đối thủ và lưu hai kết quả.

Browser: chơi Pikachu local theo thời gian, nối một cặp +100, kết thúc lượt 1, kiểm tra bàn giao 0:00, bắt đầu map mới lượt 2, chốt và lưu thành công. Trang Thành tích gộp hiển thị đúng mode/tiêu chí/điểm. Kiểm tra chiều rộng 390px không tràn ngang, menu vẫn truy cập được; không có console error.
