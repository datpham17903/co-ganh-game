import { Modal } from './Modal.js';
import { useSettingsStore } from '../stores/settingsStore.js';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  return (
    <Modal open={open} onClose={onClose} title="Cài đặt">
      <div className="space-y-4">
        <Row label="Âm thanh">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundEnabled}
            className="px-3 py-1 rounded border border-text-muted"
          >
            {soundEnabled ? 'Bật' : 'Tắt'}
          </button>
        </Row>

        <Row label="Giao diện">
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
            className="px-3 py-1 rounded border border-text-muted bg-surface"
            aria-label="Chọn giao diện"
          >
            <option value="light">Sáng</option>
            <option value="dark">Tối</option>
          </select>
        </Row>

        <Row label="Ngôn ngữ">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'vi' | 'en')}
            className="px-3 py-1 rounded border border-text-muted bg-surface"
            aria-label="Chọn ngôn ngữ"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </Row>
      </div>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}
