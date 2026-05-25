import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { applyMove, coord2index, createInitialState } from '@co-ganh/engine';
import { useGameStore } from '../src/stores/gameStore.js';
import { MoveHistory } from '../src/features/game/MoveHistory.js';

describe('MoveHistory', () => {
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

  it('placeholder khi chưa có nước đi', () => {
    render(<MoveHistory />);
    expect(screen.getByText('Chưa có nước đi nào.')).toBeInTheDocument();
  });

  it('hiển thị từng nước với format đúng', () => {
    act(() => {
      const s0 = createInitialState();
      const s1 = applyMove(s0, {
        from: coord2index(1, 0),
        to: coord2index(1, 1),
        color: 'B',
      });
      useGameStore.setState({ state: s1 });
    });
    render(<MoveHistory />);
    expect(screen.getByTestId('move-1')).toBeInTheDocument();
    expect(screen.getByText(/Đen:/)).toBeInTheDocument();
  });
});
