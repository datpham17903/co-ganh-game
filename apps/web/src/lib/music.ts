/**
 * Background music — synthetic pentatonic loop (Vietnamese-inspired ngũ cung).
 * Tách riêng khỏi audio.ts để clean separation: SFX (HTMLAudio) vs music (Web Audio API).
 *
 * Không dùng asset MP3 bên ngoài (avoid copyright + binary trong git).
 * Lịch nốt được tạo runtime bằng OscillatorNode, loop seamless.
 */

// 5 nốt ngũ cung (E minor pentatonic) gợi nhạc cụ truyền thống VN.
const PENTATONIC_HZ = [
  329.63, // E4
  392.0, // G4
  440.0, // A4
  493.88, // B4
  587.33, // D5
] as const;

// Pattern lên-xuống vòng tròn để loop seamless: 0,1,2,3,4,3,2,1 (repeat)
// Nốt cuối (1) nối liền nốt đầu (0) cách 1 bậc — không đứt mạch.
const SEQUENCE: readonly number[] = [0, 1, 2, 3, 4, 3, 2, 1];

const NOTE_DURATION_S = 0.6; // 600ms / nốt → loop ~4.8s, tổng track ~30s khi lặp 6 lần.
const MASTER_GAIN = 0.18;

// Envelope (ADSR) tránh click & cho cảm giác "thở".
const ATTACK_S = 0.05;
const DECAY_S = 0.2;
const SUSTAIN_LEVEL = 0.5;
const RELEASE_S = 0.1;

// Lookahead scheduler: schedule trước 200ms, tick mỗi 100ms.
const LOOKAHEAD_S = 0.2;
const TICK_MS = 100;

class MusicPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private playing = false;
  private timer: number | null = null;
  // Đồng hồ lịch nội bộ — thời điểm AudioContext sẽ phát nốt kế tiếp.
  private nextNoteTime = 0;
  private seqIndex = 0;
  // Track active oscillators để cleanup khi stop() ngay giữa loop.
  private active: Set<OscillatorNode> = new Set();

  /**
   * Bắt đầu loop. No-op nếu đang playing.
   * Phải được gọi sau user gesture (click/tap) — browser autoplay policy.
   */
  start(): void {
    if (this.playing) return;
    if (typeof window === 'undefined') return;

    try {
      if (!this.audioContext) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.audioContext = new Ctor();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = MASTER_GAIN;
        this.gainNode.connect(this.audioContext.destination);
      }
      // Resume nếu suspended (browser policy).
      if (this.audioContext.state === 'suspended') {
        void this.audioContext.resume();
      }
      this.playing = true;
      this.nextNoteTime = this.audioContext.currentTime + 0.05;
      this.seqIndex = 0;
      this.scheduleLoop();
    } catch {
      // Web Audio không khả dụng — bỏ qua.
    }
  }

  /** Dừng + cleanup tất cả nốt đang phát. */
  stop(): void {
    this.playing = false;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    // Stop & disconnect tất cả oscillator còn active.
    for (const osc of this.active) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* đã stop */
      }
    }
    this.active.clear();
  }

  /** Bật/tắt theo settings. */
  setEnabled(enabled: boolean): void {
    if (enabled) this.start();
    else this.stop();
  }

  private scheduleLoop = (): void => {
    if (!this.playing || !this.audioContext) return;
    const ctx = this.audioContext;
    while (this.nextNoteTime < ctx.currentTime + LOOKAHEAD_S) {
      const idx = SEQUENCE[this.seqIndex % SEQUENCE.length] ?? 0;
      const freq = PENTATONIC_HZ[idx] ?? 440;
      this.scheduleNote(freq, this.nextNoteTime);
      this.nextNoteTime += NOTE_DURATION_S;
      this.seqIndex = (this.seqIndex + 1) % SEQUENCE.length;
    }
    this.timer = window.setTimeout(this.scheduleLoop, TICK_MS);
  };

  private scheduleNote(freq: number, when: number): void {
    if (!this.audioContext || !this.gainNode) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    osc.type = 'triangle'; // mềm hơn sine, gợi đàn dây.
    osc.frequency.value = freq;

    // ADSR envelope.
    const peak = 1;
    const sustain = peak * SUSTAIN_LEVEL;
    const stopAt = when + NOTE_DURATION_S + RELEASE_S;
    noteGain.gain.setValueAtTime(0, when);
    noteGain.gain.linearRampToValueAtTime(peak, when + ATTACK_S);
    noteGain.gain.linearRampToValueAtTime(sustain, when + ATTACK_S + DECAY_S);
    noteGain.gain.setValueAtTime(sustain, when + NOTE_DURATION_S);
    noteGain.gain.linearRampToValueAtTime(0, stopAt);

    osc.connect(noteGain);
    noteGain.connect(this.gainNode);
    osc.start(when);
    osc.stop(stopAt);

    this.active.add(osc);
    osc.onended = () => {
      try {
        osc.disconnect();
        noteGain.disconnect();
      } catch {
        /* ignore */
      }
      this.active.delete(osc);
    };
  }
}

export const music = new MusicPlayer();
