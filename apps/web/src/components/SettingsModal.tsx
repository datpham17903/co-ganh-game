import type { BotDifficulty } from '@co-ganh/bot';
import { Modal } from './Modal.js';
import { useSettingsStore } from '../stores/settingsStore.js';
import { useT } from '../i18n/index.js';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const t = useT();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const botDifficulty = useSettingsStore((s) => s.botDifficulty);
  const setBotDifficulty = useSettingsStore((s) => s.setBotDifficulty);

  return (
    <Modal open={open} onClose={onClose} title={t('common.settings')}>
      <div className="space-y-5">
        <Section label={t('settings.sound')}>
          <Toggle
            on={soundEnabled}
            onLabel={t('settings.on')}
            offLabel={t('settings.off')}
            onClick={toggleSound}
            testId="toggle-sound"
          />
        </Section>

        <Section label={t('settings.theme')}>
          <div className="grid grid-cols-2 gap-2">
            <Tile
              selected={theme === 'light'}
              onClick={() => setTheme('light')}
              testId="theme-light"
            >
              {t('settings.themeLight')}
            </Tile>
            <Tile selected={theme === 'dark'} onClick={() => setTheme('dark')} testId="theme-dark">
              {t('settings.themeDark')}
            </Tile>
          </div>
        </Section>

        <Section label={t('settings.language')}>
          <div className="grid grid-cols-2 gap-2">
            <Tile selected={language === 'vi'} onClick={() => setLanguage('vi')} testId="lang-vi">
              🇻🇳 Tiếng Việt
            </Tile>
            <Tile selected={language === 'en'} onClick={() => setLanguage('en')} testId="lang-en">
              🇬🇧 English
            </Tile>
          </div>
        </Section>

        <Section label={t('settings.botDifficulty')}>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <Chip
                key={d}
                selected={botDifficulty === d}
                onClick={() => setBotDifficulty(d as BotDifficulty)}
                testId={`bot-${d}`}
              >
                {d === 'easy'
                  ? t('difficulty.easy')
                  : d === 'medium'
                    ? t('difficulty.medium')
                    : t('difficulty.hard')}
              </Chip>
            ))}
          </div>
        </Section>

        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg bg-accent text-white font-display"
        >
          {t('common.close')}
        </button>
      </div>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      {children}
    </div>
  );
}

function Tile({
  selected,
  onClick,
  children,
  testId,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`px-3 py-3 rounded-lg border-2 transition-colors ${
        selected
          ? 'border-accent bg-surface text-text-primary'
          : 'border-text-muted/30 bg-surface/40 text-text-muted hover:border-text-muted'
      }`}
    >
      {children}
    </button>
  );
}

function Chip({
  selected,
  onClick,
  children,
  testId,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`flex-1 px-3 py-2 rounded-md border-2 text-sm transition-colors ${
        selected
          ? 'border-accent bg-accent text-white'
          : 'border-text-muted/30 text-text-muted hover:border-text-muted'
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({
  on,
  onLabel,
  offLabel,
  onClick,
  testId,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      data-testid={testId}
      className={`relative w-20 h-9 rounded-full border-2 transition-colors ${
        on ? 'bg-accent border-accent' : 'bg-surface border-text-muted/40'
      }`}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 transition-all ${
          on ? 'right-2 text-white text-xs font-medium' : 'left-2 text-text-muted text-xs'
        }`}
      >
        {on ? onLabel : offLabel}
      </span>
      <span
        className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow transition-all ${
          on ? 'right-1' : 'left-1'
        }`}
      />
    </button>
  );
}
