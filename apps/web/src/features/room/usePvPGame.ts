import { useCallback } from 'react';
import { emit, getSocket, SocketEvents } from '../../lib/socket.js';

export function usePvPGame() {
  const sendMove = useCallback(async (move: { from: number; to: number }): Promise<void> => {
    const s = getSocket();
    const resp = await emit<{ ok: boolean; error?: string }>(s, SocketEvents.GAME_MOVE, move);
    if (!resp.ok) throw new Error(resp.error ?? 'INVALID_MOVE');
  }, []);

  const resign = useCallback(async (): Promise<void> => {
    const s = getSocket();
    await emit<{ ok: boolean }>(s, SocketEvents.GAME_RESIGN, {});
  }, []);

  return { sendMove, resign };
}
