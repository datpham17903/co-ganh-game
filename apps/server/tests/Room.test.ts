import { describe, it, expect } from 'vitest';
import { Room } from '../src/rooms/Room.js';
import { coord2index } from '@co-ganh/engine';

describe('Room', () => {
  it('thêm player đầu tiên = B, trạng thái waiting', () => {
    const r = new Room('TEST01');
    const c = r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    expect(c).toBe('B');
    expect(r.status).toBe('waiting');
  });

  it('thêm player thứ 2 = W, status playing', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    const c = r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    expect(c).toBe('W');
    expect(r.status).toBe('playing');
  });

  it('thêm player thứ 3 → throw', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    expect(() => r.addPlayer({ socketId: 's3', name: 'C', token: 't3' })).toThrow();
  });

  it('applyMoveBy: nước đi đúng → ok', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    const result = r.applyMoveBy('s1', { from: coord2index(1, 0), to: coord2index(1, 1) });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.turn).toBe('W');
  });

  it('applyMoveBy: không phải lượt → reject', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    const result = r.applyMoveBy('s2', { from: coord2index(3, 0), to: coord2index(3, 1) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('NOT_YOUR_TURN');
  });

  it('applyMoveBy: nước không hợp lệ → INVALID_MOVE', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    // (0,0) → (0,1): (0,1) đã có B → không đi được
    const result = r.applyMoveBy('s1', { from: coord2index(0, 0), to: coord2index(0, 1) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVALID_MOVE');
  });

  it('applyMoveBy: phòng chưa playing → GAME_NOT_STARTED', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    const result = r.applyMoveBy('s1', { from: coord2index(1, 0), to: coord2index(1, 1) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('GAME_NOT_STARTED');
  });

  it('markDisconnect / reconnect cập nhật socketId mới', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    const c = r.markDisconnect('s1');
    expect(c).toBe('B');
    expect(r.players.B?.disconnectedAt).toBeTruthy();
    const back = r.reconnect('t1', 's1-new');
    expect(back).toBe('B');
    expect(r.players.B?.socketId).toBe('s1-new');
    expect(r.players.B?.disconnectedAt).toBeNull();
  });

  it('reconnect với token sai trả null', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    expect(r.reconnect('not-exist', 's2')).toBeNull();
  });

  it('resign: bên kia thắng + status finished', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    r.resign('B');
    expect(r.status).toBe('finished');
    expect(r.state.status).toBe('W_won');
  });

  it('reset: trạng thái về initial, status playing', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    r.applyMoveBy('s1', { from: coord2index(1, 0), to: coord2index(1, 1) });
    r.resign('B');
    r.reset();
    expect(r.status).toBe('playing');
    expect(r.state.moveHistory).toHaveLength(0);
  });
});
