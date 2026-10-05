# Gửi mã khôi phục bằng Gmail

## Cấu hình

1. Bật xác minh hai bước cho tài khoản Gmail dùng để gửi thư.
2. Tạo **Mật khẩu ứng dụng (App Password)** cho Playroom. Không dùng mật khẩu đăng nhập Gmail thông thường.
3. Điền vào `.env` khi chạy local; khi triển khai, điền cùng các biến trong Environment Variables của backend:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Playroom <your-account@gmail.com>"
```

Đây là giá trị mẫu. Dùng cùng địa chỉ Gmail cho `SMTP_USER` và `SMTP_FROM`. Không đưa App Password vào mã nguồn, frontend hoặc Git. Sau khi sửa biến môi trường, khởi động lại backend hoặc redeploy.

Hướng dẫn Google: https://support.google.com/accounts/answer/185833

## Người chơi sử dụng

- Tài khoản cũ: vào **Hồ sơ → Email khôi phục**, nhập email và mật khẩu hiện tại để liên kết.
- Đổi mật khẩu khi còn đăng nhập: **Hồ sơ → Đổi mật khẩu**.
- Quên mật khẩu: nhập email đã liên kết và tên đăng nhập → gửi mã → nhập mã 6 số cùng mật khẩu mới → đăng nhập lại.
- Mã hiệu lực 10 phút, tối đa 5 lần thử, dùng một lần. Mỗi lần gửi lại cách nhau ít nhất 60 giây.
- MongoDB lưu hash của mã trong `passwordresets` và hash mật khẩu có salt trong `users`. Đổi mật khẩu thu hồi các phiên đăng nhập cũ trong `sessions`.

## Kiểm tra

`npm test` có kiểm thử tích hợp bằng MongoDB local riêng: mã sai, hết hạn, dùng lại, gửi lại, xác minh đồng thời, đổi mật khẩu và thu hồi phiên. Phần gửi thư được thay bằng adapter kiểm thử; **không chứng minh email Gmail đã được gửi thật**.

Sau khi cấu hình Gmail, dùng tài khoản thử có email bạn kiểm soát để hoàn tất một lượt khôi phục và kiểm tra cả Hộp thư đến/Spam. Thiếu cấu hình hoặc SMTP lỗi sẽ báo không gửi được; hệ thống không trả mã xác minh về trình duyệt hoặc ghi mã ra log.
