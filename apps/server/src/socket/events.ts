/** Tên các Socket.IO event (MULTIPLAYER.md mục 2). */
export const Events = {
  // Client -> Server
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_RECONNECT: 'room:reconnect',
  ROOM_LIST: 'room:list',
  GAME_MOVE: 'game:move',
  GAME_RESIGN: 'game:resign',
  GAME_REMATCH: 'game:rematch',
  CHAT_MESSAGE: 'chat:message',

  // Server -> Client
  ROOM_OPPONENT_JOINED: 'room:opponentJoined',
  ROOM_OPPONENT_LEFT: 'room:opponentLeft',
  ROOM_OPPONENT_RECONNECTED: 'room:opponentReconnected',
  ROOM_LIST_UPDATED: 'room:listUpdated',
  GAME_START: 'game:start',
  GAME_MOVE_APPLIED: 'game:moveApplied',
  GAME_MOVE_REJECTED: 'game:moveRejected',
  GAME_OVER: 'game:over',
  GAME_SYNC_STATE: 'game:syncState',
  CHAT_NEW: 'chat:new',
  CHAT_HISTORY: 'chat:history',
  ERROR: 'error',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
