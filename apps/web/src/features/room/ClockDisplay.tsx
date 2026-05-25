import type { ClockState } from '../../lib/socket.js';

interface ClockDisplayProps {
  clock: ClockState | null;
  forColor: 'B' | 'W';
  active: boolean;
}

/** Format ms thành "M:SS" hoặc "MM:SS". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Hiển thị thời gian còn lại của 1 player. Đỏ pulse khi < 30s. */
export function ClockDisplay({ clock, forColor, active }: ClockDisplayProps) {
  if (!clock) return null;
  const ms = forColor === 'B' ? clock.B : clock.W;
  const low = ms < 30_000;
  const out = ms <= 0;
  return (
    <span
      className={`font-num text-sm tabular-nums ${
        out
          ? 'text-accent font-bold'
          : low
            ? 'text-accent animate-pulse'
            : active
              ? 'text-text-primary'
              : 'text-text-muted'
      }`}
      data-testid={`clock-${forColor}`}
    >
      {formatClock(ms)}
    </span>
  );
}
