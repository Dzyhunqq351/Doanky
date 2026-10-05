import { useState } from 'react';
import { api, type User } from '../../lib/api';
export default function AccountSecurity({
  user,
  onUpdate,
}: {
  user: User;
  onUpdate: (user: User) => void;
}) {
  const [email, setEmail] = useState(user.email || '');
  const [emailPassword, setEmailPassword] = useState('');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ email: '', password: '' });
  return (
    <section className="account-security">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy('email');
          setMessage((m) => ({ ...m, email: '' }));
          try {
            const data = await api<{ user: User }>('/auth/email', 'PATCH', {
              email,
              currentPassword: emailPassword,
            });
            onUpdate(data.user);
            setEmailPassword('');
            setMessage((m) => ({ ...m, email: 'Đã lưu email khôi phục.' }));
          } catch (error) {
            setMessage((m) => ({ ...m, email: (error as Error).message }));
          } finally {
            setBusy('');
          }
        }}
      >
        <h2>Email khôi phục</h2>
        <p>Liên kết email của bạn để nhận mã khi quên mật khẩu.</p>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Mật khẩu hiện tại
          <input
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
          />
        </label>
        <button className="secondary" disabled={!!busy}>
          {busy === 'email' ? 'Đang lưu…' : 'Lưu email'}
        </button>
        <p role="status">{message.email}</p>
      </form>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) {
            setMessage((m) => ({ ...m, password: 'Hai mật khẩu mới chưa trùng nhau.' }));
            return;
          }
          setBusy('password');
          setMessage((m) => ({ ...m, password: '' }));
          try {
            await api('/auth/change-password', 'POST', {
              currentPassword: current,
              newPassword: password,
            });
            window.alert('Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.');
            window.dispatchEvent(new Event('auth:expired'));
          } catch (error) {
            setMessage((m) => ({ ...m, password: (error as Error).message }));
          } finally {
            setBusy('');
          }
        }}
      >
        <h2>Đổi mật khẩu</h2>
        <p>Sau khi đổi, các thiết bị sẽ cần đăng nhập lại.</p>
        <label>
          Mật khẩu hiện tại
          <input
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          Mật khẩu mới
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Nhập lại mật khẩu mới
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <button className="primary" disabled={!!busy}>
          {busy === 'password' ? 'Đang đổi…' : 'Đổi mật khẩu'}
        </button>
        <p role="status">{message.password}</p>
      </form>
    </section>
  );
}
