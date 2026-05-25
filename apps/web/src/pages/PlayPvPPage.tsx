import { useEffect, useState } from 'react';
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

export function PlayPvPPage() {
  const { roomId } = useParams();
  if (!roomId) return <RoomLobby />;
  return <PvPGameRoom roomId={roomId} />;
}

function PvPGameRoom({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const setSession = useSocketStore((s) => s.setSession);
  const session = useSocketStore((s) => ({ roomId: s.roomId, token: s.playerToken }));
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

  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    // Reconnect nếu có session lưu cho cùng phòng
    const tryReconnect = async () => {
      if (session.roomId === roomId && session.token) {
        try {
          const resp = await emit<{
            ok: boolean;
            color?: 'B' | 'W';
            state?: GameState;
            error?: string;
          }>(s, SocketEvents.ROOM_RECONNECT, { roomId, playerToken: session.token });
          if (resp.ok && resp.color && resp.state) {
            reset({ mode: 'pvp', myColor: resp.color });
            setStateExternal(resp.state);
            return;
          }
          pushToast('warning', 'Không vào được phòng — quay về sảnh');
          navigate('/play/pvp');
        } catch {
          navigate('/play/pvp');
        }
      } else {
        // Không có session → quay về sảnh
        navigate('/play/pvp');
      }
    };
    void tryReconnect();

    const onStart = (data: {
      state: GameState;
      players: { B: { name: string } | null; W: { name: string } | null };
    }) => {
      setStateExternal(data.state);
      const opp = useGameStore.getState().myColor === 'B' ? data.players.W : data.players.B;
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
      pushToast('info', `${d.name} đã vào phòng`);
    };
    const onOppLeft = () => {
      setOppDisconnected(true);
      pushToast('warning', 'Đối thủ mất kết nối...');
    };
    const onOppRecon = () => {
      setOppDisconnected(false);
      pushToast('success', 'Đối thủ đã kết nối lại');
    };
    const onReject = (d: { reason: string }) => {
      pushToast('error', `Nước đi không hợp lệ: ${d.reason}`);
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

    return () => {
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
    session.roomId,
    session.token,
    setInputLocked,
    setStateExternal,
  ]);

  const blackPieces = state.board.filter((c) => c === 'B').length;
  const whitePieces = state.board.filter((c) => c === 'W').length;
  const over = isGameOver(state);
  const winner = getWinner(state);

  // Bắt sự kiện khi user click ô đích → chuyển sang sendMove qua socket
  const onCellClickPvP = (idx: number): void => {
    if (selectedFrom !== null && legalDestinations.includes(idx)) {
      const from = selectedFrom;
      const move = { from, to: idx };
      // Optimistic: lock input, đợi server confirm
      setInputLocked(true);
      void sendMove(move).catch((e) => {
        pushToast('error', e instanceof Error ? e.message : 'Gửi nước đi thất bại');
        setInputLocked(false);
      });
      // Clear selection visual
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
    pushToast('success', 'Đã sao chép mã phòng');
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-3">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <Link to="/" className="text-sm underline">
          ← Menu
        </Link>
        <button
          type="button"
          onClick={copyCode}
          className="font-num text-lg"
          data-testid="room-code-display"
        >
          Mã: {roomId}
        </button>
        <button
          type="button"
          onClick={() => {
            void resign();
            leaveRoom();
          }}
          className="text-sm underline"
        >
          Đầu hàng
        </button>
      </div>

      {oppDisconnected && (
        <div className="w-full max-w-2xl mt-3 px-3 py-2 rounded bg-yellow-100 text-text-primary text-sm">
          Đối thủ mất kết nối, đợi reconnect...
        </div>
      )}

      <div className="w-full max-w-2xl flex items-center justify-between mt-3 mb-3">
        <PlayerBadge
          color="B"
          count={blackPieces}
          active={state.turn === 'B' && !over}
          isMe={myColor === 'B'}
          name={myColor === 'B' ? 'Bạn' : (opponentName ?? 'Đối thủ')}
        />
        <PlayerBadge
          color="W"
          count={whitePieces}
          active={state.turn === 'W' && !over}
          isMe={myColor === 'W'}
          name={myColor === 'W' ? 'Bạn' : (opponentName ?? 'Đối thủ')}
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
          ? 'Chờ đối thủ vào phòng...'
          : over
            ? winner === 'draw'
              ? 'Hòa'
              : winner === myColor
                ? 'Bạn thắng'
                : 'Đối thủ thắng'
            : state.turn === myColor
              ? 'Lượt bạn'
              : 'Đối thủ đang đi...'}
      </p>

      <Modal
        open={over}
        onClose={leaveRoom}
        title={winner === 'draw' ? 'Hòa cờ' : winner === myColor ? 'Bạn thắng' : 'Đối thủ thắng'}
      >
        <div className="space-y-3">
          <p className="text-sm">Số nước đi: {state.moveHistory.length}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={leaveRoom}
              className="flex-1 px-4 py-2 rounded bg-accent text-white"
            >
              Rời phòng
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
}: {
  color: 'B' | 'W';
  count: number;
  active: boolean;
  isMe: boolean;
  name: string;
}) {
  return (
    <div
      className={`px-3 py-2 rounded-md border ${active ? 'border-accent bg-surface' : 'border-text-muted'}`}
      data-testid={`badge-${color}`}
    >
      <span className="text-sm">{isMe ? 'Bạn' : name}</span>
      <span className="ml-2 text-xs text-text-muted">({color === 'B' ? 'Đen' : 'Trắng'})</span>
      <span className="ml-2 font-num">{count}</span>
    </div>
  );
}
