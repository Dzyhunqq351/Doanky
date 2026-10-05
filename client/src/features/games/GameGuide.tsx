import type { LocalGame } from '../../../../shared/localMatch.js';
import './guide.css';
const guides = {
  flappy: {
    goal: 'Bay qua các khe ống, mỗi ống được 1 điểm. Cứ 10 điểm xuất hiện một quả cầu hiệu ứng trên đường bay. Chạm ống hoặc mặt đất sẽ kết thúc nếu không còn hồi sinh.',
    controls: [
      { label: 'Chơi đơn & online', keys: ['Space', 'W', '↑', 'Chạm'], action: 'Vỗ cánh' },
      { label: 'Người 1', keys: ['W', 'Space'], action: 'Vỗ cánh khi chơi cùng máy' },
      { label: 'Người 2', keys: ['↑', 'NumPad 0'], action: 'Vỗ cánh khi chơi cùng máy' },
    ],
    tip: 'Mỗi lần bốc có 60% buff lợi và 40% buff hại; buff mạnh hiếm hơn. Hồi sinh tự đưa chim về khe an toàn, giữ điểm và tiếp tục ngay sau một lần va chạm hoặc rơi.',
  },
  pikachu: {
    goal: 'Nối hai quân giống nhau bằng đường đi không quá hai góc rẽ, không xuyên quân khác; có thể nối qua viền trống. Dọn hết bàn để hoàn thành.',
    controls: [
      { label: 'Mọi chế độ', keys: ['Chuột', 'Chạm'], action: 'Chọn hai quân' },
      { label: 'Hỗ trợ', keys: ['Gợi ý', 'Đổi vị trí'], action: 'Trừ lần lượt 30 và 10 điểm' },
    ],
    tip: 'Mỗi 1.000 điểm bốc theo tỷ lệ 60% lợi, 40% hại; hiệu ứng mạnh hiếm hơn. Có thể nhân đôi điểm, đóng băng thời gian, thêm trợ giúp hoặc bị trừ điểm/trợ giúp.',
  },
  tetris: {
    goal: 'Xếp kín hàng ngang để xóa hàng. Xóa 1 / 2 / 3 / 4 hàng nhận 100 / 300 / 500 / 800 điểm × cấp độ. Hạ chậm +1 điểm/ô, thả nhanh +2 điểm/ô. Chơi đơn và cùng máy không giới hạn thời gian; phòng online dùng thời gian do chủ phòng chọn.',
    controls: [
      {
        label: 'Chơi đơn & online',
        keys: ['←', '→', '↑', '↓', 'Space', 'C'],
        action: 'Di chuyển · xoay · hạ · thả nhanh · giữ khối',
      },
      {
        label: 'Người 1',
        keys: ['W', 'A', 'S', 'D', 'Space', 'Q'],
        action: 'Di chuyển · thả nhanh · giữ khối',
      },
      {
        label: 'Người 2',
        keys: ['↑', '←', '↓', '→', 'NumPad 0', 'NumPad 1'],
        action: 'Di chuyển · thả nhanh · giữ khối',
      },
    ],
    tip: 'Mỗi 1.000 điểm bốc theo tỷ lệ 60% lợi, 40% hại; hiệu ứng mạnh hiếm hơn. Có thể nhân đôi điểm, rơi chậm, dọn bàn, cộng/trừ điểm hoặc tăng khó cho đối thủ.',
  },
};
export default function GameGuide({ game, open = false }: { game: LocalGame; open?: boolean }) {
  const guide = guides[game];
  return (
    <details className="game-guide" open={open}>
      <summary>Luật chơi & phím điều khiển</summary>
      <dl>
        <dt className="guide-heading guide-controls-heading">Điều khiển</dt>
        <dd className="control-list">
          {guide.controls.map((control) => (
            <div className="control-group" key={control.label}>
              <strong>{control.label}</strong>
              <span className="control-keys">
                {control.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </span>
              <span>{control.action}</span>
            </div>
          ))}
        </dd>
        <dt className="guide-heading guide-goal-heading">Mục tiêu</dt>
        <dd>{guide.goal}</dd>
        <dt className="guide-heading guide-tip-heading">Lưu ý</dt>
        <dd>{guide.tip}</dd>
      </dl>
      <p className="mode-note">
        {game === 'pikachu'
          ? 'Cùng máy: hai người thay phiên, mỗi người có một bàn khác nhau và tối đa 7 phút. Online: hai tài khoản bắt đầu đồng thời trên cùng bố cục; mỗi người chỉ thấy bàn của mình và chỉ xem điểm, thời gian đối thủ khi trận kết thúc. Có thể xếp theo điểm hoặc thời gian hoàn thành. Rời phòng giữa trận tính bỏ cuộc.'
          : 'Online cần 2 tài khoản, đếm ngược 3 giây. Điểm cao hơn thắng; bằng điểm ưu tiên thời gian chơi lâu hơn. Không tạm dừng riêng trong trận online.'}
      </p>
    </details>
  );
}
export function PlayRequirements() {
  return (
    <details className="game-guide requirements">
      <summary>Trước khi chơi: thiết bị, kết nối & lưu kết quả</summary>
      <ul>
        <li>
          Đăng nhập để tạo phòng, vào phòng và lưu lịch sử. Chơi online cần hai tài khoản khác nhau.
        </li>
        <li>
          Dùng trình duyệt hỗ trợ JavaScript, cookie và WebSocket. Máy tính dùng bàn phím; điện
          thoại/tablet có nút chạm. Chơi hai người cùng máy nên dùng bàn phím có cụm phím số.
        </li>
        <li>
          Mời bạn bằng mã 8 ký tự hoặc link. Nếu chơi từ thiết bị khác, dùng địa chỉ mạng LAN hoặc
          tên miền của máy chủ; link localhost chỉ dùng trên cùng máy.
        </li>
        <li>
          Mất mạng được giữ chỗ 30 giây, trận vẫn chạy. Quay lại cùng tài khoản để nối lại; rời
          phòng sẽ chốt lượt đang chơi.
        </li>
        <li>
          Kết quả chỉ được lưu khi có thông báo “Đã lưu”. Xem lại ở Thành tích. Chơi đơn/luyện tập
          có thể tạm dừng, kết quả chỉ dùng cho kỷ lục cá nhân.
        </li>
        <li>Không chia sẻ mật khẩu tài khoản. Âm thanh có thể bật/tắt trong màn chơi.</li>
      </ul>
    </details>
  );
}
