import { useState } from 'react';
import Avatar from '../../components/Avatar';
import { api, type User } from '../../lib/api';
import AccountSecurity from './AccountSecurity';
export default function ProfileForm({
  user,
  onUpdate,
}: {
  user: User;
  onUpdate: (u: User) => void;
}) {
  const [name, setName] = useState(user.name),
    [avatar, setAvatar] = useState(user.avatar),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  return (
    <>
      <div className="hub-profile">
        <aside>
          <Avatar index={avatar} />
          <h2>{name}</h2>
          <p>@{user.username}</p>
          <strong>Tài khoản Playroom</strong>
        </aside>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage('');
            try {
              const d = await api<{ user: User }>('/auth/profile', 'PATCH', { name, avatar });
              onUpdate(d.user);
              setMessage('Đã lưu thay đổi.');
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Thông tin nhân vật</h2>
          <label>
            Tên hiển thị
            <input required maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <fieldset>
            <legend>Avatar</legend>
            <div className="hub-avatars">
              {Array.from({ length: 12 }, (_, i) => (
                <button
                  type="button"
                  key={i}
                  aria-label={`Chọn avatar ${i + 1}`}
                  aria-pressed={avatar === i}
                  onClick={() => setAvatar(i)}
                >
                  <Avatar index={i} />
                </button>
              ))}
            </div>
          </fieldset>
          <button className="primary" disabled={busy || !name.trim()}>
            {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
          <p role="status">{message}</p>
        </form>
      </div>
      <AccountSecurity user={user} onUpdate={onUpdate} />
    </>
  );
}
