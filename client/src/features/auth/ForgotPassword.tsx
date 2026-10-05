import { useState } from 'react';
import { api } from '../../lib/api';
export default function ForgotPassword({ back }: { back: (username?: string) => void }) {
  const [email, setEmail] = useState(''),
    [username, setUsername] = useState('');
  const [code, setCode] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('');
  const [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function send() {
    setBusy(true);
    setMessage('');
    try {
      const result = await api<{ message: string }>('/auth/forgot-password', 'POST', {
        email,
        username,
      });
      setSent(true);
      setMessage(result.message);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!sent) {
          await send();
          return;
        }
        if (password !== confirm) {
          setMessage('Hai mật khẩu mới chưa trùng nhau.');
          return;
        }
        setBusy(true);
        setMessage('');
        try {
          await api('/auth/reset-password', 'POST', {
            email,
            username,
            code,
            newPassword: password,
          });
          back(username);
        } catch (error) {
          setMessage((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{sent ? 'Đặt mật khẩu mới' : 'Quên mật khẩu'}</h2>
      <p>
        {sent
          ? 'Nhập mã 6 số trong email và mật khẩu mới. Mã hết hạn sau 10 phút.'
          : 'Nhập email đã liên kết và tên đăng nhập để nhận mã xác minh.'}
      </p>
      <label>
        Email khôi phục
        <input
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          readOnly={sent}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Tên đăng nhập
        <input
          autoComplete="username"
          required
          pattern="[A-Za-z0-9_]{3,24}"
          maxLength={24}
          value={username}
          readOnly={sent}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      {sent && (
        <>
          <label>
            Mã xác minh
            <input
              className="verification-code"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label>
            Mật khẩu mới
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Nhập lại mật khẩu mới
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        </>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <button className="primary" disabled={busy}>
        {busy ? 'Đang xử lý…' : sent ? 'Xác minh & đổi mật khẩu' : 'Gửi mã xác minh'}
      </button>
      {sent && (
        <button className="text-button" type="button" disabled={busy} onClick={() => void send()}>
          Gửi lại mã
        </button>
      )}
      <p className="auth-switch">
        <button type="button" disabled={busy} onClick={() => back()}>
          Quay lại đăng nhập
        </button>
      </p>
    </form>
  );
}
