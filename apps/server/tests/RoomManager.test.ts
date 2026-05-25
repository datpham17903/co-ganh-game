import { describe, it, expect } from 'vitest';
import { RoomManager } from '../src/rooms/RoomManager.js';

describe('RoomManager', () => {
  it('create trả mã 6 ký tự + token 16 ký tự + color B', () => {
    const m = new RoomManager();
    const { room, color, token } = m.create('s1', 'Alice');
    expect(room.id).toHaveLength(6);
    expect(color).toBe('B');
    expect(token).toHaveLength(16);
    expect(m.size()).toBe(1);
  });

  it('join: mã không tồn tại → NOT_FOUND', () => {
    const m = new RoomManager();
    const r = m.join('XXXXXX', 's2', 'Bob');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('NOT_FOUND');
  });

  it('join: mã invalid format → INVALID_CODE', () => {
    const m = new RoomManager();
    const r = m.join('abc!@#', 's2', 'Bob');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('INVALID_CODE');
  });

  it('join: phòng full → FULL', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'A');
    m.join(room.id, 's2', 'B');
    const r = m.join(room.id, 's3', 'C');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('FULL');
  });

  it('join thành công → color W', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'A');
    const r = m.join(room.id, 's2', 'B');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.color).toBe('W');
  });

  it('reconnect bằng token cũ', () => {
    const m = new RoomManager();
    const { room, token } = m.create('s1', 'A');
    m.disconnect('s1');
    const r = m.reconnect(room.id, 's1-new', token);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.color).toBe('B');
  });

  it('cleanup: phòng waiting hết TTL → xóa', () => {
    const m = new RoomManager({ waitingTtlMs: 1000 });
    m.create('s1', 'A');
    expect(m.size()).toBe(1);
    m.cleanup(Date.now() + 5000);
    expect(m.size()).toBe(0);
  });

  it('cleanup: trong ván, player disconnect quá TTL → forfeited', () => {
    const m = new RoomManager({ reconnectTtlMs: 1000 });
    const { room } = m.create('s1', 'A');
    m.join(room.id, 's2', 'B');
    m.disconnect('s1');
    const { forfeited } = m.cleanup(Date.now() + 5000);
    expect(forfeited).toHaveLength(1);
    expect(forfeited[0]?.loser).toBe('B');
    expect(room.status).toBe('finished');
  });

  it('không tạo trùng mã: nếu va trùng, retry và thành công', () => {
    // Stub rand: lần create thứ 1 gen "AAAAAA", lần 2 lần đầu cũng "AAAAAA"
    // (trùng) rồi sang "BBBBBB" thành công.
    const sequences: number[][] = [
      // create #1: 6 chars cho code, 16 chars cho token = 22 calls
      Array.from({ length: 22 }, () => 0),
      // create #2: 6 chars trùng (toàn 0) → retry
      Array.from({ length: 6 }, () => 0),
      // create #2 attempt 2: 6 chars khác (= 1) + 16 token
      Array.from({ length: 22 }, () => 1 / 32),
    ];
    const flat = sequences.flat();
    let i = 0;
    const rand = () => flat[i++] ?? 0;
    const m = new RoomManager({ rand });
    const { room: r1 } = m.create('s1', 'A');
    const { room: r2 } = m.create('s2', 'B');
    expect(r1.id).not.toBe(r2.id);
  });

  it('maxRooms exceed → throw', () => {
    const m = new RoomManager({ maxRooms: 2 });
    m.create('s1', 'A');
    m.create('s2', 'B');
    expect(() => m.create('s3', 'C')).toThrow(/MAX_ROOMS/);
  });
});
