/** Tên các Socket.IO event (MULTIPLAYER.md mục 2). */
export const Events = {
  // Client -> Server
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_RECONNECT: 'room:reconnect',
  GAME_MOVE: 'game:move',
  GAME_RESIGN: 'game:resign',
  GAME_REMATCH: 'game:rematch',

  // Server -> Client
  ROOM_OPPONENT_JOINED: 'room:opponentJoined',
  ROOM_OPPONENT_LEFT: 'room:opponentLeft',
  ROOM_OPPONENT_RECONNECTED: 'room:opponentReconnected',
  GAME_START: 'game:start',
  GAME_MOVE_APPLIED: 'game:moveApplied',
  GAME_MOVE_REJECTED: 'game:moveRejected',
  GAME_OVER: 'game:over',
  GAME_SYNC_STATE: 'game:syncState',
  ERROR: 'error',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
