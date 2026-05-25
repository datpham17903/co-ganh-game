import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { isGameOver, getWinner, type GameState } from '@co-ganh/engine';
import { Board } from '../features/board/Board.js';
import { useBoardInteraction } from '../features/board/useBoardInteraction.js';
import { useGameStore } from '../stores/gameStore.js';
import { useSocketStore } from '../stores/socketStore.js';
import { useToastStore } from '../stores/toastStore.js';
import { emit, getSocket, SocketEvents } from '../lib/socket.js';
import { Modal } from '../components/Modal.js';
import { RoomLobby } from '../features/room/RoomLobby.js';
import { usePvPGame } from '../features/room/usePvPGame.js';
import { ChatPanel } from '../features/room/ChatPanel.js';
import { ClockDisplay } from '../features/room/ClockDisplay.js';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic.js';
import { useClockSync } from '../hooks/useClockSync.js';
import { useT } from '../i18n/index.js';

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
  useBackgroundMusic();
  const { clock } = useClockSync();
  const navigate = useNavigate();
  const setSession = useSocketStore((s) => s.setSession);
  const sessionRoomId = useSocketStore((s) => s.roomId);
  const sessionToken = useSocketStore((s) => s.playerToken);
  const pushToast = useToastStore((s) => s.push);
  const reset = useGameStore((s) => s.resetGame);
  const setStateExternal = useGameStore((s) => s.setState);
  const myColor = useGameStore((s) => s.myColor);
  const setInputLocked = useGameStore((s) => s.setInputLocked);

  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [oppDisconnected, setOppDisconnected] = useState(false);

  const { state, selectedFrom, legalDestinations, handlePieceClick, handleCellClick } =
    useBoardInteraction();
  const { sendMove, resign } = usePvPGame();

  // Giữ ref tới t để listener không stale closure khi đổi ngôn ngữ.
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    // BUG FIX: gắn listener TRƯỚC reconnect/join. Trước đây listener gắn sau emit
    // nên player thứ 2 có thể bỏ lỡ event game:start mà server emit ngay sau ack.
    const onStart = (data: {
      state: GameState;
      players: { B: { name: string } | null; W: { name: string } | null };
    }) => {
      setStateExternal(data.state);
      const meColor = useGameStore.getState().myColor;
      const opp = meColor === 'B' ? data.players.W : data.players.B;
      if (opp) setOpponentName(opp.name);
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
    const onReject = (d: { reason: string }) => {
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
    s.on(SocketEvents.GAME_MOVE_REJECTED, onReject);
    s.on(SocketEvents.GAME_OVER, onOver);

    let cancelled = false;
    const tryReconnect = async () => {
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
    void tryReconnect();

    return () => {
      cancelled = true;
      s.off(SocketEvents.GAME_START, onStart);
      s.off(SocketEvents.GAME_MOVE_APPLIED, onMove);
      s.off(SocketEvents.GAME_SYNC_STATE, onSync);
      s.off(SocketEvents.ROOM_OPPONENT_JOINED, onOppJoined);
      s.off(SocketEvents.ROOM_OPPONENT_LEFT, onOppLeft);
      s.off(SocketEvents.ROOM_OPPONENT_RECONNECTED, onOppRecon);
      s.off(SocketEvents.GAME_MOVE_REJECTED, onReject);
      s.off(SocketEvents.GAME_OVER, onOver);
    };
  }, [
    roomId,
    navigate,
    pushToast,
    reset,
    sessionRoomId,
    sessionToken,
    setInputLocked,
    setStateExternal,
  ]);

  const blackPieces = state.board.filter((c) => c === 'B').length;
  const whitePieces = state.board.filter((c) => c === 'W').length;
  const over = isGameOver(state);
  const winner = getWinner(state);

  const onCellClickPvP = (idx: number): void => {
    if (selectedFrom !== null && legalDestinations.includes(idx)) {
      const from = selectedFrom;
      const move = { from, to: idx };
      setInputLocked(true);
      void sendMove(move).catch((e) => {
        pushToast('error', e instanceof Error ? e.message : t('pvp.sendFail'));
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
        <button
          type="button"
          onClick={() => {
            void resign();
            leaveRoom();
          }}
          className="text-sm underline"
        >
          {t('common.resign')}
        </button>
      </div>

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
          isMe={myColor === 'B'}
          name={myColor === 'B' ? t('common.you') : (opponentName ?? t('common.opponent'))}
          clock={clock}
          t={t}
        />
        <PlayerBadge
          color="W"
          count={whitePieces}
          active={state.turn === 'W' && !over}
          isMe={myColor === 'W'}
          name={myColor === 'W' ? t('common.you') : (opponentName ?? t('common.opponent'))}
          clock={clock}
          t={t}
        />
      </div>

      <Board
        state={state}
        selectedFrom={selectedFrom}
        legalDestinations={legalDestinations}
        onPieceClick={handlePieceClick}
        onCellClick={onCellClickPvP}
      />

      <p className="mt-3 text-sm text-text-muted">
        {!opponentName
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

      <ChatPanel myColor={myColor} />

      <Modal
        open={over}
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
  clock: import('../lib/socket.js').ClockState | null;
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
