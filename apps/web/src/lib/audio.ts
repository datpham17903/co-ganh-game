import { useSettingsStore } from '../stores/settingsStore.js';

type SoundName = 'select' | 'move' | 'capture' | 'win' | 'lose' | 'draw';

class AudioManager {
  private cache = new Map<SoundName, HTMLAudioElement>();
  private armed = false;

  /** Cần gọi sau user gesture đầu tiên (browser policy). */
  arm(): void {
    if (this.armed) return;
    this.armed = true;
  }

  preload(): void {
    // Preload tất cả qua data: URLs (silent ~50ms tones nếu chưa có file thật).
    // Khi có file public/sounds/*.mp3 thì swap src.
  }

  play(name: SoundName): void {
    const enabled = useSettingsStore.getState().soundEnabled;
    if (!enabled) return;
    if (!this.armed) return;
    // Tìm audio đã cache hoặc tạo synthetic beep bằng Web Audio.
    let el = this.cache.get(name);
    if (!el) {
      el = new Audio();
      el.src = synthBeepDataUrl(name);
      el.volume = 0.5;
      this.cache.set(name, el);
    }
    el.currentTime = 0;
    el.play().catch(() => {
      /* swallow - browser policy */
    });
  }
}

export const audio = new AudioManager();

/**
 * Tạo data URL "beep" tổng hợp đơn giản theo tên sự kiện.
 * Đây là placeholder — thay file thật trong public/sounds/ khi có asset.
 */
function synthBeepDataUrl(name: SoundName): string {
  const sampleRate = 22050;
  const durations: Record<SoundName, number> = {
    select: 0.05,
    move: 0.1,
    capture: 0.2,
    win: 0.6,
    lose: 0.5,
    draw: 0.4,
  };
  const freqs: Record<SoundName, number> = {
    select: 880,
    move: 440,
    capture: 660,
    win: 988,
    lose: 220,
    draw: 330,
  };
  const dur = durations[name];
  const freq = freqs[name];
  const samples = Math.floor(sampleRate * dur);
  const buffer = new Uint8Array(44 + samples * 2);
  // WAV header (PCM mono 16-bit)
  const view = new DataView(buffer.buffer);
  let p = 0;
  function w(s: string) {
    for (let i = 0; i < s.length; i++) buffer[p++] = s.charCodeAt(i);
  }
  function w32(n: number) {
    view.setUint32(p, n, true);
    p += 4;
  }
  function w16(n: number) {
    view.setUint16(p, n, true);
    p += 2;
  }
  w('RIFF');
  w32(36 + samples * 2);
  w('WAVEfmt ');
  w32(16);
  w16(1);
  w16(1);
  w32(sampleRate);
  w32(sampleRate * 2);
  w16(2);
  w16(16);
  w('data');
  w32(samples * 2);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    // simple decaying sine
    const env = Math.exp((-3 * t) / dur);
    const v = Math.sin(2 * Math.PI * freq * t) * env * 0.3;
    view.setInt16(p, Math.max(-1, Math.min(1, v)) * 0x7fff, true);
    p += 2;
  }
  let bin = '';
  for (let i = 0; i < buffer.length; i++) bin += String.fromCharCode(buffer[i]!);
  return `data:audio/wav;base64,${btoa(bin)}`;
}
