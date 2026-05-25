import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Board } from '../features/board/Board.js';
import { useBoardInteraction } from '../features/board/useBoardInteraction.js';
import { useGameStore } from '../stores/gameStore.js';
import { Modal } from '../components/Modal.js';
import { isGameOver, getWinner } from '@co-ganh/engine';
import { MoveHistory } from '../features/game/MoveHistory.js';
import { useGameSound } from '../features/game/useGameSound.js';
import { audio } from '../lib/audio.js';

export function PlayLocalPage() {
  const reset = useGameStore((s) => s.resetGame);
  useEffect(() => {
    reset({ mode: 'local' });
    audio.arm();
  }, [reset]);
  useGameSound();

  const { state, selectedFrom, legalDestinations, handlePieceClick, handleCellClick } =
    useBoardInteraction();

  const blackPieces = state.board.filter((c) => c === 'B').length;
  const whitePieces = state.board.filter((c) => c === 'W').length;
  const over = isGameOver(state);
  const winner = getWinner(state);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-3">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <Link to="/" className="text-sm underline">
          ← Menu
        </Link>
        <h1 className="font-display text-xl">Chơi 2 người</h1>
        <button
          type="button"
          onClick={() => reset({ mode: 'local' })}
          className="text-sm underline"
        >
          Đấu lại
        </button>
      </div>

      <div className="w-full max-w-2xl flex items-center justify-between mt-3 mb-3">
        <PlayerBadge color="B" count={blackPieces} active={state.turn === 'B' && !over} />
        <PlayerBadge color="W" count={whitePieces} active={state.turn === 'W' && !over} />
      </div>

      <Board
        state={state}
        selectedFrom={selectedFrom}
        legalDestinations={legalDestinations}
        onPieceClick={handlePieceClick}
        onCellClick={handleCellClick}
      />

      <p className="mt-3 text-sm text-text-muted" data-testid="turn-indicator">
        {over
          ? winner === 'draw'
            ? 'Hòa'
            : winner === 'B'
              ? 'Đen thắng'
              : 'Trắng thắng'
          : state.turn === 'B'
            ? 'Lượt: Đen'
            : 'Lượt: Trắng'}
      </p>

      <details className="w-full max-w-2xl mt-4 px-3">
        <summary className="text-sm cursor-pointer">Lịch sử nước đi</summary>
        <div className="mt-2">
          <MoveHistory />
        </div>
      </details>

      <Modal
        open={over}
        onClose={() => reset({ mode: 'local' })}
        title={winner === 'draw' ? 'Hòa cờ' : winner === 'B' ? 'Đen thắng' : 'Trắng thắng'}
      >
        <div className="space-y-3">
          <p className="text-sm">Số nước đi: {state.moveHistory.length}</p>
          {state.drawReason && <p className="text-sm">Lý do: {state.drawReason}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => reset({ mode: 'local' })}
              className="flex-1 px-4 py-2 rounded bg-accent text-white"
            >
              Đấu lại
            </button>
            <Link to="/" className="flex-1 px-4 py-2 rounded border border-text-muted text-center">
              Về menu
            </Link>
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
}: {
  color: 'B' | 'W';
  count: number;
  active: boolean;
}) {
  return (
    <div
      className={`px-3 py-2 rounded-md border ${active ? 'border-accent bg-surface' : 'border-text-muted'}`}
      data-testid={`badge-${color}`}
    >
      <span className="text-sm">{color === 'B' ? 'Đen' : 'Trắng'}</span>
      <span className="ml-2 font-num">{count}</span>
      {active && <span className="ml-2 text-accent">▶</span>}
    </div>
  );
}
