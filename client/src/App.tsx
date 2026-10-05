import { useEffect, useState } from 'react';
import { Bird, LogOut } from 'lucide-react';
import { api, type User } from './lib/api';
import AuthScreen from './features/auth/AuthScreen';
import HubDashboard from './features/hub/HubDashboard';
import { pages, type Page } from './features/hub/types';
import LocalGame from './features/games/LocalGame';
import type { LocalGame as Game, LocalMode } from '../../shared/localMatch.js';
import './hub.css';
import './arcade.css';
import { useRooms } from './features/rooms/useRooms';
import OnlineRoom from './features/rooms/OnlineRoom';
import PlayerLobby from './features/rooms/PlayerLobby';
type Selection = { game: Game; mode: LocalMode };
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [page, setPage] = useState<Page>('overview'),
    [game, setGame] = useState<Selection | null>(null),
    [busy, setBusy] = useState(false);
  const online = useRooms(user);
  async function restore() {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch (e) {
      const message = (e as Error).message;
      if (!message.includes('đăng nhập')) setError(message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void restore();
    const expired = () => {
      setUser(null);
      setGame(null);
    };
    window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, []);
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await api('/auth/logout', 'POST');
      setUser(null);
      setGame(null);
      setPage('overview');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="app-loading" role="status">
        Đang mở Playroom…
      </div>
    );
  if (!user)
    return (
      <>
        {error && (
          <div className="notice" role="alert">
            {error} <button onClick={() => void restore()}>Thử kết nối lại</button>
          </div>
        )}
        <AuthScreen
          onSuccess={(u) => {
            setUser(u);
            setError('');
          }}
        />
      </>
    );
  return (
    <div className="app">
      <header className="header">
        <button
          className="logo logo-button"
          onClick={() => {
            if (!game) setPage('overview');
          }}
        >
          <span className="logo-icon">
            <Bird size={26} />
          </span>
          playroom<span className="logo-dot">.</span>
        </button>
        {!game && !online.room && (
          <nav className="hub-nav" aria-label="Menu chính">
            {pages.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-current={page === id ? 'page' : undefined}
                onClick={() => {
                  setPage(id);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>
        )}
        <div className="account-info">
          <div className={`nav-status ${online.connected ? 'online' : ''}`}>
            <strong>●</strong>
            <span>{online.connected ? 'đã kết nối' : 'đang kết nối'}</span>
          </div>
          <span className="account-label">@{user.username}</span>
        </div>
        <button className="secondary compact" disabled={busy} onClick={() => void logout()}>
          <LogOut size={16} />
          Đăng xuất
        </button>
      </header>
      <main>
        {online.error && (
          <p className="notice" role="alert">
            {online.error}
          </p>
        )}
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        {online.room ? (
          <OnlineRoom
            room={online.room}
            userId={user.id}
            send={online.send}
            connected={online.connected}
          />
        ) : game ? (
          <LocalGame
            key={game.game + game.mode}
            game={game.game}
            mode={game.mode}
            name={user.name}
            onExit={() => {
              setGame(null);
              setPage('overview');
            }}
          />
        ) : page === 'overview' ? (
          <PlayerLobby
            rooms={online.list}
            connected={online.connected}
            send={online.send}
            launch={(game, mode) => {
              setGame({ game, mode });
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        ) : (
          <HubDashboard page={page} user={user} onUpdate={setUser} />
        )}
      </main>
      <footer>
        <b>playroom.</b>
        <span>Flappy Bird · Pikachu · Tetris</span>
      </footer>
    </div>
  );
}
