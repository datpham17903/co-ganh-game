import { create } from 'zustand';
import {
  applyMove,
  createInitialState,
  getLegalMoves,
  type Color,
  type GameState,
  type Move,
} from '@co-ganh/engine';

export type GameMode = 'bot' | 'pvp' | 'local' | 'spectate';

interface GameStoreState {
  state: GameState;
  selectedFrom: number | null;
  legalDestinations: number[];
  mode: GameMode;
  myColor: Color;
  inputLocked: boolean;
  selectPiece: (idx: number) => void;
  clearSelection: () => void;
  makeMove: (move: Move) => void;
  resetGame: (opts?: { mode?: GameMode; myColor?: Color }) => void;
  setState: (s: GameState) => void;
  setInputLocked: (locked: boolean) => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  state: createInitialState(),
  selectedFrom: null,
  legalDestinations: [],
  mode: 'local',
  myColor: 'B',
  inputLocked: false,

  selectPiece: (idx) => {
    const { state, mode, myColor } = get();
    if (state.status !== 'playing') return;
    // Spectator: không tương tác.
    if (mode === 'spectate') return;
    const cell = state.board[idx];
    if (!cell) return;
    if (mode !== 'local' && cell !== myColor) return;
    if (mode === 'local' && cell !== state.turn) return;
    if (mode !== 'local' && state.turn !== cell) return;
    const moves = getLegalMoves(state, idx);
    set({ selectedFrom: idx, legalDestinations: moves });
  },

  clearSelection: () => set({ selectedFrom: null, legalDestinations: [] }),

  makeMove: (move) => {
    const { state, mode } = get();
    if (state.status !== 'playing') return;
    if (mode === 'spectate') return;
    const next = applyMove(state, move);
    set({ state: next, selectedFrom: null, legalDestinations: [] });
  },

  resetGame: (opts) => {
    set({
      state: createInitialState(),
      selectedFrom: null,
      legalDestinations: [],
      mode: opts?.mode ?? get().mode,
      myColor: opts?.myColor ?? get().myColor,
      inputLocked: false,
    });
  },

  setState: (state) => set({ state, selectedFrom: null, legalDestinations: [] }),

  setInputLocked: (inputLocked) => set({ inputLocked }),
}));
