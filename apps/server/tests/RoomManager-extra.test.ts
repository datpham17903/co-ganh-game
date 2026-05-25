import { describe, it, expect } from 'vitest';
import { RoomManager } from '../src/rooms/RoomManager.js';

describe('RoomManager — public list + password', () => {
  it('listPublic: phòng không public không hiển thị', () => {
    const m = new RoomManager();
    m.create('s1', 'Alice');
    expect(m.listPublic()).toHaveLength(0);
  });

  it('listPublic: phòng public + waiting hiển thị', () => {
    const m = new RoomManager();
    m.create('s1', 'Alice', { isPublic: true });
    const list = m.listPublic();
    expect(list).toHaveLength(1);
    expect(list[0]?.hostName).toBe('Alice');
    expect(list[0]?.hasPassword).toBe(false);
  });

  it('listPublic: phòng full không hiển thị', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'Alice', { isPublic: true });
    m.join(room.id, 's2', 'Bob');
    expect(m.listPublic()).toHaveLength(0);
  });

  it('listPublic: hasPassword đúng cho từng phòng', () => {
    const m = new RoomManager();
    m.create('s1', 'A', { isPublic: true });
    m.create('s2', 'B', { isPublic: true, password: 'pw' });
    const list = m.listPublic();
    expect(list).toHaveLength(2);
    const withPw = list.find((r) => r.hostName === 'B');
    const noPw = list.find((r) => r.hostName === 'A');
    expect(withPw?.hasPassword).toBe(true);
    expect(noPw?.hasPassword).toBe(false);
  });

  it('listPublic: sắp xếp mới nhất lên đầu', () => {
    const m = new RoomManager();
    const r1 = m.create('s1', 'First', { isPublic: true });
    // Đợi tick để createdAt khác nhau
    const r2Room = new (class {
      // bypass sleep — manually create with later timestamp
    })();
    void r2Room;
    const r2 = m.create('s2', 'Second', { isPublic: true });
    // Bump createdAt of r2 lên
    (r2.room as unknown as { createdAt: number }).createdAt = r1.room.createdAt + 100;
    const list = m.listPublic();
    expect(list[0]?.hostName).toBe('Second');
    expect(list[1]?.hostName).toBe('First');
  });

  it('join với password đúng: ok', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'A', { isPublic: false, password: 'pw' });
    const r = m.join(room.id, 's2', 'B', 'pw');
    expect(r.ok).toBe(true);
  });

  it('join với password sai: WRONG_PASSWORD', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'A', { isPublic: false, password: 'pw' });
    const r = m.join(room.id, 's2', 'B', 'wrong');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('WRONG_PASSWORD');
  });

  it('join phòng có pw nhưng không gửi pw: WRONG_PASSWORD', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'A', { isPublic: false, password: 'pw' });
    const r = m.join(room.id, 's2', 'B');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('WRONG_PASSWORD');
  });

  it('join phòng không pw: gửi pw vẫn ok', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'A');
    const r = m.join(room.id, 's2', 'B', 'random-pw');
    expect(r.ok).toBe(true);
  });
});
