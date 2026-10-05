import { useState } from 'react';
import GameCatalog from '../games/GameCatalog';

import RoomLauncher, { RoomList } from './RoomLauncher';
import type { Listing } from './useRooms';
import type { LocalGame, LocalMode } from '../../../../shared/localMatch.js';
import { ArrowRight, Gamepad2, Radio, ShieldCheck } from 'lucide-react';
export default function PlayerLobby({
  rooms,
  connected,
  send,
  launch,
}: {
  rooms: Listing[];
  connected: boolean;
  send: (e: string, d?: unknown) => Promise<any>;
  launch: (g: LocalGame, m: LocalMode) => void;
}) {
  const [panel, setPanel] = useState<LocalGame | 'join' | null>(() =>
      new URLSearchParams(location.search).has('room') ? 'join' : null,
    ),
    [error, setError] = useState('');
  return (
    <section>
      <div className="lobby-hero">
        <div>
          <span className="eyebrow">
            <Radio size={14} /> SẢNH TRÒ CHƠI TRỰC TUYẾN
          </span>
          <h1>Ba game kinh điển. Một cuộc đấu mới.</h1>
          <p>Chơi ngay trên trình duyệt, chia sẻ mã phòng và so tài bằng tài khoản của bạn.</p>
        </div>
        <div className="hero-actions right-aligned">
          <button className="primary" onClick={() => setPanel('join')}>
            <Gamepad2 size={18} /> Nhập mã phòng <ArrowRight size={16} />
          </button>
          <span>
            <ShieldCheck size={16} /> Kết quả được lưu tự động
          </span>
        </div>
      </div>
      
      <RoomList
        rooms={rooms}
        join={async (code) => {
          setError('');
          try {
            await send('room:join', { code });
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      {panel && (
        <RoomLauncher
          key={panel}
          game={panel}
          connected={connected}
          send={send}
          onClose={() => {
            setPanel(null);
            history.replaceState(null, '', location.pathname);
          }}
        />
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <GameCatalog
        createRoom={(g) => {
          setPanel(g);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        launch={launch}
      />
    </section>
  );
}
