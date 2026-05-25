import { useEffect, useState } from 'react';
import { getSocket, SocketEvents, type ClockState } from '../lib/socket.js';

/**
 * Hook: subscribe vào clock updates từ server.
 * - Server broadcast `clock:update` mỗi giây cho phòng đang chơi.
 * - GAME_START / GAME_MOVE_APPLIED / GAME_SYNC_STATE cũng kèm clock — pick up.
 * - Local interpolation 100ms tick để smooth countdown.
 */
export function useClockSync(): { clock: ClockState | null } {
  const [serverClock, setServerClock] = useState<ClockState | null>(null);
  const [localClock, setLocalClock] = useState<ClockState | null>(null);

  useEffect(() => {
    const s = getSocket();

    const onUpdate = (d: { clock: ClockState }) => {
      setServerClock(d.clock);
      setLocalClock(d.clock);
    };
    const onStartOrSync = (d: { clock?: ClockState }) => {
      if (d.clock) {
        setServerClock(d.clock);
        setLocalClock(d.clock);
      }
    };
    const onMove = (d: { clock?: ClockState }) => {
      if (d.clock) {
        setServerClock(d.clock);
        setLocalClock(d.clock);
      }
    };

    s.on(SocketEvents.CLOCK_UPDATE, onUpdate);
    s.on(SocketEvents.GAME_START, onStartOrSync);
    s.on(SocketEvents.GAME_SYNC_STATE, onStartOrSync);
    s.on(SocketEvents.GAME_MOVE_APPLIED, onMove);

    return () => {
      s.off(SocketEvents.CLOCK_UPDATE, onUpdate);
      s.off(SocketEvents.GAME_START, onStartOrSync);
      s.off(SocketEvents.GAME_SYNC_STATE, onStartOrSync);
      s.off(SocketEvents.GAME_MOVE_APPLIED, onMove);
    };
  }, []);

  // Local tick 100ms — trừ thời gian cho bên đang đi
  useEffect(() => {
    if (!serverClock || serverClock.turn === null) return;
    const start = Date.now();
    const baseB = serverClock.B;
    const baseW = serverClock.W;
    const turn = serverClock.turn;
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      setLocalClock({
        B: turn === 'B' ? Math.max(0, baseB - elapsed) : baseB,
        W: turn === 'W' ? Math.max(0, baseW - elapsed) : baseW,
        turn,
      });
    }, 100);
    return () => clearInterval(tick);
  }, [serverClock]);

  return { clock: localClock };
}
