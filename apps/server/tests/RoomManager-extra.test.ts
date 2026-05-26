import { describe, it, expect } from 'vitest';
import { RoomManager } from '../src/rooms/RoomManager.js';

describe('RoomManager — public list + password', () => {
  it('listPublic: phòng không public không hiển thị', () => {
    const m = new RoomManager();
    m.create('s1', 'Alice');
    const r = m.listPublic();
    expect(r.rooms).toHaveLength(0);
    expect(r.total).toBe(0);
  });

  it('listPublic: phòng public + waiting hiển thị', () => {
    const m = new RoomManager();
    m.create('s1', 'Alice', { isPublic: true });
    const list = m.listPublic();
    expect(list.rooms).toHaveLength(1);
    expect(list.rooms[0]?.hostName).toBe('Alice');
    expect(list.rooms[0]?.hasPassword).toBe(false);
  });

  it('listPublic: phòng full vẫn hiển thị (cho spectate) khi includeSpectatable', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'Alice', { isPublic: true });
    m.join(room.id, 's2', 'Bob');
    // Default includeSpectatable=true → vẫn hiện vì status playing
    expect(m.listPublic().rooms).toHaveLength(1);
    // waitingOnly=true → không hiện
    expect(m.listPublic({ waitingOnly: true }).rooms).toHaveLength(0);
  });

  it('listPublic: hasPassword đúng cho từng phòng', () => {
    const m = new RoomManager();
    m.create('s1', 'A', { isPublic: true });
    m.create('s2', 'B', { isPublic: true, password: 'pw' });
    const list = m.listPublic();
    expect(list.rooms).toHaveLength(2);
    const withPw = list.rooms.find((r) => r.hostName === 'B');
    const noPw = list.rooms.find((r) => r.hostName === 'A');
    expect(withPw?.hasPassword).toBe(true);
    expect(noPw?.hasPassword).toBe(false);
  });

  it('listPublic: sắp xếp mới nhất lên đầu', () => {
    const m = new RoomManager();
    const r1 = m.create('s1', 'First', { isPublic: true });
    const r2 = m.create('s2', 'Second', { isPublic: true });
    (r2.room as unknown as { createdAt: number }).createdAt = r1.room.createdAt + 100;
    const list = m.listPublic();
    expect(list.rooms[0]?.hostName).toBe('Second');
    expect(list.rooms[1]?.hostName).toBe('First');
  });

  it('listPublic: search filter theo room name + host name + id', () => {
    const m = new RoomManager();
    m.create('s1', 'Alice', { isPublic: true, name: 'Quick chess' });
    m.create('s2', 'Bob', { isPublic: true, name: 'Slow game' });
    m.create('s3', 'Charlie', { isPublic: true });
    expect(m.listPublic({ search: 'quick' }).rooms).toHaveLength(1);
    expect(m.listPublic({ search: 'bob' }).rooms).toHaveLength(1);
    expect(m.listPublic({ search: 'charlie' }).rooms).toHaveLength(1);
    expect(m.listPublic({ search: 'xyz' }).rooms).toHaveLength(0);
  });

  it('listPublic: pagination limit + offset + total', () => {
    const m = new RoomManager();
    for (let i = 0; i < 10; i++) {
      m.create(`s${i}`, `User${i}`, { isPublic: true });
    }
    const page1 = m.listPublic({ limit: 4, offset: 0 });
    expect(page1.rooms).toHaveLength(4);
    expect(page1.total).toBe(10);
    const page2 = m.listPublic({ limit: 4, offset: 4 });
    expect(page2.rooms).toHaveLength(4);
    expect(page2.total).toBe(10);
    const page3 = m.listPublic({ limit: 4, offset: 8 });
    expect(page3.rooms).toHaveLength(2);
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

  it('spectate: phòng public OK + đếm spectator', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'A', { isPublic: true });
    const r = m.spectate(room.id, 's2', 'Watcher');
    expect(r.ok).toBe(true);
    expect(room.spectatorCount()).toBe(1);
  });

  it('spectate: phòng private vẫn cho spectate khi có mã (không cần password)', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'A', { isPublic: false, password: 'secret' });
    const r = m.spectate(room.id, 's2', 'Watcher');
    expect(r.ok).toBe(true);
    expect(room.spectatorCount()).toBe(1);
  });

  it('spectate: player đang trong phòng đó → ALREADY_PLAYER', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'A', { isPublic: true });
    const r = m.spectate(room.id, 's1', 'A');
    expect(r.ok).toBe(false);
  });

  it('disconnect spectator: xóa khỏi list', () => {
    const m = new RoomManager();
    const { room } = m.create('s1', 'A', { isPublic: true });
    m.spectate(room.id, 's2', 'Watcher');
    expect(room.spectatorCount()).toBe(1);
    const result = m.disconnect('s2');
    expect(result?.role).toBe('spectator');
    expect(room.spectatorCount()).toBe(0);
  });
});
