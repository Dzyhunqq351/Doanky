# Quản trị Playroom

Trang quản trị: `/admin`. Đăng nhập bằng tài khoản có `role: superadmin`; nút **Quản trị** xuất hiện ở thanh đầu trang. Người chơi truy cập trực tiếp bị chặn, các API `/api/admin/*` kiểm tra quyền từ MongoDB ở mỗi yêu cầu, không tin quyền do trình duyệt gửi lên.

## Chức năng

- Tổng quan số tài khoản, tài khoản khóa, lượt chơi đã lưu, kết quả bị ẩn và lượt theo game.
- Tìm người dùng theo tên đăng nhập, tên hiển thị hoặc email; lọc trạng thái và phân trang. Thêm tài khoản người chơi; sửa hồ sơ/email; khóa/mở khóa; đặt lại mật khẩu. Lưu sửa tài khoản hoặc mật khẩu thu hồi các phiên đăng nhập và mã khôi phục.
- Bật/tắt game, từng chế độ chơi; sửa mô tả trên trang chủ và thông báo bảo trì. Bảo trì chặn lượt mới và bắt đầu trận online, không cắt ngang trận đang chạy. Không sửa vật lý, luật điểm hoặc dữ liệu engine bằng JSON tự do.
- Lọc kết quả theo game/chế độ/trạng thái; ẩn hoặc khôi phục **bản ghi tài khoản đã chọn** khỏi lịch sử, kỷ lục và bảng xếp hạng. Trận online lưu riêng cho mỗi tài khoản; cần kiểm duyệt từng bản ghi liên quan. Không xóa vĩnh viễn dữ liệu gốc.
- Nhật ký ghi người thực hiện, đối tượng, lý do, dữ liệu trước/sau và trạng thái. Không ghi mật khẩu hay hash mật khẩu. Trạng thái `pending` nghĩa là thao tác chưa được xác nhận hoàn tất; cần đối chiếu nếu tiến trình bị ngắt.

Quản trị viên được bảo vệ khỏi khóa và đặt lại mật khẩu bằng chức năng quản lý người dùng. Đổi mật khẩu của chính mình qua **Hồ sơ** ở trang chơi. Cấp quyền quản trị khác chỉ thực hiện từ terminal được tin cậy, không qua đăng ký công khai.

## Tạo hoặc khôi phục quản trị

Script dùng `MONGODB_URI` trong `.env` hoặc môi trường server. Phải chọn đúng database trước khi chạy. Script cấp quyền, đặt lại mật khẩu và thu hồi các phiên cũ của tên đăng nhập được chỉ định.

Trong PowerShell:

```powershell
$adminSecret = Read-Host 'Mật khẩu quản trị mới' -AsSecureString
$env:ADMIN_BOOTSTRAP_PASSWORD = [System.Net.NetworkCredential]::new('', $adminSecret).Password
node scripts/create-admin.js admin
Remove-Item Env:ADMIN_BOOTSTRAP_PASSWORD
```

Không commit mật khẩu, không tạo endpoint bootstrap công khai. Khi deploy lên Vercel cùng MongoDB Atlas, quyền và dữ liệu quản trị được dùng chung. Redis dành cho phòng online; dashboard quản trị dùng MongoDB.

Collections mới: `gamesettings`, `adminaudits`. User bổ sung `role`, `blocked`; Match bổ sung `hidden`. Dữ liệu cũ vẫn hoạt động với mặc định người chơi, chưa khóa và kết quả chưa ẩn. Không cần xóa hoặc chuyển đổi dữ liệu cũ.
