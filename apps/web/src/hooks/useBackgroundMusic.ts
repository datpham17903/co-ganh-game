import { useEffect } from 'react';
import { music } from '../lib/music.js';
import { audio } from '../lib/audio.js';
import { useSettingsStore } from '../stores/settingsStore.js';

/**
 * Bật nhạc nền khi user vào trang chơi (PlayBot/PlayLocal/PlayPvP).
 *
 * - Vào trang đã là user gesture (click menu) → arm audio + start music nếu enabled.
 * - Subscribe vào musicEnabled changes để start/stop runtime.
 * - Cleanup: stop music khi unmount.
 */
export function useBackgroundMusic(): void {
  useEffect(() => {
    audio.arm();
    if (useSettingsStore.getState().musicEnabled) {
      music.start();
    }

    const unsub = useSettingsStore.subscribe((state, prev) => {
      if (state.musicEnabled === prev.musicEnabled) return;
      if (state.musicEnabled) music.start();
      else music.stop();
    });

    return () => {
      unsub();
      music.stop();
    };
  }, []);
}
