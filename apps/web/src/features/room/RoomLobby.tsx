import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore.js';
import { useSocketStore } from '../../stores/socketStore.js';
import { useToastStore } from '../../stores/toastStore.js';
import { emit, getSocket, SocketEvents, type PublicRoomInfo } from '../../lib/socket.js';
import { useT } from '../../i18n/index.js';
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

interface ListResponse {
  ok: boolean;
  rooms?: PublicRoomInfo[];
  error?: string;
}

export function RoomLobby() {
  const t = useT();
  const navigate = useNavigate();
  const playerName = useSettingsStore((s) => s.playerName);
  const setPlayerName = useSettingsStore((s) => s.setPlayerName);
  const setSession = useSocketStore((s) => s.setSession);
  const pushToast = useToastStore((s) => s.push);
  const [code, setCode] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);

  // Subscribe room list updates
  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    const fetchList = async () => {
      try {
        const resp = await emit<ListResponse>(s, SocketEvents.ROOM_LIST, {});
        if (resp.ok && resp.rooms) setPublicRooms(resp.rooms);
      } catch {
        /* ignore */
      }
    };

    const onListUpdate = (d: { rooms: PublicRoomInfo[] }) => setPublicRooms(d.rooms);
    s.on(SocketEvents.ROOM_LIST_UPDATED, onListUpdate);
    void fetchList();

    return () => {
      s.off(SocketEvents.ROOM_LIST_UPDATED, onListUpdate);
    };
  }, []);

  const ensureName = (): string | null => {
    const name = playerName.trim();
    if (!name) {
      pushToast('warning', t('pvp.errNoName'));
      return null;
    }
    return name;
  };

  const onCreate = async () => {
    const name = ensureName();
    if (!name) return;
    if (password.length > 32) {
      pushToast('warning', t('pvp.errPwTooLong'));
      return;
    }
    setBusy(true);
    const s = getSocket();
    if (!s.connected) s.connect();
    try {
      const resp = await emit<CreateResponse>(s, SocketEvents.ROOM_CREATE, {
        playerName: name,
        isPublic,
        password: password || undefined,
      });
      if (!resp.ok || !resp.roomId || !resp.playerToken) {
        pushToast('error', resp.error ?? t('pvp.errCreate'));
        return;
      }
      setSession(resp.roomId, resp.playerToken);
      navigate(`/play/pvp/${resp.roomId}`);
    } catch (e) {
      pushToast('error', e instanceof Error ? e.message : t('pvp.errConn'));
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async (roomId: string, pwInput?: string) => {
    const name = ensureName();
    if (!name) return;
    setBusy(true);
    const s = getSocket();
    if (!s.connected) s.connect();
    try {
      const resp = await emit<JoinResponse>(s, SocketEvents.ROOM_JOIN, {
        roomId,
        playerName: name,
        password: pwInput,
      });
      if (!resp.ok || !resp.roomId || !resp.playerToken) {
        if (resp.error === 'WRONG_PASSWORD') {
          pushToast('error', t('pvp.errWrongPw'));
        } else {
          pushToast('error', resp.error ?? t('pvp.errJoin'));
        }
        return;
      }
      setSession(resp.roomId, resp.playerToken);
      navigate(`/play/pvp/${resp.roomId}`);
    } catch (e) {
      pushToast('error', e instanceof Error ? e.message : t('pvp.errConn'));
    } finally {
      setBusy(false);
    }
  };

  const onJoinByCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      pushToast('warning', t('pvp.errCodeLen'));
      return;
    }
    const r = publicRooms.find((p) => p.id === trimmed);
    let pw: string | undefined;
    if (r?.hasPassword) {
      const input = prompt(t('pvp.enterPw')) ?? '';
      pw = input;
    }
    void joinRoom(trimmed, pw);
  };

  const onClickPublicRoom = async (room: PublicRoomInfo) => {
    let pw: string | undefined;
    if (room.hasPassword) {
      const input = prompt(t('pvp.enterPw')) ?? '';
      pw = input;
    }
    void joinRoom(room.id, pw);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-3">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <Link to="/" className="text-sm underline">
          {t('common.backHome')}
        </Link>
        <h1 className="font-display text-xl">{t('pvp.title')}</h1>
        <span />
      </div>

      <div className="w-full max-w-md mt-6 space-y-5">
        <div>
          <label htmlFor="player-name" className="block text-sm mb-1">
            {t('pvp.playerName')}
          </label>
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
            placeholder={t('pvp.playerNamePh')}
            className="w-full px-3 py-2 border border-text-muted rounded bg-surface"
            data-testid="input-player-name"
          />
        </div>

        <div className="space-y-2 p-3 rounded-lg border border-text-muted/40 bg-surface/40">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              data-testid="check-public"
            />
            <span className="text-sm font-medium">{t('pvp.public')}</span>
          </label>
          <p className="text-xs text-text-muted ml-6">{t('pvp.publicHint')}</p>

          <label htmlFor="room-pw" className="block text-sm mt-3">
            {t('pvp.password')}
          </label>
          <input
            id="room-pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value.slice(0, 32))}
            placeholder={t('pvp.passwordPh')}
            className="w-full px-3 py-2 border border-text-muted rounded bg-surface"
            data-testid="input-password"
          />
        </div>

        <button
          type="button"
          onClick={onCreate}
          disabled={busy}
          className="w-full px-4 py-3 rounded bg-accent text-white disabled:opacity-50"
          data-testid="btn-create-room"
        >
          {t('pvp.createRoom')}
        </button>

        <div className="flex items-center gap-3 text-text-muted text-sm">
          <hr className="flex-1 border-text-muted" />
          <span>{t('pvp.or')}</span>
          <hr className="flex-1 border-text-muted" />
        </div>

        <div>
          <label htmlFor="room-code" className="block text-sm mb-1">
            {t('pvp.roomCode')}
          </label>
          <div className="flex gap-2">
            <input
              id="room-code"
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC234"
              className="flex-1 px-3 py-2 border border-text-muted rounded bg-surface font-num uppercase"
              data-testid="input-room-code"
            />
            <button
              type="button"
              onClick={onJoinByCode}
              disabled={busy || code.length !== 6}
              className="px-4 py-2 rounded bg-accent-2 text-white disabled:opacity-50"
              data-testid="btn-join-room"
            >
              {t('pvp.join')}
            </button>
          </div>
        </div>

        <p className="text-xs text-text-muted text-center">{t('pvp.note')}</p>
      </div>

      <PublicRoomList rooms={publicRooms} onJoin={onClickPublicRoom} t={t} />
    </div>
  );
}

function PublicRoomList({
  rooms,
  onJoin,
  t,
}: {
  rooms: PublicRoomInfo[];
  onJoin: (r: PublicRoomInfo) => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="w-full max-w-md mt-8" data-testid="public-rooms">
      <h2 className="font-display text-lg mb-3">
        {t('pvp.publicRooms')} ({rooms.length})
      </h2>
      {rooms.length === 0 ? (
        <p className="text-sm text-text-muted">{t('pvp.noPublicRooms')}</p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onJoin(r)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-text-muted bg-surface hover:border-accent transition-colors"
                data-testid={`public-room-${r.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-num text-sm">{r.id}</span>
                  {r.hasPassword && <span title={t('pvp.password')}>{t('pvp.locked')}</span>}
                </div>
                <span className="text-sm text-text-muted truncate max-w-[12rem]">{r.hostName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
