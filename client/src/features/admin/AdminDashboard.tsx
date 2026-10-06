import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Bird,
  Users,
  Gamepad2,
  ListChecks,
  ShieldCheck,
  LayoutDashboard,
  RefreshCw,
  Search,
  Plus,
  LogOut,
} from 'lucide-react';
import { api, type User } from '../../lib/api';
import Avatar from '../../components/Avatar';
import './admin.css';

const sections = [
  { id: 'overview', title: 'Tổng quan', icon: LayoutDashboard },
  { id: 'users', title: 'Người dùng', icon: Users },
  { id: 'games', title: 'Minigame', icon: Gamepad2 },
  { id: 'matches', title: 'Kết quả chơi', icon: ListChecks },
  { id: 'audit', title: 'Nhật ký quản trị', icon: ShieldCheck },
] as const;
type Section = (typeof sections)[number]['id'];
const gameNames: Record<string, string> = {
  flappy: 'Flappy Bird',
  pikachu: 'Pikachu',
  tetris: 'Tetris',
};
const modes: Record<string, string> = {
  single: 'Chơi đơn',
  local: 'Hai người cùng máy',
  bot: 'Luyện với máy',
  online: 'Phòng online',
};
const actions: Record<string, string> = {
  'user.update': 'Sửa tài khoản',
  'user.create': 'Tạo tài khoản',
  'user.password': 'Đặt lại mật khẩu',
  'game.update': 'Cấu hình game',
  'match.moderate': 'Kiểm duyệt kết quả',
  'admin.bootstrap': 'Cấp quyền quản trị',
};
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
type AdminUser = User & { blocked: boolean; createdAt: string; updatedAt: string };
type Setting = {
  game: string;
  enabled: boolean;
  description: string;
  modes: string[];
  maintenanceMessage: string;
  updatedAt?: string;
};

export default function AdminDashboard({
  user,
  logout,
}: {
  user: User;
  logout: () => Promise<void>;
}) {
  const [section, setSection] = useState<Section>('overview');
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState('');
  const [status, setStatus] = useState(''),
    [game, setGame] = useState(''),
    [mode, setMode] = useState('');
  const [data, setData] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [revision, setRevision] = useState(0),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<AdminUser | 'new' | null>(null);
  const [setting, setSetting] = useState<Setting | null>(null);
  const [moderating, setModerating] = useState<any>(null);
  const editor = useRef<HTMLElement>(null);
  useEffect(() => {
    if ((selected || setting || moderating) && innerWidth <= 1100)
      editor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selected, setting, moderating]);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    setData(null);
    const params = new URLSearchParams({ page: String(page), search: query, status, game, mode });
    api(`/admin/${section}?${params}`)
      .then((result) => {
        if (current) setData(result);
      })
      .catch((reason) => {
        if (current) setError(reason.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [section, page, query, status, game, mode, revision]);
  function navigate(next: Section) {
    if (next === section) return;
    setData(null);
    setLoading(true);
    setSection(next);
    setPage(1);
    setStatus('');
    setGame('');
    setMode('');
    setQuery('');
    setSearch('');
    setSelected(null);
    setSetting(null);
    setModerating(null);
    setMessage('');
    setError('');
  }
  async function mutate(path: string, method: string, body: unknown) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/admin${path}`, method, body);
      setSelected(null);
      setSetting(null);
      setModerating(null);
      setMessage('Đã lưu thay đổi và ghi nhật ký.');
      setRevision((v) => v + 1);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const total = data?.total || 0,
    title = sections.find((s) => s.id === section)!.title;
  const hasEditor = !!(selected || setting || moderating);
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/" className="admin-brand">
          <Bird size={26} />
          <b>playroom.</b>
        </a>
        <p className="admin-role">
          <ShieldCheck size={16} /> Quản trị cấp cao
        </p>
        <nav aria-label="Quản trị">
          {sections.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              aria-current={section === id ? 'page' : undefined}
            >
              <Icon size={19} />
              {title}
            </button>
          ))}
        </nav>
        <a className="admin-back" href="/">
          <ArrowLeft size={17} /> Về trang chơi
        </a>
      </aside>
      <div className="admin-body">
        <header className="admin-topbar">
          <span>Quản trị / {title}</span>
          <div>
            <Avatar index={user.avatar} small />
            <b>@{user.username}</b>
            <button aria-label="Đăng xuất" onClick={() => void logout()}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="admin-content">
          <div className="admin-heading">
            <div>
              <h1>{title}</h1>
              <p>
                {section === 'overview'
                  ? 'Theo dõi tài khoản, lượt chơi và thay đổi gần nhất.'
                  : section === 'users'
                    ? 'Tìm tài khoản, cập nhật hồ sơ và quản lý quyền truy cập.'
                    : section === 'games'
                      ? 'Quản lý trạng thái và các chế độ của ba trò chơi.'
                      : section === 'matches'
                        ? 'Kiểm duyệt các bản ghi dùng cho lịch sử và bảng xếp hạng.'
                        : 'Theo dõi người thực hiện, lý do và nội dung thay đổi.'}
              </p>
            </div>
            <button
              className="secondary"
              disabled={loading || busy}
              onClick={() => setRevision((v) => v + 1)}
            >
              <RefreshCw size={16} />
              Làm mới
            </button>
          </div>
          {message && (
            <p className="admin-success" role="status">
              {message}
            </p>
          )}
          {error && !hasEditor && (
            <p className="notice" role="alert">
              {error} <button onClick={() => setRevision((v) => v + 1)}>Tải lại</button>
            </p>
          )}
          {section === 'users' && (
            <form
              className="admin-filters"
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(search);
                setPage(1);
              }}
            >
              <label>
                Tìm người dùng
                <div className="admin-search">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tên đăng nhập, tên hoặc email"
                    maxLength={64}
                  />
                </div>
              </label>
              <label>
                Trạng thái
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tất cả</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="blocked">Đã khóa</option>
                </select>
              </label>
              <button className="secondary" type="submit">
                Tìm kiếm
              </button>
              <button className="primary" type="button" onClick={() => setSelected('new')}>
                <Plus size={17} />
                Thêm người dùng
              </button>
            </form>
          )}
          {section === 'matches' && (
            <div className="admin-filters">
              <label>
                Trò chơi
                <select
                  value={game}
                  onChange={(e) => {
                    setGame(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tất cả trò chơi</option>
                  {Object.entries(gameNames).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Chế độ
                <select
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tất cả chế độ</option>
                  {Object.entries(modes).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Hiển thị
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tất cả</option>
                  <option value="visible">Đang tính thành tích</option>
                  <option value="hidden">Đã ẩn</option>
                </select>
              </label>
            </div>
          )}
          <div className={`admin-workspace ${hasEditor ? 'with-editor' : ''}`}>
            <div className="admin-list">
              {loading ? (
                <div className="admin-loading" role="status">
                  Đang tải dữ liệu…
                  <div />
                  <div />
                  <div />
                </div>
              ) : (
                data && (
                  <>
                    {section === 'overview' && (
                      <>
                        <div className="admin-summary">
                          <div>
                            <span>Người dùng</span>
                            <strong>{data.users}</strong>
                          </div>
                          <div>
                            <span>Tài khoản bị khóa</span>
                            <strong>{data.blocked}</strong>
                          </div>
                          <div>
                            <span>Lượt chơi đã lưu</span>
                            <strong>{data.matches}</strong>
                          </div>
                          <div>
                            <span>Kết quả đã ẩn</span>
                            <strong>{data.hidden}</strong>
                          </div>
                        </div>
                        <div className="admin-overview-grid">
                          <section>
                            <h2>Lượt chơi theo game</h2>
                            <div className="admin-game-totals">
                              {Object.entries(gameNames).map(([id, name]) => {
                                const count = data.games.find((g: any) => g._id === id)?.plays || 0;
                                return (
                                  <div key={id}>
                                    <span>{name}</span>
                                    <strong>{count}</strong>
                                    <progress
                                      aria-label={`Lượt chơi ${name}`}
                                      value={count}
                                      max={Math.max(1, data.matches - data.hidden)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <p className="admin-muted">
                              Bản ghi còn hiệu lực · MongoDB{' '}
                              {data.database ? 'đã kết nối' : 'chưa kết nối'}
                            </p>
                          </section>
                          <section>
                            <h2>Thao tác gần đây</h2>
                            {data.recent.length ? (
                              data.recent.map((row: any) => (
                                <div className="admin-activity" key={row._id}>
                                  <b>{actions[row.action] || row.action}</b>
                                  <span>
                                    @{row.actor} · {row.target}
                                  </span>
                                  <small>{date(row.createdAt)}</small>
                                </div>
                              ))
                            ) : (
                              <p>Chưa có thao tác quản trị.</p>
                            )}
                            <button className="text-button" onClick={() => navigate('audit')}>
                              Xem nhật ký
                            </button>
                          </section>
                        </div>
                      </>
                    )}
                    {section === 'users' && (
                      <div className="admin-table-wrap">
                        <table className="admin-users-table">
                          <thead>
                            <tr>
                              <th>Người dùng</th>
                              <th>Email khôi phục</th>
                              <th>Trạng thái</th>
                              <th>Ngày tạo</th>
                              <th>
                                <span className="admin-muted">Thao tác</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.rows.map((row: AdminUser) => (
                              <tr key={row.id}>
                                <td>
                                  <div className="admin-person">
                                    <Avatar index={row.avatar} small />
                                    <span>
                                      <b>{row.name}</b>
                                      <small>
                                        @{row.username}
                                        {row.role === 'superadmin' ? ' · Quản trị' : ''}
                                      </small>
                                    </span>
                                  </div>
                                </td>
                                <td>{row.email || 'Chưa liên kết'}</td>
                                <td>
                                  <span className={`admin-badge ${row.blocked ? 'is-off' : ''}`}>
                                    {row.blocked ? 'Đã khóa' : 'Hoạt động'}
                                  </span>
                                </td>
                                <td>{date(row.createdAt)}</td>
                                <td>
                                  <button
                                    className="secondary"
                                    disabled={row.role === 'superadmin'}
                                    onClick={() => setSelected(row)}
                                  >
                                    {row.role === 'superadmin' ? 'Được bảo vệ' : 'Chỉnh sửa'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {section === 'games' && (
                      <div className="admin-game-list">
                        {data.rows.map((row: Setting) => (
                          <section key={row.game}>
                            <div>
                              <h2>{gameNames[row.game]}</h2>
                              <span className={`admin-badge ${!row.enabled ? 'is-off' : ''}`}>
                                {row.enabled ? 'Đang mở' : 'Bảo trì'}
                              </span>
                            </div>
                            <p>{row.description || 'Đang dùng mô tả mặc định của trò chơi.'}</p>
                            <p className="admin-muted">
                              {row.modes.map((m) => modes[m]).join(' · ') || 'Chưa mở chế độ nào'}
                            </p>
                            <button className="secondary" onClick={() => setSetting(row)}>
                              Cấu hình game
                            </button>
                          </section>
                        ))}
                      </div>
                    )}
                    {section === 'matches' && (
                      <div className="admin-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Trò chơi</th>
                              <th>Người chơi / điểm</th>
                              <th>Ngày kết thúc</th>
                              <th>Trạng thái</th>
                              <th>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.rows.map((row: any) => (
                              <tr key={row._id}>
                                <td>
                                  <b>{gameNames[row.game]}</b>
                                  <small>{modes[row.mode]}</small>
                                </td>
                                <td>
                                  {row.results.map((p: any, i: number) => (
                                    <div className="admin-match-player" key={i}>
                                      <Avatar index={p.avatar || 0} small />
                                      <span>{p.name}</span>
                                      <b>{p.score.toLocaleString('vi-VN')}</b>
                                    </div>
                                  ))}
                                </td>
                                <td>{date(row.endedAt)}</td>
                                <td>
                                  <span className={`admin-badge ${row.hidden ? 'is-off' : ''}`}>
                                    {row.hidden ? 'Đã ẩn' : 'Có hiệu lực'}
                                  </span>
                                </td>
                                <td>
                                  <button className="secondary" onClick={() => setModerating(row)}>
                                    {row.hidden ? 'Khôi phục' : 'Ẩn kết quả'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {section === 'audit' && (
                      <div className="admin-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Thời gian / người thực hiện</th>
                              <th>Thao tác</th>
                              <th>Lý do</th>
                              <th>Kết quả</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.rows.map((row: any) => (
                              <tr key={row._id}>
                                <td>
                                  {date(row.createdAt)}
                                  <small>@{row.actor}</small>
                                </td>
                                <td>
                                  <b>{actions[row.action] || row.action}</b>
                                  <small>{row.target}</small>
                                  <details>
                                    <summary>Chi tiết thay đổi</summary>
                                    <pre>
                                      {JSON.stringify(
                                        { truoc: row.before, sau: row.after },
                                        null,
                                        2,
                                      )}
                                    </pre>
                                  </details>
                                </td>
                                <td>{row.reason}</td>
                                <td>
                                  {row.status === 'applied'
                                    ? 'Đã lưu'
                                    : row.status === 'failed'
                                      ? 'Thất bại'
                                      : 'Chưa xác nhận'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {['users', 'matches', 'audit'].includes(section) && (
                      <>
                        {!data.rows.length && (
                          <p className="admin-empty">
                            Không có dữ liệu phù hợp. Thử đổi bộ lọc hoặc tìm kiếm.
                          </p>
                        )}
                        <div className="admin-pagination">
                          <span>
                            {total} bản ghi · Trang {page}/{Math.max(1, Math.ceil(total / 20))}
                          </span>
                          <div>
                            <button
                              className="secondary"
                              disabled={page <= 1}
                              onClick={() => setPage((p) => p - 1)}
                            >
                              Trước
                            </button>
                            <button
                              className="secondary"
                              disabled={page * 20 >= total}
                              onClick={() => setPage((p) => p + 1)}
                            >
                              Sau
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )
              )}
            </div>
            {hasEditor && (
              <aside className="admin-editor" ref={editor}>
                {error && (
                  <p className="notice" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="text-button admin-editor-close"
                  disabled={busy}
                  onClick={() => {
                    setSelected(null);
                    setSetting(null);
                    setModerating(null);
                  }}
                >
                  Đóng
                </button>
                {selected && (
                  <UserEditor
                    key={selected === 'new' ? 'new' : selected.id}
                    user={selected}
                    busy={busy}
                    save={mutate}
                  />
                )}
                {setting && (
                  <GameEditor key={setting.game} setting={setting} busy={busy} save={mutate} />
                )}
                {moderating && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const values = new FormData(e.currentTarget);
                      void mutate(`/matches/${moderating._id}`, 'PATCH', {
                        hidden: !moderating.hidden,
                        reason: values.get('reason'),
                      });
                    }}
                  >
                    <h2>{moderating.hidden ? 'Khôi phục kết quả' : 'Ẩn kết quả'}</h2>
                    <p>
                      {gameNames[moderating.game]} · {date(moderating.endedAt)}
                    </p>
                    <p>
                      Bản ghi của tài khoản này{' '}
                      {moderating.hidden ? 'sẽ được tính lại vào' : 'sẽ bị loại khỏi'} lịch sử và
                      bảng xếp hạng. Dữ liệu gốc vẫn được giữ để đối chiếu.
                    </p>
                    <Reason />
                    <button className="primary" disabled={busy}>
                      {busy ? 'Đang lưu…' : 'Xác nhận thay đổi'}
                    </button>
                  </form>
                )}
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
function Reason() {
  return (
    <label>
      Lý do thay đổi
      <textarea
        name="reason"
        required
        maxLength={240}
        rows={2}
        placeholder="Ghi rõ lý do để đối chiếu sau này"
      />
    </label>
  );
}
type Save = (path: string, method: string, body: unknown) => Promise<void>;
function UserEditor({ user, busy, save }: { user: AdminUser | 'new'; busy: boolean; save: Save }) {
  const fresh = user === 'new';
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    void save(fresh ? '/users' : `/users/${user.id}`, fresh ? 'POST' : 'PATCH', {
      ...values,
      avatar: fresh ? 0 : user.avatar,
      blocked: values.blocked === 'on',
      version: fresh ? undefined : user.updatedAt,
    });
  };
  return (
    <>
      <form onSubmit={submit}>
        <h2>{fresh ? 'Thêm người dùng' : `@${user.username}`}</h2>
        {fresh && (
          <label>
            Tên đăng nhập
            <input
              name="username"
              required
              pattern="[a-z0-9_]{3,24}"
              minLength={3}
              maxLength={24}
              autoComplete="off"
            />
          </label>
        )}
        <label>
          Tên hiển thị
          <input name="name" required maxLength={24} defaultValue={fresh ? '' : user.name} />
        </label>
        <label>
          Email khôi phục
          <input name="email" type="email" maxLength={254} defaultValue={fresh ? '' : user.email} />
        </label>
        {fresh ? (
          <label>
            Mật khẩu
            <input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
        ) : (
          <label className="admin-checkbox">
            <input type="checkbox" name="blocked" defaultChecked={user.blocked} />
            Khóa đăng nhập và chơi online
          </label>
        )}
        <Reason />
        <p className="admin-muted">
          {fresh
            ? 'Tài khoản mới có quyền người chơi.'
            : 'Lưu thay đổi sẽ đăng xuất các phiên của người dùng.'}
        </p>
        <button className="primary" disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu người dùng'}
        </button>
      </form>
      {!fresh && (
        <form
          className="admin-password"
          onSubmit={(e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            void save(`/users/${user.id}/password`, 'POST', values);
          }}
        >
          <h3>Đặt lại mật khẩu</h3>
          <p className="admin-muted">Mật khẩu cũ và các phiên đăng nhập sẽ mất hiệu lực.</p>
          <label>
            Mật khẩu mới
            <input
              type="password"
              name="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <Reason />
          <button className="secondary" disabled={busy}>
            Đặt lại mật khẩu
          </button>
        </form>
      )}
    </>
  );
}
function GameEditor({ setting, busy, save }: { setting: Setting; busy: boolean; save: Save }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const values = new FormData(e.currentTarget);
        void save(`/games/${setting.game}`, 'PATCH', {
          enabled: values.get('enabled') === 'on',
          modes: values.getAll('modes'),
          description: values.get('description'),
          maintenanceMessage: values.get('maintenanceMessage'),
          reason: values.get('reason'),
          version: setting.updatedAt || null,
        });
      }}
    >
      <h2>{gameNames[setting.game]}</h2>
      <label className="admin-checkbox">
        <input type="checkbox" name="enabled" defaultChecked={setting.enabled} />
        Mở trò chơi
      </label>
      <label>
        Mô tả trên trang chủ
        <textarea
          name="description"
          rows={3}
          maxLength={240}
          defaultValue={setting.description}
          placeholder="Để trống để dùng mô tả mặc định"
        />
      </label>
      <fieldset>
        <legend>Chế độ được mở</legend>
        {Object.entries(modes)
          .filter(([id]) => setting.game !== 'pikachu' || id !== 'bot')
          .map(([id, label]) => (
            <label className="admin-checkbox" key={id}>
              <input
                type="checkbox"
                name="modes"
                value={id}
                defaultChecked={setting.modes.includes(id)}
              />
              {label}
            </label>
          ))}
      </fieldset>
      <label>
        Thông báo khi bảo trì
        <textarea
          name="maintenanceMessage"
          rows={2}
          required
          maxLength={160}
          defaultValue={setting.maintenanceMessage}
        />
      </label>
      <Reason />
      <p className="admin-muted">
        Áp dụng khi mở lượt mới hoặc bắt đầu trận online. Trận đang chơi được hoàn tất bình thường.
      </p>
      <button className="primary" disabled={busy}>
        {busy ? 'Đang lưu…' : 'Lưu cấu hình'}
      </button>
    </form>
  );
}
