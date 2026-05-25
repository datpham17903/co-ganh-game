import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore.js';
import { useSocketStore } from '../../stores/socketStore.js';
import { useToastStore } from '../../stores/toastStore.js';
import {
  emit,
  getSocket,
  SocketEvents,
  type ListPublicResult,
  type PublicRoomInfo,
} from '../../lib/socket.js';
import { useT, type TranslationKey } from '../../i18n/index.js';
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

interface SpectateResponse {
  ok: boolean;
  roomId?: string;
  state?: GameState;
  error?: string;
}

interface ListResponse extends ListPublicResult {
  ok: boolean;
  error?: string;
}

const PAGE_SIZE = 20;

export function RoomLobby() {
  const t = useT();
  const navigate = useNavigate();
  const playerName = useSettingsStore((s) => s.playerName);
  const setPlayerName = useSettingsStore((s) => s.setPlayerName);
  const setSession = useSocketStore((s) => s.setSession);
  const pushToast = useToastStore((s) => s.push);
  const [code, setCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const debounced = useMemo(() => search.trim().toLowerCase(), [search]);

  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    s.emit(SocketEvents.LOBBY_SUBSCRIBE);

    let cancelled = false;
    const fetchList = async () => {
      try {
        const resp = await emit<ListResponse>(s, SocketEvents.ROOM_LIST, {
          search: debounced,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        if (cancelled) return;
        if (resp.ok) {
          setPublicRooms(resp.rooms);
          setTotal(resp.total);
        }
      } catch {
        /* ignore */
      }
    };

    const onListUpdate = (d: { rooms: PublicRoomInfo[]; total: number }) => {
      if (debounced || page > 0) {
        void fetchList();
      } else {
        setPublicRooms(d.rooms.slice(0, PAGE_SIZE));
        setTotal(d.total);
      }
    };
    s.on(SocketEvents.ROOM_LIST_UPDATED, onListUpdate);
    void fetchList();

    return () => {
      cancelled = true;
      s.off(SocketEvents.ROOM_LIST_UPDATED, onListUpdate);
      s.emit(SocketEvents.LOBBY_UNSUBSCRIBE);
    };
  }, [debounced, page]);

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
        roomName: roomName.trim() || undefined,
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

  const spectateRoom = async (roomId: string) => {
    const name = ensureName();
    if (!name) return;
    setBusy(true);
    const s = getSocket();
    if (!s.connected) s.connect();
    try {
      const resp = await emit<SpectateResponse>(s, SocketEvents.ROOM_SPECTATE, {
        roomId,
        playerName: name,
      });
      if (!resp.ok) {
        const errKey: TranslationKey =
          resp.error === 'NOT_PUBLIC'
            ? 'pvp.errNotPublic'
            : resp.error === 'SPECTATORS_FULL'
              ? 'pvp.errSpectatorsFull'
              : 'pvp.errSpectate';
        pushToast('error', t(errKey));
        return;
      }
      // Spectator: no token. Mark session bằng cách clear playerToken.
      setSession(roomId, null);
      navigate(`/play/pvp/${roomId}?spectate=1`);
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

  const onClickRoom = async (room: PublicRoomInfo) => {
    if (room.status === 'playing') {
      void spectateRoom(room.id);
      return;
    }
    let pw: string | undefined;
    if (room.hasPassword) {
      const input = prompt(t('pvp.enterPw')) ?? '';
      pw = input;
    }
    void joinRoom(room.id, pw);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

          <label htmlFor="room-name" className="block text-sm mt-3">
            {t('pvp.roomName')}
          </label>
          <input
            id="room-name"
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value.slice(0, 30))}
            placeholder={t('pvp.roomNamePh')}
            className="w-full px-3 py-2 border border-text-muted rounded bg-surface"
            data-testid="input-room-name"
          />

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

      <PublicRoomList
        rooms={publicRooms}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        setSearch={(v) => {
          setPage(0);
          setSearch(v);
        }}
        setPage={setPage}
        onClick={onClickRoom}
        t={t}
      />
    </div>
  );
}

function PublicRoomList({
  rooms,
  total,
  page,
  totalPages,
  search,
  setSearch,
  setPage,
  onClick,
  t,
}: {
  rooms: PublicRoomInfo[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  setSearch: (v: string) => void;
  setPage: (p: number) => void;
  onClick: (r: PublicRoomInfo) => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="w-full max-w-md mt-8" data-testid="public-rooms">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-lg">
          {t('pvp.publicRooms')}{' '}
          <span className="text-sm text-text-muted">
            ({t('pvp.totalCount', { count: String(total) })})
          </span>
        </h2>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value.slice(0, 50))}
        placeholder={t('pvp.searchPh')}
        className="w-full px-3 py-2 mb-3 border border-text-muted rounded bg-surface text-sm"
        data-testid="input-search"
      />
      {rooms.length === 0 ? (
        <p className="text-sm text-text-muted">{t('pvp.noPublicRooms')}</p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onClick(r)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-text-muted bg-surface hover:border-accent transition-colors text-left"
                data-testid={`public-room-${r.id}`}
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-num text-sm">{r.id}</span>
                    {r.hasPassword && <span title={t('pvp.password')}>{t('pvp.locked')}</span>}
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        r.status === 'waiting'
                          ? 'bg-accent-2/20 text-accent-2'
                          : 'bg-text-muted/20 text-text-muted'
                      }`}
                    >
                      {r.status === 'waiting' ? t('pvp.statusWaiting') : t('pvp.statusPlaying')}
                    </span>
                  </div>
                  {r.name && <span className="text-sm font-medium truncate">{r.name}</span>}
                  <span className="text-xs text-text-muted truncate">
                    {r.hostName} · 👥 {r.spectatorCount}
                  </span>
                </div>
                {r.status === 'playing' && (
                  <span className="ml-2 text-xs text-accent-2 shrink-0">{t('pvp.spectate')}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-sm rounded border border-text-muted disabled:opacity-40"
          >
            ‹
          </button>
          <span className="text-xs text-text-muted">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 text-sm rounded border border-text-muted disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
