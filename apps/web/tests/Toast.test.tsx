import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useToastStore } from '../src/stores/toastStore.js';
import { ToastContainer } from '../src/components/Toast.js';

describe('toastStore + ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('push thêm toast và hiển thị message', () => {
    render(<ToastContainer />);
    act(() => {
      useToastStore.getState().push('success', 'Đã sao chép');
    });
    expect(screen.getByText('Đã sao chép')).toBeInTheDocument();
  });

  it('auto dismiss sau 3 giây', () => {
    render(<ToastContainer />);
    act(() => {
      useToastStore.getState().push('info', 'Hello');
    });
    expect(screen.getByText('Hello')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3001);
    });
    expect(screen.queryByText('Hello')).toBeNull();
  });

  it('dismiss thủ công xóa toast', () => {
    render(<ToastContainer />);
    let id = 0;
    act(() => {
      id = useToastStore.getState().push('warning', 'Coi chừng');
    });
    expect(screen.getByText('Coi chừng')).toBeInTheDocument();
    act(() => {
      useToastStore.getState().dismiss(id);
    });
    expect(screen.queryByText('Coi chừng')).toBeNull();
  });
});
