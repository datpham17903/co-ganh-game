import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useSettingsStore } from '../src/stores/settingsStore.js';
import { useSocketStore } from '../src/stores/socketStore.js';
import { RoomLobby } from '../src/features/room/RoomLobby.js';

describe('RoomLobby', () => {
  beforeEach(() => {
    useSettingsStore.setState({ playerName: '' });
    useSocketStore.setState({ roomId: null, playerToken: null });
  });

  it('hiển thị input tên + nút tạo + nút vào (disabled khi mã ngắn)', () => {
    render(
      <MemoryRouter>
        <RoomLobby />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('input-player-name')).toBeInTheDocument();
    expect(screen.getByTestId('btn-create-room')).toBeInTheDocument();
    expect(screen.getByTestId('btn-join-room')).toBeDisabled();
  });

  it('mã 6 ký tự enable nút Vào', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoomLobby />
      </MemoryRouter>,
    );
    await user.type(screen.getByTestId('input-room-code'), 'ABC234');
    expect(screen.getByTestId('btn-join-room')).not.toBeDisabled();
  });

  it('không có tên → toast warning khi tạo phòng', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoomLobby />
      </MemoryRouter>,
    );
    await user.click(screen.getByTestId('btn-create-room'));
    // Toast container không render trong test này (App-level), chỉ check không navigate.
    expect(useSocketStore.getState().roomId).toBeNull();
  });

  it('input tên cập nhật settings store', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoomLobby />
      </MemoryRouter>,
    );
    await user.type(screen.getByTestId('input-player-name'), 'Alice');
    expect(useSettingsStore.getState().playerName).toBe('Alice');
  });

  it('uppercase + max 6 ký tự cho mã phòng', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoomLobby />
      </MemoryRouter>,
    );
    const input = screen.getByTestId('input-room-code') as HTMLInputElement;
    await user.type(input, 'abc234extra');
    expect(input.value).toBe('ABC234');
  });

  it('socketStore setSession lưu vào sessionStorage', () => {
    act(() => useSocketStore.getState().setSession('ABC234', 'token123'));
    expect(useSocketStore.getState().roomId).toBe('ABC234');
    expect(sessionStorage.getItem('co-ganh-roomId')).toBe('ABC234');
    act(() => useSocketStore.getState().clearSession());
    expect(useSocketStore.getState().roomId).toBeNull();
    expect(sessionStorage.getItem('co-ganh-roomId')).toBeNull();
  });
});
