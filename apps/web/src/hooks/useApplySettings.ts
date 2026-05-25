import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore.js';

/**
 * Apply theme from store to <html class="dark"> + html lang attr.
 * Mount once trong App root.
 */
export function useApplySettings(): void {
  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
}
