import { describe, it, expect } from 'vitest';
import { Room } from '../src/rooms/Room.js';
import { coord2index } from '@co-ganh/engine';

describe('Room — clock', () => {
  it('clock initial: 10 phút mặc định', () => {
    const r = new Room('TEST01');
    const tenMin = 10 * 60 * 1000;
    expect(r.clock.remainingMs.B).toBe(tenMin);
    expect(r.clock.remainingMs.W).toBe(tenMin);
    expect(r.clock.turnStartedAt).toBeNull();
  });

  it('clock initialClockMs custom qua opts', () => {
    const r = new Room('TEST01', { isPublic: false, initialClockMs: 5000 });
    expect(r.clock.remainingMs.B).toBe(5000);
    expect(r.clock.remainingMs.W).toBe(5000);
  });

  it('clock turnStartedAt được set khi player thứ 2 join', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    expect(r.clock.turnStartedAt).toBeNull();
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    expect(r.clock.turnStartedAt).not.toBeNull();
  });

  it('applyMoveBy trừ thời gian cho B + chuyển turn sang W', () => {
    const r = new Room('TEST01', { isPublic: false, initialClockMs: 60_000 });
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    const startedAt = r.clock.turnStartedAt!;
    // Mock thời gian: B suy nghĩ 1s rồi đi
    r.clock.turnStartedAt = startedAt - 1000;
    const result = r.applyMoveBy('s1', { from: coord2index(1, 0), to: coord2index(1, 1) });
    expect(result.ok).toBe(true);
    // B đã dùng ~1s
    expect(r.clock.remainingMs.B).toBeLessThanOrEqual(60_000);
    expect(r.clock.remainingMs.B).toBeGreaterThan(58_000);
    // W chưa dùng → 60s nguyên
    expect(r.clock.remainingMs.W).toBe(60_000);
  });

  it('checkClockTimeout: B hết giờ → W thắng', () => {
    const r = new Room('TEST01', { isPublic: false, initialClockMs: 1000 });
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    // Mock B đã chạy 2s
    r.clock.turnStartedAt = Date.now() - 2000;
    const loser = r.checkClockTimeout();
    expect(loser).toBe('B');
    expect(r.status).toBe('finished');
    expect(r.state.status).toBe('W_won');
  });

  it('checkClockTimeout: chưa hết giờ → null', () => {
    const r = new Room('TEST01', { isPublic: false, initialClockMs: 60_000 });
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    expect(r.checkClockTimeout()).toBeNull();
  });

  it('clockSnapshot: trừ realtime cho bên đang đi', () => {
    const r = new Room('TEST01', { isPublic: false, initialClockMs: 60_000 });
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    r.clock.turnStartedAt = Date.now() - 5000;
    const snap = r.clockSnapshot();
    expect(snap.turn).toBe('B');
    // B đã dùng ~5s
    expect(snap.B).toBeLessThanOrEqual(55_500);
    expect(snap.B).toBeGreaterThan(54_000);
    expect(snap.W).toBe(60_000);
  });

  it('reset: clock reset về initialClockMs + turnStartedAt set', () => {
    const r = new Room('TEST01', { isPublic: false, initialClockMs: 30_000 });
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    r.clock.remainingMs.B = 1000;
    r.reset();
    expect(r.clock.remainingMs.B).toBe(30_000);
    expect(r.clock.remainingMs.W).toBe(30_000);
    expect(r.clock.turnStartedAt).not.toBeNull();
  });

  it('resign: clock dừng (turnStartedAt = null)', () => {
    const r = new Room('TEST01');
    r.addPlayer({ socketId: 's1', name: 'A', token: 't1' });
    r.addPlayer({ socketId: 's2', name: 'B', token: 't2' });
    r.resign('B');
    expect(r.clock.turnStartedAt).toBeNull();
  });
});
