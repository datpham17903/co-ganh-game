import { describe, it, expect } from 'vitest';
import { Room } from '../src/rooms/Room.js';

describe('Room — password + public + chat', () => {
  it('mặc định: không public, không password', () => {
    const r = new Room('TEST01');
    expect(r.isPublic).toBe(false);
    expect(r.hasPassword()).toBe(false);
    expect(r.verifyPassword(undefined)).toBe(true);
  });

  it('isPublic flag set qua opts', () => {
    const r = new Room('TEST01', { isPublic: true });
    expect(r.isPublic).toBe(true);
  });

  it('password được hash, không lưu plain', () => {
    const r = new Room('TEST01', { isPublic: true, password: 'secret' });
    expect(r.hasPassword()).toBe(true);
    // hash không phải là plain
    expect(r.passwordHash).not.toBe('secret');
    expect(r.passwordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifyPassword đúng', () => {
    const r = new Room('TEST01', { isPublic: false, password: 's3cret!' });
    expect(r.verifyPassword('s3cret!')).toBe(true);
    expect(r.verifyPassword('wrong')).toBe(false);
    expect(r.verifyPassword(undefined)).toBe(false);
    expect(r.verifyPassword('')).toBe(false);
  });

  it('verifyPassword cho phòng không pw: chấp nhận mọi input (kể cả undefined)', () => {
    const r = new Room('TEST01');
    expect(r.verifyPassword('anything')).toBe(true);
    expect(r.verifyPassword(undefined)).toBe(true);
  });

  it('pushChat: text rỗng → null', () => {
    const r = new Room('TEST01');
    expect(r.pushChat('B', 'A', '')).toBeNull();
    expect(r.pushChat('B', 'A', '   ')).toBeNull();
  });

  it('pushChat: text > 200 ký tự → null', () => {
    const r = new Room('TEST01');
    expect(r.pushChat('B', 'A', 'x'.repeat(201))).toBeNull();
  });

  it('pushChat: msg hợp lệ → có id tăng dần, từ trim', () => {
    const r = new Room('TEST01');
    const m1 = r.pushChat('B', 'Alice', '  hello  ');
    const m2 = r.pushChat('W', 'Bob', 'hi there');
    expect(m1?.id).toBe(1);
    expect(m1?.text).toBe('hello');
    expect(m2?.id).toBe(2);
    expect(r.chat).toHaveLength(2);
  });

  it('chat history cap ở 100 msg', () => {
    const r = new Room('TEST01');
    for (let i = 0; i < 120; i++) {
      r.pushChat('B', 'A', `msg ${i}`);
    }
    expect(r.chat).toHaveLength(100);
    // msg cũ nhất bị shift, msg mới nhất ở cuối
    expect(r.chat[0]?.text).toBe('msg 20');
    expect(r.chat[99]?.text).toBe('msg 119');
  });

  it('chat type system', () => {
    const r = new Room('TEST01');
    const m = r.pushChat('system', 'system', 'Game started');
    expect(m?.from).toBe('system');
  });
});
