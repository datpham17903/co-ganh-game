import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore.js';
import { useSocketStore } from '../../stores/socketStore.js';
import { useToastStore } from '../../stores/toastStore.js';
import { emit, getSocket, SocketEvents } from '../../lib/socket.js';
import type { GameState } from '@co-ganh/engine';

interface CreateResponse {
  ok: boolean;
  roomId?: string;
  color?: 'B';
  playerToken?: string;
  error?: string;
}

interface JoinResponse {
  ok: boolean;
  roomId?: string;
  color?: 'B' | 'W';
  playerToken?: string;
  state?: GameState;
  opponent?: { name: string } | null;
  error?: string;
}

export function RoomLobby() {
  const navigate = useNavigate();
  const playerName = useSettingsStore((s) => s.playerName);
  const setPlayerName = useSettingsStore((s) => s.setPlayerName);
  const setSession = useSocketStore((s) => s.setSession);
  const pushToast = useToastStore((s) => s.push);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const ensureName = (): string | null => {
    const name = playerName.trim();
    if (!name) {
      pushToast('warning', 'Hãy nhập tên trước');
      return null;
    }
    return name;
  };

  const onCreate = async () => {
    const name = ensureName();
    if (!name) return;
    setBusy(true);
    const s = getSocket();
    if (!s.connected) s.connect();
    try {
      const resp = await emit<CreateResponse>(s, SocketEvents.ROOM_CREATE, {
        playerName: name,
      });
      if (!resp.ok || !resp.roomId || !resp.playerToken) {
        pushToast('error', resp.error ?? 'Không tạo được phòng');
        return;
      }
      setSession(resp.roomId, resp.playerToken);
      navigate(`/play/pvp/${resp.roomId}`);
    } catch (e) {
      pushToast('error', e instanceof Error ? e.message : 'Lỗi kết nối');
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    const name = ensureName();
    if (!name) return;
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      pushToast('warning', 'Mã phòng phải có 6 ký tự');
      return;
    }
    setBusy(true);
    const s = getSocket();
    if (!s.connected) s.connect();
    try {
      const resp = await emit<JoinResponse>(s, SocketEvents.ROOM_JOIN, {
        roomId: trimmed,
        playerName: name,
      });
      if (!resp.ok || !resp.roomId || !resp.playerToken) {
        pushToast('error', resp.error ?? 'Không vào được phòng');
        return;
      }
      setSession(resp.roomId, resp.playerToken);
      navigate(`/play/pvp/${resp.roomId}`);
    } catch (e) {
      pushToast('error', e instanceof Error ? e.message : 'Lỗi kết nối');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-3">
      <div className="w-full max-w-md flex items-center justify-between">
        <Link to="/" className="text-sm underline">
          ← Quay lại
        </Link>
        <h1 className="font-display text-xl">Chơi online</h1>
        <span />
      </div>

      <div className="w-full max-w-md mt-6 space-y-6">
        <div>
          <label htmlFor="player-name" className="block text-sm mb-1">
            Tên hiển thị
          </label>
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
            placeholder="Người chơi"
            className="w-full px-3 py-2 border border-text-muted rounded bg-surface"
            data-testid="input-player-name"
          />
        </div>

        <button
          type="button"
          onClick={onCreate}
          disabled={busy}
          className="w-full px-4 py-3 rounded bg-accent text-white disabled:opacity-50"
          data-testid="btn-create-room"
        >
          ➕ Tạo phòng mới
        </button>

        <div className="flex items-center gap-3 text-text-muted text-sm">
          <hr className="flex-1 border-text-muted" />
          <span>HOẶC</span>
          <hr className="flex-1 border-text-muted" />
        </div>

        <div>
          <label htmlFor="room-code" className="block text-sm mb-1">
            Mã phòng
          </label>
          <div className="flex gap-2">
            <input
              id="room-code"
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              className="flex-1 px-3 py-2 border border-text-muted rounded bg-surface font-num uppercase"
              data-testid="input-room-code"
            />
            <button
              type="button"
              onClick={onJoin}
              disabled={busy || code.length !== 6}
              className="px-4 py-2 rounded bg-accent-2 text-white disabled:opacity-50"
              data-testid="btn-join-room"
            >
              Vào
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
