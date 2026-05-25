import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { coord2index, createInitialState } from '@co-ganh/engine';
import { useGameStore } from '../src/stores/gameStore.js';
import { useBoardInteraction } from '../src/features/board/useBoardInteraction.js';

describe('useBoardInteraction state machine', () => {
  beforeEach(() => {
    useGameStore.setState({
      state: createInitialState(),
      selectedFrom: null,
      legalDestinations: [],
      mode: 'local',
      myColor: 'B',
      inputLocked: false,
    });
  });

  it('IDLE → click quân mình → PIECE_SELECTED + legal moves', () => {
    const { result } = renderHook(() => useBoardInteraction());
    act(() => result.current.handlePieceClick(coord2index(1, 0)));
    expect(useGameStore.getState().selectedFrom).toBe(coord2index(1, 0));
    expect(useGameStore.getState().legalDestinations.length).toBeGreaterThan(0);
  });

  it('PIECE_SELECTED → click ô đích hợp lệ → APPLY MOVE', () => {
    const { result } = renderHook(() => useBoardInteraction());
    act(() => result.current.handlePieceClick(coord2index(1, 0)));
    const target = useGameStore.getState().legalDestinations[0]!;
    act(() => result.current.handleCellClick(target));
    expect(useGameStore.getState().state.turn).toBe('W');
    expect(useGameStore.getState().selectedFrom).toBeNull();
  });

  it('PIECE_SELECTED → click quân địch → IDLE', () => {
    const { result } = renderHook(() => useBoardInteraction());
    act(() => result.current.handlePieceClick(coord2index(1, 0)));
    expect(useGameStore.getState().selectedFrom).not.toBeNull();
    // Click quân W (đối phương)
    act(() => result.current.handlePieceClick(coord2index(4, 0)));
    expect(useGameStore.getState().selectedFrom).toBeNull();
  });

  it('PIECE_SELECTED → click quân mình khác → đổi PIECE_SELECTED', () => {
    const { result } = renderHook(() => useBoardInteraction());
    act(() => result.current.handlePieceClick(coord2index(0, 0)));
    expect(useGameStore.getState().selectedFrom).toBe(coord2index(0, 0));
    act(() => result.current.handlePieceClick(coord2index(0, 2)));
    expect(useGameStore.getState().selectedFrom).toBe(coord2index(0, 2));
  });

  it('PIECE_SELECTED → click ô không hợp lệ → IDLE', () => {
    const { result } = renderHook(() => useBoardInteraction());
    act(() => result.current.handlePieceClick(coord2index(1, 0)));
    // Click một cell không phải legal destination, không phải quân
    act(() => result.current.handleCellClick(coord2index(2, 2)));
    expect(useGameStore.getState().selectedFrom).toBeNull();
  });

  it('inputLocked block mọi click', () => {
    useGameStore.setState({ inputLocked: true });
    const { result } = renderHook(() => useBoardInteraction());
    act(() => result.current.handlePieceClick(coord2index(1, 0)));
    expect(useGameStore.getState().selectedFrom).toBeNull();
  });

  it('không cho chọn ô trống', () => {
    const { result } = renderHook(() => useBoardInteraction());
    act(() => result.current.handlePieceClick(coord2index(2, 2))); // ô giữa trống
    expect(useGameStore.getState().selectedFrom).toBeNull();
  });

  it('handleCellClick(-1) bỏ chọn', () => {
    const { result } = renderHook(() => useBoardInteraction());
    act(() => result.current.handlePieceClick(coord2index(1, 0)));
    expect(useGameStore.getState().selectedFrom).not.toBeNull();
    act(() => result.current.handleCellClick(-1));
    expect(useGameStore.getState().selectedFrom).toBeNull();
  });
});
