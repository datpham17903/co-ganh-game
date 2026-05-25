import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSettingsStore } from '../src/stores/settingsStore.js';

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      soundEnabled: true,
      musicEnabled: true,
      theme: 'light',
      language: 'vi',
      botDifficulty: 'medium',
      playerName: '',
    });
  });

  it('default state hợp lý', () => {
    const s = useSettingsStore.getState();
    expect(s.soundEnabled).toBe(true);
    expect(s.musicEnabled).toBe(true);
    expect(s.theme).toBe('light');
    expect(s.language).toBe('vi');
    expect(s.botDifficulty).toBe('medium');
  });

  it('toggleSound đảo trạng thái', () => {
    act(() => useSettingsStore.getState().toggleSound());
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
    act(() => useSettingsStore.getState().toggleSound());
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
  });

  it('toggleMusic đảo trạng thái', () => {
    act(() => useSettingsStore.getState().toggleMusic());
    expect(useSettingsStore.getState().musicEnabled).toBe(false);
    act(() => useSettingsStore.getState().toggleMusic());
    expect(useSettingsStore.getState().musicEnabled).toBe(true);
  });

  it('setTheme + setLanguage + setBotDifficulty + setPlayerName', () => {
    act(() => useSettingsStore.getState().setTheme('dark'));
    act(() => useSettingsStore.getState().setLanguage('en'));
    act(() => useSettingsStore.getState().setBotDifficulty('hard'));
    act(() => useSettingsStore.getState().setPlayerName('An'));
    const s = useSettingsStore.getState();
    expect(s.theme).toBe('dark');
    expect(s.language).toBe('en');
    expect(s.botDifficulty).toBe('hard');
    expect(s.playerName).toBe('An');
  });

  it('persist vào localStorage', () => {
    act(() => useSettingsStore.getState().setTheme('dark'));
    const raw = localStorage.getItem('co-ganh-settings');
    expect(raw).toBeTruthy();
    expect(raw).toContain('dark');
  });
});
