import { History } from 'lucide-react';
import { names, time, type Entry } from './types';
import Avatar from '../../components/Avatar';
export default function HistoryTable({ rows, filtered = false }: { rows: Entry[]; filtered?: boolean }) {
  return rows.length ? (
    <div className="hub-table-wrap">
      <table className="hub-table">
        <thead>
          <tr>
            <th>Trò chơi</th>
            <th>Người chơi & kết quả</th>
            <th>Điểm</th>
            <th>Hạng lượt chơi</th>
            <th>Thời gian</th>
            <th>Ngày chơi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <b>{names[r.game]}</b>
                <small>
                  {r.mode === 'single'
                    ? 'Chơi đơn'
                    : r.mode === 'bot'
                      ? 'Luyện với máy'
                      : r.mode === 'online'
                        ? 'Phòng online'
                        : r.game === 'pikachu'
                          ? '2 người thay phiên'
                          : '2 người cùng máy'}
                  {r.game === 'pikachu' && r.players > 1
                    ? ` · ${r.ranking === 'time' ? 'Thời gian' : 'Điểm'}`
                    : ''}
                </small>
              </td>
              <td>
                <div className="history-players">
                  {r.participants?.map((p, index) => (
                    <div className={`history-player ${p.me ? 'is-me' : ''}`} key={index}>
                      <Avatar index={p.avatar} small />
                      <span>
                        <b>
                          {p.name}
                          {p.me ? ' · Bạn' : ''}
                        </b>
                        <small>
                          {p.score.toLocaleString('vi-VN')} điểm · {time(p.elapsed)}
                        </small>
                      </span>
                      <strong>{r.players > 1 ? `#${p.rank}` : 'Đơn'}</strong>
                    </div>
                  ))}
                </div>
              </td>
              <td className="hub-score">{r.score.toLocaleString('vi-VN')}</td>
              <td>{r.players === 1 ? 'Chơi đơn' : `${r.rank}/${r.players}`}</td>
              <td>{time(r.duration)}</td>
              <td>
                {new Date(r.at).toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="hub-empty">
      <History size={30} />
      <h3>{filtered ? 'Không có lượt chơi phù hợp' : 'Chưa có lượt chơi'}</h3>
      <p>{filtered ? 'Thử đổi hoặc xóa bộ lọc để xem các lượt khác.' : 'Hoàn thành một ván để lưu thành tích vào tài khoản.'}</p>
    </div>
  );
}
