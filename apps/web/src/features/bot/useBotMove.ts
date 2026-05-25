import { useEffect, useRef } from 'react';
import type { BotConfig } from '@co-ganh/bot';
import { chooseMoveSync } from '@co-ganh/bot';
import type { GameState, Move } from '@co-ganh/engine';
import { useGameStore } from '../../stores/gameStore.js';

interface UseBotMoveOpts {
  enabled: boolean;
  config: BotConfig;
  thinkingDelayMs?: number;
}

/**
 * Tự động trigger bot khi đến lượt bot. Dùng Web Worker khi available, fallback
 * sang sync trong main thread (test env hoặc khi Worker không support).
 */
export function useBotMove({ enabled, config, thinkingDelayMs = 500 }: UseBotMoveOpts) {
  const state = useGameStore((s) => s.state);
  const myColor = useGameStore((s) => s.myColor);
  const makeMove = useGameStore((s) => s.makeMove);
  const setInputLocked = useGameStore((s) => s.setInputLocked);

  const requestIdRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof Worker === 'undefined') return;
    workerRef.current = new Worker(new URL('./botWorker.ts', import.meta.url), {
      type: 'module',
    });
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (state.status !== 'playing') return;
    if (state.turn === myColor) return;

    setInputLocked(true);
    const requestId = ++requestIdRef.current;
    const minDelay = new Promise((res) => setTimeout(res, thinkingDelayMs));

    const computeMove = async (): Promise<Move> => {
      if (workerRef.current) {
        return new Promise<Move>((resolve, reject) => {
          const w = workerRef.current!;
          const handler = (e: MessageEvent<{ requestId: number; move?: Move; error?: string }>) => {
            if (e.data.requestId !== requestId) return;
            w.removeEventListener('message', handler);
            if (e.data.error) reject(new Error(e.data.error));
            else if (e.data.move) resolve(e.data.move);
            else reject(new Error('No move'));
          };
          w.addEventListener('message', handler);
          w.postMessage({ requestId, state, config });
        });
      }
      // Fallback sync (test)
      return chooseMoveSync(state, state.turn, config);
    };

    Promise.all([computeMove(), minDelay])
      .then(([move]) => {
        // Only apply if still latest request and same turn
        if (requestIdRef.current !== requestId) return;
        const cur = useGameStore.getState();
        if (cur.state !== state) return;
        makeMove(move);
        setInputLocked(false);
      })
      .catch(() => {
        setInputLocked(false);
      });

    // Cleanup: don't apply stale moves if effect re-runs
    return () => {
      // Bump requestId so the in-flight promise sees it's stale
      requestIdRef.current++;
      setInputLocked(false);
    };
  }, [enabled, state, myColor, makeMove, setInputLocked, thinkingDelayMs, config]);
}

// Helper for unit tests / debugging.
export function pickMoveDirect(state: GameState, config: BotConfig): Move {
  return chooseMoveSync(state, state.turn, config);
}
