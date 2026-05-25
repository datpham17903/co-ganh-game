import { Link } from 'react-router-dom';
import { useState } from 'react';
import { SettingsModal } from '../components/SettingsModal.js';
import { BOT_ONLY } from '../config.js';
import { useT } from '../i18n/index.js';

export function HomePage() {
  const t = useT();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <span className="font-display text-lg">{t('app.title')}</span>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('common.settings')}
          className="px-3 py-1 rounded hover:bg-surface"
        >
          ⚙
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
        <div className="text-center">
          <h1 className="font-display text-3xl md:text-5xl uppercase">{t('app.title')}</h1>
          <p className="text-text-muted mt-2">{t('app.tagline')}</p>
        </div>

        <nav className="flex flex-col gap-3 w-full max-w-xs">
          <MenuButton to="/play/bot" label={t('menu.bot')} />
          {!BOT_ONLY && <MenuButton to="/play/pvp" label={t('menu.online')} />}
          <MenuButton to="/play/local" label={t('menu.local')} />
          <Link
            to="/rules"
            className="text-text-muted hover:text-text-primary text-sm text-center underline"
          >
            {t('menu.rules')}
          </Link>
          {BOT_ONLY && (
            <p className="text-xs text-text-muted text-center mt-2">{t('menu.botOnlyNote')}</p>
          )}
        </nav>
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function MenuButton({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="block px-6 py-3 rounded-lg bg-surface border border-text-muted text-center font-display hover:bg-bg-board hover:border-accent transition-colors"
    >
      {label}
    </Link>
  );
}
