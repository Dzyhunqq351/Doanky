import { useState } from 'react';
import { Bird, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api, type User } from '../../lib/api';
import './auth.css';
import ForgotPassword from './ForgotPassword';
export default function AuthScreen({ onSuccess }: { onSuccess: (u: User) => void }) {
  const [register, setRegister] = useState(false),
    [forgot, setForgot] = useState(false),
    [resetDone, setResetDone] = useState(false),
    [username, setUsername] = useState(''),
    [name, setName] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [justRegistered, setJustRegistered] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (register && password !== confirm) {
      setError('Hai mật khẩu chưa trùng nhau.');
      return;
    }
    setBusy(true);
    try {
      if (register) {
        // Đăng ký xong → chuyển sang form đăng nhập với username điền sẵn
        await api(`/auth/register`, 'POST', { username, password, name });
        const savedUsername = username;
        setRegister(false);
        setJustRegistered(true);
        setUsername(savedUsername);
        setPassword('');
        setConfirm('');
        setError('');
      } else {
        // Đăng nhập → vào trang game
        const data = await api<{ user: User }>(`/auth/login`, 'POST', { username, password });
        onSuccess(data.user);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <a className="logo" href="/">
          <Bird /> playroom.
        </a>
        <div>
          <span>PLAYROOM</span>
          <h1>
            Flappy Bird.
            <br />
            Pikachu.
            <br />
            Tetris.
          </h1>
          <p>Chơi đơn, đấu 2 người và tạo phòng online. Thành tích được lưu theo tài khoản.</p>
        </div>
        <small>3 trò chơi · Chơi trên trình duyệt</small>
      </section>
      <section className="auth-form">
        {forgot ? (
          <ForgotPassword
            back={(value) => {
              setForgot(false);
              setRegister(false);
              setPassword('');
              if (value) {
                setUsername(value);
                setResetDone(true);
              }
            }}
          />
        ) : (
          <form onSubmit={submit}>
            <span className="tag">{register ? 'THÀNH VIÊN MỚI' : 'CHÀO MỪNG TRỞ LẠI'}</span>
            <h2>{register ? 'Tạo tài khoản' : 'Đăng nhập Playroom'}</h2>
            <p>
              {register ? 'Tạo tài khoản để chơi và lưu kết quả.' : 'Nhập tài khoản để tiếp tục.'}
            </p>
            {justRegistered && !register && (
              <p className="auth-success" role="status">
                ✅ Đăng ký thành công! Nhập mật khẩu rồi nhấn <b>Đăng nhập</b> để vào game.
              </p>
            )}
            {resetDone && (
              <p className="auth-success" role="status">
                Đã đổi mật khẩu. Đăng nhập bằng tên tài khoản và mật khẩu mới.
              </p>
            )}
            {register && (
              <label>
                Tên nhân vật
                <input
                  autoComplete="nickname"
                  maxLength={24}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
            )}
            <label>
              Tên đăng nhập
              <input
                autoComplete="username"
                autoCapitalize="none"
                pattern="[A-Za-z0-9_]{3,24}"
                minLength={3}
                maxLength={24}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <small>3–24 chữ cái, số hoặc dấu gạch dưới.</small>
            </label>
            <label>
              Mật khẩu
              <div className="password-input">
                <input
                  type={visible ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {register && (
              <label>
                Nhập lại mật khẩu
                <input
                  type={visible ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </label>
            )}
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? 'Đang xử lý…' : register ? 'Đăng ký' : 'Đăng nhập'} <ArrowRight size={18} />
            </button>
            {!register && (
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setForgot(true);
                  setError('');
                }}
              >
                Quên mật khẩu?
              </button>
            )}
            <p className="auth-switch">
              {register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setRegister(!register);
                  setJustRegistered(false);
                  setError('');
                  setPassword('');
                  setConfirm('');
                }}
              >
                {register ? 'Đăng nhập' : 'Đăng ký ngay'}
              </button>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
