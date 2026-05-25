import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BotDifficulty } from '@co-ganh/bot';

export type Theme = 'light' | 'dark';
export type Language = 'vi' | 'en';

interface SettingsState {
  soundEnabled: boolean;
  musicEnabled: boolean;
  theme: Theme;
  language: Language;
  botDifficulty: BotDifficulty;
  playerName: string;
  toggleSound: () => void;
  toggleMusic: () => void;
  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
  setBotDifficulty: (d: BotDifficulty) => void;
  setPlayerName: (name: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      musicEnabled: true,
      theme: 'light',
      language: 'vi',
      botDifficulty: 'medium',
      playerName: '',
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setBotDifficulty: (botDifficulty) => set({ botDifficulty }),
      setPlayerName: (playerName) => set({ playerName }),
    }),
    {
      name: 'co-ganh-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
