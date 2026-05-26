import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { isGameOver, getWinner, type GameState } from '@co-ganh/engine';
import { Board } from '../features/board/Board.js';
import { useBoardInteraction } from '../features/board/useBoardInteraction.js';
import { useGameStore } from '../stores/gameStore.js';
import { useSocketStore } from '../stores/socketStore.js';
import { useToastStore } from '../stores/toastStore.js';
import {
  emit,
  getSocket,
  SocketEvents,
  type ClockState,
  type SpectatorInfo,
} from '../lib/socket.js';
import { Modal } from '../components/Modal.js';
import { RoomLobby } from '../features/room/RoomLobby.js';
import { usePvPGame } from '../features/room/usePvPGame.js';
import { ChatPanel } from '../features/room/ChatPanel.js';
import { ClockDisplay } from '../features/room/ClockDisplay.js';
import { useClockSync } from '../hooks/useClockSync.js';
import { useT } from '../i18n/index.js';

// Module-scoped timer cho cleanup sau unmount thật. StrictMode sẽ mount
// → cleanup → mount lại trong cùng tick; setTimeout(0) cho phép mount
// thứ 2 cancel cleanup pending trước khi nó chạy.
let pendingLeaveTimer: ReturnType<typeof setTimeout> | null = null;

export function PlayPvPPage() {
  const { roomId } = useParams();
  if (!roomId) return <RoomLobby />;
  return <PvPGameRoom roomId={roomId} />;
}

interface ReconnectResponse {
  ok: boolean;
  color?: 'B' | 'W';
  state?: GameState;
  opponent?: { name: string } | null;
  roomStatus?: 'waiting' | 'playing' | 'finished';
  error?: string;
}

function PvPGameRoom({ roomId }: { roomId: string }) {
  const t = useT();
  const { clock } = useClockSync();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSpectatorMode = searchParams.get('spectate') === '1';

  const setSession = useSocketStore((s) => s.setSession);
  const sessionRoomId = useSocketStore((s) => s.roomId);
  const sessionToken = useSocketStore((s) => s.playerToken);
  const pushToast = useToastStore((s) => s.push);
  const reset = useGameStore((s) => s.resetGame);
  const setStateExternal = useGameStore((s) => s.setState);
  const myColor = useGameStore((s) => s.myColor);
  const mode = useGameStore((s) => s.mode);
  const setInputLocked = useGameStore((s) => s.setInputLocked);

  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [oppDisconnected, setOppDisconnected] = useState(false);
  const [spectators, setSpectators] = useState<SpectatorInfo[]>([]);
  const [playerNames, setPlayerNames] = useState<{ B: string | null; W: string | null }>({
    B: null,
    W: null,
  });

  const isSpectator = mode === 'spectate';

  const { state, selectedFrom, legalDestinations, handlePieceClick, handleCellClick } =
    useBoardInteraction();
  const { sendMove, resign } = usePvPGame();

  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    const onStart = (data: {
      state: GameState;
      players: { B: { name: string } | null; W: { name: string } | null };
      clock?: ClockState;
    }) => {
      setStateExternal(data.state);
      setPlayerNames({
        B: data.players.B?.name ?? null,
        W: data.players.W?.name ?? null,
      });
      const meColor = useGameStore.getState().myColor;
      const meMode = useGameStore.getState().mode;
      if (meMode !== 'spectate') {
        const opp = meColor === 'B' ? data.players.W : data.players.B;
        if (opp) setOpponentName(opp.name);
      }
      setOppDisconnected(false);
    };
    const onMove = (data: { state: GameState }) => {
      setStateExternal(data.state);
      setInputLocked(false);
    };
    const onSync = (data: { state: GameState }) => setStateExternal(data.state);
    const onOppJoined = (d: { name: string }) => {
      setOpponentName(d.name);
      pushToast('info', tRef.current('pvp.oppJoinedToast', { name: d.name }));
    };
    const onOppLeft = () => {
      setOppDisconnected(true);
      pushToast('warning', tRef.current('pvp.oppLeftToast'));
    };
    const onOppRecon = () => {
      setOppDisconnected(false);
      pushToast('success', tRef.current('pvp.oppRecToast'));
    };
    const onSpecJoined = (d: { name: string }) => {
      pushToast('info', tRef.current('pvp.specJoined', { name: d.name }));
    };
    const onSpecLeft = () => {
      pushToast('info', tRef.current('pvp.specLeft'));
    };
    const onSpecsUpdate = (d: { spectators: SpectatorInfo[] }) => {
      setSpectators(d.spectators);
    };
    const onReject = (d: { reason: string }) => {
      // NO_ROOM thường gặp khi socket vừa reconnect — auto re-bind tới room
      // qua ROOM_RECONNECT thay vì spam toast cho user.
      if (d.reason === 'NO_ROOM') {
        return;
      }
      pushToast('error', tRef.current('pvp.invalidMoveToast', { reason: d.reason }));
      setInputLocked(false);
    };
    const onOver = () => setInputLocked(false);

    s.on(SocketEvents.GAME_START, onStart);
    s.on(SocketEvents.GAME_MOVE_APPLIED, onMove);
    s.on(SocketEvents.GAME_SYNC_STATE, onSync);
    s.on(SocketEvents.ROOM_OPPONENT_JOINED, onOppJoined);
    s.on(SocketEvents.ROOM_OPPONENT_LEFT, onOppLeft);
    s.on(SocketEvents.ROOM_OPPONENT_RECONNECTED, onOppRecon);
    s.on(SocketEvents.ROOM_SPECTATOR_JOINED, onSpecJoined);
    s.on(SocketEvents.ROOM_SPECTATOR_LEFT, onSpecLeft);
    s.on(SocketEvents.ROOM_SPECTATORS_UPDATE, onSpecsUpdate);
    s.on(SocketEvents.GAME_MOVE_REJECTED, onReject);
    s.on(SocketEvents.GAME_OVER, onOver);

    let cancelled = false;
    const reattach = async () => {
      if (isSpectatorMode || !sessionToken) return;
      try {
        await emit<ReconnectResponse>(s, SocketEvents.ROOM_RECONNECT, {
          roomId,
          playerToken: sessionToken,
        });
      } catch {
        /* sẽ retry ở reconnect tiếp theo */
      }
    };
    const init = async () => {
      // Spectator mode: fetch snapshot (state + tên player + clock) để render
      // ngay vì server chỉ emit GAME_START khi player W join — spectator
      // vào sau đó không nhận event này.
      if (isSpectatorMode) {
        reset({ mode: 'spectate' });
        try {
          const resp = await emit<{
            ok: boolean;
            state?: GameState;
            players?: { B: { name: string } | null; W: { name: string } | null };
          }>(s, SocketEvents.ROOM_GET_STATE, { roomId });
          if (cancelled) return;
          if (resp.ok && resp.state) {
            setStateExternal(resp.state);
            if (resp.players) {
              setPlayerNames({
                B: resp.players.B?.name ?? null,
                W: resp.players.W?.name ?? null,
              });
            }
          }
        } catch {
          /* ignore — sẽ tự sync qua GAME_SYNC_STATE / GAME_MOVE_APPLIED */
        }
        return;
      }
      if (sessionRoomId === roomId && sessionToken) {
        try {
          const resp = await emit<ReconnectResponse>(s, SocketEvents.ROOM_RECONNECT, {
            roomId,
            playerToken: sessionToken,
          });
          if (cancelled) return;
          if (resp.ok && resp.color && resp.state) {
            reset({ mode: 'pvp', myColor: resp.color });
            setStateExternal(resp.state);
            if (resp.opponent) setOpponentName(resp.opponent.name);
            return;
          }
          pushToast('warning', tRef.current('pvp.errJoin'));
          navigate('/play/pvp');
        } catch {
          if (!cancelled) navigate('/play/pvp');
        }
      } else {
        navigate('/play/pvp');
      }
    };
    void init();

    // Tự re-bind tới room mỗi lần socket reconnect (Render cold-start, network
    // blip). Không cần navigate — chỉ cần server biết socket.id mới này thuộc
    // phòng nào để các action sau đó (move/chat) không trả NO_ROOM.
    const onReconnect = () => {
      void reattach();
    };
    s.io.on('reconnect', onReconnect);

    return () => {
      cancelled = true;
      s.off(SocketEvents.GAME_START, onStart);
      s.off(SocketEvents.GAME_MOVE_APPLIED, onMove);
      s.off(SocketEvents.GAME_SYNC_STATE, onSync);
      s.off(SocketEvents.ROOM_OPPONENT_JOINED, onOppJoined);
      s.off(SocketEvents.ROOM_OPPONENT_LEFT, onOppLeft);
      s.off(SocketEvents.ROOM_OPPONENT_RECONNECTED, onOppRecon);
      s.off(SocketEvents.ROOM_SPECTATOR_JOINED, onSpecJoined);
      s.off(SocketEvents.ROOM_SPECTATOR_LEFT, onSpecLeft);
      s.off(SocketEvents.ROOM_SPECTATORS_UPDATE, onSpecsUpdate);
      s.off(SocketEvents.GAME_MOVE_REJECTED, onReject);
      s.off(SocketEvents.GAME_OVER, onOver);
      s.io.off('reconnect', onReconnect);
    };
  }, [
    roomId,
    isSpectatorMode,
    navigate,
    pushToast,
    reset,
    sessionRoomId,
    sessionToken,
    setInputLocked,
    setStateExternal,
  ]);

  // Cleanup chỉ chạy khi unmount component thực sự (rời trang) — emit
  // room:leave để server xóa phòng nếu là sole-player waiting room. Tránh
  // ghost room khi user nhấn "← Menu", browser back, hoặc switch route.
  // Dùng setTimeout(0) + module flag để StrictMode không trigger nhầm
  // (mount → cleanup → mount → cleanup): cleanup đầu schedule, mount sau
  // cancel; chỉ unmount thật mới fire.
  useEffect(() => {
    if (pendingLeaveTimer !== null) {
      clearTimeout(pendingLeaveTimer);
      pendingLeaveTimer = null;
    }
    return () => {
      pendingLeaveTimer = setTimeout(() => {
        pendingLeaveTimer = null;
        const sock = getSocket();
        if (sock.connected) {
          sock.emit(SocketEvents.ROOM_LEAVE, {});
        }
        setSession(null, null);
      }, 0);
    };
  }, [setSession]);

  const blackPieces = state.board.filter((c) => c === 'B').length;
  const whitePieces = state.board.filter((c) => c === 'W').length;
  const over = isGameOver(state);
  const winner = getWinner(state);

  const onCellClickPvP = (idx: number): void => {
    if (isSpectator) return;
    if (selectedFrom !== null && legalDestinations.includes(idx)) {
      const from = selectedFrom;
      const move = { from, to: idx };
      setInputLocked(true);
      void sendMove(move).catch((e) => {
        // NO_ROOM xảy ra khi vừa reconnect — bỏ qua, server sẽ re-bind
        // qua reconnect listener và user có thể click lại sau ~1s.
        const msg = e instanceof Error ? e.message : 'UNKNOWN';
        if (msg !== 'NO_ROOM') {
          pushToast('error', msg === 'UNKNOWN' ? t('pvp.sendFail') : msg);
        }
        setInputLocked(false);
      });
      useGameStore.setState({ selectedFrom: null, legalDestinations: [] });
      return;
    }
    handleCellClick(idx);
  };

  const leaveRoom = () => {
    const s = getSocket();
    s.emit(SocketEvents.ROOM_LEAVE, {});
    setSession(null, null);
    navigate('/play/pvp');
  };

  const copyCode = () => {
    void navigator.clipboard?.writeText(roomId);
    pushToast('success', t('pvp.codeCopied'));
  };

  // Names hiển thị: spectator dùng playerNames; player dùng me/opponent
  const blackName = isSpectator
    ? (playerNames.B ?? t('common.black'))
    : myColor === 'B'
      ? t('common.you')
      : (opponentName ?? t('common.opponent'));
  const whiteName = isSpectator
    ? (playerNames.W ?? t('common.white'))
    : myColor === 'W'
      ? t('common.you')
      : (opponentName ?? t('common.opponent'));

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-3">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <Link to="/" className="text-sm underline">
          {t('common.back')}
        </Link>
        <button
          type="button"
          onClick={copyCode}
          className="font-num text-lg"
          data-testid="room-code-display"
        >
          {t('pvp.codePrefix')}: {roomId}
        </button>
        {isSpectator ? (
          <button type="button" onClick={leaveRoom} className="text-sm underline">
            {t('common.leaveRoom')}
          </button>
        ) : !opponentName || over ? (
          <button type="button" onClick={leaveRoom} className="text-sm underline">
            {t('common.leaveRoom')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              void resign();
            }}
            className="text-sm underline"
            data-testid="btn-forfeit"
          >
            {t('common.forfeit')}
          </button>
        )}
      </div>

      {isSpectator && (
        <div
          className="w-full max-w-2xl mt-3 px-3 py-2 rounded bg-accent-2/15 text-text-primary text-sm"
          data-testid="spectator-banner"
        >
          👁 {t('pvp.youAreSpectator')}
        </div>
      )}

      {oppDisconnected && (
        <div className="w-full max-w-2xl mt-3 px-3 py-2 rounded bg-yellow-100 text-text-primary text-sm">
          {t('pvp.oppDisconnected')}
        </div>
      )}

      <div className="w-full max-w-2xl flex items-center justify-between mt-3 mb-3">
        <PlayerBadge
          color="B"
          count={blackPieces}
          active={state.turn === 'B' && !over}
          isMe={!isSpectator && myColor === 'B'}
          name={blackName}
          clock={clock}
          t={t}
        />
        <PlayerBadge
          color="W"
          count={whitePieces}
          active={state.turn === 'W' && !over}
          isMe={!isSpectator && myColor === 'W'}
          name={whiteName}
          clock={clock}
          t={t}
        />
      </div>

      <Board
        state={state}
        selectedFrom={selectedFrom}
        legalDestinations={legalDestinations}
        onPieceClick={isSpectator ? () => undefined : handlePieceClick}
        onCellClick={onCellClickPvP}
      />

      <p className="mt-3 text-sm text-text-muted">
        {isSpectator
          ? over
            ? winner === 'draw'
              ? t('result.draw')
              : winner === 'B'
                ? t('result.blackWin')
                : t('result.whiteWin')
            : state.turn === 'B'
              ? t('turn.localBlack')
              : t('turn.localWhite')
          : !opponentName
            ? t('pvp.waitingOpp')
            : over
              ? winner === 'draw'
                ? t('result.draw')
                : winner === myColor
                  ? t('result.youWin')
                  : t('result.oppWin')
              : state.turn === myColor
                ? t('turn.you')
                : t('turn.opponent')}
      </p>

      <SpectatorsList spectators={spectators} t={t} />

      <ChatPanel myColor={isSpectator ? 'B' : myColor} />

      <Modal
        open={over && !isSpectator}
        onClose={leaveRoom}
        title={
          winner === 'draw'
            ? t('result.draw')
            : winner === myColor
              ? t('result.youWin')
              : t('result.oppWin')
        }
      >
        <div className="space-y-3">
          <p className="text-sm">
            {t('common.movesCount')}: {state.moveHistory.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={leaveRoom}
              className="flex-1 px-4 py-2 rounded bg-accent text-white"
            >
              {t('common.leaveRoom')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SpectatorsList({
  spectators,
  t,
}: {
  spectators: SpectatorInfo[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <details
      className="w-full max-w-2xl mt-4 px-3 rounded-lg border border-text-muted/30 bg-surface/30"
      data-testid="spectators-list"
    >
      <summary className="text-sm cursor-pointer py-2">
        👁 {t('pvp.spectators')} ({spectators.length})
      </summary>
      <div className="pb-3">
        {spectators.length === 0 ? (
          <p className="text-sm text-text-muted italic">{t('pvp.noSpectators')}</p>
        ) : (
          <ul className="text-sm space-y-1">
            {spectators.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-text-muted">·</span>
                <span>{s.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function PlayerBadge({
  color,
  count,
  active,
  isMe,
  name,
  clock,
  t,
}: {
  color: 'B' | 'W';
  count: number;
  active: boolean;
  isMe: boolean;
  name: string;
  clock: ClockState | null;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div
      className={`px-3 py-2 rounded-md border ${active ? 'border-accent bg-surface' : 'border-text-muted'}`}
      data-testid={`badge-${color}`}
    >
      <span className="text-sm">{isMe ? t('common.you') : name}</span>
      <span className="ml-2 text-xs text-text-muted">
        ({color === 'B' ? t('common.black') : t('common.white')})
      </span>
      <span className="ml-2 font-num">{count}</span>
      {clock && (
        <span className="ml-2">
          <ClockDisplay clock={clock} forColor={color} active={active} />
        </span>
      )}
    </div>
  );
}
