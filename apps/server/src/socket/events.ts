/** Tên các Socket.IO event (MULTIPLAYER.md mục 2). */
export const Events = {
  // Client -> Server
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_RECONNECT: 'room:reconnect',
  ROOM_LIST: 'room:list',
  /** Lấy snapshot phòng (state + players + clock) — dùng cho spectator. */
  ROOM_GET_STATE: 'room:getState',
  /** Subscribe vào lobby updates (giảm broadcast cho user không ở lobby). */
  LOBBY_SUBSCRIBE: 'lobby:subscribe',
  LOBBY_UNSUBSCRIBE: 'lobby:unsubscribe',
  ROOM_SPECTATE: 'room:spectate',
  GAME_MOVE: 'game:move',
  GAME_RESIGN: 'game:resign',
  GAME_REMATCH: 'game:rematch',
  CHAT_MESSAGE: 'chat:message',

  // Server -> Client
  ROOM_OPPONENT_JOINED: 'room:opponentJoined',
  ROOM_OPPONENT_LEFT: 'room:opponentLeft',
  ROOM_OPPONENT_RECONNECTED: 'room:opponentReconnected',
  ROOM_SPECTATOR_JOINED: 'room:spectatorJoined',
  ROOM_SPECTATOR_LEFT: 'room:spectatorLeft',
  ROOM_SPECTATORS_UPDATE: 'room:spectatorsUpdate',
  ROOM_LIST_UPDATED: 'room:listUpdated',
  GAME_START: 'game:start',
  GAME_MOVE_APPLIED: 'game:moveApplied',
  GAME_MOVE_REJECTED: 'game:moveRejected',
  GAME_OVER: 'game:over',
  GAME_SYNC_STATE: 'game:syncState',
  CHAT_NEW: 'chat:new',
  CHAT_HISTORY: 'chat:history',
  CLOCK_UPDATE: 'clock:update',
  ERROR: 'error',
} as const;

/** Socket.IO room name cho subscribers của lobby (để broadcast targeted). */
export const LOBBY_ROOM = '__lobby__';

export type EventName = (typeof Events)[keyof typeof Events];
