import { Link } from 'react-router-dom';
import { useState } from 'react';
import { SettingsModal } from '../components/SettingsModal.js';

export function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <span className="font-display text-lg">Cờ Gánh</span>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Cài đặt"
          className="px-3 py-1 rounded hover:bg-surface"
        >
          ⚙
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
        <div className="text-center">
          <h1 className="font-display text-3xl md:text-5xl">CỜ GÁNH</h1>
          <p className="text-text-muted mt-2">Cờ truyền thống Việt Nam</p>
        </div>

        <nav className="flex flex-col gap-3 w-full max-w-xs">
          <MenuButton to="/play/bot" label="▶  CHƠI VỚI BOT" />
          <MenuButton to="/play/pvp" label="◎  CHƠI ONLINE" />
          <MenuButton to="/play/local" label="⚎  CHƠI 2 NGƯỜI" />
          <Link
            to="/rules"
            className="text-text-muted hover:text-text-primary text-sm text-center underline"
          >
            📖 Hướng dẫn luật chơi
          </Link>
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
