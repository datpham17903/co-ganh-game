/// <reference lib="webworker" />
import { chooseMoveSync, type BotConfig } from '@co-ganh/bot';
import type { GameState, Move } from '@co-ganh/engine';

interface BotRequest {
  requestId: number;
  state: GameState;
  config: BotConfig;
}

interface BotResponse {
  requestId: number;
  move?: Move;
  error?: string;
}

self.onmessage = (e: MessageEvent<BotRequest>) => {
  const { requestId, state, config } = e.data;
  try {
    const move = chooseMoveSync(state, state.turn, config);
    const resp: BotResponse = { requestId, move };
    (self as unknown as DedicatedWorkerGlobalScope).postMessage(resp);
  } catch (err) {
    const resp: BotResponse = {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as DedicatedWorkerGlobalScope).postMessage(resp);
  }
};

export {};
