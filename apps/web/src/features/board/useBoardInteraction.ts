import { useGameStore } from '../../stores/gameStore.js';

/**
 * State machine click theo FLOW.md 5.1:
 * - IDLE → click quân mình → PIECE_SELECTED
 * - PIECE_SELECTED → click quân mình khác → đổi PIECE_SELECTED
 * - PIECE_SELECTED → click ô đích hợp lệ → APPLY MOVE → IDLE
 * - PIECE_SELECTED → click khác → IDLE
 */
export function useBoardInteraction() {
  const state = useGameStore((s) => s.state);
  const selectedFrom = useGameStore((s) => s.selectedFrom);
  const legalDestinations = useGameStore((s) => s.legalDestinations);
  const inputLocked = useGameStore((s) => s.inputLocked);
  const selectPiece = useGameStore((s) => s.selectPiece);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const makeMove = useGameStore((s) => s.makeMove);

  const handlePieceClick = (idx: number): void => {
    if (inputLocked) return;
    if (state.status !== 'playing') return;
    const cell = state.board[idx];
    if (!cell) return;
    // Click quân của bên đang đi → chọn (hoặc đổi)
    if (cell === state.turn) {
      selectPiece(idx);
      return;
    }
    // Click quân địch:
    //  - Nếu đang chọn 1 quân, bỏ chọn.
    //  - Nếu không, không làm gì.
    if (selectedFrom !== null) clearSelection();
  };

  const handleCellClick = (idx: number): void => {
    if (inputLocked) return;
    if (state.status !== 'playing') return;
    if (selectedFrom === null) return;
    // -1 = click nền → bỏ chọn
    if (idx < 0) {
      clearSelection();
      return;
    }
    if (legalDestinations.includes(idx)) {
      const color = state.board[selectedFrom];
      if (!color) return;
      makeMove({ from: selectedFrom, to: idx, color });
      return;
    }
    clearSelection();
  };

  return {
    state,
    selectedFrom,
    legalDestinations,
    handlePieceClick,
    handleCellClick,
  };
}
