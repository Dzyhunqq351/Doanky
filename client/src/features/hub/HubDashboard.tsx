import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api, type User } from '../../lib/api';
import { names, type Page, type HubData } from './types';
import HistoryTable from './HistoryTable';
import ProfileForm from './ProfileForm';
import '../../hub.css';
export default function HubDashboard({
  page,
  user,
  onUpdate,
}: {
  page: Exclude<Page, 'overview'>;
  user: User;
  onUpdate: (u: User) => void;
}) {
  const [filter, setFilter] = useState('all'),
    [mode, setMode] = useState('all'),
    [outcome, setOutcome] = useState('all'),
    [period, setPeriod] = useState('all'),
    [order, setOrder] = useState('recent'),
    [data, setData] = useState<HubData | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (page === 'profile') return;
    let live = true;
    setLoading(true);
    setError('');
    api<HubData>('/hub')
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [revision, page]);
  const rows = (data?.history ?? []).filter(
    (r) =>
      (filter === 'all' || r.game === filter) &&
      (mode === 'all' || r.mode === mode) &&
      (outcome === 'all' || (r.players > 1 && (outcome === 'first' ? r.rank === 1 : r.rank > 1))) &&
      (period === 'all' || +new Date(r.at) >= Date.now() - Number(period) * 86400000),
  );
  const best = rows.length ? Math.max(...rows.map((r) => r.score)) : null;
  const sorted = [...rows].sort((a, b) =>
    order === 'score'
      ? b.score - a.score
      : order === 'duration'
        ? a.duration - b.duration
        : +new Date(b.at) - +new Date(a.at),
  );
  return (
    <section className="hub-dashboard">
      <div className="hub-title">
        <h1>{page === 'profile' ? 'Hồ sơ' : 'Thành tích'}</h1>
        {page !== 'profile' && (
          <button
            className="secondary"
            disabled={loading}
            onClick={() => setRevision((v) => v + 1)}
          >
            <RefreshCw size={16} />
            {loading ? 'Đang tải…' : 'Làm mới'}
          </button>
        )}
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {page === 'profile' ? (
        <ProfileForm user={user} onUpdate={onUpdate} />
      ) : loading ? (
        <p role="status">Đang tải thành tích…</p>
      ) : (
        data && (
          <>
            <div className="achievement-toolbar">
              <label>
                Trò chơi
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">Tất cả</option>
                  {Object.entries(names).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Chế độ
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="all">Mọi chế độ</option>
                  <option value="single">Chơi đơn</option>
                  <option value="local">Hai người cùng máy</option>
                  <option value="online">Phòng online</option>
                  <option value="bot">Luyện với máy</option>
                </select>
              </label>
              <label>
                Kết quả
                <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                  <option value="all">Tất cả kết quả</option>
                  <option value="first">Đấu đôi · Hạng 1</option>
                  <option value="other">Đấu đôi · Hạng còn lại</option>
                </select>
              </label>
              <label>
                Khoảng thời gian
                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <option value="all">Tất cả ngày</option>
                  <option value="7">7 ngày qua</option>
                  <option value="30">30 ngày qua</option>
                </select>
              </label>
              <label>
                Sắp xếp
                <select value={order} onChange={(e) => setOrder(e.target.value)}>
                  <option value="recent">Mới nhất</option>
                  <option value="score">Điểm cao nhất</option>
                  <option value="duration">Thời gian ngắn nhất</option>
                </select>
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setFilter('all');
                  setMode('all');
                  setOutcome('all');
                  setPeriod('all');
                  setOrder('recent');
                }}
              >
                Xóa bộ lọc
              </button>
              <span>
                {rows.length} / {data.history.length} lượt · tối đa 100 lượt gần nhất
              </span>
            </div>
            <div className="achievement-summary">
              <span>
                <b>{rows.length}</b> lượt chơi
              </span>
              <span>
                <b>{rows.filter((r) => r.players > 1 && r.rank === 1).length}</b> lượt hạng 1
              </span>
              {filter !== 'all' && (
                <span>
                  Điểm cao nhất: <b>{best === null ? '—' : best.toLocaleString('vi-VN')}</b>
                </span>
              )}
            </div>
            <HistoryTable rows={sorted} filtered={data.history.length > 0} />
          </>
        )
      )}
    </section>
  );
}
