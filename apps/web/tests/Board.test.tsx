import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coord2index, createInitialState } from '@co-ganh/engine';
import { Board } from '../src/features/board/Board.js';

function noop() {
  /* noop */
}

describe('Board (SVG)', () => {
  it('render đúng số quân initial state (16)', () => {
    const state = createInitialState();
    render(
      <Board
        state={state}
        selectedFrom={null}
        legalDestinations={[]}
        onPieceClick={noop}
        onCellClick={noop}
      />,
    );
    const pieces = screen.getAllByTestId(/^piece-/);
    expect(pieces).toHaveLength(16);
  });

  it('có 25 cell + 16 piece + 0 highlight (initial)', () => {
    const state = createInitialState();
    render(
      <Board
        state={state}
        selectedFrom={null}
        legalDestinations={[]}
        onPieceClick={noop}
        onCellClick={noop}
      />,
    );
    expect(screen.getAllByTestId(/^cell-/)).toHaveLength(25);
    expect(screen.queryAllByTestId(/^legal-/)).toHaveLength(0);
  });

  it('hiển thị legal destinations đúng', () => {
    const state = createInitialState();
    render(
      <Board
        state={state}
        selectedFrom={coord2index(1, 0)}
        legalDestinations={[coord2index(1, 1)]}
        onPieceClick={noop}
        onCellClick={noop}
      />,
    );
    expect(screen.getAllByTestId(/^legal-/)).toHaveLength(1);
  });

  it('quân đang chọn có data-selected="true"', () => {
    const state = createInitialState();
    const sel = coord2index(1, 0);
    render(
      <Board
        state={state}
        selectedFrom={sel}
        legalDestinations={[]}
        onPieceClick={noop}
        onCellClick={noop}
      />,
    );
    const piece = screen.getByTestId(`piece-${sel}`);
    expect(piece.getAttribute('data-selected')).toBe('true');
  });

  it('click piece gọi onPieceClick với đúng index', async () => {
    const user = userEvent.setup();
    const state = createInitialState();
    const calls: number[] = [];
    render(
      <Board
        state={state}
        selectedFrom={null}
        legalDestinations={[]}
        onPieceClick={(i) => calls.push(i)}
        onCellClick={noop}
      />,
    );
    await user.click(screen.getByTestId(`piece-${coord2index(0, 0)}`));
    expect(calls).toEqual([coord2index(0, 0)]);
  });

  it('click legal destination gọi onCellClick', async () => {
    const user = userEvent.setup();
    const state = createInitialState();
    const calls: number[] = [];
    render(
      <Board
        state={state}
        selectedFrom={coord2index(1, 0)}
        legalDestinations={[coord2index(1, 1)]}
        onPieceClick={noop}
        onCellClick={(i) => calls.push(i)}
      />,
    );
    await user.click(screen.getByTestId(`legal-${coord2index(1, 1)}`));
    expect(calls).toEqual([coord2index(1, 1)]);
  });
});
